import React, { useEffect, useState } from 'react';
import { fetchProducts } from '../api.js'; // ваш утилитный модуль для запросов к API

export default function ProductList() {
  const [products, setProducts] = useState([]);
  const tg = window.Telegram.WebApp;

  useEffect(() => {
    // Закрыть «шторку» Telegram, если нужно
    tg.expand();

    // Загрузить продукты с API
    fetchProducts().then(setProducts);
  }, []);

  const onClick = (id) => {
    // Перенаправить на карточку внутри WebApp
    tg.openLink(`${tg.initDataUnsafe.query_id ? tg.initDataUnsafe.query_id : ''}`); 
    // Или просто:
    window.location.href = `${tg.initDataUnsafe.query_id}?product=${id}`;
  };

  return (
    <div className="miniapp">
      <h1>Каталог товаров</h1>
      <ul>
        {products.map(p => (
          <li key={p.id} onClick={() => onClick(p.id)}>
            <img src={p.image_url} alt={p.name} width="50" />
            <span>{p.name} — {p.price} ₽</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
