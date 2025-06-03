// webapp/src/miniapps/ProductList.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchProducts } from '../api.js';
import { useCart } from '../context/CartContext.jsx';  // ← контекст корзины
import './ProductList.css';

export default function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Функция из контекста корзины
  const { addToCart } = useCart();

  useEffect(() => {
    // Если внутри Telegram WebApp, расширим окно
    if (window.Telegram?.WebApp?.expand) {
      window.Telegram.WebApp.expand();
    }

    async function load() {
      try {
        setLoading(true);
        const list = await fetchProducts();
        setProducts(list);
      } catch (e) {
        console.error(e);
        setError('Не удалось загрузить список товаров');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleClick = (id) => {
    navigate(`/product/${id}`);
  };

  // Обработчик добавления в корзину
  // e.stopPropagation() нужен, чтобы клик по кнопке не срабатывал как клик по карточке
  const handleAddToCart = (e, product) => {
    e.stopPropagation();
    addToCart(product);
  };

  if (loading) {
    return (
      <p style={{ color: '#fff', textAlign: 'center', marginTop: 32 }}>
        Загрузка товаров...
      </p>
    );
  }
  if (error) {
    return (
      <p style={{ color: '#e53935', textAlign: 'center', marginTop: 32 }}>
        {error}
      </p>
    );
  }
  if (!Array.isArray(products) || products.length === 0) {
    return (
      <p style={{ color: '#fff', textAlign: 'center', marginTop: 32 }}>
        Товары не найдены
      </p>
    );
  }

  return (
    <div className="product-grid">
      {products.map((p) => (
        <div
          key={p.id}
          className="product-card"
          onClick={() => handleClick(p.id)}
        >
          {p.images && p.images.length > 0 ? (
            <img src={p.images[0]} alt={p.name} className="product-image" />
          ) : (
            <div className="product-image--placeholder" />
          )}

          <div className="product-info">
            <h3 className="product-title">{p.name}</h3>
            <p className="product-price">
              {p.price.toLocaleString()} ₽
            </p>
          </div>

          {/* Кнопка «В корзину» */}
          <button
            className="btn-add-cart"
            onClick={(e) => handleAddToCart(e, p)}
          >
            В корзину
          </button>
        </div>
      ))}
    </div>
  );
}
