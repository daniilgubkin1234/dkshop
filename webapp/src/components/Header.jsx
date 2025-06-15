// webapp/src/components/Header.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import CartLink from './CartLink.jsx';
import './Header.css';

const Header = ({ onSearch }) => {
  const [query, setQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [infoTitle, setInfoTitle] = useState('');
  const [infoContent, setInfoContent] = useState('');
  const navigate = useNavigate();

  // проверяем, есть ли в localStorage проверенный телеграм-пользователь
  const user = JSON.parse(localStorage.getItem('dkshop_user') || 'null');
  const isLoggedIn = Boolean(user?.id);
  const openInfo = (type) => {
    let title = '';
    let content = '';
    switch (type) {
      case 'payment':
        title = 'Оплата заказа';
        content = `Оплата товара производится на карту Сбербанка.

Также оплата товара производится после оформления корзины в сообществе Вконтакте (при заказе в ВК).`;
        break;
      case 'refund':
        title = 'Возврат';
        content = `ВОЗВРАТ ИЛИ ОБМЕН ТОВАРА НАДЛЕЖАЩЕГО КАЧЕСТВА:

- Срок возврата или обмена: 14 дней после получения.
- Условия: товарный вид, целая упаковка.
- Оплата возврата/обмена: за счёт покупателя.
- Проверка: до 2 рабочих дней.
- Деньги — по предоставленным реквизитам.

ВОЗВРАТ ИЛИ ОБМЕН ТОВАРА НЕНАДЛЕЖАЩЕГО КАЧЕСТВА:

- Заводской брак, некомплект, гарантийный случай.
- Доставка возврата — за счёт продавца.
- Возврат средств: до 10 рабочих дней.

Важно: повреждение упаковки ТК — не основание для возврата. Покупатель подаёт претензию в ТК.`;
        break;
      case 'delivery':
        title = 'Доставка';
        content = `Изготовление и отправка товара — до 15 дней!

Доступные ТК:
- СДЭК: https://www.cdek.ru/calculate
- Энергия: https://nrg-tk.ru/client/calculator/
- Деловые Линии: https://www.dellin.ru/`;
        break;
      case 'contacts':
        title = 'Контакты';
        content = `Технические вопросы: +7(927)705-52-03 (Пн–Пт 9:00–17:00)
Опт: Telegram/WhatsApp +7(967)485-93-90
Оформление и консультации: WhatsApp +7(967)483-32-10`;
        break;
    }
    setInfoTitle(title);
    setInfoContent(content);
    toggleSidebar();
  };
  
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
    if (onSearch) onSearch(value);
  };

  const toggleSidebar = () => setIsSidebarOpen(prev => !prev);

  const handleLogoClick = () => navigate('/');

  return (
    <>
      <header className="header-container">
        <div className="header-top">
          <div
            className="header-top__left"
            onClick={handleLogoClick}
            style={{ cursor: 'pointer' }}
          >
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff">
                <path d="M12 3C7.03 3 3 7.03 3 12s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm0 16c-3.87 0-7-3.13-7-7 0-1.93.78-3.68 2.05-4.95L12 11v3h3l3.95 3.95C15.68 18.22 13.93 19 12 19z" />
              </svg>
              <span>Official channel</span>
            </a>
          </div>
        </div>
        

        {/* -------- низ шапки -------- */}
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
            

            {/* бургер-меню */}
            <button className="header-menu" onClick={toggleSidebar}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
                <path d="M3 12h18v2H3zM3 6h18v2H3zM3 18h18v2H3z" />
              </svg>
            </button>

            {/* корзина */}
            <CartLink />
          </div>
        </div>
      </header>

      {/* -------- сайдбар -------- */}
      <div
        className={`sidebar-overlay ${isSidebarOpen ? "visible" : ""}`}
        onClick={toggleSidebar}
      ></div>

      <aside className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <button className="sidebar-close" onClick={toggleSidebar}>
            ×
          </button>
        </div>
        <nav className="sidebar-nav">
          <ul>
            <li>
              <a href="#!" onClick={() => openInfo("payment")}>
                Оплата заказа
              </a>
            </li>
            <li>
              <a href="#!" onClick={() => openInfo("refund")}>
                Возврат
              </a>
            </li>
            <li>
              <a href="#!" onClick={() => openInfo("delivery")}>
                Доставка
              </a>
            </li>
            <li>
              <a href="#!" onClick={() => openInfo("contacts")}>
                Контакты
              </a>
            </li>

            {/* «Мои заказы» — только когда user_token есть */}
            {isLoggedIn && (
              <li>
                <Link to="/profile" onClick={toggleSidebar}>
                  Личный кабинет
                </Link>
              </li>
            )}

            {/* Убрать регистрацию, логин, ЛК */}
            {/* Админ-панель */}
            
          </ul>
        </nav>
      </aside>

      {/* -------- модальное окно информации -------- */}
      {infoContent && (
        <div
          className="info-modal-overlay"
          onClick={() => setInfoContent("")}
        >
          <div
            className="info-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>{infoTitle}</h3>
            <pre>{infoContent}</pre>
            <button onClick={() => setInfoContent("")}>Закрыть</button>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
