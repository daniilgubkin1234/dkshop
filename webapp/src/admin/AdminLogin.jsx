import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function AdminLogin() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    const token = btoa(`${login}:${password}`);
    try {
      const res = await fetch("/admin/orders", {
        headers: {
          Authorization: `Basic ${token}`
        }
      });

      const contentType = res.headers.get("content-type");

      if (!res.ok || !contentType || !contentType.includes("application/json")) {
        throw new Error("Unauthorized");
      }

      localStorage.setItem("auth_token", token);
      navigate("/admin/orders");
    } catch (err) {
      localStorage.removeItem("auth_token");
      setError("Неверный логин или пароль");
    }
  };

  return (
    <div className="admin-container admin-login">
      <h2>Вход в админку</h2>
      <input
        placeholder="Логин"
        value={login}
        onChange={(e) => setLogin(e.target.value)}
      />
      <br /><br />
      <input
        placeholder="Пароль"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <br /><br />
      <button onClick={handleLogin}>Войти</button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}

export default AdminLogin;
