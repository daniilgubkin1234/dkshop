import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminHeader from "./AdminHeader.jsx";

import './AdminInfo.css';
const empty = { slug: "", title: "", content: "" };

export default function AdminInfo() {
  const [pages, setPages] = useState([]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  // универсальный API helper с куками
  const api = (url, opt = {}) =>
    fetch(url, {
      ...opt,
      headers: {
        "Content-Type": "application/json",
        ...opt.headers,
      },
      credentials: "include",
    });

  // загрузка страниц info
  const load = () => {
    setLoading(true);
    api("/api/admin/info")
      .then(r => {
        if (r.status === 401) {
          nav("/admin/login");
          return [];
        }
        return r.json();
      })
      .then(setPages)
      .finally(() => setLoading(false));
  };

  /* ---------- create / update (upsert) ---------- */
  const save = async () => {
    if (!form.slug.trim() || !form.title.trim())
      return alert("Введите slug и заголовок");

    // upsert: если slug существует → PATCH, иначе → POST
    const existed = pages.find(p => p.slug === form.slug);

    const url = existed
      ? `/api/admin/info/${existed.id}`
      : "/api/admin/info";
    const method = existed ? "PATCH" : "POST";

    const res = await api(url, { method, body: JSON.stringify(form) }).then(r => r.json());

    setPages(pages => {
      const idx = pages.findIndex(p => p.id === res.id);
      if (idx === -1) return [...pages, res];
      const copy = [...pages];
      copy[idx] = res;
      return copy;
    });
    setForm(empty);
    setEditId(null);
  };

  const del = id =>
    window.confirm("Удалить страницу?") &&
    api(`/api/admin/info/${id}`, { method: "DELETE" })
      .then(() => setPages(p => p.filter(x => x.id !== id)));

  useEffect(load, []); // eslint-disable-line

  return (
    <div className="admin-container">
      <AdminHeader />
      <h2>Информация</h2>

      {/* ——— форма добавления / обновления ——— */}
      <div className="info-add-row">
        <input
          style={{ minWidth: 120 }}
          placeholder="Slug"
          value={form.slug}
          onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
        />
        <input
          placeholder="Заголовок"
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
        />
        <textarea
          placeholder="Контент"
          value={form.content}
          onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
          rows={4}
          style={{ minWidth: 260, resize: "vertical" }}
        />
        <button onClick={save}>Добавить</button>
      </div>

      {/* ——— таблица ——— */}
      {loading ? (
        <p>Загрузка…</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Slug</th>
              <th>Заголовок</th>
              <th>Контент</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {pages.map(p => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{p.slug}</td>
                <td>{p.title}</td>
                <td style={{ whiteSpace: "pre-wrap" }}>{p.content}</td>
                <td>
                  <button
                    onClick={() => {
                      setForm({ slug: p.slug, title: p.title, content: p.content });
                      setEditId(p.id);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    ✎
                  </button>
                  <button
                    style={{ background: "#e53935", color: "#fff" }}
                    onClick={() => del(p.id)}
                  >
                    🗑
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
