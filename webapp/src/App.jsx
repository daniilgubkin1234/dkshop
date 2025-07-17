import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';

import Header                from './components/Header.jsx';
import Footer                from './components/Footer.jsx';
import ProductList           from './miniapps/ProductList.jsx';
import Product               from './miniapps/Product.jsx';
import Cart                  from './miniapps/Cart.jsx';
import Profile               from './miniapps/Profile.jsx';
import WholesaleProductList  from './miniapps/WholesaleProductList.jsx';

import AdminLogin      from './admin/AdminLogin.jsx';
import AdminOrders     from './admin/AdminOrders.jsx';
import AdminFAQ        from './admin/AdminFAQ.jsx';
import AdminProduct    from './admin/AdminProduct.jsx';
import AdminFooter     from './admin/AdminFooter.jsx';
import AdminModelCards from './admin/AdminModelCards.jsx';
import AdminInfo       from './admin/AdminInfo.jsx';
import Users           from './admin/Users.jsx';
import WholesalesClient from './admin/WholesalesClient.jsx';

import { API_URL, fetchUserById } from './api.js';

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('dkshop_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [search, setSearch] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  // Telegram WebApp initData → /login → сохраняем в localStorage и React-стейт
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
        localStorage.setItem('dkshop_user', JSON.stringify(data.user));
        setUser(data.user);
      })
      .catch(err => console.error('Login error:', err));
  }, []);
  useEffect(() => {
    // Telegram WebApp deep-link
    const tg = window.Telegram?.WebApp;
    const startParam = tg?.initDataUnsafe?.start_param;
    if (startParam && startParam.startsWith('product_')) {
      const id = startParam.replace('product_', '');
      navigate(`/product/${id}`);
    } else {
      // резерв: если пришёл через ?startapp=product_123
      const url = new URL(window.location.href);
      const startapp = url.searchParams.get('startapp');
      if (startapp && startapp.startsWith('product_')) {
        const id = startapp.replace('product_', '');
        navigate(`/product/${id}`);
      }
    }
  }, [navigate]);
  // Автоматически обновлять данные пользователя при любом переходе по страницам
  useEffect(() => {
    if (user?.id) {
      fetchUserById(user.id)
        .then(fresh => {
          if (fresh) {
            localStorage.setItem('dkshop_user', JSON.stringify(fresh));
            setUser(fresh);
          }
        })
        .catch(() => {});
    }
    // eslint-disable-next-line
  }, [location.pathname]);

  return (
    <>
      <Header user={user} onSearch={setSearch} />

      <main style={{ padding: '20px 16px', background: '#121212' }}>
        <Routes>
          <Route
            path="/"
            element={
              user?.is_wholesale
                ? <Navigate to="/wholesale" replace />
                : <ProductList filterQuery={search} />
            }
          />
          <Route path="/product/:id" element={<Product />} />
          <Route path="/cart"        element={<Cart />} />
          <Route path="/my-orders"   element={<Navigate to="/profile" replace />} />
          <Route path="/profile"     element={<Profile />} />
          <Route
            path="/wholesale"
            element={
              user?.is_wholesale
                ? <WholesaleProductList user={user} filterQuery={search} />
                : <Navigate to="/" replace />
            }
          />
          {/* admin */}
          <Route path="/admin/login"       element={<AdminLogin />} />
          <Route path="/admin/orders"      element={<AdminOrders />} />
          <Route path="/admin/faq"         element={<AdminFAQ />} />
          <Route path="/admin/products"    element={<AdminProduct />} />
          <Route path="/admin/footer"      element={<AdminFooter />} />
          <Route path="/admin/model_cards" element={<AdminModelCards />} />
          <Route path="/admin/info"        element={<AdminInfo />} />
          <Route path="/admin/users"       element={<Users />} />
          <Route path="/admin/wholesale_clients" element={<WholesalesClient />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <Footer />
    </>
  );
}
