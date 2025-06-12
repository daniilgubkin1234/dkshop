// webapp/src/admin/AdminModelCards.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Admin.css";
import AdminHeader from "./AdminHeader";

const empty = { label: "", models: "", img: "", match_by_name: true };

export default function AdminModelCards() {
  /* ---------- state ---------- */
  const [cards, setCards]         = useState([]);
  const [newCard, setNewCard]     = useState(empty);
  const [editId, setEditId]       = useState(null);
  const [editCard, setEditCard]   = useState(empty);

  const navigate = useNavigate();

  /* ---------- helpers ---------- */
  const uploadFile = async file => {
    const fd = new FormData();
    fd.append("file", file);
    const res  = await fetch("/upload", { method: "POST", body: fd });
    const data = await res.json();
    return data.url;
  };

  /* ---------- загрузка списка ---------- */
  const loadCards = () => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      navigate("/admin/login");
      return;
    }
    fetch("/admin/model_cards", {
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
      .then(setCards)
      .catch(() => {
        localStorage.removeItem("auth_token");
        navigate("/admin/login");
      });
  };

  /* ---------- CRUD ---------- */
  const handleAdd = () => {
    const token = localStorage.getItem("auth_token");
    if (!token) return navigate("/admin/login");

    const body = {
      ...newCard,
      models: newCard.models.split(",").map(s => s.trim()).filter(Boolean),
    };

    fetch("/admin/model_cards", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${token}`,
      },
      body: JSON.stringify(body),
    })
      .then(async r => {
        if (!r.ok) throw new Error("Ошибка создания");
        const created = await r.json();
        setCards(prev => [...prev, created]);
        setNewCard(empty);
      })
      .catch(e => alert(e.message));
  };

  const handleDelete = id => {
    if (!window.confirm("Удалить карточку?")) return;
    const token = localStorage.getItem("auth_token");
    fetch(`/admin/model_cards/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Basic ${token}` },
    })
      .then(r => {
        if (!r.ok) throw new Error("Ошибка удаления");
        setCards(prev => prev.filter(c => c.id !== id));
      })
      .catch(e => alert(e.message));
  };

  const handleEdit = row => {
    setEditId(row.id);
    setEditCard({
      ...row,
      models: (row.models || []).join(", "),
    });
  };

  const handleEditSave = () => {
    const token = localStorage.getItem("auth_token");
    const body = {
      ...editCard,
      models: editCard.models.split(",").map(s => s.trim()).filter(Boolean),
    };
    fetch(`/admin/model_cards/${editId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${token}`,
      },
      body: JSON.stringify(body),
    })
      .then(async r => {
        if (!r.ok) throw new Error("Ошибка сохранения");
        const updated = await r.json();
        setCards(prev => prev.map(c => (c.id === updated.id ? updated : c)));
        setEditId(null);
        setEditCard(empty);
      })
      .catch(e => alert(e.message));
  };

  /* ---------- первый рендер ---------- */
  useEffect(() => {
    loadCards();
    // eslint-disable-next-line
  }, []);

  /* ---------- UI ---------- */
  return (
    <div className="admin-container admin-modelcards">
      <AdminHeader />
      <h2>Карточки моделей</h2>

      {/* --- добавление --- */}
      <div className="modelcard-add-row">
        <input
          placeholder="Заголовок"
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
          style={{ minWidth: 180 }}
        />
        <input
          type="file"
          accept="image/*"
          onChange={async e => {
            const f = e.target.files?.[0];
            if (f) {
              const url = await uploadFile(f);
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
          по&nbsp;названию
        </label>
        <button onClick={handleAdd}>Добавить</button>
      </div>

      {/* --- таблица --- */}
      <table className="admin-table" cellPadding="8">
        <thead>
          <tr>
            <th>ID</th><th>Заголовок</th><th>Модели</th><th>Картинка</th><th>by&nbsp;Name</th><th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {cards.map(row =>
            editId === row.id ? (
              /* ===== режим редактирования ===== */
              <tr key={row.id}>
                <td>{row.id}</td>
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
                <td style={{ textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={editCard.match_by_name}
                    onChange={e => setEditCard(v => ({ ...v, match_by_name: e.target.checked }))}
                  />
                </td>
                <td>
                  <button onClick={handleEditSave}>Сохранить</button>
                  <button onClick={() => setEditId(null)}>Отмена</button>
                </td>
              </tr>
            ) : (
              /* ===== режим просмотра ===== */
              <tr key={row.id}>
                <td>{row.id}</td>
                <td>{row.label}</td>
                <td style={{ whiteSpace: "pre-wrap", maxWidth: 240 }}>
                  {(row.models || []).join(", ")}
                </td>
                <td>
                  {row.img && (
                    <img
                      src={row.img}
                      alt=""
                      style={{ height: 40, borderRadius: 4, background: "#fff" }}
                    />
                  )}
                </td>
                <td style={{ textAlign: "center" }}>{row.match_by_name ? "✓" : ""}</td>
                <td>
                  <button onClick={() => handleEdit(row)}>Ред.</button>
                  <button
                    style={{ background: "#e53935", color: "#fff" }}
                    onClick={() => handleDelete(row.id)}
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
