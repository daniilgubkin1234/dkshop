export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

export async function fetchProducts() {
  const response = await fetch(`${API_URL}/products`);
  if (!response.ok) {
    throw new Error(`Ошибка при загрузке товаров: ${response.status}`);
  }
  return await response.json();
}

export async function fetchProductById(id) {
  let response = await fetch(`${API_URL}/products/${id}`);
  if (response.ok) {
    return await response.json();
  }
  // fallback: если не найдено, то получить весь список и найти
  response = await fetch(`${API_URL}/products`);
  if (!response.ok) {
    throw new Error(`Ошибка при загрузке товаров: ${response.status}`);
  }
  const all = await response.json();
  const found = all.find((item) => String(item.id) === String(id));
  if (!found) {
    throw new Error('Товар не найден');
  }
  return found;
}

/**
 * Оформление заказа.
 * @param {{ user_id:number, name:string, phone:string, items:{product_id:number,quantity:number}[] }} orderData
 * @returns {Promise<any>} 
 */
export async function postOrder(orderData) {
  const response = await fetch(`${API_URL}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData),
  });
  if (!response.ok) {
    throw new Error(`Ошибка при оформлении заказа: ${response.status}`);
  }
  return await response.json();
}


/* ---------- MODEL CARDS ---------- */
export async function fetchModelCards() {
  const r = await fetch(`${API_URL}/model_cards`);
  if (!r.ok) throw new Error("Ошибка при загрузке model_cards");
  return await r.json();
}

// Basic-auth: token = btoa("admin_user:admin_pass")
export async function createModelCard(data, token) {
  const r = await fetch(`${API_URL}/admin/model_cards`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error("Не удалось создать карточку");
  return await r.json();
}

// При желании добавьте PATCH / DELETE
export const updateModelCard = (id, data, token) =>
  fetch(`${API_URL}/admin/model_cards/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${token}`,
    },
    body: JSON.stringify(data),
  }).then(r => {
    if (!r.ok) throw new Error("Не удалось обновить карточку");
    return r.json();
  });

export const deleteModelCard = (id, token) =>
  fetch(`${API_URL}/admin/model_cards/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Basic ${token}` },
  }).then(r => {
    if (!r.ok) throw new Error("Не удалось удалить карточку");
  });



 /* ----------------------------------------------------------------
   authFetch — любой запрос, который требует токена пользователя
------------------------------------------------------------------*/
export const authFetch = (url, opts = {}) => {
  const token = localStorage.getItem("user_token");
  const headers = { ...JSON_HEADERS, ...opts.headers };
  if (token) headers.Authorization = `Bearer ${token}`;

  return fetch(`${API_URL}${url}`, { ...opts, headers }).then(toJsonOrThrow);
};

/* ----------------------------------------------------------------
   AUTH
------------------------------------------------------------------*/
export async function loginApi(phone, password) {
  const body = new URLSearchParams();
  body.append("username", phone);      // OAuth2PasswordRequestForm
  body.append("password", password);

  const r = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  return toJsonOrThrow(r);             // {access_token, token_type}
}

export async function registerApi({ phone, name, password }) {
  const r = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ phone, name, password }),
  });
  return toJsonOrThrow(r);             // 201 → {id, phone, …} / 409
}

export const meApi = (token) =>
  fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then(toJsonOrThrow);

/* ----------------------------------------------------------------
   ORDERS  (личный кабинет)
------------------------------------------------------------------*/
export const myOrdersApi   = () => authFetch("/orders/me");
export const createOrderApi = (data) =>
  authFetch("/orders", { method: "POST", body: JSON.stringify(data) });