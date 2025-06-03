// webapp/src/components/CartLink.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import './CartLink.css';

export default function CartLink() {
  const { totalCount } = useCart();

  return (
    <Link to="/cart" className="cart-link">
      {/* Иконка корзины (можно заменить на svg/icon из библиотеки) */}
      <span className="cart-icon">🛒</span>
      {totalCount > 0 && <span className="cart-badge">{totalCount}</span>}
    </Link>
  );
}
