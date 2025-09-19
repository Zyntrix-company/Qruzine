"use client"

import { useState } from "react"
import { CreditCard, User, Phone, CheckCircle, X, Mail } from "lucide-react"
import api from '../../../../../../lib/api'

export default function Checkout({ 
  isOpen, 
  onClose, 
  items, 
  total, 
  onComplete,
  formData,
  setFormData,
  resID,
  qrID,
}) {
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!resID || !qrID) return
    try {
      setSubmitting(true)
      // Map cart items to backend payload
      const payloadItems = items.map(it => {
        // Extract menuID and variantName from id like "menuID:Variant" if present
        const [menuID, variantName] = String(it.id || it.menuID).split(':')
        return {
          menuID,
          quantity: it.quantity,
          variantName: variantName || undefined,
          specialInstructions: it.specialInstructions || '',
        }
      })

      const payload = {
        resID,
        qrID,
        customer: {
          name: formData.name,
          phone: formData.phone,
          email: formData.email || "guest@example.com",
        },
        items: payloadItems,
        specialRequest: formData.specialInstructions || '',
      }

      const resp = await api.placeOrder(payload)
      const data = resp?.data?.data || resp?.data || resp
      if (!data || !data.orderID) {
        throw new Error('Failed to place order')
      }

      const confirmation = {
        orderId: data.orderID,
        customerInfo: {
          name: payload.customer.name,
          phone: payload.customer.phone,
          email: payload.customer.email,
          specialInstructions: formData.specialInstructions || '',
        },
        items,
        total,
        timestamp: data.createdAt || new Date().toISOString(),
        status: data.status || 'Pending',
        estimatedTime: typeof data.estimatedTime === 'number' ? `${data.estimatedTime} mins` : (data.estimatedTime || '—'),
      }

      onComplete(confirmation)
    } catch (err) {
      alert(err?.message || 'Order failed')
    } finally {
      setSubmitting(false)
    }
  }

  const isFormValid = formData.name && formData.phone

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
          <div 
            className="relative rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2" 
            style={{ backgroundColor: '#510400', borderColor: '#B76E79' }}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center" style={{ color: '#ffffff' }}>
                  <CreditCard className="h-6 w-6 mr-2" />
                  Checkout
                </h2>
                <button onClick={onClose} style={{ color: '#ffffff' }}>
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold" style={{ color: '#ffffff' }}>Customer Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
                        <User className="h-4 w-4 inline mr-2" />
                        Full Name *
                      </label>
                      <input
                        required
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full px-4 py-2 rounded-lg border-2"
                        style={{ 
                          backgroundColor: '#f5bfb3ff', 
                          borderColor: '#B76E79',
                          color: '#510400'
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
                        <Phone className="h-4 w-4 inline mr-2" />
                        Phone Number *
                      </label>
                      <input
                        required
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="w-full px-4 py-2 rounded-lg border-2"
                        style={{ 
                          backgroundColor: '#f5bfb3ff', 
                          borderColor: '#B76E79',
                          color: '#510400'
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
                        <Mail className="h-4 w-4 inline mr-2" />
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full px-4 py-2 rounded-lg border-2"
                        style={{ 
                          backgroundColor: '#f5bfb3ff', 
                          borderColor: '#B76E79',
                          color: '#510400'
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
                      Special Instructions (Optional)
                    </label>
                    <textarea
                      value={formData.specialInstructions}
                      onChange={(e) => setFormData({...formData, specialInstructions: e.target.value})}
                      rows={3}
                      className="w-full px-4 py-2 rounded-lg border-2"
                      style={{ 
                        backgroundColor: '#f5bfb3ff', 
                        borderColor: '#B76E79',
                        color: '#510400'
                      }}
                      placeholder="Any special requests or dietary requirements..."
                    />
                  </div>
                </div>

                <hr style={{ borderColor: '#bd8b93ff' }} />

                {/* Order Summary */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold" style={{ color: '#ffffff' }}>Order Summary</h3>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {items.map(item => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span style={{ color: '#ffffff' }}>{item.quantity}x {item.name}</span>
                        <span style={{ color: '#fdfdfdff' }}>${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <hr style={{ borderColor: '#bd8b93ff' }} />
                  <div className="flex justify-between text-lg font-bold">
                    <span style={{ color: '#ffffff' }}>Total</span>
                    <span style={{ color: '#ffffff' }}>${total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-3 px-6 rounded-lg border-2 font-medium transition-colors"
                    style={{ borderColor: '#B76E79', color: '#ffffff', backgroundColor: 'transparent' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!isFormValid || submitting}
                    className="flex-1 py-3 px-6 rounded-lg border-2 font-medium transition-colors disabled:opacity-60"
                    style={{ borderColor: '#B76E79', color: '#ffffff', backgroundColor: 'transparent' }}
                  >
                    <CheckCircle className="h-4 w-4 inline mr-2" />
                    {submitting ? 'Placing...' : 'Place Order'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
