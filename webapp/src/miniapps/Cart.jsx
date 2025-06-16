// webapp/src/miniapps/Cart.jsx

import React, { useState, useEffect } from "react";
import { useCart } from "../context/CartContext.jsx";
import { postOrder } from "../api.js";
import { useNavigate } from "react-router-dom";
import "./Cart.css";

export default function Cart() {
  const navigate = useNavigate();

  // 1) Берём из контекста все нужные методы и состояния
  let ctx;
  try {
    ctx = useCart();
  } catch (err) {
    console.error("Cart.jsx: useCart() error:", err.message);
    ctx = {};
  }
  const {
    cartItems = [],
    totalPrice = 0,
    clearCart = () => {},
    removeFromCart = () => {},
    removeOneFromCart = () => {},
    updateQuantity = () => {},
  } = ctx;

  // 2) Локальные поля формы
  const [name, setName]         = useState("");
  const [phone, setPhone]       = useState("");
  const [status, setStatus]     = useState("");
  const [orderInfo, setOrderInfo] = useState(null);

  // 3) Подгружаем пользователя
  const storedUser = JSON.parse(localStorage.getItem("dkshop_user") || "null");
  const userId     = storedUser?.id;

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

  // 4) Отправка заказа
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
    postOrderRequest({
      user_id: userId || null,
      name:    name.trim(),
      phone:   phone.trim(),
      items:   cartItems.map((it) => ({ product_id: it.id, quantity: it.quantity })),
    });
  };

  // 5) Если заказ оформлен — показываем детали
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

  // 6) Если корзина пуста
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

  // 7) Сам компонент корзины
  return (
    <div className="cart-container">
      <h2>Корзина ({cartItems.length} позиции)</h2>

      <div className="cart-list">
        {cartItems.map((item) => (
          <div key={item.id} className="cart-item">
            <img src={item.image} alt={item.name} className="cart-item-image" />
            <div className="cart-item-info">
              <h3 className="cart-item-name">{item.name}</h3>
              <p className="cart-item-price">
                {(item.price ?? 0).toLocaleString()} ₽ за шт.
              </p>
              <div className="cart-item-quantity">
                <input
                  type="number"
                  className="qty-input"
                  value={item.quantity}
                  min="1"
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (isNaN(val) || val < 1) {
                      removeFromCart(item.id);
                    } else {
                      updateQuantity(item.id, val);
                    }
                  }}
                />
              </div>
              <button
                className="btn-remove"
                onClick={() => removeFromCart(item.id)}
              >
                Удалить
              </button>
            </div>
            <div className="cart-item-subtotal">
              <p>{((item.price ?? 0) * item.quantity).toLocaleString()} ₽</p>
            </div>
          </div>
        ))}
      </div>

      <div className="cart-summary">
        <p className="cart-total">Итого: {(totalPrice ?? 0).toLocaleString()} ₽</p>
      </div>

      <div className="checkout-section">
        <h3>Оформление заказа</h3>
        <input
          type="text"
          placeholder="ФИО"
          className="checkout-input"
          value={name}
          onChange={(e) => { setName(e.target.value); setStatus(""); }}
        />
        <input
          type="tel"
          inputMode="tel"
          placeholder="+7 XXX XXX XXXX или 8 XXX XXX XXXX"
          className="checkout-input"
          value={phone}
          onChange={(e) => { setPhone(e.target.value); setStatus(""); }}
          pattern="^(?:\+7|8)(?: ?\d){10}$"
          title="Номер в формате +7 900 900 9192 или 8 900 900 9192"
          required
        />
        <div className="cart-buttons">
          <button className="btn-clear" onClick={clearCart}>
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
