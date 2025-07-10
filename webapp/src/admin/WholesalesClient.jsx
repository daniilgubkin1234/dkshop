import React, { useEffect, useState } from "react";
import { fetchClients, updateClientWholesale } from "../api.js";
import AdminHeader from "./AdminHeader.jsx";
import EditWholesalePrices from "./EditWholesalePrices.jsx";

export default function WholesalesClient() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null); // id редактируемого юзера (для цен)

  useEffect(() => {
    setLoading(true);
    fetchClients()
      .then(setUsers)
      .catch(() => setError("Ошибка загрузки пользователей"))
      .finally(() => setLoading(false));
  }, []);

  const toggleWholesale = (user) => {
    updateClientWholesale(user.id, !user.is_wholesale)
      .then(updated => {
        setUsers(prev =>
          prev.map(u => u.id === updated.id ? updated : u)
        );
      })
      .catch(() => alert("Ошибка обновления статуса"));
  };

  // Обновление данных после сохранения цен
  const reloadClients = () => {
    fetchClients().then(setUsers);
  };

  const filtered = users.filter(u =>
    (u.username || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="admin-container">
      <AdminHeader />
      <h2>База клиентов</h2>
      <input
        placeholder="Поиск по username…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{margin: "8px 0", padding: 4, minWidth: 180}}
      />
      {loading && <p>Загрузка…</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {!loading && !error && (
        <table>
          <thead>
            <tr>
              <th>ID (Telegram)</th>
              <th>Username</th>
              <th>Имя</th>
              <th>Оптовый клиент</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.username || <span style={{color:"#aaa"}}>—</span>}</td>
                <td>{u.first_name} {u.last_name}</td>
                <td style={{ textAlign: "center" }}>
                  {u.is_wholesale ? <span style={{color:"#008000",fontWeight:600}}>✔️</span> : <span style={{color:"#aaa"}}>—</span>}
                </td>
                <td style={{ display: "flex", gap: 6 }}>
                  <button
                    style={{
                      background: u.is_wholesale ? "#e53935" : "#249f34",
                      color: "#fff",
                      border: "none",
                      borderRadius: 4,
                      padding: "4px 10px",
                      cursor: "pointer"
                    }}
                    onClick={() => toggleWholesale(u)}
                  >
                    {u.is_wholesale ? "Снять опт" : "Сделать оптовиком"}
                  </button>
                  <button
                    style={{
                      background: "#296ca8",
                      color: "#fff",
                      border: "none",
                      borderRadius: 4,
                      padding: "4px 10px",
                      cursor: "pointer"
                    }}
                    onClick={() => setEditing(u.id)}
                  >
                    Цены
                  </button>
                  {editing === u.id && (
                    <EditWholesalePrices
                      user={u}
                      onClose={() => setEditing(null)}
                      onSaved={reloadClients}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
