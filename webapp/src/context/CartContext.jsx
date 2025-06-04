/**
 * webapp/src/context/CartContext.jsx
 *
 * Хранит состояние корзины в React Context + локалсторадж.
 * Экспортирует:
 *   - useCart() – хук для получения всех методов/свойств корзины
 *   - CartProvider – провайдер, который нужно обернуть вокруг всего <App>
 */

import React, { createContext, useContext, useEffect, useState } from 'react';

const CartContext = createContext(null);

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart должен вызываться внутри CartProvider');
  }
  return ctx;
}

export function CartProvider({ children }) {
  // Инициализируем cartItems из localStorage
  const [cartItems, setCartItems] = useState(() => {
    try {
      const raw = localStorage.getItem('dkshop_cart');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Сохраняем cartItems в localStorage
  useEffect(() => {
    try {
      localStorage.setItem('dkshop_cart', JSON.stringify(cartItems));
    } catch {
      /* игнорируем */
    }
  }, [cartItems]);

  const findIndex = (id) => cartItems.findIndex((item) => item.id === id);

  // Добавляет товар в корзину (или увеличивает quantity на 1)
  const addToCart = (product) => {
    setCartItems((prev) => {
      const idx = prev.findIndex((it) => it.id === product.id);
      if (idx === -1) {
        return [
          ...prev,
          {
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.images?.[0] || '',
            quantity: 1,
          },
        ];
      } else {
        const updated = [...prev];
        updated[idx].quantity += 1;
        return updated;
      }
    });
  };

  // Уменьшает quantity на 1; если quantity = 0, убирает товар
  const removeOneFromCart = (productId) => {
    setCartItems((prev) => {
      const idx = prev.findIndex((it) => it.id === productId);
      if (idx === -1) return prev;
      const updated = [...prev];
      if (updated[idx].quantity > 1) {
        updated[idx].quantity -= 1;
      } else {
        updated.splice(idx, 1);
      }
      return updated;
    });
  };

  // Удаляет весь товар (вне зависимости от quantity)
  const removeFromCart = (productId) => {
    setCartItems((prev) => prev.filter((it) => it.id !== productId));
  };

  // Обновить точное количество (при ручном вводе)
  const updateQuantity = (productId, newQuantity) => {
    setCartItems((prev) => {
      const idx = findIndex(productId);
      if (idx === -1) return prev;
      const updated = [...prev];
      if (newQuantity <= 0) {
        updated.splice(idx, 1);
      } else {
        updated[idx].quantity = newQuantity;
      }
      return updated;
    });
  };

  // Полностью очистить корзину
  const clearCart = () => {
    setCartItems([]);
  };

  // Общее число единиц (для бейджа, если нужно)
  const totalCount = cartItems.reduce((sum, it) => sum + it.quantity, 0);

  // Итоговая сумма (сумма цен * quantity)
  const totalPrice = cartItems.reduce((sum, it) => sum + it.price * it.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeOneFromCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalCount,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
