// webapp/src/components/AdminFooter.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminHeader from "./AdminHeader";

const API = "/admin/footer";          // ← все запросы идут на защищённый префикс

export default function AdminFooter() {
  /* ------------- state ------------- */
  const [links, setLinks] = useState([]);

  const [newTitle, setNewTitle] = useState("");
  const [newUrl,   setNewUrl]   = useState("");
  const [newIcon,  setNewIcon]  = useState("");

  const [editId,   setEditId]   = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editUrl,   setEditUrl]   = useState("");
  const [editIcon,  setEditIcon]  = useState("");

  const navigate = useNavigate();
  const token    = localStorage.getItem("auth_token");
  const headers  = {
    "Content-Type": "application/json",
    Authorization: `Basic ${token}`,
  };

  /* ------------- helpers ------------ */
  const authOrRedirect = () => {
    if (!token) {
      navigate("/admin/login", { replace: true });
      return false;
    }
    return true;
  };

  const loadLinks = async () => {
    if (!authOrRedirect()) return;
    const res = await fetch(API, { headers });
    if (res.status === 401) {
      localStorage.removeItem("auth_token");
      navigate("/admin/login", { replace: true });
      return;
    }
    setLinks(await res.json());
  };

  useEffect(loadLinks, []);              // eslint-disable-line

  /* ------------- CRUD ------------- */
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!authOrRedirect()) return;
    await fetch(API, {
      method: "POST",
      headers,
      body: JSON.stringify({ title: newTitle, url: newUrl, icon: newIcon }),
    });
    setNewTitle(""); setNewUrl(""); setNewIcon("");
    loadLinks();
  };

  const handleDelete = (id) =>
    authOrRedirect() &&
    fetch(`${API}/${id}`, { method: "DELETE", headers }).then(loadLinks);

  const handleSave = (id) =>
    authOrRedirect() &&
    fetch(`${API}/${id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ title: editTitle, url: editUrl, icon: editIcon }),
    }).then(() => { setEditId(null); loadLinks(); });

  /* ------------- UI ------------- */
  return (
    <div className="admin-footer admin-container">
      <AdminHeader />
      <h2>Полезные ссылки</h2>

      {/* ── форма добавления ── */}
      <form onSubmit={handleAdd} style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <input value={newTitle} onChange={e=>setNewTitle(e.target.value)} placeholder="Название" required/>
        <input type="url" value={newUrl} onChange={e=>setNewUrl(e.target.value)} placeholder="URL" required/>
        <input value={newIcon} onChange={e=>setNewIcon(e.target.value)} placeholder="Иконка" style={{width:90}}/>
        <button type="submit">Добавить</button>
      </form>

      {/* ── таблица ── */}
      <table style={{ width:"100%", borderCollapse:"collapse", color:"#fff" }}>
        <thead>
          <tr><th>Название</th><th>URL</th><th>Иконка</th><th>Действия</th></tr>
        </thead>
        <tbody>
          {links.map(l =>
            editId === l.id ? (
              <tr key={l.id}>
                <td><input value={editTitle} onChange={e=>setEditTitle(e.target.value)}/></td>
                <td><input value={editUrl}   onChange={e=>setEditUrl(e.target.value)}/></td>
                <td><input value={editIcon}  onChange={e=>setEditIcon(e.target.value)} style={{width:80}}/></td>
                <td>
                  <button onClick={()=>handleSave(l.id)}>Сохранить</button>{" "}
                  <button onClick={()=>setEditId(null)}>Отмена</button>
                </td>
              </tr>
            ) : (
              <tr key={l.id}>
                <td>{l.title}</td>
                <td><a href={l.url} target="_blank" rel="noopener noreferrer" style={{color:"#6cb2ff"}}>{l.url}</a></td>
                <td style={{textAlign:"center"}}>{l.icon || "🔗"}</td>
                <td>
                  <button onClick={()=>{setEditId(l.id); setEditTitle(l.title); setEditUrl(l.url); setEditIcon(l.icon||"");}}>Ред.</button>{" "}
                  <button onClick={()=>handleDelete(l.id)}>Удалить</button>
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}
