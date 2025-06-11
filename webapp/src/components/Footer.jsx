import React, { useEffect, useState } from "react";
import "./Footer.css";

export default function Footer() {
  const [links, setLinks] = useState([]);

  useEffect(() => {
    fetch("/footer")
      .then(r => r.ok ? r.json() : [])
      .then(setLinks)
      .catch(() => setLinks([]));
  }, []);

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-links">
          <h4 className="footer-title">Полезные ссылки</h4>
          <ul className="footer-list">
            {links.map(l => (
              <li key={l.id}>
                <a href={l.url} className="footer-link" target="_blank" rel="noopener noreferrer">
                  <span className="footer-icon">{l.icon || "🔗"}</span>
                  <span className="footer-text">{l.title}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="footer-contact">
          <h4 className="footer-title">Контактный телефон</h4>
          <a className="footer-phone" href="tel:+78482636363">8 848 263 63 63</a>
        </div>
      </div>
    </footer>
  );
}
