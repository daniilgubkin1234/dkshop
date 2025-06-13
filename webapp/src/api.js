/* ============================================================= *
 *  API-обёртка для FastAPI-бэкенда
 * ============================================================= */

export const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8001";

/* общий набор JSON-заголовков */
const JSON_HEADERS = { "Content-Type": "application/json" };

/* универсальный разбор ответа
   ─ OK (200/201/204) → json | null
   ─ !OK             → throw { status, detail }                */
async function toJsonOrThrow(r) {
  if (r.ok) {
    try {
      return await r.json(); // 200/201 с телом
    } catch {
      return null;           // 204 или 201 без тела
    }
  }
  let detail = "unknown";
  try {
    detail = (await r.json()).detail ?? detail;
  } catch { /* не JSON */ }
  throw { status: r.status, detail };
}

/* =================================================================
   ТОВАРЫ (оставлены как были)
==================================================================*/
export async function fetchProducts() {
  const response = await fetch(`${API_URL}/products`);
  return toJsonOrThrow(response);
}

export async function fetchProductById(id) {
  let response = await fetch(`${API_URL}/products/${id}`);
  if (response.ok) return response.json();

  // fallback: получить весь список и найти нужный
  response = await fetch(`${API_URL}/products`);
  const all = await toJsonOrThrow(response);
  const found = all.find((item) => String(item.id) === String(id));
  if (!found) throw new Error("Товар не найден");
  return found;
}

/* ---------- MODEL CARDS ---------- */
export async function fetchModelCards() {
  const r = await fetch(`${API_URL}/model_cards`);
  return toJsonOrThrow(r);
}

// Basic-auth: token = btoa("admin_user:admin_pass")
export async function createModelCard(data, token) {
  const r = await fetch(`${API_URL}/admin/model_cards`, {
    method: "POST",
    headers: {
      ...JSON_HEADERS,
      Authorization: `Basic ${token}`,
    },
    body: JSON.stringify(data),
  });
  return toJsonOrThrow(r);
}

export const updateModelCard = (id, data, token) =>
  fetch(`${API_URL}/admin/model_cards/${id}`, {
    method: "PATCH",
    headers: {
      ...JSON_HEADERS,
      Authorization: `Basic ${token}`,
    },
    body: JSON.stringify(data),
  }).then(toJsonOrThrow);

export const deleteModelCard = (id, token) =>
  fetch(`${API_URL}/admin/model_cards/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Basic ${token}` },
  }).then(toJsonOrThrow);

/* =================================================================
   AUTH-утилита, которая сама подставит Bearer-токен
==================================================================*/
export const authFetch = (url, opts = {}) => {
  const token  = localStorage.getItem("user_token");
  const headers = { ...JSON_HEADERS, ...opts.headers };
  if (token) headers.Authorization = `Bearer ${token}`;

  return fetch(`${API_URL}${url}`, { ...opts, headers }).then(toJsonOrThrow);
};


// Авторизация через Telegram WebApp (initData) — возвращает токен
export const authTelegramApi = (initDataRaw) =>
  fetch(`${API_URL}/auth/telegram`, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: initDataRaw,
  }).then(toJsonOrThrow);

export const meApi = (token) =>
  fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then(toJsonOrThrow);

// Оформление заказа (авторизация через Telegram WebApp!)
export const createOrderApi = (data) =>
  authFetch("/orders", { method: "POST", body: JSON.stringify(data) });

// Получение своих заказов (авторизация через Telegram WebApp!)
export const myOrdersApi = () => authFetch("/orders/me");

