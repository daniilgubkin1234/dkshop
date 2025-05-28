// webapp/src/api.js
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001';

export async function fetchProducts() {
  const res = await fetch(`${BASE}/products`);
  if (!res.ok) throw new Error(`Не удалось получить товары: ${res.status}`);
  return res.json();
}

export async function fetchProduct(id) {
  const res = await fetch(`${BASE}/products/${id}`);
  if (!res.ok) throw new Error(`Не удалось получить товар ${id}: ${res.status}`);
  return res.json();
}
