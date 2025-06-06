// webapp/src/miniapps/Cart.jsx

import React, { useState } from "react";
import { useCart } from "../context/CartContext.jsx";
import { postOrder } from "../api.js";
import { useNavigate } from "react-router-dom";
import "./Cart.css";

export default function Cart() {
  // 1. Достаем корзину из контекста
  let ctx;
  try {
    ctx = useCart();
  } catch (err) {
    console.error("Cart.jsx: useCart() error:", err.message);
    ctx = null;
  }

  // Если корзина недоступна (например, компонент вызывают вне контекста)
  if (!ctx) {
    return (
      <div className="cart-empty">
        <h2>Корзина недоступна</h2>
        <button className="btn-back" onClick={() => (window.location.href = "/")}>
          Вернуться на главную
        </button>
      </div>
    );
  }

  const { cartItems, updateQuantity, removeFromCart, clearCart, totalPrice } = ctx;
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("");
  const navigate = useNavigate();
  const [orderInfo, setOrderInfo] = useState(null);
  // 2. Отправка заказа на бэкенд
  const postOrderRequest = async (data) => {
    try {
      const response = await postOrder(data);
      setOrderInfo({
        orderId: response.order_id,
        name: data.name,
        phone: data.phone,
        items: data.items,
        total: totalPrice,
      });
      clearCart();
    } catch (err) {
      console.error("postOrder error:", err);
      setStatus("❌ Не удалось оформить заказ");
    }
  };
  
  // 3. Обработчик клика «Оформить заказ»
  const handleSubmit = () => {
    // Проверяем, что ФИО и телефон заполнены
    if (!name.trim() || !phone.trim()) {
      setStatus("❗ Заполните ФИО и телефон");
      return;
    }

    // Проверяем, что в корзине есть товары
    if (!cartItems || cartItems.length === 0) {
      setStatus("❗ Ваша корзина пуста");
      return;
    }

    // Формируем payload: без user_id, только имя, телефон и товары
    const payload = {
      name: name.trim(),
      phone: phone.trim(),
      items: cartItems.map((item) => ({
        product_id: item.id,
        quantity: item.quantity,
      })),
    };

    postOrderRequest(payload);
  };
// ✅ Успешное оформление — показываем инфо
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
  // 4. Если корзина пуста — показываем сообщение
  if (!cartItems || cartItems.length === 0) {
    return (
      <div className="cart-empty">
        <h2>Ваша корзина пуста</h2>
        <button className="btn-back" onClick={() => navigate("/")}>
          Вернуться в каталог
        </button>
      </div>
    );
  }

  return (
    <div className="cart-container">
      <h2>Корзина</h2>

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
              <button className="btn-remove" onClick={() => removeFromCart(item.id)}>
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

      <div style={{ marginTop: 24 }}>
        <h3>Оформление заказа</h3>
        <input
          type="text"
          placeholder="ФИО"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setStatus("");
          }}
          style={{ marginBottom: 12, width: "100%", padding: 8 }}
        />
        <input
          type="tel"
          placeholder="Телефон для связи"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            setStatus("");
          }}
          style={{ marginBottom: 12, width: "100%", padding: 8 }}
        />
        <div className="cart-buttons">
          <button className="btn-clear" onClick={() => clearCart()}>
            Очистить корзину
          </button>
          <button className="btn-checkout" onClick={handleSubmit}>
            Оформить заказ
          </button>
        </div>
        {status && <p style={{ marginTop: 12 }}>{status}</p>}
      </div>
    </div>
  );
}
