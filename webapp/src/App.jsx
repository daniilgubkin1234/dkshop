import React, { useEffect, useState, useRef } from 'react';
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

console.log("App запускается. API_URL =", API_URL);

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('dkshop_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [search, setSearch] = useState("");
  const location = useLocation();
  const navigate = useNavigate();

  // Флаг, чтобы переход по deep-link был только 1 раз
  const hasHandledDeepLink = useRef(false);
  // Ref для хранения productId, если deep-link обнаружен ДО логина
  const pendingProductId = useRef(null);

  // --- Сначала ищем deeplink (до логина) ---
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    const url = new URL(window.location.href);

    const startParam = tg?.initDataUnsafe?.start_param;
    const startapp = url.searchParams.get('startapp');

    function extractProductId(param) {
      if (!param) return null;
      if (param.startsWith('product_')) return param.replace('product_', '');
      if (param.startsWith('product-')) return param.replace('product-', '');
      return null;
    }

    const productId =
      extractProductId(startParam) ||
      extractProductId(startapp);

    if (productId) {
      pendingProductId.current = productId;
      // Не делаем navigate здесь!
      // Навигируем после логина
    }
  }, []);

  // --- Логин пользователя ---
  useEffect(() => {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) return;

    fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData })
    })
      .then(res => {
        if (!res.ok) throw new Error(`[App.jsx] Auth failed: ${res.status}`);
        return res.json();
      })
      .then(data => {
        localStorage.setItem('dkshop_user', JSON.stringify(data.user));
        setUser(data.user);

        // После логина: если был deep-link, делаем navigate!
        if (pendingProductId.current && !hasHandledDeepLink.current) {
          navigate(`/product/${pendingProductId.current}`, { replace: true });
          hasHandledDeepLink.current = true;
        }
      })
      .catch(err => console.error('[App.jsx] Login error:', err));
  }, [navigate]);

  // --- Если пользователь уже залогинен и мы зашли по deep-link (редкий кейс) ---
  useEffect(() => {
    if (
      user &&
      pendingProductId.current &&
      !hasHandledDeepLink.current
    ) {
      navigate(`/product/${pendingProductId.current}`, { replace: true });
      hasHandledDeepLink.current = true;
    }
  }, [user, navigate]);

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
        .catch((e) => console.warn("[App.jsx] Ошибка при обновлении пользователя:", e));
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
