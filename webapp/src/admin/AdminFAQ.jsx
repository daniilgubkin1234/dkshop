// src/admin/AdminFAQ.jsx
import React, { useEffect, useState } from "react";
import "./Admin.css";

export default function AdminFAQ() {
  const [faqList, setFaqList] = useState([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");

  const token = localStorage.getItem("auth_token");

  const loadFAQs = () => {
    fetch("https://dkshopbot.ru/faq?q=*", {
      headers: { Authorization: `Basic ${token}` },
    })
      .then((r) => r.json())
      .then(setFaqList)
      .catch(console.error);
  };

  const handleAdd = () => {
    fetch("https://dkshopbot.ru/faq", {
      method: "POST",
      headers: {
        Authorization: `Basic ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ question: newQuestion, answer: newAnswer }),
    })
      .then(() => {
        setNewQuestion("");
        setNewAnswer("");
        loadFAQs();
      })
      .catch(console.error);
  };

  const handleDelete = (id) => {
    if (!window.confirm("Удалить этот FAQ?")) return;
    fetch(`https://dkshopbot.ru/faq/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Basic ${token}` },
    })
      .then(loadFAQs)
      .catch(console.error);
  };

  const handleEditSave = (faq) => {
    fetch(`https://dkshopbot.ru/faq/${faq.id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Basic ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question: faq.question,
        answer: faq.answer,
      }),
    })
      .then(loadFAQs)
      .catch(console.error);
  };

  const handleChange = (id, field, value) => {
    setFaqList((prev) =>
      prev.map((faq) =>
        faq.id === id ? { ...faq, [field]: value } : faq
      )
    );
  };

  useEffect(() => {
    loadFAQs();
  }, []);

  return (
    <div className="admin-container">
      <h2>FAQ – Вопросы и ответы</h2>

      <div style={{ marginBottom: 20 }}>
        <input
          style={{ width: "40%", marginRight: 10 }}
          placeholder="Новый вопрос"
          value={newQuestion}
          onChange={(e) => setNewQuestion(e.target.value)}
        />
        <input
          style={{ width: "40%", marginRight: 10 }}
          placeholder="Ответ"
          value={newAnswer}
          onChange={(e) => setNewAnswer(e.target.value)}
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
          {faqList.map((faq) => (
            <tr key={faq.id}>
              <td>
                <input
                  value={faq.question}
                  onChange={(e) => handleChange(faq.id, "question", e.target.value)}
                  style={{ width: "100%" }}
                />
              </td>
              <td>
                <input
                  value={faq.answer}
                  onChange={(e) => handleChange(faq.id, "answer", e.target.value)}
                  style={{ width: "100%" }}
                />
              </td>
              <td>
                <button onClick={() => handleEditSave(faq)}>💾 Сохранить</button>
                <button onClick={() => handleDelete(faq.id)} style={{ marginLeft: 10 }}>
                  🗑️ Удалить
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
