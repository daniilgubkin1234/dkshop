// webapp/src/miniapps/ProductList.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchProducts } from '../api.js';
import { useCart } from '../context/CartContext.jsx';
import './ProductList.css';

export default function ProductList({ onSearchChange }) {
  const [products, setProducts] = useState([]);
  const [filterQuery, setFilterQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { addToCart } = useCart();

  useEffect(() => {
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

  useEffect(() => {
    if (onSearchChange) {
      onSearchChange((query) => setFilterQuery(query));
    }
  }, [onSearchChange]);

  const handleClick = (id) => {
    navigate(`/product/${id}`);
  };

  const handleAddToCart = (e, product) => {
    e.stopPropagation();
    addToCart(product);
  };

  // ⬇️ Расширенный фильтр: name + model_compat + type
  const filtered = products.filter((p) => {
    const q = (filterQuery || '').toLowerCase();
    return (
      (p.name || '').toLowerCase().includes(q) ||
      (p.model_compat || '').toLowerCase().includes(q) ||
      (p.type || '').toLowerCase().includes(q)
    );
  });

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

  if (!filtered.length) {
    return (
      <p style={{ color: '#fff', textAlign: 'center', marginTop: 32 }}>
        Ничего не найдено
      </p>
    );
  }

  return (
    <div className="product-grid">
      {filtered.map((p) => (
        <div key={p.id} className="product-card" onClick={() => handleClick(p.id)}>
          {p.images?.[0] ? (
            <img src={p.images[0]} alt={p.name} className="product-image" />
          ) : (
            <div className="product-image--placeholder" />
          )}

          <div className="product-info">
            <h3 className="product-title">{p.name}</h3>
            <p className="product-price">{p.price.toLocaleString()} ₽</p>
          </div>

          <button className="btn-add-cart" onClick={(e) => handleAddToCart(e, p)}>
            В корзину
          </button>
        </div>
      ))}
    </div>
  );
}
