import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "./Admin.css";

export default function AdminHeader() {
  const location = useLocation();
  const [isSuper, setIsSuper] = useState(false);

  useEffect(() => {
    // Узнаём статус суперадмина
    fetch("/api/admin/me", { credentials: "include" })
      .then(r => r.ok ? r.json() : {})
      .then(data => setIsSuper(!!data.is_super));
  }, []);

  return (
    <div className="admin-header-nav">
      <Link
        to="/admin/orders"
        className={location.pathname.includes("/orders") ? "active" : ""}
      >
        Заказы
      </Link>
      <Link
        to="/admin/faq"
        className={location.pathname.includes("/faq") ? "active" : ""}
      >
        FAQ
      </Link>
      <Link
        to="/admin/products"
        className={location.pathname.includes("/products") ? "active" : ""}
      >
        Товары
      </Link>
      <Link
        to="/admin/footer"
        className={location.pathname.includes("/footer") ? "active" : ""}
      >
        Полезные ссылки
      </Link>
      <Link
        to="/admin/model_cards"
        className={location.pathname.includes("/model_cards") ? "active" : ""}
      >
        Карточки каталога
      </Link>
      <Link
        to="/admin/info"
        className={location.pathname.includes("/info") ? "active" : ""}
      >
        Информация
      </Link>
      {isSuper && (
        <Link
          to="/admin/users"
          className={location.pathname.includes("/users") ? "active" : ""}
        >
          Пользователи
        </Link>
        
      )}
      <Link
  to="/admin/wholesale_clients"
  className={location.pathname.includes("/wholesale_clients") ? "active" : ""}
>
  Оптовики
</Link>

    </div>
  );
}
