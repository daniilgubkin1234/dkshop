import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminHeader from "./AdminHeader";
import './AdminFooter.css';

const API = "/api/admin/footer"; // обновленный путь!
const COMPANY_API = "/api/admin/company";

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
  const [newPhone, setNewPhone] = useState('');
  const navigate = useNavigate();

  // ----------------- Загрузка ссылок -----------------
  const loadLinks = async () => {
    const res = await fetch(API, { credentials: "include" });
    if (res.status === 401) {
      navigate("/admin/login", { replace: true });
      return;
    }
    setLinks(await res.json());
  };

  useEffect(() => {
    loadLinks();
    fetch('/api/company')
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setNewPhone(d.phone));
    // eslint-disable-next-line
  }, []);

  // ----------------- CRUD -----------------
  const handleAdd = async (e) => {
    e.preventDefault();
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ title: newTitle, url: newUrl, icon: newIcon }),
    });
    if (res.status === 401) {
      navigate("/admin/login", { replace: true });
      return;
    }
    setNewTitle(""); setNewUrl(""); setNewIcon("");
    loadLinks();
  };

  const handleDelete = (id) =>
    fetch(`${API}/${id}`, { method: "DELETE", credentials: "include" })
      .then(r => {
        if (r.status === 401) {
          navigate("/admin/login", { replace: true });
          return;
        }
        loadLinks();
      });

  const handleSave = (id) =>
    fetch(`${API}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ title: editTitle, url: editUrl, icon: editIcon }),
    }).then(r => {
      if (r.status === 401) {
        navigate("/admin/login", { replace: true });
        return;
      }
      setEditId(null);
      loadLinks();
    });

  const handleSavePhone = (e) => {
    e.preventDefault();
    fetch(COMPANY_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ phone: newPhone })
    }).then(r => {
      if (r.status === 401) {
        navigate("/admin/login", { replace: true });
        return;
      }
      alert('Телефон обновлён!');
    });
  };

  // ----------------- UI -----------------
  return (
    <div className="admin-footer admin-container">
      <AdminHeader />
      <h2>Полезные ссылки</h2>

      {/* ── форма добавления ── */}
      <form onSubmit={handleAdd} className="footer-add-row">
        <input value={newTitle} onChange={e=>setNewTitle(e.target.value)} placeholder="Название" required/>
        <input type="url" value={newUrl} onChange={e=>setNewUrl(e.target.value)} placeholder="URL" required/>
        <input value={newIcon} onChange={e=>setNewIcon(e.target.value)} placeholder="Иконка" style={{width:90}}/>
        <button type="submit">Добавить</button>
      </form>

      <form onSubmit={handleSavePhone} className="footer-add-row">
        <input
          placeholder="Контактный телефон"
          value={newPhone}
          onChange={e=>setNewPhone(e.target.value)}
          style={{minWidth:220}}
        />
        <button>Сохранить</button>
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
                  <button onClick={()=>{
                    setEditId(l.id);
                    setEditTitle(l.title);
                    setEditUrl(l.url);
                    setEditIcon(l.icon||"");
                  }}>✎</button>{" "}
                  <button onClick={()=>handleDelete(l.id)}>🗑</button>
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}
