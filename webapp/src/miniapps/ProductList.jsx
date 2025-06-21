// webapp/src/miniapps/ProductList.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchProducts } from '../api.js';
import { useCart } from '../context/CartContext.jsx';
import './ProductList.css';
import ModelScroll from '../components/ModelScroll.jsx';
import HitsCarousel from '../components/HitsCarousel.jsx';
/* ---------- helpers ---------- */
function normalize(str = '') {
  return str
    .toLowerCase()
    .replace(/[ё]/g, 'е')
    .replace(/[^\wа-я0-9]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const PAGE_SIZE = 6;               // сколько карточек показывать за раз

export default function ProductList({ onSearchChange }) {
  const [products, setProducts]           = useState([]);
  const [filterQuery, setFilterQuery]     = useState('');
  const [selectedModel, setSelectedModel] = useState(null);
  const [selectedByName, setSelectedByName] = useState(false);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [visibleCount, setVisibleCount]   = useState(PAGE_SIZE);

  const navigate = useNavigate();
  const { addToCart } = useCart();

  /* ---------- загрузка списка ---------- */
  useEffect(() => {
    window.Telegram?.WebApp?.expand?.();
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

  /* ---------- подписка на поиск сверху ---------- */
  useEffect(() => {
    if (!onSearchChange) return;
    onSearchChange(q => setFilterQuery(q));
    return () => onSearchChange(null);
  }, [onSearchChange]);

  /* ---------- сброс видимого количества при любом фильтре ---------- */
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filterQuery, selectedModel, selectedByName]);

  /* ---------- фильтрация ---------- */
  const filtered = products.filter(p => {
    const q      = normalize(filterQuery);
    const name   = normalize(p.name);
    const model  = normalize(p.model_compat);
    const type   = normalize(p.type);

    const matchesText = !q || name.includes(q) || model.includes(q) || type.includes(q);

    const matchesModel = !selectedModel || (
      Array.isArray(selectedModel)
        ? selectedModel.some(m => (selectedByName ? name.includes(m) : model.includes(m)))
        : selectedByName ? name.includes(normalize(selectedModel)) : model.includes(normalize(selectedModel))
    );

    return matchesText && matchesModel;
  });

  const visible = filtered.slice(0, visibleCount);

  /* ---------- handlers ---------- */
  const handleClick       = id         => navigate(`/product/${id}`);
  const handleAddToCart   = (e, prod)  => { e.stopPropagation(); addToCart(prod); };
  const handleShowMore    = ()         => setVisibleCount(v => Math.min(v + PAGE_SIZE, filtered.length));

  /* ---------- render ---------- */
  return (
    <>
      {/* выбор модели */}
      <HitsCarousel /> 
      <h2 className="catalog-title">Каталог</h2>

      <ModelScroll
        onSelect={(modelsNorm, byName) => {
          setSelectedModel(modelsNorm);
          setSelectedByName(!!byName);
        }}
      />

      {/* состояния загрузки / ошибки */}
      {loading && <p className="pl-status">Загрузка…</p>}
      {error   && <p className="pl-status">{error}</p>}
      {!loading && !error && filtered.length === 0 && (
        <p className="pl-status">Ничего не найдено</p>
      )}

      {/* грид товаров */}
      {!loading && !error && visible.length > 0 && (
        <>
          <div className="product-grid">
            {visible.map(p => (
              <div key={p.id} className="product-card" onClick={() => handleClick(p.id)}>
                <img
                  src={p.images?.[0] || '/static/no-image.png'}
                  alt={p.name}
                  className="product-image"
                  onError={e => { e.currentTarget.src = '/static/no-image.png'; }}
                />
                <div className="product-info">
                  <h3 className="product-title">{p.name}</h3>
                  <p className="product-price">{p.price.toLocaleString()} ₽</p>
                </div>
                <button className="btn-add-cart" onClick={e => handleAddToCart(e, p)}>
                  В корзину
                </button>
              </div>
            ))}
          </div>

          {/* кнопка "показать ещё" */}
          {visibleCount < filtered.length && (
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <button className="btn-show-more" onClick={handleShowMore}>
                Показать ещё ({filtered.length - visibleCount})
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
