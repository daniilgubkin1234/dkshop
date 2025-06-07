import React, { useState } from "react";

export default function MyOrders() {
  const [phone, setPhone] = useState("");
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");

  const fetchOrders = async () => {
    if (!phone.trim()) return;

    try {
      const res = await fetch(`/orders/by-phone?phone=${encodeURIComponent(phone)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Ошибка загрузки заказов");
      setOrders(data);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ padding: 20, color: "#fff" }}>
      <h2>Мои заказы</h2>
      <input
        type="tel"
        placeholder="Введите телефон"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        style={{ padding: 8, width: "100%", marginBottom: 12 }}
      />
      <button onClick={fetchOrders} style={{ padding: 10, background: "#e53935", color: "#fff", border: "none", borderRadius: 6 }}>
        Показать заказы
      </button>

      {error && <p style={{ marginTop: 12, color: "tomato" }}>{error}</p>}

      {orders.length > 0 && (
        <div style={{ marginTop: 24 }}>
          {orders.map((order) => (
            <div key={order.id} style={{ padding: 12, marginBottom: 16, background: "#1e1e1e", borderRadius: 8 }}>
              <p>Номер заказа: <b>#{order.id}</b></p>
              <p>Дата: {new Date(order.created_at).toLocaleString()}</p>
              <p>Имя: {order.name}</p>
              <p>Телефон: {order.phone}</p>
              <p>Статус: {order.status}</p>
              <p>Позиций: {order.items.length}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
