// webapp/src/miniapps/ProductList.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchProducts } from '../api.js';
import { useCart } from '../context/CartContext.jsx';
import './ProductList.css';
import ModelScroll from '../components/ModelScroll.jsx';   // ← динамический скролл

export default function ProductList({ onSearchChange }) {
  const [products, setProducts] = useState([]);
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedModel, setSelectedModel] = useState(null);
  const [selectedMatchByName, setSelectedMatchByName] = useState(false);
  const [showAllModels, setShowAllModels] = useState(false);  // пока не используется, оставил как было
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigate = useNavigate();
  const { addToCart } = useCart();

  /* ---------- загрузка товаров ---------- */
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

  /* ---------- поиск из SearchBar ---------- */
  useEffect(() => {
    if (onSearchChange) {
      onSearchChange((q) => setFilterQuery(q));
    }
  }, [onSearchChange]);

  /* ---------- навигация и корзина ---------- */
  const handleClick       = (id)          => navigate(`/product/${id}`);
  const handleAddToCart   = (e, product)  => { e.stopPropagation(); addToCart(product); };

  /* ---------- фильтрация ---------- */
  const filtered = products.filter((p) => {
    const q     = (filterQuery || '').toLowerCase();
    const name  = (p.name         || '').toLowerCase();
    const model = (p.model_compat || '').toLowerCase();
    const type  = (p.type         || '').toLowerCase();

    const matchesText =
      name.includes(q) || model.includes(q) || type.includes(q);

    const matchesModel =
      !selectedModel ||
      (Array.isArray(selectedModel)
        ? selectedModel.some((m) =>
            selectedMatchByName
              ? name.includes(m.toLowerCase())
              : model.includes(m)
          )
        : selectedMatchByName
          ? name.includes(selectedModel.toLowerCase())
          : model.includes(selectedModel));

    return matchesText && matchesModel;
  });

  return (
    <>
      {/* ---------- динамический скролл моделей ---------- */}
      <ModelScroll
        onSelect={(models, byName) => {
          setSelectedModel(models);
          setSelectedMatchByName(!!byName);
        }}
      />

      {/* ---------- список товаров ---------- */}
      {loading && (
        <p style={{ color: '#fff', textAlign: 'center', marginTop: 32 }}>Загрузка…</p>
      )}
      {error && (
        <p style={{ color: '#fff', textAlign: 'center', marginTop: 32 }}>{error}</p>
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
                src={p.images?.[0] ? p.images[0] : '/static/no-image.png'}
                alt={p.name}
                className="product-image"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/static/no-image.png';
                }}
              />

              <div className="product-info">
                <h3 className="product-title">{p.name}</h3>
                <p className="product-price">{p.price.toLocaleString()} ₽</p>
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
