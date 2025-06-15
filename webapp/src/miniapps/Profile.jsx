// webapp/src/miniapps/Profile.jsx
import React, { useEffect, useState } from 'react';
import { API_URL } from '../api.js';

export default function Profile() {
  const [orders, setOrders] = useState([]);
  // Достаём проверенного телеграм-пользователя из localStorage
  const user = JSON.parse(localStorage.getItem('dkshop_user') || '{}');

  useEffect(() => {
    if (user?.id) {
      fetch(`${API_URL}/orders/by-user?user_id=${user.id}`)
        .then(res => res.json())
        .then(setOrders)
        .catch(console.error);
    }
  }, [user]);

  return (
    <div style={{ padding: 20 }}>
      <h1>Личный кабинет</h1>
      <p><strong>ID:</strong> {user.id}</p>
      <p><strong>Телефон:</strong> {user.phone}</p>

      <h2>Мои заказы</h2>
      {orders.length === 0 ? (
        <p>У вас пока нет заказов.</p>
      ) : (
        <ul>
          {orders.map(o => (
            <li key={o.id}>
              Заказ #{o.id}, статус: <em>{o.status}</em>, дата:{' '}
              {new Date(o.created_at).toLocaleString()}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
