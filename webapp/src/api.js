const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

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
