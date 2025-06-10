// src/admin/AdminFAQ.jsx
import React, { useEffect, useState, useRef } from "react";
import "./Admin.css";
import AdminHeader from "./AdminHeader";
function useAutosizeTextArea(value) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.height = "auto";
    ref.current.style.height = ref.current.scrollHeight + "px";
  }, [value]);

  return ref;
}

function FAQRow({ faq, onChange, onSave, onDelete }) {
  const qRef = useAutosizeTextArea(faq.question);
  const aRef = useAutosizeTextArea(faq.answer);

  return (
    <tr>
      <td data-label="Вопрос">
        <textarea
          ref={qRef}
          rows={1}
          value={faq.question}
          onChange={(e) => onChange(faq.id, "question", e.target.value)}
        />
      </td>
      <td data-label="Ответ">
        <textarea
          ref={aRef}
          rows={1}
          value={faq.answer}
          onChange={(e) => onChange(faq.id, "answer", e.target.value)}
        />
      </td>
      <td data-label="Действия">
        <button onClick={() => onSave(faq)}>Сохранить</button>
        <button onClick={() => onDelete(faq.id)}>Удалить</button>
      </td>
    </tr>
  );
}

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
    <div className="admin-container admin-faq">
        <AdminHeader />
      <h2>FAQ – Вопросы и ответы</h2>

      <div className="faq-add-row">
        <input
          placeholder="Новый вопрос"
          value={newQuestion}
          onChange={(e) => setNewQuestion(e.target.value)}
        />
        <input
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
            <FAQRow
              key={faq.id}
              faq={faq}
              onChange={handleChange}
              onSave={handleEditSave}
              onDelete={handleDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
