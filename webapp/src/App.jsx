// webapp/src/App.jsx
import React, { useRef, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

import Header          from './components/Header.jsx';
import Footer          from './components/Footer.jsx';
import ProductList     from './miniapps/ProductList.jsx';
import Product         from './miniapps/Product.jsx';
import Cart            from './miniapps/Cart.jsx';
import MyOrders        from './miniapps/MyOrders.jsx';
import Profile         from './miniapps/Profile.jsx';


import AdminLogin      from './admin/AdminLogin.jsx';
import AdminOrders     from './admin/AdminOrders.jsx';
import AdminFAQ        from './admin/AdminFAQ.jsx';
import AdminProduct    from './admin/AdminProduct.jsx';
import AdminFooter     from './admin/AdminFooter.jsx';
import AdminModelCards from './admin/AdminModelCards.jsx';

// 1) Импорт API_URL для обращения к бэку
import { API_URL } from './api.js';

export default function App() {
  const handleSearch = useRef(null);
  const location = useLocation();

  // 2) Инициализация Telegram-авторизации через initData
  useEffect(() => {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) return;

    fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData })
    })
      .then(res => {
        if (!res.ok) throw new Error(`Auth failed: ${res.status}`);
        return res.json();
      })
      .then(data => {
        // Сохраняем проверенные данные пользователя
        localStorage.setItem('dkshop_user', JSON.stringify(data.user));
      })
      .catch(err => console.error('Login error:', err));
  }, []);

  /* Сбрасываем предыдущий handler поиска при смене маршрута */
  useEffect(() => {
    handleSearch.current = null;
  }, [location.pathname]);

  return (
    <>
      <Header
        onSearch={(q) => {
          if (typeof handleSearch.current === 'function') {
            handleSearch.current(q);
          }
        }}
      />

      <main style={{ padding: '20px 16px', background: '#121212' }}>
        <Routes>
          <Route
            path="/"
            element={<ProductList onSearchChange={(fn) => (handleSearch.current = fn)} />}
          />

          {/* mini-apps */}
          <Route path="/product/:id" element={<Product />} />
          <Route path="/cart"        element={<Cart />} />
          <Route path="/my-orders"   element={<MyOrders />} />

          {/* admin */}
          <Route path="/admin/login"    element={<AdminLogin />} />
          <Route path="/admin/orders"   element={<AdminOrders />} />
          <Route path="/admin/faq"      element={<AdminFAQ />} />
          <Route path="/admin/products" element={<AdminProduct />} />
          <Route path="/admin/footer"   element={<AdminFooter />} />
          <Route path="/admin/model_cards" element={<AdminModelCards />} />

          <Route path="/profile" element={<Profile />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <Footer />
    </>
  );
}
