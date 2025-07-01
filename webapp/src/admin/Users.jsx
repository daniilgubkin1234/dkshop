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
  const nav  = useNavigate();

  const api = (url, opt={}) =>
    fetch(url, {
      ...opt,
      headers: {
        "Content-Type": "application/json",
        ...opt.headers,
      },
      credentials: "include", // cookie!
    });

  const load = () => {
    setLoading(true);
    setError("");
    api("/admin/users")
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
      ? `/admin/users/${editId}`
      : "/admin/users";
    const method = editId ? "PATCH" : "POST";
    const body   = { ...form };
    if (!form.password) delete body.password; // не отправлять пустой пароль на PATCH

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
    } catch {
      setError("Ошибка сети");
    }
  };

  const del = id =>
    window.confirm("Удалить пользователя?") &&
    api(`/admin/users/${id}`, { method: "DELETE" })
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
        <input
          type="password"
          placeholder={editId ? "Новый пароль" : "Пароль"}
          value={form.password}
          onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
        />
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
