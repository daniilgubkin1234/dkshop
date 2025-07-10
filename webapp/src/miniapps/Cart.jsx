// webapp/src/miniapps/Cart.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate }               from 'react-router-dom';
import { useCart }                   from '../context/CartContext.jsx';
import { postOrder }                 from '../api.js';
import './Cart.css';

export default function Cart() {
  const {
    cartItems,
    totalPrice,
    addToCart,            // вдруг понадобится
    removeFromCart,
    removeOneFromCart,
    updateQuantity,
    clearCart,
    reloadFromServer,     // <-- новое
  } = useCart();

  /* ───────── fetch fresh cart on mount ───────── */
  useEffect(() => { reloadFromServer?.(); }, [reloadFromServer]);

  const navigate = useNavigate();

  /* ───────── форма оформления ───────── */
  const [name,  setName]  = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('');
  const [orderInfo, setOrderInfo] = useState(null);
  const isWholesaleOrder = window.location.pathname === "/wholesale";
  /* ───── подставляем данные авторизованного пользователя ───── */
  const storedUser = JSON.parse(localStorage.getItem('dkshop_user') || 'null');
  const userId     = storedUser?.id;

  useEffect(() => {
    if (!storedUser) return;
    if (storedUser.phone) setPhone(storedUser.phone);
    const fullName = [storedUser.first_name, storedUser.last_name]
      .filter(Boolean).join(' ');
    if (fullName) setName(fullName);
  }, [storedUser]);

  /* ───────── отправка заказа ───────── */
  const handleSubmit = async () => {
    const phoneValid = /^(?:\+7|8)(?: ?\d){10}$/.test(phone);
    if (!name.trim() || !phoneValid)             return setStatus('❗ Введите корректные ФИО и номер телефона');
    if (cartItems.length === 0)                  return setStatus('❗ Ваша корзина пуста');

    try {
      const resp = await postOrder({
        user_id: userId || null,
        name:    name.trim(),
        phone:   phone.trim(),
        items: cartItems.map(i => ({
          product_id: i.id,
          name: i.name,
          quantity: i.quantity,
          price: i.price
        })),
        is_wholesale: isWholesaleOrder,
      });
      setOrderInfo({
        orderId: resp.order_id,
        name,
        phone,
        items: cartItems,
        total: totalPrice,
      });
      clearCart();
    } catch {
      setStatus('❌ Не удалось оформить заказ');
    }
  };

  /* ───────── отображение ───────── */
  if (orderInfo) {
    return (
      <div className="cart-empty">
        <h2>✅ Заказ успешно оформлен!</h2>
        <p>Номер заказа: <b>#{orderInfo.orderId}</b></p>
        <p>На имя: <b>{orderInfo.name}</b></p>
        <p>Телефон: <b>{orderInfo.phone}</b></p>
        <p>Позиций: {orderInfo.items.length}</p>
        <p>Сумма: {orderInfo.total.toLocaleString()} ₽</p>
        <button className="btn-back" onClick={() => navigate('/')}>
          Вернуться на главную
        </button>
      </div>
    );
  }

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
        {cartItems.map(item => (
          <div key={item.id} className="cart-item">
            <img
              src={item.image || '/static/no-image.png'}
              alt={item.name}
              className="cart-item-image"
              onError={e => { e.target.src = '/static/no-image.png'; }}
            />
            <div className="cart-item-info">
              <h3 className="cart-item-name">{item.name}</h3>
              <p className="cart-item-price">
                {item.price.toLocaleString()} ₽ за шт.
              </p>
              <div className="cart-item-quantity">
                <input
                  type="number"
                  className="qty-input"
                  value={item.quantity}
                  min="1"
                  onChange={e => {
                    const val = Number(e.target.value);
                    if (isNaN(val) || val <= 0) {
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
              <p>{(item.price * item.quantity).toLocaleString()} ₽</p>
            </div>
          </div>
        ))}
      </div>

      <div className="cart-summary">
        <p className="cart-total">
          Итого: {totalPrice.toLocaleString()} ₽
        </p>
      </div>

      <div className="checkout-section">
        <h3>Оформление заказа</h3>
        <input
          type="text"
          placeholder="ФИО"
          className="checkout-input"
          value={name}
          onChange={e => { setName(e.target.value); setStatus(''); }}
        />
        <input
          type="tel"
          inputMode="tel"
          placeholder="+7 XXX XXX XXXX или 8 XXX XXX XXXX"
          className="checkout-input"
          value={phone}
          onChange={e => { setPhone(e.target.value); setStatus(''); }}
          pattern="^(?:\\+7|8)(?: ?\\d){10}$"
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
