import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import Home from './Home.jsx';
import ProductList from './miniapps/ProductList.jsx';
import Product from './miniapps/Product.jsx';

export default function App() {
  return (
    <Routes>
      {/* Главная страница */}
      <Route path="/" element={<Home />} />

      {/* Mini App: каталог товаров */}
      <Route path="/mini/product-list" element={<ProductList />} />

      {/* Mini App: карточка товара */}
      <Route path="/mini/product/:id" element={<Product />} />

      {/* Если ни один маршрут не подошёл, редирект на корень */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
