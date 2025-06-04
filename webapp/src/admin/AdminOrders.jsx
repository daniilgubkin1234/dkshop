// src/admin/AdminOrders.jsx
import React, { useEffect, useState } from 'react';
import './Admin.css';
export default function AdminOrders() {
  const [orders, setOrders] = useState([]);

  const loadOrders = () => {
    const token = localStorage.getItem('auth_token');
    fetch('https://dkshopbot.ru/admin/orders', {
      headers: { Authorization: `Basic ${token}` }
    })
      .then(r => r.json())
      .then(setOrders)
      .catch(console.error);
  };

  const updateStatus = (id, newStatus) => {
    const token = localStorage.getItem('auth_token');
    fetch(`https://dkshopbot.ru/admin/orders/${id}?new_status=${newStatus}`, {
      method: 'PATCH',
      headers: { Authorization: `Basic ${token}` }
    })
      .then(loadOrders)
      .catch(console.error);
  };

  useEffect(() => { loadOrders(); }, []);

  return (
    <div className="admin-container admin-login">
      <h2>Заказы</h2>
      <table border="1" cellPadding="8">
        <thead>
          <tr>
            <th>ID</th>
            <th>Имя</th>
            <th>Телефон</th>
            <th>Статус</th>
            <th>Дата</th>
            <th>Изменить</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(o => (
            <tr key={o.id}>
              <td>{o.id}</td>
              <td>{o.name}</td>
              <td>{o.phone}</td>
              <td>{o.status}</td>
              <td>{new Date(o.created_at).toLocaleString()}</td>
              <td>
                <button onClick={() => updateStatus(o.id, 'accepted')}>Принят</button>
                <button onClick={() => updateStatus(o.id, 'shipped')}>Отгружен</button>
                <button onClick={() => updateStatus(o.id, 'done')}>Завершён</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
