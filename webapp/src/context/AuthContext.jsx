// src/context/AuthContext.jsx
//
// Контекст авторизации для «обычных» пользователей (личный кабинет).
// • Токен хранится в localStorage под ключом user_token  ←  admin-токен (auth_token) не трогаем.
// • При старте подтягивает /auth/me, чтобы восстановить сессию.
// • Предоставляет { user, login, logout }.

import React, {
    createContext,
    useContext,
    useEffect,
    useState,
  } from "react";
  import { loginApi, meApi } from "../api";
  
  const AuthContext = createContext(null);
  export const useAuth = () => useContext(AuthContext);
  
  export default function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [ready, setReady] = useState(false);
  
    // ── восстанавливаем сессию ─────────────────────────────────────────
    useEffect(() => {
      const token = localStorage.getItem("user_token");
      if (!token) { setReady(true); return; }
  
      meApi(token)
        .then((data) => { setUser(data); setReady(true); })
        .catch(() => {           // токен протух / пользователь удалён
          localStorage.removeItem("user_token");
          setReady(true);
        });
    }, []);
  
    // ── логин ──────────────────────────────────────────────────────────
    const login = async (phone, password) => {
      const { access_token } = await loginApi(phone, password);
      localStorage.setItem("user_token", access_token);
      const me = await meApi(access_token);
      setUser(me);
    };
  
    // ── выход ──────────────────────────────────────────────────────────
    const logout = () => {
      localStorage.removeItem("user_token");
      setUser(null);
    };
  
    if (!ready) return null;      // пока не знаем статус ― рендерим «пусто»
  
    return (
      <AuthContext.Provider value={{ user, login, logout }}>
        {children}
      </AuthContext.Provider>
    );
  }
  