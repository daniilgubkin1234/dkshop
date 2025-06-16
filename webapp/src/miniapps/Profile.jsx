import React, { useEffect, useState } from 'react';
import { API_URL } from '../api.js';
import './Profile.css';

export default function Profile() {
  const [orders, setOrders] = useState([]);
  const [user, setUser]     = useState(() => {
    const raw = localStorage.getItem('dkshop_user');
    return raw ? JSON.parse(raw) : {};
  });

  // Показать «назад» в Telegram и загрузить заказы
  useEffect(() => {
    if (window.TelegramWebApp) {
      window.TelegramWebApp.ready();
      window.TelegramWebApp.BackButton.show();
    }

    if (user.id) {
      fetch(`${API_URL}/orders/by-user?user_id=${user.id}`)
        .then(r => (r.ok ? r.json() : []))
        .then(setOrders)
        .catch(console.error);
    }

    return () => {
      if (window.TelegramWebApp) {
        window.TelegramWebApp.BackButton.hide();
      }
    };
  }, [user.id]);

  

  return (
    <div className="profile-container">
      <h1 className="profile-title">Личный кабинет</h1>

      <section className="profile-card">
        <h2 className="section-title">Моя информация</h2>
        <div className="profile-info">
          <div><span className="label">ID:</span> {user.id}</div>
          {user.first_name && <div><span className="label">Имя:</span> {user.first_name}</div>}
          {user.last_name  && <div><span className="label">Фамилия:</span> {user.last_name}</div>}
          {user.username   && <div><span className="label">Username:</span> @{user.username}</div>}
          {user.phone      && <div><span className="label">Телефон:</span> {user.phone}</div>}
        </div>
        
      </section>

      <section className="profile-card">
        <h2 className="section-title">Мои заказы</h2>
        {orders.length === 0 ? (
          <p className="empty-text">У вас пока нет заказов.</p>
        ) : (
          <table className="orders-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Статус</th>
                <th>Дата</th>
                <th>Позиций</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td>{o.id}</td>
                  <td>{o.status}</td>
                  <td>{new Date(o.created_at).toLocaleString()}</td>
                  <td>{o.items?.length ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
