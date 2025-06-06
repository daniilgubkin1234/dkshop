// webapp/src/miniapps/Cart.jsx

import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext.jsx';
import { postOrder } from '../api.js';
import { useNavigate } from 'react-router-dom';
import './Cart.css';

export default function Cart() {
  let ctx;
  try {
    ctx = useCart();
  } catch (err) {
    console.error(err.message);
    ctx = null;
  }

  // Если контекст корзины недоступен, показываем заглушку
  if (!ctx) {
    return (
      <div className="cart-empty">
        <h2>Корзина недоступна</h2>
        <button className="btn-back" onClick={() => (window.location.href = '/')}>
          Вернуться на главную
        </button>
      </div>
    );
  }

  const {
    cartItems = [],
    updateQuantity,
    removeFromCart,
    clearCart,
    totalPrice = 0,
  } = ctx;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('');
  const [userId, setUserId] = useState(null);
  const navigate = useNavigate();

  /**
   * useEffect: динамически подключаем Telegram WebApp SDK,
   * ждём, пока скрипт загрузится и инициализируется,
   * затем вытягиваем userId из window.Telegram.WebApp.initDataUnsafe.user.id
   */
  useEffect(() => {
    // Если скрипт уже есть на странице, то просто пробуем взять user сразу
    if (document.getElementById('telegram-webapp-sdk')) {
      if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.ready();
        const user = window.Telegram.WebApp.initDataUnsafe?.user;
        if (user && user.id) {
          setUserId(user.id);
        }
      }
      return;
    }

    // Создаём <script> для Telegram WebApp SDK
    const script = document.createElement('script');
    script.id = 'telegram-webapp-sdk';
    script.src = 'https://telegram.org/js/telegram-web-app.js';
    script.async = true;

    // Когда скрипт загрузится — запускаем WebApp.ready() и получаем userId
    script.onload = () => {
      if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.ready();
        const user = window.Telegram.WebApp.initDataUnsafe?.user;
        if (user && user.id) {
          setUserId(user.id);
        }
      }
    };

    // Вставляем <script> в <body>
    document.body.appendChild(script);

    // При размонтировании компонента убираем скрипт
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Функция отправки заказа на бэкенд
  const postOrderRequest = async (data) => {
    try {
      const response = await postOrder(data);
      // Предполагаем, что бэкенд вернёт объект { order_id: <число> }
      setStatus(`✅ Заказ #${response.order_id} оформлен!`);
      clearCart();
    } catch (err) {
      console.error(err);
      setStatus('❗ Не удалось оформить заказ');
    }
  };

  // Обработчик клика “Оформить заказ”
  const handleSubmit = () => {
    // Если не определили userId из Telegram
    if (!userId) {
      setStatus('❗ Не удалось определить пользователя Telegram');
      return;
    }
    // Проверяем, заполнены ли имя и телефон
    if (!name.trim() || !phone.trim()) {
      setStatus('❗ Заполните имя и телефон');
      return;
    }
    // Проверяем, что в корзине есть товары
    if (cartItems.length === 0) {
      setStatus('❗ Корзина пуста');
      return;
    }

    // Формируем массив items в нужном формате
    const payload = {
      user_id: userId,
      name: name.trim(),
      phone: phone.trim(),
      items: cartItems.map((item) => ({
        product_id: item.id,
        quantity: item.quantity,
      })),
    };

    postOrderRequest(payload);
  };

  // Если корзина пуста, показываем заглушку “Ваша корзина пуста”
  if (cartItems.length === 0) {
    return (
      <div className="cart-empty">
        <h2>Ваша корзина пуста</h2>
        <button className="btn-back" onClick={() => navigate('/')}>
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
            setStatus(''); // сбрасываем статус при вводе
          }}
          style={{ marginBottom: 12, width: '100%', padding: 8 }}
        />
        <input
          type="tel"
          placeholder="Телефон для связи"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            setStatus(''); // сбрасываем статус при вводе
          }}
          style={{ marginBottom: 12, width: '100%', padding: 8 }}
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
