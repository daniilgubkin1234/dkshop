import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "/api";

const AdminLogin = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    setError("");
    try {
      const res = await fetch(`${API_URL}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        setError("Неверный логин или пароль");
        return;
      }
      window.location.href = "/admin/orders";
    } catch {
      setError("Ошибка соединения");
    }
  };

  return (
    <div className="admin-container admin-login">
      <h2>Вход в админку</h2>
      <input
        placeholder="Логин"
        value={username}
        onChange={e => setUsername(e.target.value)}
      />
      <br /><br />
      <input
        placeholder="Пароль"
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
      />
      <br /><br />
      <button onClick={handleLogin}>Войти</button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
};

export default AdminLogin;
