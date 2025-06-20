/**
 * webapp/src/context/CartContext.jsx
 *
 * 1. Читает корзину из localStorage, а если пользователь авторизован –
 *    догружает актуальные позиции с бэкенда (`GET /cart?user_id=`).
 * 2. Любое изменение корзины мгновенно отражается в state и localStorage
 *    + параллельно шлёт запрос на сервер, чтобы синхронизировать БД.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { API_URL } from '../api.js';

const CartContext = createContext(null);
export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart должен вызываться внутри CartProvider');
  return ctx;
};

export function CartProvider({ children }) {
  /* ------------------------------------------------------------
     0) базовые данные
  ------------------------------------------------------------ */
  const storedUser = JSON.parse(localStorage.getItem('dkshop_user') || 'null');
  const userId     = storedUser?.id;          // undefined → гость
  const isGuest    = !userId;

  /* ------------------------------------------------------------
     1) локальная инициализация из localStorage (мгновенно)
  ------------------------------------------------------------ */
  const [cartItems, setCartItems] = useState(() => {
    try {
      const raw = localStorage.getItem('dkshop_cart');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  /* ------------------------------------------------------------
     2) загрузка корзины с сервера (если userId) – once on mount
  ------------------------------------------------------------ */
  const fetchedFromServer = useRef(false);
  useEffect(() => {
    if (isGuest || fetchedFromServer.current) return;

    (async () => {
      try {
        const data = await fetch(
          `${API_URL}/cart?user_id=${userId}`
        ).then(r => (r.ok ? r.json() : []));
        // Если сервер вернул что-то, подменяем локальный state
        if (Array.isArray(data) && data.length) setCartItems(data);
      } catch {/* silent */}
      fetchedFromServer.current = true;
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  /* ------------------------------------------------------------
     3) синхронизация в localStorage при любом изменении
  ------------------------------------------------------------ */
  useEffect(() => {
    try {
      localStorage.setItem('dkshop_cart', JSON.stringify(cartItems));
    } catch {/* ignore */}
  }, [cartItems]);

  /* ------------------------------------------------------------
     4) helpers для запросов к API
  ------------------------------------------------------------ */
  const postDelta = (productId, delta) => {
    if (isGuest) return;
    fetch(`${API_URL}/cart`, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({ user_id: userId, product_id: productId, delta })
    }).catch(() => {/* ignore network error */});
  };

  const clearServerCart = () => {
    if (isGuest) return;
    fetch(`${API_URL}/cart/clear?user_id=${userId}`, { method: 'DELETE' })
      .catch(() => {/* ignore */});
  };

  /* ------------------------------------------------------------
     5) операции с корзиной
  ------------------------------------------------------------ */
  const addToCart = product => {
    setCartItems(prev => {
      const idx = prev.findIndex(it => it.id === product.id);
      let updated;
      if (idx === -1) {
        updated = [...prev, {
          id : product.id,
          name: product.name,
          price: product.price,
          image: product.images?.[0] || '',
          quantity: 1,
        }];
      } else {
        updated = [...prev];
        updated[idx].quantity += 1;
      }
      return updated;
    });
    postDelta(product.id, +1);
  };

  const removeOneFromCart = productId => {
    setCartItems(prev => {
      const idx = prev.findIndex(it => it.id === productId);
      if (idx === -1) return prev;
      const updated = [...prev];
      if (updated[idx].quantity > 1) {
        updated[idx].quantity -= 1;
      } else {
        updated.splice(idx, 1);
      }
      return updated;
    });
    postDelta(productId, -1);
  };

  const removeFromCart = productId => {
      setCartItems(prev => {
          const qty = prev.find(it => it.id === productId)?.quantity || 0;
          postDelta(productId, -qty);
          return prev.filter(it => it.id !== productId);
        });
  };

  const updateQuantity = (productId, newQty) => {
    setCartItems(prev => {
      const idx = prev.findIndex(it => it.id === productId);
      if (idx === -1) return prev;
  
      const oldQty  = prev[idx].quantity;
      const updated = [...prev];
  
      /* #1: если newQty <= 0 — нужно удалить позицию                */
      if (newQty <= 0) {
        postDelta(productId, -oldQty);   // отправляем «-oldQty»
        updated.splice(idx, 1);          // убираем из списка (#1 fix)
        return updated;
      }
  
      /* #2: normal case — просто меняем qty и отправляем δ          */
      updated[idx].quantity = newQty;
      postDelta(productId, newQty - oldQty);   // (#2 fix)
      return updated;
    });
  };

  const clearCart = () => {
    setCartItems([]);
    clearServerCart();
  };

  /* ------------------------------------------------------------
     6) агрегаты
  ------------------------------------------------------------ */
  const totalCount = cartItems.reduce((s, it) => s + it.quantity, 0);
  const totalPrice = cartItems.reduce((s, it) => s + it.price * it.quantity, 0);
  const reloadFromServer = async () => {
    if (!userId) return;
    try {
      const fresh = await fetch(`${API_URL}/cart?user_id=${userId}`)
                          .then(r => r.ok ? r.json() : []);
      setCartItems(fresh);
    } catch {/* ignore */}
  };
  /* ------------------------------------------------------------
     7) provider
  ------------------------------------------------------------ */
  return (
    <CartContext.Provider value={{
      cartItems,
      addToCart,
      removeOneFromCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      totalCount,
      totalPrice,
      reloadFromServer, 
    }}>
      {children}
    </CartContext.Provider>
  );
}
