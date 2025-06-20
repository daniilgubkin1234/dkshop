// webapp/src/components/Header.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import CartLink from "./CartLink.jsx";
import { API_URL } from "../api.js";
import "./Header.css";

export default function Header({ onSearch }) {
  const [query, setQuery] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [infoTitle, setInfoTitle] = useState("");
  const [infoContent, setInfoContent] = useState("");
  const [pages, setPages] = useState([]); // <- загружаемые пункты меню

  const navigate = useNavigate();
  const isAdmin = localStorage.getItem("auth_token") !== null;
  const user = JSON.parse(localStorage.getItem("dkshop_user") || "null");
  const isLoggedIn = Boolean(user?.id);

  /* ─── Загружаем все статичные страницы ─── */
  useEffect(() => {
    fetch(`${API_URL}/info`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setPages)
      .catch(console.error);
  }, []);

  /* ─── Telegram WebApp back-button ─── */
  useEffect(() => {
    if (window.TelegramWebApp) {
      window.TelegramWebApp.ready();
      window.TelegramWebApp.BackButton.show();
    }
  }, []);

  const handleBack = () =>
    window.TelegramWebApp
      ? window.TelegramWebApp.BackButton.click()
      : window.history.back();

  const handleSearchChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    onSearch?.(v);
  };

  const toggleSidebar = () => setIsSidebarOpen((p) => !p);
  const handleLogoClick = () => navigate("/");

  /* ─── Открываем выбранную страницу в модалке ─── */
  const openInfo = (slug) => {
    const page = pages.find((p) => p.slug === slug);
    if (!page) return; // на случай, если slug ещё не создан
    setInfoTitle(page.title);
    setInfoContent(page.content);
    toggleSidebar();
  };

  return (
    <>
      {/* ---------- top ---------- */}
      <header className="header-container">
        <div className="header-top">
          <div className="header-top__left" onClick={handleLogoClick}>
            <img src="/models/dklogo.png" alt="logo" className="header-logo-image" />
            <span className="header-logo-text">DK PROduct</span>
          </div>

          <div className="header-top__right">
            <a
              href="https://vk.com/dk_pro_tuning?from=groups"
              target="_blank"
              rel="noopener noreferrer"
              className="header-official"
            >
              <span>Official channel</span>
            </a>
          </div>
        </div>

        {/* ---------- bottom ---------- */}
        <div className="header-bottom">
          <div className="header-bottom__left">
            {window.TelegramWebApp && (
              <button className="header-back" onClick={handleBack}>
                ←
              </button>
            )}

            <div className="header-search-wrapper">
              <span className="header-search-icon-left">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#9e9e9e">
                  <path d="M15.5 14h-.79l-.28-.27a6.471 6.471 0 001.48-5.34C15.18 5.75 12.43 3 9 3S2.82 5.75 2.82 9.39 5.57 15.78 9 15.78c1.61 0 3.09-.59 4.23-1.57l.27.27v.79l4.25 4.25a1 1 0 001.42-1.42L15.5 14z" />
                </svg>
              </span>
              <input
                type="text"
                className="header-input"
                placeholder="Я ищу…"
                value={query}
                onChange={handleSearchChange}
              />
            </div>
          </div>

          <div className="header-bottom__right">
            <button className="header-menu" onClick={toggleSidebar}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
                <path d="M3 12h18v2H3zM3 6h18v2H3zM3 18h18v2H3z" />
              </svg>
            </button>
            <CartLink />
          </div>
        </div>
      </header>

      {/* ---------- sidebar ---------- */}
      <div
        className={`sidebar-overlay ${isSidebarOpen ? "visible" : ""}`}
        onClick={toggleSidebar}
      />
      <aside className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <button className="sidebar-close" onClick={toggleSidebar}>
            ×
          </button>
        </div>

        <nav className="sidebar-nav">
          <ul>
            {/* динамически выводим все страницы */}
            {pages.map((p) => (
              <li key={p.slug}>
                <a href="#" onClick={() => openInfo(p.slug)}>
                  {p.title}
                </a>
              </li>
            ))}

            {isLoggedIn && (
              <li>
                <Link to="/profile" onClick={toggleSidebar}>
                  Личный кабинет
                </Link>
              </li>
            )}

            {isAdmin && (
              <li>
                <Link
                  to="/admin/orders"
                  className="admin-link"     
                onClick={toggleSidebar}
                >
                  Панель администратора
                </Link>
              </li>
            )}
          </ul>
        </nav>
      </aside>

      {/* ---------- modal ---------- */}
      {infoContent && (
        <div className="info-modal-overlay" onClick={() => setInfoContent("")}>
          <div className="info-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{infoTitle}</h3>
            <pre>{infoContent}</pre>
            <button onClick={() => setInfoContent("")}>Закрыть</button>
          </div>
        </div>
      )}
    </>
  );
}
