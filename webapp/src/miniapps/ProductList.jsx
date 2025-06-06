// webapp/src/miniapps/ProductList.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchProducts } from '../api.js';
import { useCart } from '../context/CartContext.jsx';
import './ProductList.css';

export default function ProductList({ onSearchChange }) {
  const [products, setProducts] = useState([]);
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedModel, setSelectedModel] = useState(null);
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

  const filtered = products.filter((p) => {
    const q = (filterQuery || '').toLowerCase();
    const name = (p.name || '').toLowerCase();
    const model = (p.model_compat || '').toLowerCase();
    const type = (p.type || '').toLowerCase();

    const matchesText = name.includes(q) || model.includes(q) || type.includes(q);
    const matchesModel = !selectedModel || p.model_compat === selectedModel;

    return matchesText && matchesModel;
  });

  const uniqueModels = [...new Set(products.map((p) => p.model_compat).filter(Boolean))];

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

  return (
    <>
      <div className="model-scroll">
        {uniqueModels.map((model) => (
          <button
            key={model}
            className={`model-tab ${selectedModel === model ? 'active' : ''}`}
            onClick={() => setSelectedModel(model)}
          >
            {model}
          </button>
        ))}
        {selectedModel && (
          <button className="model-tab reset" onClick={() => setSelectedModel(null)}>
            Сбросить
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <p style={{ color: '#fff', textAlign: 'center', marginTop: 32 }}>
          Ничего не найдено
        </p>
      ) : (
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
      )}
    </>
  );
}
