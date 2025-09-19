"use client"

import React, { useState } from "react"
import { Plus, Minus, X } from "lucide-react"

// Safely compute the lowest available variant price
function getLowestAvailablePrice(item) {
  if (!item?.variants || !Array.isArray(item.variants) || item.variants.length === 0) {
    return typeof item?.price === 'number' ? item.price : 0
  }
  const available = item.variants.filter(v => v && v.isAvailable !== false && typeof v.price === 'number')
  if (available.length === 0) {
    return typeof item?.price === 'number' ? item.price : 0
  }
  return Math.min(...available.map(v => v.price))
}

// Compute total qty across all variants of a parent item
function getVariantTotalQty(cart, item) {
  if (!cart || !item?.menuID) return 0
  const prefix = `${item.menuID}:`
  return Object.entries(cart).reduce((sum, [key, val]) => (key.startsWith(prefix) ? sum + (val || 0) : sum), 0)
}

// Bottom sheet for selecting variants (mobile)
function VariantBottomSheet({ open, onClose, item, cart, onQuantityChange }) {
  if (!open) return null
  const variants = (item?.variants || []).filter(v => v && v.isAvailable !== false)
  return (
    <div className="fixed inset-0 z-50 flex items-end md:hidden" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative w-full bg-[#3a022e] border-t border-[#800020] rounded-t-2xl p-4 pt-3 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-md" />
          <div className="flex-1">
            <h3 className="text-white font-semibold text-base leading-tight">{item.name}</h3>
            <p className="text-xs text-gray-300 line-clamp-2">{item.description}</p>
          </div>
          <button
            aria-label="Close"
            onClick={onClose}
            className="p-1 rounded-full bg-[#800020] text-white shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-3">
          <p className="text-xs text-gray-300 mb-2">Choose an option</p>
          <div className="max-h-[45vh] overflow-y-auto pr-1 space-y-2">
            {variants.map(v => {
              const composed = {
                ...item,
                id: `${item.menuID}:${v.name}`,
                name: `${item.name} - ${v.name}`,
                price: v.price,
              }
              const qty = cart?.[composed.id] || 0
              return (
                <div key={composed.id} className="flex items-center justify-between bg-[#510400] border border-[#800020] rounded-lg p-2">
                  <div>
                    <p className="text-sm text-white font-medium leading-tight">{v.name}</p>
                    <p className="text-xs text-[#FFFAFA]">₹{(v.price || 0).toFixed(2)}</p>
                  </div>
                  {qty > 0 ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); onQuantityChange(composed, Math.max(0, qty - 1)) }}
                        className="px-2 py-1 rounded bg-[#800020] text-white"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="text-white text-sm w-6 text-center">{qty}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); onQuantityChange(composed, qty + 1) }}
                        className="px-2 py-1 rounded bg-[#800020] text-white"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); onQuantityChange(composed, 1) }}
                      className="px-3 py-1 rounded bg-[#800020] text-white text-sm"
                    >
                      Add
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// Render a variant row controller
function VariantControls({ parent, variant, quantity, onChange }) {
  const composed = {
    ...parent,
    id: `${parent.menuID}:${variant.name}`,
    name: `${parent.name} - ${variant.name}`,
    price: variant.price,
  }
  return (
    <div className="flex items-center justify-between mt-2">
      <span className="text-xs text-gray-200">{variant.name} · ₹{variant.price.toFixed(2)}</span>
      {quantity > 0 ? (
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); onChange(composed, Math.max(0, quantity - 1)) }} className="p-1 rounded bg-[#800020] text-white">
            <Minus className="w-3 h-3" />
          </button>
          <span className="text-sm text-white w-5 text-center">{quantity}</span>
          <button onClick={(e) => { e.stopPropagation(); onChange(composed, quantity + 1) }} className="p-1 rounded bg-[#800020] text-white">
            <Plus className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button onClick={(e) => { e.stopPropagation(); onChange(composed, 1) }} className="px-2 py-1 rounded bg-[#800020] text-white text-xs">Add</button>
      )}
    </div>
  )
}

