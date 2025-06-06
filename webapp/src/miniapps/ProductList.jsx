import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchProducts } from '../api.js';
import { useCart } from '../context/CartContext.jsx';
import './ProductList.css';

const MODEL_CARDS = [
  { label: 'ВАЗ 2101-07', model: '2101-07', img: '/models/2101.jpg' },
  { label: 'SAMARA, 2108-15', model: '2108-21', img: '/models/2108.jpg' },
  { label: 'PRIORA, 2110-12', model: '2110-21', img: '/models/2110.jpg' },
  { label: 'KALINA, GRANTA', model: 'GRANTA', img: '/models/granta.jpg', disabled: true },
  { label: '2170-21', model: '2170-21', img: '/models/2170.jpg' },
];

export default function ProductList({ onSearchChange }) {
  const [products, setProducts] = useState([]);
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedModel, setSelectedModel] = useState(null);
  const [showAllModels, setShowAllModels] = useState(false);
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

  return (
    <>
      {/* Карточки моделей */}
      <div className="model-cards">
        {(showAllModels ? MODEL_CARDS : MODEL_CARDS.slice(0, 4)).map(({ label, model, img, disabled }) => (
          <div
            key={model}
            className={`model-card ${selectedModel === model ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
            onClick={() => !disabled && setSelectedModel(model)}
          >
            <img src={img} alt={label} />
            <span>{label}</span>
          </div>
        ))}
        {MODEL_CARDS.length > 4 && (
          <button className="toggle-more" onClick={() => setShowAllModels((v) => !v)}>
            {showAllModels ? 'Скрыть' : 'Показать все'}
          </button>
        )}
      </div>

      {/* Результаты */}
      {loading ? (
        <p style={{ color: '#fff', textAlign: 'center', marginTop: 32 }}>Загрузка товаров...</p>
      ) : error ? (
        <p style={{ color: '#e53935', textAlign: 'center', marginTop: 32 }}>{error}</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: '#fff', textAlign: 'center', marginTop: 32 }}>Ничего не найдено</p>
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
