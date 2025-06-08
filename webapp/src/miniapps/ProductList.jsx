import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchProducts } from '../api.js';
import { useCart } from '../context/CartContext.jsx';
import './ProductList.css';

const MODEL_CARDS = [
  { label: 'ВАЗ 2101-07', models: ['2101-07'], img: '/models/2101-07.jpg' },
  { label: 'SAMARA 2108-21', models: ['2108-21'], img: '/models/2108-15.jpg' },
  { label: 'PRIORA (2110–2170)', models: ['2110-21', '2170-21'], img: '/models/2110-12.jpg' },
  { label: 'KALINA (1117–1119)', models: ['1117', '1118', '1119'], img: '/models/kalina_granta.jpg' },
  { label: 'GRANTA (2190–2192)', models: ['гранта'], matchByName: true, img: '/models/kalina_granta.jpg' },
];

export default function ProductList({ onSearchChange }) {
  const [products, setProducts] = useState([]);
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedModel, setSelectedModel] = useState(null);
  const [selectedMatchByName, setSelectedMatchByName] = useState(false);
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
      <div className="model-scroll">
  {MODEL_CARDS.map(({ label, models, img, matchByName }) => {
    const isActive =
      selectedModel &&
      (Array.isArray(selectedModel)
        ? models.some((m) => selectedModel.includes(m))
        : models.includes(selectedModel));

    return (
      <div
        key={label}
        className={`model-card ${isActive ? 'active' : ''}`}
        onClick={() => {
          setSelectedModel(models);
          setSelectedMatchByName(!!matchByName);
        }}
      >
        <img src={img} alt={label} />
        <span>{label}</span>
      </div>
    );
  })}
</div>

      {filtered.length === 0 ? (
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
