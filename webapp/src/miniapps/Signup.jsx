import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerApi } from "../api";

export default function Signup() {
  const [form,  setForm]  = useState({ phone: "", name: "", password: "" });
  const [error, setError] = useState("");
  const [busy,  setBusy]  = useState(false);
  const nav = useNavigate();

  const onChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");

    registerApi(form)
      .then(() => nav("/login", { replace: true }))
      .catch((err) => {
        if (err.status === 409)
          setError("Телефон уже зарегистрирован");
        else
          setError(err.detail);
      })
      .finally(() => setBusy(false));
  };

  return (
    <form className="auth-form" onSubmit={onSubmit}>
      <h2>Регистрация</h2>

      <input
        name="name"
        placeholder="Имя"
        value={form.name}
        onChange={onChange}
        required
      />
      <input
        name="phone"
        placeholder="Телефон"
        value={form.phone}
        onChange={onChange}
        required
      />
      <input
        name="password"
        type="password"
        placeholder="Пароль"
        value={form.password}
        onChange={onChange}
        required
      />

      {error && <div className="err">{error}</div>}

      <button disabled={busy}>
        {busy ? "Создаём…" : "Создать аккаунт"}
      </button>

      <div style={{ marginTop: 8, fontSize: 14 }}>
        Уже есть аккаунт?{" "}
        <Link to="/login" style={{ color: "#4ea4ff" }}>
          Войти
        </Link>
      </div>
    </form>
  );
}
