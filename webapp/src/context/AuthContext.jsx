import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { loginApi, meApi } from "../api";

/* ─────────── helpers ─────────── */
const TOKEN_KEY = "user_token";
export const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

/* ─────────── provider ─────────── */
export default function AuthProvider({ children }) {
  const [user, setUser]   = useState(null);
  const [ready, setReady] = useState(false);

  /* bootstrap session once */
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setReady(true); return; }

    meApi(token)
      .then(setUser)
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setReady(true));
  }, []);

  /* login → save token → fetch profile */
  const login = async (phone, password) => {
    const { access_token } = await loginApi(phone, password);
    localStorage.setItem(TOKEN_KEY, access_token);
    const me = await meApi(access_token);
    setUser(me);
  };

  /* logout */
  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  };

  if (!ready) return null;             // можно показать спиннер

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
