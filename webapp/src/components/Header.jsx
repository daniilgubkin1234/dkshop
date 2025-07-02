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
  const [pages, setPages] = useState([]);
  const [officialChannelUrl, setOfficialChannelUrl] = useState("https://vk.com/dk_pro_tuning?from=groups");
  const [isAdmin, setIsAdmin] = useState(false);

  const navigate = useNavigate();

  // Проверяем статус админа через /api/admin/me
  useEffect(() => {
    fetch("/api/admin/me", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => setIsAdmin(!!data))
      .catch(() => setIsAdmin(false));
  }, []);

  // Загружаем все статичные страницы (и URL для official_channel)
  useEffect(() => {
    fetch(`${API_URL}/info`)
      .then((r) => (r.ok ? r.json() : []))
      .then((pages) => {
        setPages(pages);
        const page = pages.find((p) => p.slug === "official_channel");
        if (page && page.content) setOfficialChannelUrl(page.content);
      })
      .catch(console.error);
  }, []);

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

  const openInfo = (slug) => {
    const page = pages.find((p) => p.slug === slug);
    if (!page) return;
    setInfoTitle(page.title);
    setInfoContent(page.content);
    toggleSidebar();
  };

  // Кнопка выхода
  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {}
    setIsAdmin(false);
    setIsSidebarOpen(false);
    window.location.href = "/"; // Можно заменить на navigate("/")
  };

  // ВЫБИРАЕМ ТОЛЬКО ОТКАЗЫВАЕМСЯ ОТ official_channel для меню
  const sidebarPages = pages.filter((p) => p.slug !== "official_channel");

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
              href={officialChannelUrl}
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
            {/* выводим все страницы КРОМЕ official_channel */}
            {sidebarPages.map((p) => (
              <li key={p.slug}>
                <a href="#" onClick={() => openInfo(p.slug)}>
                  {p.title}
                </a>
              </li>
            ))}

            {isAdmin && (
              <>
                <li>
                  <Link
                    to="/admin/orders"
                    className="admin-link"
                    onClick={toggleSidebar}
                  >
                    Панель администратора
                  </Link>
                </li>
                <li>
                <button
                  className="admin-logout-btn"
                  onClick={handleLogout}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path d="M16 17L21 12L16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M13 5V7C13 8.10457 12.1046 9 11 9H5C3.89543 9 3 8.10457 3 7V17C3 18.1046 3.89543 19 5 19H11C12.1046 19 13 18.1046 13 17V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Выйти из учётки
                  </span>
                </button>
              </li>
              </>
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
