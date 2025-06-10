import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Admin.css";
import AdminHeader from "./AdminHeader";

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const navigate = useNavigate();

  // Проверка токена и загрузка заказов
  const loadOrders = () => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      navigate("/admin/login");
      return;
    }
    fetch("https://dkshopbot.ru/admin/orders", {
      headers: { Authorization: `Basic ${token}` }
    })
      .then(async res => {
        if (res.status === 401) {
          localStorage.removeItem("auth_token");
          navigate("/admin/login");
          return [];
        }
        return res.json();
      })
      .then(setOrders)
      .catch(() => {
        localStorage.removeItem("auth_token");
        navigate("/admin/login");
      });
  };

  // Обновить статус заказа
  const updateStatus = (id, newStatus) => {
    const token = localStorage.getItem("auth_token");
    fetch(`https://dkshopbot.ru/admin/orders/${id}?new_status=${newStatus}`, {
      method: "PATCH",
      headers: { Authorization: `Basic ${token}` }
    })
      .then(loadOrders)
      .catch(() => {
        localStorage.removeItem("auth_token");
        navigate("/admin/login");
      });
  };

  // Удалить заказ
  const deleteOrder = (id) => {
    if (!window.confirm(`Удалить заказ #${id}?`)) return;
    const token = localStorage.getItem("auth_token");
    fetch(`https://dkshopbot.ru/admin/orders/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Basic ${token}` }
    })
      .then(loadOrders)
      .catch(() => {
        localStorage.removeItem("auth_token");
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
              <td style={{ whiteSpace: "pre-wrap", maxWidth: 300 }}>
                {o.items.map(it => `${it.name} × ${it.quantity}`).join("\n")}
              </td>
              <td>
                <button onClick={() => updateStatus(o.id, "Принят")}>Принят</button>
                <button onClick={() => updateStatus(o.id, "В доставке")}>В доставке</button>
                <button onClick={() => updateStatus(o.id, "Завершён")}>Завершён</button>
                <button
                  onClick={() => deleteOrder(o.id)}
                  style={{ marginLeft: 8, background: "#e53935", color: "#fff" }}
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
