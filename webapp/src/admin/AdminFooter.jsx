import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminHeader from "./AdminHeader";

const AdminFooter = () => {
  const [links, setLinks] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [editId, setEditId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const navigate = useNavigate();

  // Устойчивая проверка токена при маунте
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      navigate("/admin/login", { replace: true });
    }
    // Не делаем return! Только навигация если нет токена.
    // Далее — грузим ссылки (fetchLinks ниже)
    fetchLinks();
    // eslint-disable-next-line
  }, []);

  // Грузим полезные ссылки
  const fetchLinks = async () => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      navigate("/admin/login", { replace: true });
      return;
    }
    try {
      const response = await fetch("/footer", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.status === 401) {
        localStorage.removeItem("auth_token");
        navigate("/admin/login", { replace: true });
        return;
      }
      const data = await response.json();
      setLinks(data);
    } catch (error) {
      // Ошибку логируем, если надо
      console.error("Ошибка загрузки ссылок:", error);
    }
  };

  // Добавление новой ссылки
  const handleAdd = async e => {
    e.preventDefault();
    const token = localStorage.getItem("auth_token");
    if (!token) {
      navigate("/admin/login", { replace: true });
      return;
    }
    try {
      const response = await fetch("/footer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ title: newTitle, url: newUrl })
      });
      if (response.status === 401) {
        localStorage.removeItem("auth_token");
        navigate("/admin/login", { replace: true });
        return;
      }
      setNewTitle("");
      setNewUrl("");
      fetchLinks();
    } catch (error) {
      console.error("Ошибка при добавлении:", error);
    }
  };

  // Удаление ссылки
  const handleDelete = async id => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      navigate("/admin/login", { replace: true });
      return;
    }
    try {
      const response = await fetch(`/footer/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.status === 401) {
        localStorage.removeItem("auth_token");
        navigate("/admin/login", { replace: true });
        return;
      }
      fetchLinks();
    } catch (error) {
      console.error("Ошибка при удалении:", error);
    }
  };

  // Начать редактирование
  const handleEdit = link => {
    setEditId(link.id);
    setEditTitle(link.title);
    setEditUrl(link.url);
  };

  // Сохранить изменения
  const handleSave = async id => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      navigate("/admin/login", { replace: true });
      return;
    }
    try {
      const response = await fetch(`/footer/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ title: editTitle, url: editUrl })
      });
      if (response.status === 401) {
        localStorage.removeItem("auth_token");
        navigate("/admin/login", { replace: true });
        return;
      }
      setEditId(null);
      fetchLinks();
    } catch (error) {
      console.error("Ошибка при обновлении:", error);
    }
  };

  return (
    <div className="admin-footer admin-container">
      <AdminHeader />
      <h2>Полезные ссылки</h2>
      <form onSubmit={handleAdd} className="footer-add-row" style={{ marginBottom: 24, display: "flex", gap: 12 }}>
        <input
          type="text"
          placeholder="Название"
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          required
        />
        <input
          type="url"
          placeholder="URL"
          value={newUrl}
          onChange={e => setNewUrl(e.target.value)}
          required
        />
        <button type="submit">Добавить</button>
      </form>
      <table style={{ width: "100%", background: "#212232", color: "#fff", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ width: "38%" }}>Название</th>
            <th style={{ width: "48%" }}>URL</th>
            <th style={{ width: "14%" }}>Действия</th>
          </tr>
        </thead>
        <tbody>
          {links.map(link =>
            editId === link.id ? (
              <tr key={link.id}>
                <td>
                  <input value={editTitle} onChange={e => setEditTitle(e.target.value)} />
                </td>
                <td>
                  <input value={editUrl} onChange={e => setEditUrl(e.target.value)} />
                </td>
                <td>
                  <button onClick={() => handleSave(link.id)}>Сохранить</button>
                  <button onClick={() => setEditId(null)}>Отмена</button>
                </td>
              </tr>
            ) : (
              <tr key={link.id}>
                <td>{link.title}</td>
                <td>
                  <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ color: "#6cb2ff" }}>
                    {link.url}
                  </a>
                </td>
                <td>
                  <button onClick={() => handleEdit(link)}>Редактировать</button>
                  <button onClick={() => handleDelete(link.id)}>Удалить</button>
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
};

export default AdminFooter;
