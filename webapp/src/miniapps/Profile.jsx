// webapp/src/miniapps/Profile.jsx

import React, { useEffect, useState } from 'react';
import { API_URL } from '../api.js';

export default function Profile() {
  const [orders, setOrders] = useState([]);
  const user = JSON.parse(localStorage.getItem('dkshop_user') || '{}');

  useEffect(() => {
    // Инициализируем Telegram WebApp, показываем кнопку «Назад»
    if (window.TelegramWebApp) {
      window.TelegramWebApp.ready();
      window.TelegramWebApp.BackButton.show();
    }

    // Запрашиваем заказы по Telegram-ID
    if (user.id) {
      fetch(`${API_URL}/orders/by-user?user_id=${user.id}`)
        .then(res => res.ok ? res.json() : Promise.resolve([]))
        .then(setOrders)
        .catch(console.error);
    }

    // При размонтировании скрываем кнопку «Назад»
    return () => {
      if (window.TelegramWebApp) {
        window.TelegramWebApp.BackButton.hide();
      }
    };
  }, [user.id]);

  return (
    <div style={{ padding: 16, color: '#fff' }}>
      <h1>Личный кабинет</h1>

      <section style={{ marginBottom: 24 }}>
        <h2>Моя информация</h2>
        <p><strong>ID:</strong> {user.id}</p>
        {user.first_name && <p><strong>Имя:</strong> {user.first_name}</p>}
        {user.last_name  && <p><strong>Фамилия:</strong> {user.last_name}</p>}
        {user.username   && <p><strong>Username:</strong> @{user.username}</p>}
        {user.phone      && <p><strong>Телефон:</strong> {user.phone}</p>}
      </section>

      <section>
        <h2>Мои заказы</h2>
        {orders.length === 0 ? (
          <p>У вас пока нет заказов.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #444' }}>
                <th>ID</th>
                <th>Статус</th>
                <th>Дата</th>
                <th>Позиций</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} style={{ borderBottom: '1px solid #333' }}>
                  <td>{o.id}</td>
                  <td>{o.status}</td>
                  <td>{new Date(o.created_at).toLocaleString()}</td>
                  <td>{o.items?.length ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
