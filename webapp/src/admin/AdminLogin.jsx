import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const AdminLogin = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) return;

    fetch("https://dkshopbot.ru/admin/orders", {
      headers: { Authorization: `Basic ${token}` },
    })
      .then((res) => {
        if (res.ok) {
          console.log("Token is valid, redirecting to /admin/orders");
          navigate("/admin/orders");
        } else {
          console.log("Token is invalid, removing");
          localStorage.removeItem("auth_token");
        }
      })
      .catch((err) => {
        console.error("Error checking token:", err);
        localStorage.removeItem("auth_token");
      });
  }, [navigate]);

  const handleLogin = () => {
    const token = btoa(`${username}:${password}`);
    fetch("https://dkshopbot.ru/admin/orders", {
      headers: { Authorization: `Basic ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Ошибка авторизации");
        localStorage.setItem("auth_token", token);
        navigate("/admin/orders");
      })
      .catch(() => {
        localStorage.removeItem("auth_token");
        setError("Неверный логин или пароль");
      });
  };

  return (
    <div className="admin-container admin-login">
      <h2>Вход в админку</h2>
      <input
        placeholder="Логин"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <br />
      <br />
      <input
        placeholder="Пароль"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <br />
      <br />
      <button onClick={handleLogin}>Войти</button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
};

export default AdminLogin;
