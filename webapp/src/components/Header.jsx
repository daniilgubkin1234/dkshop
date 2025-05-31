// webapp/src/components/Header.jsx
import React, { useEffect, useState } from 'react';
import './Header.css';

const Header = ({ onSearch }) => {
  const [query, setQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (window.TelegramWebApp) {
      window.TelegramWebApp.ready();
      window.TelegramWebApp.BackButton.show();
    }
  }, []);

  const handleBack = () => {
    if (window.TelegramWebApp) {
      window.TelegramWebApp.BackButton.click();
    } else {
      window.history.back();
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  // Открыть/закрыть боковое меню
  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  return (
    <>
      <header className="header-container">
        {/* Верхняя строка */}
        <div className="header-top">
          <div className="header-top__left">
            <span className="header-logo-text">DK PROduct</span>
          </div>
          <div className="header-top__right">
            <button className="header-official">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="#fff"
                xmlns="http://www.w3.org/2000/svg"
                className="header-official__icon"
              >
                <path d="M12 3C7.03 3 3 7.03 3 12s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm0 16c-3.87 0-7-3.13-7-7 0-1.93.78-3.68 2.05-4.95L12 11v3h3l3.95 3.95C15.68 18.22 13.93 19 12 19z" />
              </svg>
              <span>Official channel</span>
            </button>
          </div>
        </div>

        {/* Нижняя строка */}
        <div className="header-bottom">
          <div className="header-bottom__left">
            {window.TelegramWebApp && (
              <button className="header-back" onClick={handleBack}>
                ←
              </button>
            )}
            <div className="header-search-wrapper">
              <span className="header-search-icon-left">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="#9e9e9e"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M15.5 14h-.79l-.28-.27a6.471 6.471 0 001.48-5.34C15.18 5.75 12.43 3 9 3S2.82 5.75 2.82 9.39 5.57 15.78 9 15.78c1.61 0 3.09-.59 4.23-1.57l.27.27v.79l4.25 4.25c.39.39 1.02.39 1.41 0l.01-.01c.39-.39.39-1.02 0-1.41L15.5 14zm-6.5 0c-2.48 0-4.5-2.02-4.5-4.5S6.52 5 9 5s4.5 2.02 4.5 4.5S11.48 14 9 14z" />
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
            <button className="header-filter">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="#fff"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M3 5h18v2H3zM6 11h12v2H6zM10 17h4v2h-4z" />
              </svg>
            </button>
            {/* Кнопка «гамбургер» */}
            <button className="header-menu" onClick={toggleSidebar}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="#fff"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M3 12h18v2H3zM3 6h18v2H3zM3 18h18v2H3z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* ---------- Выезжающее боковое меню (Sidebar) ---------- */}
      <div
        className={`sidebar-overlay ${isSidebarOpen ? 'visible' : ''}`}
        onClick={toggleSidebar}
      ></div>

      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <button className="sidebar-close" onClick={toggleSidebar}>
            ×
          </button>
        </div>
        <nav className="sidebar-nav">
          <ul>
            <li>
              <a href="#payment" onClick={toggleSidebar}>
                Оплата заказа
              </a>
            </li>
            <li>
              <a href="#refund" onClick={toggleSidebar}>
                Возврат
              </a>
            </li>
            <li>
              <a href="#delivery" onClick={toggleSidebar}>
                Доставка
              </a>
            </li>
            <li>
              <a href="#contacts" onClick={toggleSidebar}>
                Контакты
              </a>
            </li>
            {/* Добавьте другие пункты меню по необходимости */}
          </ul>
        </nav>
      </aside>
    </>
  );
};

export default Header;
