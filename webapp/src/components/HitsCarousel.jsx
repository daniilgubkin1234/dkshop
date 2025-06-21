// webapp/src/components/HitsCarousel.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../api.js";
import "./HitsCarousel.css";

const PAGE = 4;           // сколько карточек за раз
const INTERVAL = 3000;    // мс

export default function HitsCarousel() {
  const [hits, setHits]       = useState([]);
  const [page, setPage]       = useState(0);
  const navigate              = useNavigate();

  useEffect(() => {
    fetch(`${API_URL}/hits`)
      .then(r => r.ok ? r.json() : [])
      .then(setHits)
      .catch(() => setHits([]));
  }, []);

  useEffect(() => {
    if (hits.length <= PAGE) return;
    const id = setInterval(
      () => setPage(p => (p + 1) % Math.ceil(hits.length / PAGE)),
      INTERVAL
    );
    return () => clearInterval(id);
  }, [hits]);

  if (hits.length === 0) return null;

  const start = page * PAGE;
  const slice = hits.slice(start, start + PAGE);

  return (
    <div className="hits-wrapper">
      <h2 className="hits-title">Хиты продаж</h2>
      <div className="hits-grid">
        {slice.map(p => (
          <div key={p.id} className="hits-card" onClick={() => navigate(`/product/${p.id}`)}>
            <img
              src={p.images?.[0] || "/static/no-image.png"}
              alt={p.name}
              onError={e => { e.currentTarget.src = "/static/no-image.png"; }}
            />
            <p className="hits-name">{p.name}</p>
            <p className="hits-price">{p.price.toLocaleString()} ₽</p>
          </div>
        ))}
      </div>
    </div>
  );
}
