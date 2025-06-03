// webapp/src/context/CartContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';

const CartContext = createContext(null);

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    // Если контекст не найден, бросаем ошибку
    throw new Error('useCart должен вызываться внутри CartProvider');
  }
  return ctx;
}

export function CartProvider({ children }) {
  // Инициализируем cartItems из localStorage (или пустой массив)
  const [cartItems, setCartItems] = useState(() => {
    try {
      const raw = localStorage.getItem('dkshop_cart');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Ошибка чтения корзины из localStorage:', e);
      return [];
    }
  });

  // Сохраняем cartItems в localStorage при каждом изменении
  useEffect(() => {
    try {
      localStorage.setItem('dkshop_cart', JSON.stringify(cartItems));
    } catch (e) {
      console.error('Ошибка сохранения корзины в localStorage:', e);
    }
  }, [cartItems]);

  // Вспомогательный хелпер для поиска индекса по id
  const findIndex = (id) => cartItems.findIndex((item) => item.id === id);

  // Добавляем товар в корзину (или увеличиваем quantity на 1)
  const addToCart = (product) => {
    setCartItems((prev) => {
      const idx = prev.findIndex((it) => it.id === product.id);
      if (idx === -1) {
        // Если товара ещё нет — добавляем новый
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
        // Клонируем массив и увеличиваем quantity ровно на 1
        const updated = [...prev];
        updated[idx].quantity += 1;
        return updated;
      }
    });
  };

  // Уменьшаем количество на 1; если quantity станет 0 — удаляем позицию
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

  // Удаляем товар полностью
  const removeFromCart = (productId) => {
    setCartItems((prev) => prev.filter((it) => it.id !== productId));
  };

  // Устанавливаем точное значение quantity (если ввели вручную)
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

  // Полностью очищаем корзину
  const clearCart = () => {
    setCartItems([]);
  };

  // Общее число единиц (для бейджа)
  const totalCount = cartItems.reduce((sum, it) => sum + it.quantity, 0);

  // Итоговая сумма (totalPrice всегда число, хотя массив может быть пуст)
  const totalPrice = cartItems.reduce(
    (sum, it) => sum + it.price * it.quantity,
    0
  );

  const value = {
    cartItems,
    addToCart,
    removeOneFromCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    totalCount,
    totalPrice,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
