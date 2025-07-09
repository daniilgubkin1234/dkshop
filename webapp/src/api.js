export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';
console.log("API_URL =", API_URL);
export async function fetchProducts({wholesale, user_id, username, ...params} = {}) {
  let url = `${API_URL}/products?`;
  if (wholesale) url += 'wholesale=1&';
  if (user_id) url += `user_id=${user_id}&`;
  if (username) url += `username=${username}&`;
  // ...другие параметры
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Ошибка при загрузке товаров: ${response.status}`);
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

// --- CRUD admin model_cards через cookie ---
export async function createModelCard(data) {
  const r = await fetch(`${API_URL}/admin/model_cards`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error("Не удалось создать карточку");
  return await r.json();
}

export const updateModelCard = (id, data) =>
  fetch(`${API_URL}/admin/model_cards/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(data),
  }).then(r => {
    if (!r.ok) throw new Error("Не удалось обновить карточку");
    return r.json();
  });

export const deleteModelCard = (id) =>
  fetch(`${API_URL}/admin/model_cards/${id}`, {
    method: "DELETE",
    credentials: "include",
  }).then(r => {
    if (!r.ok) throw new Error("Не удалось удалить карточку");
  });
  export async function fetchClients() {
    const r = await fetch(`${API_URL}/admin/clients`, { credentials: "include" });
    if (!r.ok) throw new Error("Ошибка загрузки клиентов");
    return await r.json();
  }
  
  export async function updateClientWholesale(user_id, is_wholesale) {
    const r = await fetch(`${API_URL}/admin/clients/${user_id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ is_wholesale })
    });
    if (!r.ok) throw new Error("Ошибка обновления статуса опта");
    return await r.json();
  }
  
  export async function updateClientWholesalePrices(user_id, wholesale_prices) {
    const r = await fetch(`${API_URL}/admin/clients/${user_id}/prices`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ wholesale_prices })
    });
    if (!r.ok) throw new Error("Ошибка обновления индивидуальных цен");
    return await r.json();
  }
  export async function fetchUserById(userId) {
    const response = await fetch(`${API_URL}/user/${userId}`);
    if (!response.ok) throw new Error("Ошибка загрузки пользователя");
    return await response.json();
  }