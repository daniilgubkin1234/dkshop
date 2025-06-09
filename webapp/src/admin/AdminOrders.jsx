// src/admin/AdminOrders.jsx
import React, { useEffect, useState } from 'react';
import './Admin.css';
import AdminHeader from './AdminHeader';

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);

  // Загрузить список заказов из бэкенда
  const loadOrders = () => {
    const token = localStorage.getItem('auth_token');
    fetch('https://dkshopbot.ru/admin/orders', {
      headers: { Authorization: `Basic ${token}` }
    })
      .then(res => res.json())
      .then(setOrders)
      .catch(err => console.error('Ошибка загрузки заказов:', err));
  };

  // Обновить статус заказа
  const updateStatus = (id, newStatus) => {
    const token = localStorage.getItem('auth_token');
    fetch(`https://dkshopbot.ru/admin/orders/${id}?new_status=${newStatus}`, {
      method: 'PATCH',
      headers: { Authorization: `Basic ${token}` }
    })
      .then(loadOrders)
      .catch(err => console.error(`Ошибка при обновлении заказа ${id}:`, err));
  };

  // Удалить заказ
  const deleteOrder = (id) => {
    if (!window.confirm(`Удалить заказ #${id}?`)) return;
    const token = localStorage.getItem('auth_token');
    fetch(`https://dkshopbot.ru/admin/orders/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Basic ${token}` }
    })
      .then(loadOrders)
      .catch(err => console.error(`Ошибка при удалении заказа ${id}:`, err));
  };

  useEffect(() => {
    loadOrders();
  }, []);

  return (
    <div className="admin-container admin-orders">
      <AdminHeader />
      <h2>Заказы</h2>
      <table className="admin-table" cellPadding="8">
        <thead>
          <tr>
            <th>ID</th>
            <th>Имя</th>
            <th>Телефон</th>
            <th>Статус</th>
            <th>Дата</th>
            <th>Содержимое</th>
            <th>Действия</th>
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
              <td style={{ whiteSpace: 'pre-wrap', maxWidth: 300 }}>
                {o.items.map(it => `${it.name} × ${it.quantity}`).join('\n')}
              </td>

              <td>
                <button onClick={() => updateStatus(o.id, 'Принят')}>
                  Принят
                </button>
                <button onClick={() => updateStatus(o.id, 'Отгружен')}>
                  Отгружен
                </button>
                <button onClick={() => updateStatus(o.id, 'Завершён')}>
                  Завершён
                </button>
                <button
                  onClick={() => deleteOrder(o.id)}
                  style={{ marginLeft: 8, background: '#e53935', color: '#fff' }}
                >
                  Удалить
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
