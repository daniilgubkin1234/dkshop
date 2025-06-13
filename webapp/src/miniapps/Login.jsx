import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const [phone, setPhone] = useState("");
  const [pass,  setPass ] = useState("");
  const [err,   setErr ]  = useState("");
  const { login } = useAuth();
  const nav = useNavigate();

  const onSubmit = e => {
    e.preventDefault();
    login(phone, pass)
      .then(() => nav("/profile"))
      .catch(() => setErr("Неверный телефон или пароль"));
  };

  return (
    <form className="auth-form" onSubmit={onSubmit}>
      <h2>Вход</h2>

      <input
        placeholder="Телефон"
        value={phone}
        onChange={e => setPhone(e.target.value)}
        required
      />

      <input
        type="password"
        placeholder="Пароль"
        value={pass}
        onChange={e => setPass(e.target.value)}
        required
      />

      {err && <div className="err">{err}</div>}

      <button>Войти</button>

      <div style={{ marginTop: 8, fontSize: 14 }}>
        Нет аккаунта?{" "}
        <Link to="/signup" style={{ color: "#4ea4ff" }}>
          Зарегистрироваться
        </Link>
      </div>
    </form>
  );
}
