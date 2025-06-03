// webapp/src/App.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import ProductList from './miniapps/ProductList.jsx';
import Product from './miniapps/Product.jsx';
import Cart from './miniapps/Cart.jsx';
export default function App() {
  return (
    <>
      {/* Шапка приложения */}
      <Header />

      {/* Основной контент (страницы переключаются через маршруты) */}
      <main style={{ padding: '20px 16px', fontFamily: 'sans-serif', background: '#121212' }}>
        <Routes>
          {/* Главная страница */}
          <Route path="/" element={<ProductList />} />

          {/* Страница «Каталог» */}
          <Route path="/catalog" element={<ProductList />} />

          {/* Страница карточки товара */}
          <Route path="/product/:id" element={<Product />} />
          <Route path="/cart" element={<Cart />} />
          {/* Все остальные пути перенаправляем на главную */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Футер: полезные ссылки и телефон */}
      <Footer />    {/* ← добавили компонент Footer */}
    </>
  );
}
