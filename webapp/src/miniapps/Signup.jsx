import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerApi } from "../api";

export default function Signup() {
  const [form, set]   = useState({ phone: "", name: "", password: "" });
  const [error, setError] = useState("");
  const [busy,  setBusy]  = useState(false);
  const nav = useNavigate();

  const onChange = (e) =>
    set({ ...form, [e.target.name]: e.target.value });

  const onSubmit = (e) => {
    e.preventDefault();
    setBusy(true);
    registerApi(form)
      .then(() => nav("/login"))
      .catch(async (r) => {
        if (r.status === 409) setError("Такой телефон уже зарегистрирован");
        else {
          const txt = (await r.text().catch(() => "")) || "Ошибка регистрации";
          setError(txt);
        }
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
