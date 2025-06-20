// webapp/src/admin/AdminInfo.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminHeader   from "./AdminHeader.jsx";
import "./Admin.css";

const emptyPage = { slug: "payment", title: "", content: "" };
const SLUGS = [
  { value: "payment",  label: "Оплата заказа" },
  { value: "refund",   label: "Возврат" },
  { value: "delivery", label: "Доставка" },
  { value: "contacts", label: "Контакты" },
];

export default function AdminInfo() {
  const [pages, setPages]         = useState([]);
  const [newPage, setNewPage]     = useState(emptyPage);
  const [editId, setEditId]       = useState(null);
  const [editPage, setEditPage]   = useState(emptyPage);
  const [loading, setLoading]     = useState(false);
  const navigate = useNavigate();
  const token    = localStorage.getItem("auth_token");

  /* ---------- helpers ---------- */
  const req = (url, opts={}) =>
    fetch(url, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${token}`,
        ...opts.headers,
      },
    });

  const loadPages = () => {
    if (!token) return navigate("/admin/login");
    setLoading(true);
    req("https://dkshopbot.ru/admin/info")
      .then(r => (r.status === 401 ? [] : r.json()))
      .then(setPages)
      .finally(() => setLoading(false));
  };

  /* ---------- CRUD ---------- */
  const handleAdd = () => {
    if (!newPage.title.trim()) return alert("Введите заголовок");
    req("https://dkshopbot.ru/admin/info", {
      method: "POST",
      body: JSON.stringify(newPage),
    })
      .then(r => r.json())
      .then(p => {
        setPages(prev => [...prev, p]);
        setNewPage(emptyPage);
      });
  };

  const handleDelete = id => {
    if (!window.confirm("Удалить эту страницу?")) return;
    req(`https://dkshopbot.ru/admin/info/${id}`, { method: "DELETE" })
      .then(() => setPages(prev => prev.filter(p => p.id !== id)));
  };

  const handleEditSave = () => {
    if (!editPage.title.trim()) return alert("Введите заголовок");
    req(`https://dkshopbot.ru/admin/info/${editId}`, {
      method: "PATCH",
      body: JSON.stringify(editPage),
    })
      .then(r => r.json())
      .then(p => {
        setPages(prev => prev.map(item => (item.id === p.id ? p : item)));
        setEditId(null);
      });
  };

  useEffect(loadPages, []); // eslint-disable-line

  /* ---------- render ---------- */
  return (
    <div className="admin-container">
      <AdminHeader />
      <h2>Информация</h2>

      {/* ----- add row ----- */}
      <div className="info-add-row">
        <select
          value={newPage.slug}
          onChange={e => setNewPage(p => ({ ...p, slug: e.target.value }))}>
          {SLUGS.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <input
          placeholder="Заголовок"
          value={newPage.title}
          onChange={e => setNewPage(p => ({ ...p, title: e.target.value }))}
        />
        <input
          placeholder="Содержимое"
          value={newPage.content}
          onChange={e => setNewPage(p => ({ ...p, content: e.target.value }))}
        />
        <button onClick={handleAdd}>Добавить / Обновить</button>
      </div>

      {/* ----- table ----- */}
      {loading ? (
        <p>Загрузка…</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Слаг</th><th>Заголовок</th>
              <th>Контент</th><th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {pages.map(p =>
              editId === p.id ? (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td>{p.slug}</td>
                  <td>
                    <input
                      value={editPage.title}
                      onChange={e => setEditPage(v => ({ ...v, title: e.target.value }))}
                    />
                  </td>
                  <td>
                    <input
                      value={editPage.content}
                      onChange={e => setEditPage(v => ({ ...v, content: e.target.value }))}
                    />
                  </td>
                  <td>
                    <button onClick={handleEditSave}>Сохранить</button>
                    <button onClick={() => setEditId(null)}>Отмена</button>
                  </td>
                </tr>
              ) : (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td>{p.slug}</td>
                  <td>{p.title}</td>
                  <td style={{ whiteSpace: "pre-wrap" }}>{p.content}</td>
                  <td>
                    <button onClick={() => { setEditId(p.id); setEditPage(p); }}>
                      Редактировать
                    </button>
                    <button
                      style={{ background: "#e53935", color: "#fff" }}
                      onClick={() => handleDelete(p.id)}
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
