import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { loginApi, meApi } from "../api";

const TOKEN_KEY = "user_token";
export const AuthContext = createContext(null);
export const useAuth     = () => useContext(AuthContext);

export default function AuthProvider({ children }) {
  const [user,  setUser]  = useState(null);
  const [ready, setReady] = useState(false);

  /* bootstrap session once */
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setReady(true); return; }

    meApi(token)
      .then(setUser)
      .catch(() => localStorage.removeItem(TOKEN_KEY)) // 401 → logout
      .finally(() => setReady(true));
  }, []);

  const login = async (phone, password) => {
    const { access_token } = await loginApi(phone, password);
    localStorage.setItem(TOKEN_KEY, access_token);
    const me = await meApi(access_token);
    setUser(me);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  };

  if (!ready) return null;   // можно спиннер

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
