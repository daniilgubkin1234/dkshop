// webapp/src/App.jsx
import React, { useRef } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import ProductList from './miniapps/ProductList.jsx';
import Product from './miniapps/Product.jsx';
import Cart from './miniapps/Cart.jsx';
import AdminLogin from './admin/AdminLogin.jsx';
import AdminOrders from './admin/AdminOrders.jsx';
import MyOrders from './miniapps/MyOrders.jsx';

export default function App() {
  const handleSearch = useRef(null); // ← стабильная ссылка

  return (
    <>
      <Header onSearch={(q) => handleSearch.current && handleSearch.current(q)} />

      <main style={{ padding: '20px 16px', fontFamily: 'sans-serif', background: '#121212' }}>
        <Routes>
          <Route
            path="/"
            element={<ProductList onSearchChange={(fn) => (handleSearch.current = fn)} />}
          />
          <Route path="/product/:id" element={<Product />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/orders" element={<AdminOrders />} />
          <Route path="/my-orders" element={<MyOrders />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <Footer />
    </>
  );
}
