import React, { useEffect, useState } from 'react';
import './ModelScroll.css';

function normalize(s) {
  return (s || "")
    .toLowerCase()
    .replace(/[ё]/g, "е")
    .replace(/[^\wа-я0-9]+/gi, " ") // не буквы/цифры в пробел
    .replace(/\s+/g, " ")
    .trim();
}

export default function ModelScroll({ onSelect }) {
  const [cards, setCards] = useState([]);

  useEffect(() => {
    fetch('/model_cards')
      .then((r) => (r.ok ? r.json() : []))
      .then(setCards)
      .catch(() => setCards([]));
  }, []);

  if (!cards.length) return null; // или спиннер

  return (
    <div className="model-scroll">
      {cards.map(({ id, label, models = [], img, match_by_name }) => (
        <div
          key={id}
          className="model-card"
          onClick={() =>
            onSelect(
              models.map(normalize),      // теперь передаем нормализованные
              !!match_by_name
            )
          }
        >
          <img src={img} alt={label} />
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}
