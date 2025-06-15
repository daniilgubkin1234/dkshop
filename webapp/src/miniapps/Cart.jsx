// webapp/src/miniapps/Cart.jsx

import React, { useState, useEffect } from "react";
import { useCart } from "../context/CartContext.jsx";
import { postOrder } from "../api.js";
import { useNavigate } from "react-router-dom";
import "./Cart.css";

export default function Cart() {
  const navigate = useNavigate();

  // Получаем контекст корзины
  let ctx;
  try {
    ctx = useCart();
  } catch (err) {
    console.error("Cart.jsx: useCart() error:", err.message);
    ctx = null;
  }
  const cartItems  = ctx?.cartItems || [];
  const totalPrice = ctx?.totalPrice || 0;
  const clearCart  = ctx?.clearCart || (() => {});

  // Состояние формы и статуса
  const [name, setName]         = useState("");
  const [phone, setPhone]       = useState("");
  const [status, setStatus]     = useState("");
  const [orderInfo, setOrderInfo] = useState(null);

  // Достаем авторизованного телеграм-пользователя из localStorage
  const storedUser = JSON.parse(localStorage.getItem("dkshop_user") || "null");
  const userId     = storedUser?.id;

  // Предзаполняем поля ФИО и телефона, если пользователь вошел
  useEffect(() => {
    if (storedUser) {
      if (storedUser.phone) {
        setPhone(storedUser.phone);
      }
      const fullName = [storedUser.first_name, storedUser.last_name]
        .filter(Boolean)
        .join(" ");
      if (fullName) {
        setName(fullName);
      }
    }
  }, [storedUser]);

  // Отправка заказа на бэкенд
  const postOrderRequest = async (data) => {
    try {
      const response = await postOrder(data);
      setOrderInfo({
        orderId: response.order_id,
        name:    data.name,
        phone:   data.phone,
        items:   data.items,
        total:   totalPrice,
      });
      clearCart();
    } catch (err) {
      console.error("postOrder error:", err);
      setStatus("❌ Не удалось оформить заказ");
    }
  };

  const handleSubmit = () => {
    const phoneValid = /^(?:\+7|8)(?: ?\d){10}$/.test(phone);

    if (!name.trim() || !phoneValid) {
      setStatus("❗ Введите корректные ФИО и номер телефона");
      return;
    }
    if (cartItems.length === 0) {
      setStatus("❗ Ваша корзина пуста");
      return;
    }

    const payload = {
      user_id: userId || null,
      name:    name.trim(),
      phone:   phone.trim(),
      items:   cartItems.map((item) => ({
        product_id: item.id,
        quantity:   item.quantity,
      })),
    };

    postOrderRequest(payload);
  };

  // Если заказ уже оформлен — показываем страницу с деталями
  if (orderInfo) {
    return (
      <div className="cart-empty">
        <h2>✅ Заказ успешно оформлен!</h2>
        <p>Номер заказа: <b>#{orderInfo.orderId}</b></p>
        <p>На имя: <b>{orderInfo.name}</b></p>
        <p>Телефон: <b>{orderInfo.phone}</b></p>
        <p>Позиций: {orderInfo.items.length}</p>
        <p>Сумма: {orderInfo.total.toLocaleString()} ₽</p>
        <button className="btn-back" onClick={() => navigate("/")}>
          Вернуться на главную
        </button>
      </div>
    );
  }

  // Если корзина пуста — показываем заглушку
  if (cartItems.length === 0) {
    return (
      <div className="cart-empty">
        <h2>Ваша корзина пуста</h2>
        <button className="btn-back" onClick={() => navigate("/")}>
          Вернуться в каталог
        </button>
      </div>
    );
  }

  // Основной рендер корзины
  return (
    <div className="cart-container">
      <h2>Ваша корзина ({cartItems.length} позиции)</h2>

      <div className="cart-items">
        {cartItems.map((item) => (
          <div key={item.id} className="cart-item">
            <div className="cart-item__info">
              <p className="cart-item__name">{item.name}</p>
              <p className="cart-item__quantity">
                Количество: {item.quantity}
              </p>
              <p className="cart-item__price">
                Цена: {item.price.toLocaleString()} ₽
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="cart-summary">
        <p className="cart-summary__total">
          Итого: <b>{totalPrice.toLocaleString()} ₽</b>
        </p>

        <div className="cart-form">
          <input
            type="text"
            placeholder="ФИО"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="tel"
            placeholder="Телефон"
            pattern="^(?:\+7|8)(?: ?\d){10}$"
            title="Номер в формате +7xxxxxxxxxx или 8xxxxxxxxxx"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div className="cart-buttons">
          <button className="btn-clear" onClick={() => clearCart()}>
            Очистить корзину
          </button>
          <button className="btn-checkout" onClick={handleSubmit}>
            Оформить заказ
          </button>
        </div>

        {status && <p className="cart-status">{status}</p>}
      </div>
    </div>
  );
}
