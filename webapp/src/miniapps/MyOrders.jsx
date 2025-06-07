import React, { useState } from "react";

export default function MyOrders() {
  const [phone, setPhone] = useState("");
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchOrders = async () => {
    if (!phone.trim()) return;

    setLoading(true);
    setError("");
    setOrders([]);

    try {
      const res = await fetch(`/orders/by-phone?phone=${encodeURIComponent(phone)}`);

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Ошибка загрузки заказов");
      }

      const data = await res.json();
      setOrders(data);
    } catch (err) {
      setError(err.message || "Не удалось получить заказы");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20, color: "#fff", maxWidth: 600, margin: "0 auto" }}>
      <h2 style={{ marginBottom: 16 }}>🧾 Мои заказы</h2>

      <input
        type="tel"
        placeholder="Введите телефон"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        style={{
          padding: 10,
          width: "100%",
          borderRadius: 6,
          border: "1px solid #444",
          marginBottom: 12,
          fontSize: 16,
        }}
      />

      <button
        onClick={fetchOrders}
        style={{
          padding: 10,
          background: "#e53935",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          width: "100%",
          fontWeight: "bold",
          fontSize: 16,
        }}
      >
        {loading ? "Загрузка..." : "Показать заказы"}
      </button>

      {error && (
        <p style={{ marginTop: 12, color: "tomato", whiteSpace: "pre-wrap" }}>{error}</p>
      )}

      {orders.length > 0 && (
        <div style={{ marginTop: 24 }}>
          {orders.map((order) => (
            <div
              key={order.id}
              style={{
                padding: 14,
                marginBottom: 16,
                background: "#1e1e1e",
                borderRadius: 8,
                border: "1px solid #333",
              }}
            >
              <p>
                <b>Номер заказа:</b> #{order.id}
              </p>
              <p>
                <b>Дата:</b> {new Date(order.created_at).toLocaleString()}
              </p>
              <p>
                <b>Имя:</b> {order.name}
              </p>
              <p>
                <b>Телефон:</b> {order.phone}
              </p>
              <p>
                <b>Статус:</b> {order.status}
              </p>
              <p>
                <b>Позиций:</b> {order.items.length}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
