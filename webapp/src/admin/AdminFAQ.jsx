import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminHeader from "./AdminHeader";
import "./Admin.css";

const empty = { question: "", answer: "" };

export default function AdminFAQ() {
  const [faq, setFaq] = useState([]);
  const [newQ, setNewQ] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [editQ, setEditQ] = useState(empty);
  const navigate = useNavigate();

  const loadFAQ = () => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      navigate("/admin/login");
      return;
    }
    fetch("/faq", {
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
      .then(setFaq)
      .catch(() => {
        localStorage.removeItem("auth_token");
        navigate("/admin/login");
      });
  };

  const handleAdd = () => {
    const token = localStorage.getItem("auth_token");
    fetch("/faq", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${token}`,
      },
      body: JSON.stringify(newQ),
    })
      .then(async r => {
        if (!r.ok) throw new Error("Ошибка добавления");
        const created = await r.json();
        setFaq(prev => [...prev, created]);
        setNewQ(empty);
      })
      .catch(e => alert(e.message));
  };

  const handleDelete = id => {
    if (!window.confirm("Удалить FAQ?")) return;
    const token = localStorage.getItem("auth_token");
    fetch(`/faq/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Basic ${token}` }
    })
      .then(r => {
        if (!r.ok) throw new Error("Ошибка удаления");
        setFaq(prev => prev.filter(f => f.id !== id));
      })
      .catch(e => alert(e.message));
  };

  const handleEdit = row => {
    setEditId(row.id);
    setEditQ(row);
  };

  const handleEditSave = () => {
    const token = localStorage.getItem("auth_token");
    fetch(`/faq/${editId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${token}`,
      },
      body: JSON.stringify(editQ),
    })
      .then(async r => {
        if (!r.ok) throw new Error("Ошибка обновления");
        const updated = await r.json();
        setFaq(prev => prev.map(f => (f.id === updated.id ? updated : f)));
        setEditId(null);
        setEditQ(empty);
      })
      .catch(e => alert(e.message));
  };

  useEffect(() => {
    loadFAQ();
    // eslint-disable-next-line
  }, []);

  return (
    <div className="admin-container admin-faq">
      <AdminHeader />
      <h2>FAQ — частые вопросы</h2>
      <div className="faq-add-row">
        <input
          placeholder="Вопрос"
          value={newQ.question}
          onChange={e => setNewQ(q => ({ ...q, question: e.target.value }))}
        />
        <input
          placeholder="Ответ"
          value={newQ.answer}
          onChange={e => setNewQ(q => ({ ...q, answer: e.target.value }))}
        />
        <button onClick={handleAdd}>Добавить</button>
      </div>
      <table>
        <thead>
          <tr>
            <th>Вопрос</th>
            <th>Ответ</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {faq.map(row =>
            editId === row.id ? (
              <tr key={row.id}>
                <td>
                  <input
                    value={editQ.question}
                    onChange={e => setEditQ(q => ({ ...q, question: e.target.value }))}
                  />
                </td>
                <td>
                  <input
                    value={editQ.answer}
                    onChange={e => setEditQ(q => ({ ...q, answer: e.target.value }))}
                  />
                </td>
                <td>
                  <button onClick={handleEditSave}>Сохранить</button>
                  <button onClick={() => setEditId(null)}>Отмена</button>
                </td>
              </tr>
            ) : (
              <tr key={row.id}>
                <td>{row.question}</td>
                <td>{row.answer}</td>
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
