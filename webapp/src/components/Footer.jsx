import React, { useEffect, useState } from "react";
import "./Footer.css";

export default function Footer() {
  const [links, setLinks] = useState([]);
  const [phone, setPhone]   = useState('');

  useEffect(() => {
    fetch("/footer")
      .then(r => r.ok ? r.json() : [])
      .then(setLinks)
      .catch(() => setLinks([]));

    fetch("/company")
      .then(r => r.ok ? r.json() : null)
      .then(data => data && setPhone(data.phone))
      .catch(() => {});
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
          <a className="footer-phone" href={`tel:${phone.replace(/\D/g,'')}`}>
   {        phone || '—'}
          </a>
        </div>
      </div>
    </footer>
  );
}
