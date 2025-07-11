import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import { API_URL } from '../api.js';

const CartContext = createContext(null);
export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart должен вызываться внутри CartProvider');
  return ctx;
};

export function CartProvider({ children }) {
  // 0) Базовые данные
  const storedUser = JSON.parse(localStorage.getItem('dkshop_user') || 'null');
  const userId     = storedUser?.id;
  const isGuest    = !userId;

  // 1) Локальная инициализация из localStorage
  const [cartItems, setCartItems] = useState(() => {
    try {
      const raw = localStorage.getItem('dkshop_cart');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // 2) Загрузка корзины с сервера (если userId) – once on mount
  const fetchedFromServer = useRef(false);
  useEffect(() => {
    if (isGuest || fetchedFromServer.current) return;

    (async () => {
      try {
        const data = await fetch(
          `${API_URL}/cart?user_id=${userId}`
        ).then(r => (r.ok ? r.json() : []));
        if (Array.isArray(data) && data.length) setCartItems(data);
      } catch {/* silent */}
      fetchedFromServer.current = true;
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // 3) Синхронизация в localStorage при любом изменении
  useEffect(() => {
    try {
      localStorage.setItem('dkshop_cart', JSON.stringify(cartItems));
    } catch {/* ignore */}
  }, [cartItems]);

  // 4) Helpers для запросов к API
  const postDelta = useCallback((productId, delta) => {
    if (isGuest) return;
    fetch(`${API_URL}/cart`, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({ user_id: userId, product_id: productId, delta })
    }).catch(() => {/* ignore network error */});
  }, [isGuest, userId]);

  const clearServerCart = useCallback(() => {
    if (isGuest) return;
    fetch(`${API_URL}/cart/clear?user_id=${userId}`, { method: 'DELETE' })
      .catch(() => {/* ignore */});
  }, [isGuest, userId]);

  // 5) Операции с корзиной
  const addToCart = useCallback(product => {
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
  }, [postDelta]);

  const removeOneFromCart = useCallback(productId => {
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
  }, [postDelta]);

  const removeFromCart = useCallback(productId => {
    setCartItems(prev => {
      const qty = prev.find(it => it.id === productId)?.quantity || 0;
      postDelta(productId, -qty);
      return prev.filter(it => it.id !== productId);
    });
  }, [postDelta]);

  const updateQuantity = useCallback((productId, newQty) => {
    setCartItems(prev => {
      const idx = prev.findIndex(it => it.id === productId);
      if (idx === -1) return prev;

      const oldQty  = prev[idx].quantity;
      const updated = [...prev];

      if (newQty <= 0) {
        postDelta(productId, -oldQty);
        updated.splice(idx, 1);
        return updated;
      }

      updated[idx].quantity = newQty;
      postDelta(productId, newQty - oldQty);
      return updated;
    });
  }, [postDelta]);

  const clearCart = useCallback(() => {
    setCartItems([]);
    clearServerCart();
  }, [clearServerCart]);

  // 6) Агрегаты
  const totalCount = cartItems.reduce((s, it) => s + it.quantity, 0);
  const totalPrice = cartItems.reduce((s, it) => s + it.price * it.quantity, 0);

  // 7) Релоад из сервера (СТАБИЛЬНАЯ!)
  const reloadFromServer = useCallback(async () => {
    if (!userId) return;
    try {
      const fresh = await fetch(`${API_URL}/cart?user_id=${userId}`)
                          .then(r => r.ok ? r.json() : []);
      setCartItems(fresh);
    } catch {/* ignore */}
  }, [userId]);

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
