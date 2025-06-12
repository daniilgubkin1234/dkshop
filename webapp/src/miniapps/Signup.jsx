// webapp/src/miniapps/Signup.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerApi } from "../api";

export default function Signup() {
  const [form, set] = useState({ phone:"", name:"", password_hash:"" });
  const nav = useNavigate();

  const onChange = e => set({ ...form, [e.target.name]: e.target.value });
  const onSubmit = e => {
    e.preventDefault();
    registerApi(form).then(()=>nav("/login"));
  };

  return (
    <form className="auth-form" onSubmit={onSubmit}>
      <h2>Регистрация</h2>
      <input name="name" placeholder="Имя" value={form.name} onChange={onChange} required />
      <input name="phone" placeholder="Телефон" value={form.phone} onChange={onChange} required />
      <input name="password_hash" type="password" placeholder="Пароль"
             value={form.password_hash} onChange={onChange} required />
      <button>Создать аккаунт</button>
    </form>
  );
}
