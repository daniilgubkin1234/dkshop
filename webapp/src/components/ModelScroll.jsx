// webapp/src/components/ModelScroll.jsx
import React, { useEffect, useState } from "react";
import "./ModelScroll.css";               // можно копировать стили из .model-scroll

export default function ModelScroll({ onSelect }) {
  const [cards, setCards] = useState([]);

  useEffect(() => {
    fetch("/model_cards")
      .then(r => r.ok ? r.json() : [])
      .then(setCards)
      .catch(() => setCards([]));
  }, []);

  if (!cards.length) return null;          // или спиннер

  return (
    <div className="model-scroll">
      {cards.map(({ id, label, models, img, match_by_name }) => (
        <div
          key={id}
          className="model-card"
          onClick={() => onSelect(models, !!match_by_name)}
        >
          <img src={img} alt={label} />
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}
