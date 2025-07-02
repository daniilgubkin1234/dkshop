import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Admin.css";
import AdminHeader from "./AdminHeader";

const API_URL = import.meta.env.VITE_API_URL || "/api";

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const navigate = useNavigate();

  // Загрузка заказов с проверкой по access_token (кука)
  const loadOrders = () => {
    fetch(`${API_URL}/admin/orders`, {
      credentials: "include"
    })
      .then(async res => {
        if (res.status === 401) {
          navigate("/admin/login");
          return [];
        }
        return res.json();
      })
      .then(setOrders)
      .catch(() => {
        navigate("/admin/login");
      });
  };

  // Обновить статус заказа
  const updateStatus = (id, newStatus) => {
    fetch(`${API_URL}/admin/orders/${id}?new_status=${newStatus}`, {
      method: "PATCH",
      credentials: "include"
    })
      .then(loadOrders)
      .catch(() => {
        navigate("/admin/login");
      });
  };

  // Удалить заказ
  const deleteOrder = (id) => {
    if (!window.confirm(`Удалить заказ #${id}?`)) return;
    fetch(`${API_URL}/admin/orders/${id}`, {
      method: "DELETE",
      credentials: "include"
    })
      .then(loadOrders)
      .catch(() => {
        navigate("/admin/login");
      });
  };

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line
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
            <th>Сумма</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(o => {
            // вычисляем сумму заказа
            const total = (o.items || []).reduce(
              (sum, it) => sum + (it.price || 0) * (it.quantity || 0),
              0
            );
            return (
              <tr key={o.id}>
                <td>{o.id}</td>
                <td>{o.name}</td>
                <td>{o.phone}</td>
                <td>{o.status}</td>
                <td>{new Date(o.created_at).toLocaleString()}</td>
                <td style={{ whiteSpace: "pre-wrap", maxWidth: 300 }}>
                  {o.items.map(it => `${it.name} × ${it.quantity}`).join("\n")}
                </td>
                <td>
                  {total ? total.toLocaleString() + " ₽" : "—"}
                </td>
                <td>
                  <button onClick={() => updateStatus(o.id, "Принят в работу")}>Принят в работу</button>
                  <button onClick={() => updateStatus(o.id, "Подтверждён")}>Подтверждён</button>
                  <button onClick={() => updateStatus(o.id, "В доставке")}>В доставке</button>
                  <button onClick={() => updateStatus(o.id, "Завершён")}>Завершён</button>
                  <button
                    onClick={() => deleteOrder(o.id)}
                    style={{ marginLeft: 8, background: "#e53935", color: "#fff" }}
                  >
                    🗑
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
