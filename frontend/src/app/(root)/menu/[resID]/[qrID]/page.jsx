"use client"

import React, { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import SplashScreen from '../../../../../components/splash_screen'
import Header from './components/Header'
import MenuItems from './components/MenuItems' 
import Cart from './components/Cart'
import Checkout from './components/Checkout'
import OrderConfirmation from './components/OrderConfirmation'
import OrderTracker from './components/OrderTracker'
import Footer from './components/Footer'
import api from '../../../../../lib/api'

export default function Page() {
  const params = useParams()
  const resID = params?.resID
  const qrID = params?.qrID

  const [showSplash, setShowSplash] = useState(true)
  const [cartItems, setCartItems] = useState([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [isOrderTrackerOpen, setIsOrderTrackerOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState("All")
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [orderData, setOrderData] = useState(null)
  const [checkoutForm, setCheckoutForm] = useState({
    name: "",
    email: "",
    phone: "",
    specialInstructions: ""
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [restaurant, setRestaurant] = useState(null)
  const [qrInfo, setQrInfo] = useState(null)
  const [menuItems, setMenuItems] = useState([])
  const [categories, setCategories] = useState(["All"]) 
  const [vegOnly, setVegOnly] = useState(false)

  // Fetch public menu
  useEffect(() => {
    let isMounted = true
    async function fetchMenu() {
      if (!resID || !qrID) return
      try {
        setLoading(true)
        const resp = await api.getPublicMenu(resID, qrID)
        const payload = resp?.data || resp // handle both shapes
        const data = payload?.data || payload
        if (!data) throw new Error('Invalid menu response')
        if (!isMounted) return

        setRestaurant(data.restaurant)
        setQrInfo(data.qrCode)

        // Flatten items into array with category
        const items = Object.entries(data.menu || {}).flatMap(([category, list]) =>
          (list || []).map(it => ({
            ...it,
            id: it.menuID, // base id; variant will adjust when added to cart
            category,
            price: (it.basePrice ?? it.price ?? 0),
          }))
        )

        // Special items at top in UI ordering
        items.sort((a, b) => {
          if (a.isSpecialItem && !b.isSpecialItem) return -1
          if (!a.isSpecialItem && b.isSpecialItem) return 1
          return a.name.localeCompare(b.name)
        })

        setMenuItems(items)
        const cats = ["All", ...Object.keys(data.menu || {})]
        setCategories(cats)
        setActiveCategory("All")
        setError(null)
      } catch (e) {
        console.error('Failed to load menu:', e)
        setError(e?.message || 'Failed to load menu')
      } finally {
        setLoading(false)
      }
    }
    fetchMenu()
    return () => { isMounted = false }
  }, [resID, qrID])

  // Persist cart to localStorage so refresh doesn't clear it
  const storageKey = useMemo(() => (resID && qrID ? `qr_cart_${resID}_${qrID}` : null), [resID, qrID])

  // Hydrate cart from localStorage when resID/qrID become available
  useEffect(() => {
    if (!storageKey) return
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          setCartItems(parsed)
        }
      }
    } catch (e) {
      console.warn('Failed to load cart from storage', e)
    }
  }, [storageKey])

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (!storageKey) return
    try {
      localStorage.setItem(storageKey, JSON.stringify(cartItems))
    } catch (e) {
      console.warn('Failed to save cart to storage', e)
    }
  }, [cartItems, storageKey])

  // Cart Functions
  const addToCart = (item) => {
    setCartItems(prev => {
      const existing = prev.find(cartItem => cartItem.id === item.id)
      if (existing) {
        return prev.map(cartItem => 
          cartItem.id === item.id 
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        )
      }
      return [...prev, { ...item, quantity: 1 }]
    })
  }

  const updateQuantity = (id, quantity) => {
    if (quantity === 0) {
      setCartItems(prev => prev.filter(item => item.id !== id))
    } else {
      setCartItems(prev => prev.map(item => 
        item.id === id ? { ...item, quantity } : item
      ))
    }
  }

  const removeItem = (id) => {
    setCartItems(prev => prev.filter(item => item.id !== id))
  }

  // Calculations
  const getTotalItems = () => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0)
  }

  const getSubtotal = () => {
    return cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  }

  const getTax = () => {
    // If items have per-item taxPercentage, compute weighted sum; fallback 10%
    if (cartItems.length) {
      let tax = 0
      for (const it of cartItems) {
        const tp = typeof it.taxPercentage === 'number' ? it.taxPercentage : 10
        tax += (it.price * it.quantity) * (tp / 100)
      }
      return tax
    }
    return getSubtotal() * 0.1
  }

  const getTotal = () => {
    return getSubtotal() + getTax()
  }

  // Checkout Functions
  const handleCheckout = () => {
    setIsCartOpen(false)
    setIsCheckoutOpen(true)
  }

  const handleCheckoutComplete = (newOrderData) => {
    setOrderData(newOrderData)
    setShowConfirmation(true)
    setIsCheckoutOpen(false)
    // Reset cart and form
    setTimeout(() => {
      setCartItems([])
      setCheckoutForm({ name: "", email: "", phone: "", specialInstructions: "" })
    }, 1000)
  }

  const filteredItems = useMemo(() => {
    let list = activeCategory === 'All' ? menuItems : menuItems.filter(i => i.category === activeCategory)
    if (vegOnly) list = list.filter(i => i.isVegetarian)
    return list
  }, [menuItems, activeCategory, vegOnly])

  const handleConfirmationClose = () => {
    setShowConfirmation(false)
    setOrderData(null)
  }

  return (
    <>
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      {!showSplash && (
        <div className="min-h-screen" style={{ backgroundColor: 'rgb(15, 18, 15)' }}>
          {error && (
            <div className="container mx-auto px-4 pt-4">
              <div className="p-3 rounded bg-red-100 text-red-700">{error}</div>
            </div>
          )}

          {/* Header */}
          <Header 
          restaurantName={restaurant?.name || 'Restaurant'} 
            cartItemsCount={getTotalItems()}
            onCartClick={() => setIsCartOpen(true)}
            onTrackOrderClick={() => setIsOrderTrackerOpen(true)}
          />

          {/* Main Content */}
          <main>
            <MenuItems
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
              items={filteredItems}
              categories={categories}
              vegOnly={vegOnly}
              onToggleVeg={() => setVegOnly(v => !v)}
              cart={cartItems.reduce((acc, item) => ({ ...acc, [item.id]: item.quantity }), {})}
              onQuantityChange={(sel, qty) => {
                const id = sel.id
                const nextQty = Math.max(0, qty || 0)
                const existing = cartItems.find(i => i.id === id)
                if (nextQty === 0) {
                  updateQuantity(id, 0)
                  return
                }
                if (existing) {
                  updateQuantity(id, nextQty)
                } else {
                  // Add new item with exact quantity
                  setCartItems(prev => [...prev, { ...sel, quantity: nextQty }])
                }
              }}
            />

          </main>

          {/* Footer */}
           <Footer restaurant={restaurant} /> 

          {/* Cart */}
          <Cart
            isOpen={isCartOpen}
            onClose={() => setIsCartOpen(false)}
            items={cartItems}
            onUpdateQuantity={updateQuantity}
            onRemoveItem={removeItem}
            onCheckout={handleCheckout}
            subtotal={getSubtotal()}
            tax={getTax()}
            total={getTotal()}
          />

          {/* Checkout */}
          <Checkout
            isOpen={isCheckoutOpen}
            onClose={() => setIsCheckoutOpen(false)}
            items={cartItems}
            total={getTotal()}
            onComplete={handleCheckoutComplete}
            formData={checkoutForm}
            setFormData={setCheckoutForm}
            resID={resID}
            qrID={qrID}
          />

          {/* Order Confirmation */}
          <OrderConfirmation
            isOpen={showConfirmation}
            onClose={handleConfirmationClose}
            orderData={orderData}
          />

          {/* Order Tracker */}
          <OrderTracker
            isOpen={isOrderTrackerOpen}
            onClose={() => setIsOrderTrackerOpen(false)}
          />
        </div>
      )}
    </>
  )
}