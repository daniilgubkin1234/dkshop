// webapp/src/components/Footer.jsx
import React from 'react';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">

        {/* Левая колонка: Полезные ссылки */}
        <div className="footer-links">
          <h4 className="footer-title">Полезные ссылки</h4>
          <ul className="footer-list">
            <li>
              <a href="/reviews" className="footer-link">
                <span className="footer-icon">⭐</span>
                <span className="footer-text">Отзывы</span>
              </a>
            </li>
            <li>
              <a href="/about" className="footer-link">
                <span className="footer-icon">ℹ️</span>
                <span className="footer-text">О компании</span>
              </a>
            </li>
            <li>
              <a href="/warranty" className="footer-link">
                <span className="footer-icon">✅</span>
                <span className="footer-text">Гарантия</span>
              </a>
            </li>
            <li>
              <a href="/offer" className="footer-link">
                <span className="footer-icon">📄</span>
                <span className="footer-text">Оферта</span>
              </a>
            </li>
          </ul>
        </div>

        {/* Правая колонка: Телефон */}
        <div className="footer-contact">
          <h4 className="footer-title">Контактный телефон</h4>
          <a href="tel:+88482636363" className="footer-phone">
            8 848 263 63 63
          </a>
        </div>
      </div>
    </footer>
  );
}
