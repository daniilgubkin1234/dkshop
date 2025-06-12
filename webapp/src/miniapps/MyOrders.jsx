// webapp/src/miniapps/MyOrders.jsx
import React, { useEffect, useState } from "react";
import { myOrdersApi } from "../api";

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  useEffect(() => { myOrdersApi().then(setOrders); }, []);
  return (
    <div>
      <h2>Мои заказы</h2>
      {orders.length === 0 ? "Заказов нет" :
        <ul>{orders.map(o=>(
          <li key={o.id}>#{o.id} — {o.status} — {o.total} ₽</li>
        ))}</ul>}
    </div>
  );
}
