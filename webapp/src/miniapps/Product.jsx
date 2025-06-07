// webapp/src/miniapps/Product.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchProductById } from '../api.js';
import { useCart } from '../context/CartContext.jsx';  // ← хук корзины
import './Product.css';

export default function Product() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Функция из контекста корзины
  const { addToCart } = useCart();

  useEffect(() => {
    async function loadItem() {
      try {
        setLoading(true);
        const prod = await fetchProductById(id);
        setItem(prod);
      } catch (e) {
        console.error(e);
        setError('Не удалось загрузить товар');
      } finally {
        setLoading(false);
      }
    }
    loadItem();
  }, [id]);

  if (loading) {
    return <p style={{ padding: 20 }}>Загрузка…</p>;
  }
  if (error) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <p style={{ color: '#e53935' }}>{error}</p>
        <button
          onClick={() => navigate(-1)}
          style={{
            marginTop: 12,
            background: '#e53935',
            color: '#ffffff',
            border: 'none',
            padding: '8px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Назад
        </button>
      </div>
    );
  }
  if (!item) {
    return null;
  }

  return (
    <div className="product-page">
      {/* Кнопка «← Назад» */}
      <button className="product-back" onClick={() => navigate("/")}>
      ← Вернуться на главную
      </button>

      <div className="product-content">
        {/* Блок с изображением */}
        <div className="product-page__image">
          {item.images && item.images.length > 0 ? (
            <img src={item.images[0]} alt={item.name} />
          ) : (
            <div className="product-placeholder" />
          )}
        </div>

        {/* Блок с деталями товара */}
        <div className="product-page__info">
          <h2 className="product-page__title">{item.name}</h2>

          {item.model_compat && (
            <p className="product-page__subtitle">
              Совместимость: {item.model_compat}
            </p>
          )}

          <p className="product-page__price">
            {item.price.toLocaleString()} ₽
          </p>

          {item.type && (
            <p className="product-page__detail">
              <strong>Тип:</strong> {item.type}
            </p>
          )}

          {item.description && (
            <div className="product-page__description">
              <h3>Описание</h3>
              <p>{item.description}</p>
            </div>
          )}

          {/* Кнопка «В корзину» */}
          <button
            className="btn-add-cart-single"
            onClick={() => addToCart(item)}
          >
            В корзину
          </button>

          {/* Кнопка «Открыть в боте» (если Telegram-WebApp) */}
          {window.TelegramWebApp && (
            <button
              className="product-cta"
              onClick={() => {
                const botLink = `${import.meta.env.VITE_FRONT_URL}/product/${item.id}`;
                window.TelegramWebApp.openLink(botLink);
              }}
            >
              Открыть в боте
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
