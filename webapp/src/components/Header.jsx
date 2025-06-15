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
            {/* … */}
          </div>
        </div>

        <div className="header-bottom">
          <div className="header-bottom__left">
            {window.TelegramWebApp && (
              <button className="header-back" onClick={handleBack}>←</button>
            )}
            <div className="header-search-wrapper">
              {/* … ваш код поиска … */}
            </div>
          </div>

          <div className="header-bottom__right">
            <button className="header-menu" onClick={toggleSidebar}>
              {/* … иконка гамбургера … */}
            </button>
            <CartLink />
          </div>
        </div>
      </header>

      <div
        className={`sidebar-overlay ${isSidebarOpen ? 'visible' : ''}`}
        onClick={toggleSidebar}
      />

      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <button className="sidebar-close" onClick={toggleSidebar}>×</button>
        </div>
        <nav className="sidebar-nav">
          <ul>
            <li><a href="#!" onClick={() => openInfo('payment')}>Оплата заказа</a></li>
            <li><a href="#!" onClick={() => openInfo('refund')}>Возврат</a></li>
            <li><a href="#!" onClick={() => openInfo('delivery')}>Доставка</a></li>
            <li><a href="#!" onClick={() => openInfo('contacts')}>Контакты</a></li>

            {isLoggedIn && (
              <li>
                <Link to="/profile" onClick={toggleSidebar}>
                  Личный кабинет
                </Link>
              </li>
            )}

            <li>
              <Link to="/my-orders" onClick={toggleSidebar}>
                Мои заказы
              </Link>
            </li>

            {isLoggedIn && (
              <li>
                <Link
                  to="/admin/orders"
                  className="admin-link"
                  onClick={toggleSidebar}
                >
                  🛠 Панель администратора
                </Link>
              </li>
            )}
          </ul>
        </nav>
      </aside>

      {infoContent && (
        <div
          className="info-modal-overlay"
          onClick={() => setInfoContent('')}
        >
          {/* … модалка … */}
        </div>
      )}
    </>
  );
};

export default Header;
