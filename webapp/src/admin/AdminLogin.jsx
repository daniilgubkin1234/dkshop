import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Admin.css';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Проверка: если уже есть невалидный токен — удаляем его
    const token = localStorage.getItem('auth_token');
    if (token) {
      fetch('https://dkshopbot.ru/admin/orders', {
        headers: { Authorization: `Basic ${token}` }
      }).then(res => {
        if (res.ok) {
          navigate('/admin/orders');
        } else {
          localStorage.removeItem('auth_token');
        }
      }).catch(() => {
        localStorage.removeItem('auth_token');
      });
    }
  }, []);

  const handleLogin = () => {
    const token = btoa(`${username}:${password}`);
    fetch('https://dkshopbot.ru/admin/orders', {
      headers: {
        Authorization: `Basic ${token}`
      }
    })
      .then(r => {
        if (!r.ok) throw new Error("Ошибка авторизации");
        localStorage.setItem('auth_token', token);
        navigate('/admin/orders');
      })
      .catch(() => {
        localStorage.removeItem('auth_token');
        setErr('Неверный логин или пароль');
      });
  };

  return (
    <div className="admin-container admin-login">
      <h2>Вход в админку</h2>
      <input placeholder="Логин" value={username} onChange={e => setUsername(e.target.value)} />
      <br /><br />
      <input placeholder="Пароль" type="password" value={password} onChange={e => setPassword(e.target.value)} />
      <br /><br />
      <button onClick={handleLogin}>Войти</button>
      {err && <p style={{ color: 'red' }}>{err}</p>}
    </div>
  );
}