function MobileMenuItem({ item, quantity, onQuantityChange, cart }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const lowestPrice = getLowestAvailablePrice(item)
  const variantTotalQty = getVariantTotalQty(cart, item)

  return (
    <div className="py-0.5 block md:hidden cursor-pointer">
      <div 
        onClick={() => setIsExpanded(!isExpanded)} 
        className="relative flex items-center gap-2 bg-[#510400] rounded-lg p-2 border border-[#800020]"
      >
        {item.isSpecialItem && (
          <span className="absolute top-1 right-1 bg-[#800020] text-white text-[10px] px-2 py-0.5 rounded">Special</span>
        )}
        <img 
          src={item.image} 
          alt={item.name} 
          className="w-1/5 h-16 object-cover rounded-md flex-shrink-0" 
        />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-white leading-tight">{item.name}</h3>
          {(!item.variants?.length) ? (
            <p className="text-xs text-[#FFFAFA] font-bold">₹{(item.price || 0).toFixed(2)}</p>
          ) : (
            <p className="text-xs text-[#FFFAFA] font-bold">From ₹{(lowestPrice || 0).toFixed(2)}</p>
          )}
        </div>
        {!item.variants?.length ? (
          quantity > 0 ? (
            <div className="flex items-center gap-1">
              <button 
                onClick={(e) => { e.stopPropagation(); onQuantityChange(item, Math.max(0, quantity - 1)) }} 
                className="p-1 rounded bg-[#800020] text-white"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="text-sm text-white w-5 text-center">{quantity}</span>
              <button 
                onClick={(e) => { e.stopPropagation(); onQuantityChange(item, quantity + 1) }} 
                className="p-1 rounded bg-[#800020] text-white"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button 
              onClick={(e) => { e.stopPropagation(); onQuantityChange(item, 1) }} 
              className="p-1 rounded-full bg-[#800020] text-white flex items-center justify-center"
            >
              <Plus className="w-4 h-4" />
            </button>
          )
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); setIsSheetOpen(true) }}
            className="px-2 py-1 rounded-full bg-[#800020] text-white text-xs"
          >
            Add
            {variantTotalQty > 0 && (
              <span className="ml-1 inline-flex items-center justify-center min-w-4 px-1 h-4 text-[10px] bg-white text-[#800020] rounded-full">{variantTotalQty}</span>
            )}
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="mt-1 ml-1">
          <p className="text-xs text-gray-200">{item.description}</p>
          {Array.isArray(item.variants) && item.variants.length > 0 && (
            <div className="mt-2 space-y-1">
              {item.variants.filter(v => v.isAvailable !== false).map(v => (
                <VariantControls
                  key={`${item.menuID}-${v.name}`}
                  parent={item}
                  variant={v}
                  quantity={cart[`${item.menuID}:${v.name}`] || 0}
                  onChange={onQuantityChange}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bottom sheet for selecting a variant (mobile) */}
      <VariantBottomSheet
        open={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        item={item}
        cart={cart}
        onQuantityChange={(composed, q) => {
          onQuantityChange(composed, q)
          // Keep the sheet open so users can add multiple; close when first add? Up to UX. We'll keep open.
        }}
      />
    </div>
  )
}

function DesktopMenuItem({ item, quantity, onQuantityChange, cart }) {
  return (
    <div className="py-0.5 hidden md:flex flex-col rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border bg-[#510400] border-[#800020] cursor-pointer relative">
      {item.isSpecialItem && (
        <span className="absolute top-2 right-2 bg-[#800020] text-white text-xs px-2 py-1 rounded">Special</span>
      )}
      <img src={item.image} alt={item.name} className="w-full h-48 object-cover" />
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-lg mb-2 text-[#FFFAFA]">{item.name}</h3>
        <p className="text-gray-200 text-sm mb-4 flex-1">{item.description}</p>
        <div className="flex items-center justify-between">
          {(!item.variants?.length) ? (
            <span className="font-bold text-[#FFFAFA]">₹{(item.price || 0).toFixed(2)}</span>
          ) : (
            <span className="font-bold text-[#FFFAFA]">From ₹{Math.min(...item.variants.filter(v=>v.isAvailable!==false).map(v=>v.price)).toFixed(2)}</span>
          )}
          {!item.variants?.length && (quantity > 0 ? (
            <div className="flex items-center gap-1">
              <button onClick={() => onQuantityChange(item, Math.max(0, quantity - 1))} className="p-1 rounded bg-[#800020] text-white">
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-white font-bold">{quantity}</span>
              <button onClick={() => onQuantityChange(item, quantity + 1)} className="p-1 rounded bg-[#800020] text-white">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button onClick={() => onQuantityChange(item, 1)} className="p-2 rounded-full bg-[#800020] text-white flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </button>
          ))}
        </div>
        {Array.isArray(item.variants) && item.variants.length > 0 && (
          <div className="mt-3 space-y-2">
            {item.variants.filter(v => v.isAvailable !== false).map(v => (
              <VariantControls
                key={`${item.menuID}-${v.name}`}
                parent={item}
                variant={v}
                quantity={cart[`${item.menuID}:${v.name}`] || 0}
                onChange={onQuantityChange}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function MenuItems({ activeCategory, onCategoryChange, cart, onQuantityChange, items = [], categories = ["All"], vegOnly = false, onToggleVeg }) {
  const filteredItems = activeCategory === "All" 
    ? items 
    : items.filter(item => item.category === activeCategory)

  return (
    <div className="px-2 py-4">
      {/* Categories */}
      <div className="flex items-center justify-between pb-2 mb-3">
        <div className="flex gap-2 overflow-x-auto">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
              className={`px-2 py-1 rounded-full transition text-xs md:text-sm md:px-3 md:py-2 font-semibold ${
              activeCategory === cat ? "bg-[#800020] text-white" : "border border-[#800020] text-gray-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <button
          onClick={onToggleVeg}
          className={`ml-3 px-3 py-1 rounded-full text-xs md:text-sm border ${vegOnly ? 'bg-[#800020] text-white border-[#800020]' : 'border-[#800020] text-gray-200'}`}
        >
          Veg only
        </button>
      </div>

      {/* Mobile Items */}
      <div className="space-y-1">
        {filteredItems.map((item, index) => (
          <div key={item.id || item.menuID || index}>
            <MobileMenuItem
              item={item}
              quantity={cart[item.id] || 0}
              onQuantityChange={onQuantityChange}
              cart={cart}
            />

            {activeCategory === "All" && index === Math.floor(filteredItems.length / 2) && (
              <div className="w-full my-4">
                <img
                  src="/Advertisment.jpg"
                  alt="Advertisement"
                  className="w-full h-15 md:h-40 object-cover rounded-lg shadow-lg"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop Items */}
      <div className="hidden md:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredItems.map((item, index) => {
          if (
            activeCategory === "All" &&
            index === Math.floor(filteredItems.length / 2)
          ) {
            return (
              <React.Fragment key={`ad-${index}`}>
                <DesktopMenuItem
                  item={item}
                  quantity={cart[item.id] || 0}
                  onQuantityChange={onQuantityChange}
                  cart={cart}
                />
              </React.Fragment>
            )
          }

          return (
            <DesktopMenuItem
              key={item.id || item.menuID || index}
              item={item}
              quantity={cart[item.id] || 0}
              onQuantityChange={onQuantityChange}
              cart={cart}
            />
          )
        })}
      </div>
    </div>
  )
}
