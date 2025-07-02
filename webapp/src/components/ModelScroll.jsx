// webapp/src/components/ModelScroll.jsx
// Горизонтальный скролл карточек моделей.
// Поведение:
//   • клик по карточке активирует фильтр товаров
//   • повторный клик по активной карточке снимает фильтр (возврат на «все»)
//   • активная карточка подсвечивается красной рамкой через класс .active

import React, { useEffect, useState } from 'react';
import './ModelScroll.css';

function normalize(s = '') {
  return s
    .toLowerCase()
    .replace(/[ё]/g, 'е')
    .replace(/[^\wа-я0-9]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function ModelScroll({ onSelect }) {
  const [cards, setCards] = useState([]);
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    fetch('/api/model_cards')
      .then((r) => (r.ok ? r.json() : []))
      .then(setCards)
      .catch(() => setCards([]));
  }, []);

  const handleClick = ({ id, models, match_by_name }) => {
    // если кликаем по уже активной — сбрасываем фильтр
    if (activeId === id) {
      setActiveId(null);
      onSelect(null, false);
      return;
    }

    setActiveId(id);
    const norm = (models || []).map(normalize);
    onSelect(norm, !!match_by_name);
  };

  if (!cards.length) return null;

  return (
    <div className="model-scroll">
      {cards.map((c) => (
        <div
          key={c.id}
          className={`model-card${activeId === c.id ? ' active' : ''}`}
          onClick={() => handleClick(c)}
        >
          <img src={c.img} alt={c.label} />
          <span>{c.label}</span>
        </div>
      ))}
    </div>
  );
}
