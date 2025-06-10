import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminHeader from "./AdminHeader";
import "./Admin.css";

const empty = { name: "", url: "" };

export default function AdminFooter() {
  const [links, setLinks] = useState([]);
  const [newLink, setNewLink] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [editLink, setEditLink] = useState(empty);
  const navigate = useNavigate();

  const loadLinks = () => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      navigate("/admin/login");
      return;
    }
    fetch("/footer", {
      headers: { Authorization: `Basic ${token}` }
    })
      .then(async r => {
        if (r.status === 401) {
          localStorage.removeItem("auth_token");
          navigate("/admin/login");
          return [];
        }
        return r.json();
      })
      .then(setLinks)
      .catch(() => {
        localStorage.removeItem("auth_token");
        navigate("/admin/login");
      });
  };

  const handleAdd = () => {
    const token = localStorage.getItem("auth_token");
    fetch("/footer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${token}`,
      },
      body: JSON.stringify(newLink),
    })
      .then(async r => {
        if (!r.ok) throw new Error("Ошибка добавления");
        const created = await r.json();
        setLinks(prev => [...prev, created]);
        setNewLink(empty);
      })
      .catch(e => alert(e.message));
  };

  const handleDelete = id => {
    if (!window.confirm("Удалить ссылку?")) return;
    const token = localStorage.getItem("auth_token");
    fetch(`/footer/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Basic ${token}` }
    })
      .then(r => {
        if (!r.ok) throw new Error("Ошибка удаления");
        setLinks(prev => prev.filter(f => f.id !== id));
      })
      .catch(e => alert(e.message));
  };

  const handleEdit = row => {
    setEditId(row.id);
    setEditLink(row);
  };

  const handleEditSave = () => {
    const token = localStorage.getItem("auth_token");
    fetch(`/footer/${editId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${token}`,
      },
      body: JSON.stringify(editLink),
    })
      .then(async r => {
        if (!r.ok) throw new Error("Ошибка обновления");
        const updated = await r.json();
        setLinks(prev => prev.map(f => (f.id === updated.id ? updated : f)));
        setEditId(null);
        setEditLink(empty);
      })
      .catch(e => alert(e.message));
  };

  useEffect(() => {
    loadLinks();
    // eslint-disable-next-line
  }, []);

  return (
    <div className="admin-container admin-faq">
      <AdminHeader />
      <h2>Управление ссылками подвала</h2>
      <div className="faq-add-row">
        <input
          placeholder="Название"
          value={newLink.name}
          onChange={e => setNewLink(q => ({ ...q, name: e.target.value }))}
        />
        <input
          placeholder="URL"
          value={newLink.url}
          onChange={e => setNewLink(q => ({ ...q, url: e.target.value }))}
        />
        <button onClick={handleAdd}>Добавить</button>
      </div>
      <table>
        <thead>
          <tr>
            <th>Название</th>
            <th>URL</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {links.map(row =>
            editId === row.id ? (
              <tr key={row.id}>
                <td>
                  <input
                    value={editLink.name}
                    onChange={e => setEditLink(q => ({ ...q, name: e.target.value }))}
                  />
                </td>
                <td>
                  <input
                    value={editLink.url}
                    onChange={e => setEditLink(q => ({ ...q, url: e.target.value }))}
                  />
                </td>
                <td>
                  <button onClick={handleEditSave}>Сохранить</button>
                  <button onClick={() => setEditId(null)}>Отмена</button>
                </td>
              </tr>
            ) : (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td>{row.url}</td>
                <td>
                  <button onClick={() => handleEdit(row)}>Редактировать</button>
                  <button onClick={() => handleDelete(row.id)}>Удалить</button>
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}
