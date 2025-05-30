// webapp/src/miniapps/Product.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchProductById } from '../api.js';
import './Product.css';

export default function Product() {
  const { id } = useParams();      // Берём ID из URL
  const navigate = useNavigate();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadItem() {
      try {
        setLoading(true);
        const prod = await fetchProductById(id);
        setItem(prod);
      } catch (e) {
        console.error(e);
        setError(e.message || 'Не удалось загрузить товар');
      } finally {
        setLoading(false);
      }
    }
    loadItem();
  }, [id]);

  if (loading) {
    return (
      <p style={{ padding: 20, color: '#fff', textAlign: 'center' }}>
        Загрузка товара...
      </p>
    );
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
      <button
        className="product-back"
        onClick={() => navigate(-1)}
      >
        ← Назад
      </button>

      <div className="product-content">
        {/* Блок изображения */}
        <div className="product-page__image">
          {item.images && item.images.length > 0 ? (
            <img src={item.images[0]} alt={item.name} />
          ) : (
            <div className="product-placeholder" />
          )}
        </div>

        {/* Блок с подробной информацией */}
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

          {/* Кнопка «Открыть в боте» (если внутри Telegram-WebApp) */}
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
