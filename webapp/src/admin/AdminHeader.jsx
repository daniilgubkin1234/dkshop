// src/admin/AdminHeader.jsx
import React from "react";
import { Link, useLocation } from "react-router-dom";
import "./Admin.css";

export default function AdminHeader() {
  const location = useLocation();

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
    </div>
  );
}
