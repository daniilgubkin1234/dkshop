// src/admin/AdminProduct.jsx
import React, { useEffect, useState } from "react";
import "./Admin.css";
import AdminHeader from "./AdminHeader";

// Заготовка начального состояния товара для формы
const emptyProduct = {
  name: "",
  price: "",
  model_compat: "",
  type: "",
  stock: 10,
  description: "",
  images: "", // строка через запятую (введет менеджер), преобразуем в массив
};

export default function AdminProduct() {
  const [products, setProducts] = useState([]);
  const [newProduct, setNewProduct] = useState(emptyProduct);
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem("auth_token");

  // Загрузить список товаров
  const loadProducts = () => {
    setLoading(true);
    fetch("https://dkshopbot.ru/products")
      .then((r) => r.json())
      .then(setProducts)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  // Добавить новый товар
  const handleAdd = () => {
    const body = {
      ...newProduct,
      price: Number(newProduct.price),
      stock: Number(newProduct.stock),
      images: newProduct.images
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };

    fetch("https://dkshopbot.ru/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Basic ${token}` } : {}),
      },
      body: JSON.stringify(body),
    })
      .then((r) => {
        if (!r.ok) throw new Error("Ошибка добавления товара");
        setNewProduct(emptyProduct);
        loadProducts();
      })
      .catch((e) => alert(e.message));
  };

  // Удалить товар (по желанию, если хочешь реализовать)
  // const handleDelete = (id) => { ... }

  useEffect(() => {
    loadProducts();
  }, []);

  return (
    <div className="admin-container admin-products">
      <AdminHeader />
      <h2>Товары — управление</h2>

      <div className="product-add-row" style={{ marginBottom: 24 }}>
        <input
          placeholder="Название"
          value={newProduct.name}
          onChange={(e) => setNewProduct((p) => ({ ...p, name: e.target.value }))}
        />
        <input
          placeholder="Цена (₽)"
          type="number"
          value={newProduct.price}
          onChange={(e) => setNewProduct((p) => ({ ...p, price: e.target.value }))}
        />
        <input
          placeholder="Совместимость (напр. 2101-07)"
          value={newProduct.model_compat}
          onChange={(e) => setNewProduct((p) => ({ ...p, model_compat: e.target.value }))}
        />
        <input
          placeholder="Тип (напр. глушитель)"
          value={newProduct.type}
          onChange={(e) => setNewProduct((p) => ({ ...p, type: e.target.value }))}
        />
        <input
          placeholder="Остаток"
          type="number"
          value={newProduct.stock}
          onChange={(e) => setNewProduct((p) => ({ ...p, stock: e.target.value }))}
        />
        <input
          placeholder="URL картинок (через запятую)"
          value={newProduct.images}
          onChange={(e) => setNewProduct((p) => ({ ...p, images: e.target.value }))}
        />
        <input
          placeholder="Описание"
          value={newProduct.description}
          onChange={(e) => setNewProduct((p) => ({ ...p, description: e.target.value }))}
        />
        <button onClick={handleAdd}>Добавить товар</button>
      </div>

      {loading ? (
        <p>Загрузка товаров…</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>id</th>
              <th>Название</th>
              <th>Цена</th>
              <th>Совместимость</th>
              <th>Тип</th>
              <th>Остаток</th>
              <th>Картинки</th>
              {/* <th>Действия</th> */}
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
            <tr key={p.id}>
            <td data-label="id">{p.id}</td>
            <td data-label="Название">{p.name}</td>
            <td data-label="Цена">{p.price}</td>
            <td data-label="Совместимость">{p.model_compat}</td>
            <td data-label="Тип">{p.type}</td>
            <td data-label="Остаток">{p.stock}</td>
            <td data-label="Картинки" style={{ maxWidth: 120, wordBreak: "break-all" }}>
            {(p.images || []).join(", ")}
            </td>
            </tr>
            ))}
            </tbody>
        </table>
      )}
    </div>
  );
}
