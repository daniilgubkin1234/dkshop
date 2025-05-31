// webapp/src/api.js

// Базовый URL бэкенда (подхватывается из .env):
// VITE_API_URL=http://localhost:8001  (пример)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

/**
 * Получить список всех товаров.
 * Возвращает Promise с массивом объектов.
 */
export async function fetchProducts() {
  const response = await fetch(`${API_URL}/products`);
  if (!response.ok) {
    throw new Error(`Ошибка при загрузке списка товаров: ${response.status}`);
  }
  return await response.json();
}

/**
 * Получить один товар по ID.
 * Если endpoint /products/:id не существует, можно
 * вызывать fetchProducts() + фильтрацию.
 */
export async function fetchProductById(id) {
  // Первым шагом попробуем endpoint /products/{id}
  let response = await fetch(`${API_URL}/products/${id}`);
  if (response.ok) {
    return await response.json();
  }
  // Если сервер вернул 404 или другое, пробуем получить всё и отфильтровать
  response = await fetch(`${API_URL}/products`);
  if (!response.ok) {
    throw new Error(`Ошибка при загрузке списка товаров: ${response.status}`);
  }
  const all = await response.json();
  const found = all.find((item) => String(item.id) === String(id));
  if (!found) {
    throw new Error('Товар не найден');
  }
  return found;
}
