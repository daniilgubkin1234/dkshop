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

  // --- Внутренний флаг, чтобы переход по deep-link был только 1 раз ---
  const hasHandledDeepLink = useRef(false);

  // Telegram WebApp initData → /login → сохраняем в localStorage и React-стейт
  useEffect(() => {
    const initData = window.Telegram?.WebApp?.initData;
    console.log("[App.jsx] initData =", initData);
    if (!initData) {
      console.warn("[App.jsx] Нет initData для Telegram WebApp");
      return;
    }

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
        console.log("[App.jsx] Пользователь успешно залогинен:", data.user);
      })
      .catch(err => console.error('[App.jsx] Login error:', err));
  }, []);

  // --- Deep-link переход только при первом запуске MiniApp ---
  useEffect(() => {
    if (hasHandledDeepLink.current) return;

    const tg = window.Telegram?.WebApp;
    const url = new URL(window.location.href);

    // 1. Проверяем initDataUnsafe
    const startParam = tg?.initDataUnsafe?.start_param;
    // 2. Проверяем строку запроса (?startapp=product_... или product-...)
    const startapp = url.searchParams.get('startapp');
    // 3. Проверяем оба параметра и логируем оба
    console.log("[App.jsx] [DEEP LINK] start_param:", startParam, " | startapp:", startapp, " | href:", window.location.href);

    // Универсальная функция для извлечения id товара из параметра
    function extractProductId(param) {
      if (!param) return null;
      if (param.startsWith('product_')) {
        return param.replace('product_', '');
      }
      if (param.startsWith('product-')) {
        return param.replace('product-', '');
      }
      return null;
    }

    // Открываем карточку по deep-link только один раз
    const productId =
      extractProductId(startParam) ||
      extractProductId(startapp);

    if (productId) {
      console.log("[App.jsx] [DEEP LINK] NAVIGATE BY param:", productId);
      navigate(`/product/${productId}`, { replace: true });
      hasHandledDeepLink.current = true;
    }
    // Больше никогда не навигируем по deep-link до перезагрузки страницы
  }, [navigate]);

  // Автоматически обновлять данные пользователя при любом переходе по страницам
  useEffect(() => {
    if (user?.id) {
      console.log("[App.jsx] Обновляю пользователя, id:", user.id);
      fetchUserById(user.id)
        .then(fresh => {
          if (fresh) {
            localStorage.setItem('dkshop_user', JSON.stringify(fresh));
            setUser(fresh);
            console.log("[App.jsx] Данные пользователя обновлены:", fresh);
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
