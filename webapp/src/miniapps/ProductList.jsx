import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchProducts } from '../api.js';
import { useCart } from '../context/CartContext.jsx';
import './ProductList.css';
import ModelScroll from '../components/ModelScroll.jsx';

function normalize(s) {
  return (s || "")
    .toLowerCase()
    .replace(/[ё]/g, "е")
    .replace(/[^\wа-я0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default function ProductList({ onSearchChange }) {
  const [products, setProducts] = useState([]);
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedModel, setSelectedModel] = useState(null);
  const [selectedMatchByName, setSelectedMatchByName] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigate = useNavigate();
  const { addToCart } = useCart();

  useEffect(() => {
    if (window.Telegram?.WebApp?.expand) window.Telegram.WebApp.expand();

    (async () => {
      try {
        setLoading(true);
        setProducts(await fetchProducts());
      } catch (e) {
        console.error(e);
        setError('Не удалось загрузить список товаров');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (onSearchChange) {
      onSearchChange((q) => setFilterQuery(q));
      return () => onSearchChange(null);
    }
  }, [onSearchChange]);

  const handleClick     = (id)           => navigate(`/product/${id}`);
  const handleAddToCart = (e, product)   => { e.stopPropagation(); addToCart(product); };

  // --- новый фильтр с normalize для любых вариантов ---
  const filtered = products.filter((p) => {
    const q      = normalize(filterQuery);
    const name   = normalize(p.name);
    const model  = normalize(p.model_compat);
    const type   = normalize(p.type);

    const matchesText =
      name.includes(q) || model.includes(q) || type.includes(q);

    const matchesModel =
      !selectedModel ||
      (Array.isArray(selectedModel)
        ? selectedModel.some((m) =>
            selectedMatchByName
              ? name.includes(m)
              : model.includes(m)
          )
        : selectedModel
        ? (selectedMatchByName
            ? name.includes(normalize(selectedModel))
            : model.includes(normalize(selectedModel)))
        : true);

    return matchesText && matchesModel;
  });

  return (
    <>
      <ModelScroll
        onSelect={(modelsNorm, byName) => {
          setSelectedModel(modelsNorm);      // уже нормализованные
          setSelectedMatchByName(!!byName);
        }}
      />

      {loading && (
        <p style={{ color: '#fff', textAlign: 'center', marginTop: 32 }}>
          Загрузка…
        </p>
      )}
      {error && (
        <p style={{ color: '#fff', textAlign: 'center', marginTop: 32 }}>
          {error}
        </p>
      )}
      {!loading && filtered.length === 0 && (
        <p style={{ color: '#fff', textAlign: 'center', marginTop: 32 }}>
          Ничего не найдено
        </p>
      )}

      {!loading && filtered.length > 0 && (
        <div className="product-grid">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="product-card"
              onClick={() => handleClick(p.id)}
            >
              <img
                src={p.images?.[0] || '/static/no-image.png'}
                alt={p.name}
                className="product-image"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/static/no-image.png';
                }}
              />

              <div className="product-info">
                <h3 className="product-title">{p.name}</h3>
                <p className="product-price">
                  {p.price.toLocaleString()} ₽
                </p>
              </div>

              <button
                className="btn-add-cart"
                onClick={(e) => handleAddToCart(e, p)}
              >
                В корзину
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
