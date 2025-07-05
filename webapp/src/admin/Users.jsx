import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminHeader from "./AdminHeader.jsx";
import './AdminInfo.css';

const empty = { username: "", password: "", is_super: false };

export default function Users() {
  const [users, setUsers]     = useState([]);
  const [form, setForm]       = useState(empty);
  const [editId, setEditId]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const nav  = useNavigate();

  // ВЕЗДЕ добавлен /api/
  const api = (url, opt={}) =>
    fetch(url, {
      ...opt,
      headers: {
        "Content-Type": "application/json",
        ...opt.headers,
      },
      credentials: "include",
    });

  const load = () => {
    setLoading(true);
    setError("");
    api("/api/admin/users")
      .then(r => {
        if (r.status === 401 || r.status === 403) {
          nav("/admin/login");
          return [];
        }
        return r.json();
      })
      .then(setUsers)
      .catch(() => setError("Нет доступа или ошибка сети"))
      .finally(() => setLoading(false));
  };

  // create / update
  const save = async () => {
    setError("");
    if (!form.username.trim() || (!editId && !form.password.trim()))
      return alert("Введите логин и пароль");
    const url    = editId
      ? `/api/admin/users/${editId}` // исправлено!
      : "/api/admin/users";          // исправлено!
    const method = editId ? "PATCH" : "POST";
    const body   = { ...form };
    if (!form.password) delete body.password;

    try {
      const res = await api(url, { method, body: JSON.stringify(body) });
      if (!res.ok) {
        const err = await res.json();
        setError(err.detail || "Ошибка запроса");
        return;
      }
      const user = await res.json();
      setUsers(users => {
        const idx = users.findIndex(u => u.id === user.id);
        if (idx === -1) return [...users, user];
        const copy = [...users];
        copy[idx] = user;
        return copy;
      });
      setForm(empty);
      setEditId(null);
      setShowPassword(false);
    } catch {
      setError("Ошибка сети");
    }
  };

  const del = id =>
    window.confirm("Удалить пользователя?") &&
    api(`/api/admin/users/${id}`, { method: "DELETE" })
      .then(r => {
        if (r.ok) setUsers(u => u.filter(x => x.id !== id));
        else setError("Ошибка удаления");
      });

  useEffect(load, []); // eslint-disable-line

  return (
    <div className="admin-container">
      <AdminHeader />
      <h2>Пользователи панели</h2>
      {error && <p style={{color: "red"}}>{error}</p>}
      <div className="info-add-row">
        <input
          placeholder="Логин"
          value={form.username}
          onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
        />
        <div style={{ display: "flex", alignItems: "center" }}>
          <input
            type={showPassword ? "text" : "password"}
            placeholder={editId ? "Новый пароль (оставьте пустым чтобы не менять)" : "Пароль"}
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            style={{ flex: 1 }}
          />
          <button
            type="button"
            className="toggle-password"
            onClick={() => setShowPassword(v => !v)}
            style={{
              marginLeft: 6,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
              height: 32,
              width: 32,
              justifyContent: "center",
            }}
            tabIndex={-1}
            title={showPassword ? "Скрыть пароль" : "Показать пароль"}
          >
            {showPassword ? (
              // перечёркнутый глаз
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M17.94 17.94A10.08 10.08 0 0 1 12 19.88C5 19.88 2.09 15.48 2 15.34a1 1 0 0 1 0-1.13C2.39 14 4.67 10.3 9 8.12l-2.65-2.65 1.41-1.41 16.97 16.97-1.41 1.41-2.65-2.65zM12 16.5c-5 0-8.06-2.72-9.14-4.01A13.34 13.34 0 0 1 4.33 8.95l2.02 2.02a3.5 3.5 0 0 0 4.88 4.88l2.02 2.02A8.64 8.64 0 0 1 12 16.5zm6.29-2.12-1.41-1.41c.38-.43.71-.89.99-1.37C19.94 10.28 22.27 12 22.27 12S18.64 16.5 12 16.5A8.61 8.61 0 0 1 7.32 14.38l1.47-1.47A3.48 3.48 0 0 0 12 14.5a3.5 3.5 0 0 0 2.5-5.5 3.48 3.48 0 0 0-.59-2.21l1.47-1.47A8.61 8.61 0 0 1 12 7.5C18.64 7.5 22.27 12 22.27 12S20.73 10.24 18.29 8.38Z" fill="currentColor"/>
                <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2"/>
              </svg>
            ) : (
              // обычный глаз
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5C21.27 7.61 17 4.5 12 4.5zm0 13a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11zm0-9A3.5 3.5 0 1 0 12 15a3.5 3.5 0 0 0 0-7z" fill="currentColor"/>
              </svg>
            )}
          </button>
        </div>
        {editId && (
          <small style={{ color: "#888", marginLeft: 8, marginTop: 2, display: "block" }}>
            Если оставить поле пустым, пароль не изменится
          </small>
        )}
        <label>
          <input
            type="checkbox"
            checked={form.is_super}
            onChange={e => setForm(f => ({ ...f, is_super: e.target.checked }))}
          /> суперадмин
        </label>
        <button onClick={save}>{editId ? "Сохранить" : "Добавить"}</button>
      </div>
      {loading ? (
        <p>Загрузка…</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Логин</th>
              <th>Роль</th>
              <th>Создан</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.username}</td>
                <td>{u.is_super ? "суперадмин" : "менеджер"}</td>
                <td>{u.created_at?.split("T")[0]}</td>
                <td>
                  <button onClick={() => {
                    setForm({ username: u.username, password: "", is_super: u.is_super });
                    setEditId(u.id);
                    setShowPassword(false);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}>✎</button>
                  <button style={{ background: "#e53935", color: "#fff" }}
                          onClick={() => del(u.id)}>🗑</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
