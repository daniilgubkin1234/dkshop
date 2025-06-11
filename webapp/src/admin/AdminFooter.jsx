// webapp/src/components/AdminFooter.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminHeader from "./AdminHeader";

export default function AdminFooter() {
  // ─────────── state ───────────
  const [links,      setLinks]      = useState([]);

  const [newTitle,   setNewTitle]   = useState("");
  const [newUrl,     setNewUrl]     = useState("");
  const [newIcon,    setNewIcon]    = useState("");

  const [editId,     setEditId]     = useState(null);
  const [editTitle,  setEditTitle]  = useState("");
  const [editUrl,    setEditUrl]    = useState("");
  const [editIcon,   setEditIcon]   = useState("");

  const navigate = useNavigate();
  const token    = localStorage.getItem("auth_token");
  const headers  = {
    "Content-Type": "application/json",
    Authorization: `Basic ${token}`,
  };

  // ─────────── helpers ───────────
  const ensureAuth = () => {
    if (!token) {
      navigate("/admin/login", { replace: true });
      return false;
    }
    return true;
  };

  const fetchLinks = async () => {
    if (!ensureAuth()) return;
    try {
      const res = await fetch("/footer", { headers });
      if (res.status === 401) {
        localStorage.removeItem("auth_token");
        navigate("/admin/login", { replace: true });
        return;
      }
      setLinks(await res.json());
    } catch (e) {
      console.error("Ошибка загрузки ссылок:", e);
    }
  };

  // ─────────── effects ───────────
  useEffect(fetchLinks, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────── CRUD ───────────
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!ensureAuth()) return;
    try {
      await fetch("/footer", {
        method: "POST",
        headers,
        body: JSON.stringify({ title: newTitle, url: newUrl, icon: newIcon }),
      });
      setNewTitle("");
      setNewUrl("");
      setNewIcon("");
      fetchLinks();
    } catch (e) {
      console.error("Ошибка при добавлении:", e);
    }
  };

  const handleDelete = async (id) => {
    if (!ensureAuth()) return;
    try {
      await fetch(`/footer/${id}`, { method: "DELETE", headers });
      fetchLinks();
    } catch (e) {
      console.error("Ошибка при удалении:", e);
    }
  };

  const handleSave = async (id) => {
    if (!ensureAuth()) return;
    try {
      await fetch(`/footer/${id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ title: editTitle, url: editUrl, icon: editIcon }),
      });
      setEditId(null);
      fetchLinks();
    } catch (e) {
      console.error("Ошибка при обновлении:", e);
    }
  };

  const handleEdit = (l) => {
    setEditId(l.id);
    setEditTitle(l.title);
    setEditUrl(l.url);
    setEditIcon(l.icon || "");
  };

  // ─────────── UI ───────────
  return (
    <div className="admin-footer admin-container">
      <AdminHeader />
      <h2>Полезные ссылки</h2>

      {/* Добавление */}
      <form
        onSubmit={handleAdd}
        className="footer-add-row"
        style={{ display: "flex", gap: 12, marginBottom: 24 }}
      >
        <input
          placeholder="Название"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          required
        />
        <input
          type="url"
          placeholder="URL"
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          required
        />
        <input
          placeholder="Иконка"
          value={newIcon}
          onChange={(e) => setNewIcon(e.target.value)}
          style={{ width: 90 }}
        />
        <button type="submit">Добавить</button>
      </form>

      {/* Таблица */}
      <table style={{ width: "100%", borderCollapse: "collapse", color: "#fff" }}>
        <thead>
          <tr>
            <th style={{ width: "30%" }}>Название</th>
            <th style={{ width: "40%" }}>URL</th>
            <th style={{ width: "10%" }}>Иконка</th>
            <th style={{ width: "20%" }}>Действия</th>
          </tr>
        </thead>
        <tbody>
          {links.map((l) =>
            editId === l.id ? (
              <tr key={l.id}>
                <td>
                  <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                </td>
                <td>
                  <input value={editUrl} onChange={(e) => setEditUrl(e.target.value)} />
                </td>
                <td>
                  <input
                    value={editIcon}
                    onChange={(e) => setEditIcon(e.target.value)}
                    style={{ width: 80 }}
                  />
                </td>
                <td>
                  <button onClick={() => handleSave(l.id)}>Сохранить</button>{" "}
                  <button onClick={() => setEditId(null)}>Отмена</button>
                </td>
              </tr>
            ) : (
              <tr key={l.id}>
                <td>{l.title}</td>
                <td>
                  <a href={l.url} target="_blank" rel="noopener noreferrer" style={{ color: "#6cb2ff" }}>
                    {l.url}
                  </a>
                </td>
                <td style={{ textAlign: "center" }}>{l.icon || "🔗"}</td>
                <td>
                  <button onClick={() => handleEdit(l)}>Редактировать</button>{" "}
                  <button onClick={() => handleDelete(l.id)}>Удалить</button>
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}
