// context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { authTelegramApi, meApi } from "../api";

const TOKEN_KEY = "user_token";
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }) {
  const [user, setUser]   = useState(null);
  const [ready, setReady] = useState(false);

  /* 1) если токен уже в LS — проверяем */
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      meApi(token).then(setUser).finally(() => setReady(true));
      return;
    }
    /* 2) иначе — пробуем авторизоваться по initData */
    if (window.Telegram?.WebApp?.initData) {
      authTelegramApi(window.Telegram.WebApp.initData)
        .then(({ access_token }) => {
          localStorage.setItem(TOKEN_KEY, access_token);
          return meApi(access_token);
        })
        .then(setUser)
        .catch(console.warn)
        .finally(() => setReady(true));
    } else {
      setReady(true);          // открыли сайт вне Telegram – только гостевой режим
    }
  }, []);

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  };

  if (!ready) return null;     // можно прелоадер

  return (
    <AuthContext.Provider value={{ user, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
