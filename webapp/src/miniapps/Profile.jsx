import React, { useEffect, useState } from 'react';
import { API_URL } from '../api.js';
import './Profile.css';

export default function Profile() {
  const [orders, setOrders] = useState([]);
  const [user, setUser]     = useState(() => {
    const raw = localStorage.getItem('dkshop_user');
    return raw ? JSON.parse(raw) : {};
  });

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
                <th>Состав заказа</th>
                <th>Сумма</th>
                <th>Тип заказа</th>
              </tr>
            </thead>
            <tbody>
  {orders.map(o => {
    // Считаем сумму заказа
    const total = (o.items || []).reduce(
      (sum, item) => sum + (item.price || 0) * (item.quantity || 0),
      0
    );
    return (
      <tr key={o.id}>
        <td data-label="ID">{o.id}</td>
        <td data-label="Статус">{o.status}</td>
        <td data-label="Дата">{new Date(o.created_at).toLocaleString()}</td>
        <td data-label="Позиций">{o.items?.length ?? 0}</td>
        <td data-label="Состав заказа">
          {o.items && o.items.length > 0 ? (
            <ul>
              {o.items.map((item, idx) => (
                <li key={idx}>
                  {item.name || `#${item.product_id}`} × {item.quantity}
                </li>
              ))}
            </ul>
          ) : (
            "—"
          )}
        </td>
        <td data-label="Сумма">
          {total ? total.toLocaleString() + " ₽" : "—"}
        </td>
        <td data-label="Тип заказа">
  {o.is_wholesale
    ? <span style={{ color: "#008000", fontWeight: 600 }}>Оптовый</span>
    : <span style={{ color: "#aaa" }}>Розница</span>
  }
</td>
      </tr>
    );
  })}
</tbody>
          </table>
        )}
      </section>
    </div>
  );
}
