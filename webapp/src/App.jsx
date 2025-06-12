// webapp/src/App.jsx
import React, { useRef } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import Header          from './components/Header.jsx';
import Footer          from './components/Footer.jsx';
import ProductList     from './miniapps/ProductList.jsx';
import Product         from './miniapps/Product.jsx';
import Cart            from './miniapps/Cart.jsx';
import MyOrders        from './miniapps/MyOrders.jsx';

import AdminLogin      from './admin/AdminLogin.jsx';
import AdminOrders     from './admin/AdminOrders.jsx';
import AdminFAQ        from './admin/AdminFAQ.jsx';
import AdminProduct    from './admin/AdminProduct.jsx';
import AdminFooter     from './admin/AdminFooter.jsx';
import AdminModelCards from './admin/AdminModelCards.jsx';

export default function App() {
  const handleSearch = useRef(null);

  return (
    <>
      {/* --- Header с безопасной проверкой функции --- */}
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

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <Footer />
    </>
  );
}
