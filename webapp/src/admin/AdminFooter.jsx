import React, { useEffect, useState } from "react";
import AdminHeader from "./AdminHeader";

const emptyLink = { href: "", icon: "", text: "" };

export default function AdminFooter() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newLink, setNewLink] = useState(emptyLink);
  const [editId, setEditId] = useState(null);
  const [editLink, setEditLink] = useState(emptyLink);
  const token = localStorage.getItem("auth_token");

  // Загрузка списка ссылок
  const loadLinks = () => {
    setLoading(true);
    fetch("/footer_links")
      .then(r => r.json())
      .then(setLinks)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  // Добавить новую ссылку
  const handleAdd = () => {
    fetch("/footer_links", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Basic ${token}` } : {}),
      },
      body: JSON.stringify(newLink),
    })
      .then(async r => {
        if (!r.ok) throw new Error("Ошибка добавления");
        const created = await r.json();
        setLinks(prev => [...prev, created]);
        setNewLink(emptyLink);
      })
      .catch(e => alert(e.message));
  };

  // Удалить ссылку
  const handleDelete = id => {
    if (!window.confirm("Удалить ссылку?")) return;
    fetch(`/footer_links/${id}`, {
      method: "DELETE",
      headers: {
        ...(token ? { Authorization: `Basic ${token}` } : {}),
      },
    })
      .then(r => {
        if (!r.ok) throw new Error("Ошибка удаления");
        setLinks(prev => prev.filter(l => l.id !== id));
      })
      .catch(e => alert(e.message));
  };

  // Начать редактировать
  const handleEdit = link => {
    setEditId(link.id);
    setEditLink(link);
  };

  // Сохранить изменения
  const handleEditSave = () => {
    fetch(`/footer_links/${editId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Basic ${token}` } : {}),
      },
      body: JSON.stringify(editLink),
    })
      .then(async r => {
        if (!r.ok) throw new Error("Ошибка обновления");
        const updated = await r.json();
        setLinks(prev => prev.map(l => (l.id === updated.id ? updated : l)));
        setEditId(null);
        setEditLink(emptyLink);
      })
      .catch(e => alert(e.message));
  };

  useEffect(() => {
    loadLinks();
  }, []);

  return (
    <div className="admin-container admin-footer">
      <AdminHeader />
      <h2>Управление полезными ссылками футера</h2>

      <div className="footer-add-row">
        <input
          placeholder="Ссылка (href, напр. /about)"
          value={newLink.href}
          onChange={e => setNewLink(l => ({ ...l, href: e.target.value }))}
        />
        <input
          placeholder="Эмодзи (напр. ⭐)"
          value={newLink.icon}
          onChange={e => setNewLink(l => ({ ...l, icon: e.target.value }))}
          style={{ width: 60 }}
        />
        <input
          placeholder="Текст"
          value={newLink.text}
          onChange={e => setNewLink(l => ({ ...l, text: e.target.value }))}
        />
        <button onClick={handleAdd}>Добавить</button>
      </div>

      {loading ? (
        <p>Загрузка…</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Эмодзи</th>
              <th>Текст</th>
              <th>Ссылка</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {links.map(l =>
              editId === l.id ? (
                <tr key={l.id}>
                  <td>
                    <input
                      value={editLink.icon}
                      onChange={e => setEditLink(el => ({ ...el, icon: e.target.value }))}
                      style={{ width: 60 }}
                    />
                  </td>
                  <td>
                    <input
                      value={editLink.text}
                      onChange={e => setEditLink(el => ({ ...el, text: e.target.value }))}
                    />
                  </td>
                  <td>
                    <input
                      value={editLink.href}
                      onChange={e => setEditLink(el => ({ ...el, href: e.target.value }))}
                    />
                  </td>
                  <td>
                    <button onClick={handleEditSave}>Сохранить</button>
                    <button onClick={() => setEditId(null)}>Отмена</button>
                  </td>
                </tr>
              ) : (
                <tr key={l.id}>
                  <td>{l.icon}</td>
                  <td>{l.text}</td>
                  <td>{l.href}</td>
                  <td>
                    <button onClick={() => handleEdit(l)}>Редактировать</button>
                    <button onClick={() => handleDelete(l.id)}>Удалить</button>
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
