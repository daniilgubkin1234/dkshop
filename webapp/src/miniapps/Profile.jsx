import React from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { Link } from "react-router-dom";

export default function Profile() {
  const { user, logout } = useAuth();

  if (!user) return <p>Не авторизованы</p>;

  return (
    <div className="profile">
      <h2>Профиль</h2>
      <p><b>Имя:</b> {user.name}</p>
      <p><b>Телефон:</b> {user.phone}</p>

      <Link to="/my-orders">Мои заказы</Link>
      <button onClick={logout} style={{ marginLeft: 12 }}>
        Выйти
      </button>
    </div>
  );
}
