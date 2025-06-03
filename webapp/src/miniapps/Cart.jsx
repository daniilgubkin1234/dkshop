// webapp/src/miniapps/Cart.jsx
import React, { useState } from 'react';
import { useCart } from '../context/CartContext.jsx';
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
    removeOneFromCart,
    removeFromCart,
    clearCart,
    totalPrice = 0,
  } = ctx;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!name || !phone) {
      setStatus('❗ Заполните имя и телефон');
      return;
    }

    try {
      const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
      if (!userId) {
        setStatus('❗ Не удалось определить пользователя Telegram');
        return;
      }

      const payload = {
        user_id: userId,
        name,
        phone,
        items: cartItems.map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
        })),
      };

      const res = await fetch('http://localhost:8001/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Ошибка при отправке');

      const data = await res.json();
      setStatus(`✅ Заказ #${data.order_id} оформлен!`);
      clearCart();
    } catch (err) {
      console.error(err);
      setStatus('❗ Не удалось оформить заказ');
    }
  };

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
          onChange={(e) => setName(e.target.value)}
          style={{ marginBottom: 12, width: '100%', padding: 8 }}
        />
        <input
          type="tel"
          placeholder="Телефон для связи"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={{ marginBottom: 12, width: '100%', padding: 8 }}
        />
        <div className="cart-buttons">
          <button className="btn-clear" onClick={clearCart}>
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
