// webapp/src/App.jsx
import React, { useRef, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

/* ── context / guards ─────────────────────────────────────────────── */
import AuthProvider  from "./context/AuthContext.jsx";
import PrivateRoute  from "./PrivateRoute.jsx";

/* ── layout ───────────────────────────────────────────────────────── */
import Header  from "./components/Header.jsx";
import Footer  from "./components/Footer.jsx";

/* ── клиентские mini-apps ─────────────────────────────────────────── */
import ProductList from "./miniapps/ProductList.jsx";
import Product     from "./miniapps/Product.jsx";
import Cart        from "./miniapps/Cart.jsx";
import MyOrders    from "./miniapps/MyOrders.jsx";

/* ── админка ──────────────────────────────────────────────────────── */
import AdminLogin      from "./admin/AdminLogin.jsx";
import AdminOrders     from "./admin/AdminOrders.jsx";
import AdminFAQ        from "./admin/AdminFAQ.jsx";
import AdminProduct    from "./admin/AdminProduct.jsx";
import AdminFooter     from "./admin/AdminFooter.jsx";
import AdminModelCards from "./admin/AdminModelCards.jsx";

export default function App() {
  /* ---------- поиск в каталоге ---------- */
  const handleSearch = useRef(null);
  const location = useLocation();
  useEffect(() => { handleSearch.current = null; }, [location.pathname]);

  return (
    <AuthProvider>
      {/* Header */}
      <Header
        onSearch={(q) => {
          if (typeof handleSearch.current === "function") {
            handleSearch.current(q);
          }
        }}
      />

      {/* Основная часть */}
      <main style={{ padding: "20px 16px", background: "#121212" }}>
        <Routes>
          {/* каталог / карточка товара / корзина */}
          <Route
            path="/"
            element={<ProductList onSearchChange={(fn) => (handleSearch.current = fn)} />}
          />
          <Route path="/product/:id" element={<Product />} />
          <Route path="/cart"        element={<Cart />} />

          
          <Route path="/my-orders" element={
            <PrivateRoute><MyOrders /></PrivateRoute>
          } />

          {/* админ-панель */}
          <Route path="/admin/login"      element={<AdminLogin />} />
          <Route path="/admin/orders"     element={<AdminOrders />} />
          <Route path="/admin/faq"        element={<AdminFAQ />} />
          <Route path="/admin/products"   element={<AdminProduct />} />
          <Route path="/admin/footer"     element={<AdminFooter />} />
          <Route path="/admin/model_cards" element={<AdminModelCards />} />

          {/* fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <Footer />
    </AuthProvider>
  );
}
