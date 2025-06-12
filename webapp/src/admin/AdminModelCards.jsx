import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Admin.css";
import AdminHeader from "./AdminHeader";

const empty = { label: "", models: "", img: "", match_by_name: true };

export default function AdminModelCards() {
  /* ---------- state ---------- */
  const [cards, setCards]       = useState([]);
  const [newCard, setNewCard]   = useState(empty);
  const [editId, setEditId]     = useState(null);
  const [editCard, setEditCard] = useState(empty);

  const navigate = useNavigate();
  const token    = localStorage.getItem("auth_token");
  const headers  = {
    "Content-Type": "application/json",
    Authorization: `Basic ${token}`,
  };

  /* ---------- helpers ---------- */
  const authOrRedirect = () => {
    if (!token) {
      navigate("/admin/login", { replace: true });
      return false;
    }
    return true;
  };

  const loadCards = async () => {
    if (!authOrRedirect()) return;
    const r = await fetch("/admin/model_cards", { headers });
    if (r.status === 401) {
      localStorage.removeItem("auth_token");
      navigate("/admin/login", { replace: true });
      return;
    }
    setCards(await r.json());
  };

  useEffect(loadCards, []);                   // eslint-disable-line

  /* ---------- upload ---------- */
  const uploadFile = async file => {
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch("/upload", { method: "POST", body: fd });
    const data = await r.json();
    return data.url;
  };

  /* ---------- handlers ---------- */
  const handleAdd = async e => {
    e.preventDefault();
    if (!authOrRedirect()) return;
    const body = {
      ...newCard,
      models: newCard.models.split(",").map(s => s.trim()).filter(Boolean),
    };
    const r = await fetch("/admin/model_cards", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!r.ok) return alert("Не удалось создать карточку");
    setNewCard(empty);
    loadCards();
  };

  const handleDelete = id =>
    authOrRedirect() &&
    window.confirm("Удалить карточку?") &&
    fetch(`/admin/model_cards/${id}`, { method: "DELETE", headers }).then(loadCards);

  const handleEdit = c => {
    setEditId(c.id);
    setEditCard({ ...c, models: (c.models || []).join(", ") });
  };

  const handleEditSave = async () => {
    if (!authOrRedirect()) return;
    const body = {
      ...editCard,
      models: editCard.models.split(",").map(s => s.trim()).filter(Boolean),
    };
    const r = await fetch(`/admin/model_cards/${editId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
    });
    if (!r.ok) return alert("Ошибка обновления");
    setEditId(null);
    setEditCard(empty);
    loadCards();
  };

  /* ---------- JSX ---------- */
  return (
    <div className="admin-container admin-modelcards">
      <AdminHeader />
      <h2>Карточки каталога</h2>

      {/* форма добавления */}
      <form className="modelcard-add-row" onSubmit={handleAdd}>
        <input
          placeholder="Заголовок"
          required
          value={newCard.label}
          onChange={e => setNewCard(v => ({ ...v, label: e.target.value }))}
        />
        <input
          placeholder="Модели через запятую"
          value={newCard.models}
          onChange={e => setNewCard(v => ({ ...v, models: e.target.value }))}
        />
        <input
          placeholder="URL картинки"
          value={newCard.img}
          onChange={e => setNewCard(v => ({ ...v, img: e.target.value }))}
          style={{ minWidth: 200 }}
        />
        <input
          type="file"
          accept="image/*"
          onChange={async e => {
            const file = e.target.files?.[0];
            if (file) {
              const url = await uploadFile(file);
              setNewCard(v => ({ ...v, img: url }));
            }
          }}
        />
        <label>
          <input
            type="checkbox"
            checked={newCard.match_by_name}
            onChange={e => setNewCard(v => ({ ...v, match_by_name: e.target.checked }))}
          />
          по названию
        </label>
        <button type="submit">Добавить</button>
      </form>

      {/* таблица */}
      <table className="admin-table" cellPadding="8">
        <thead>
          <tr>
            <th>ID</th><th>Заголовок</th><th>Модели</th><th>Картинка</th><th>by Name</th><th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {cards.map(c =>
            editId === c.id ? (
              /* режим редактирования */
              <tr key={c.id}>
                <td>{c.id}</td>
                <td>
                  <input
                    value={editCard.label}
                    onChange={e => setEditCard(v => ({ ...v, label: e.target.value }))}
                  />
                </td>
                <td>
                  <input
                    value={editCard.models}
                    onChange={e => setEditCard(v => ({ ...v, models: e.target.value }))}
                  />
                </td>
                <td>
                  <input
                    value={editCard.img}
                    onChange={e => setEditCard(v => ({ ...v, img: e.target.value }))}
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async e => {
                      const f = e.target.files?.[0];
                      if (f) {
                        const url = await uploadFile(f);
                        setEditCard(v => ({ ...v, img: url }));
                      }
                    }}
                    style={{ marginTop: 6 }}
                  />
                  {editCard.img && <img src={editCard.img} alt="" style={{ height: 40 }} />}
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={editCard.match_by_name}
                    onChange={e => setEditCard(v => ({ ...v, match_by_name: e.target.checked }))}
                  />
                </td>
                <td>
                  <button onClick={handleEditSave}>Сохранить</button>{" "}
                  <button onClick={() => setEditId(null)}>Отмена</button>
                </td>
              </tr>
            ) : (
              /* режим просмотра */
              <tr key={c.id}>
                <td>{c.id}</td>
                <td>{c.label}</td>
                <td style={{ whiteSpace: "pre-wrap", maxWidth: 200 }}>{(c.models || []).join(", ")}</td>
                <td>
                  {c.img && <img src={c.img} alt="" style={{ height: 40, borderRadius: 4 }} />}
                </td>
                <td style={{ textAlign: "center" }}>{c.match_by_name ? "✓" : ""}</td>
                <td>
                  <button onClick={() => handleEdit(c)}>Ред.</button>{" "}
                  <button
                    onClick={() => handleDelete(c.id)}
                    style={{ background: "#e53935", color: "#fff" }}
                  >
                    Удалить
                  </button>
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}
