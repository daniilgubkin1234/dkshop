import React, { useEffect, useState } from "react";
import "./Admin.css";
import AdminHeader from "./AdminHeader";

const emptyProduct = {
  name: "",
  price: "",
  model_compat: "",
  type: "",
  stock: 10,
  description: "",
  images: "",
};

export default function AdminProduct() {
  const [products, setProducts] = useState([]);
  const [newProduct, setNewProduct] = useState(emptyProduct);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editProduct, setEditProduct] = useState(emptyProduct);
  const token = localStorage.getItem("auth_token");

  const loadProducts = () => {
    setLoading(true);
    fetch("https://dkshopbot.ru/products")
      .then((r) => r.json())
      .then(setProducts)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  // --- Загрузка файлов с ПК для нового товара ---
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("https://dkshopbot.ru/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setNewProduct((p) => ({
        ...p,
        images: p.images
          ? p.images + ", " + data.url
          : data.url,
      }));
    }
  };

  // --- Загрузка файлов для редактируемого товара ---
  const handleEditFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("https://dkshopbot.ru/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setEditProduct((p) => ({
        ...p,
        images: p.images
          ? p.images + ", " + data.url
          : data.url,
      }));
    }
  };

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

  const handleDelete = (id) => {
    if (!window.confirm("Удалить этот товар?")) return;
    fetch(`https://dkshopbot.ru/products/${id}`, {
      method: "DELETE",
      headers: {
        ...(token ? { Authorization: `Basic ${token}` } : {}),
      },
    })
      .then((r) => {
        if (!r.ok) throw new Error("Ошибка удаления");
        loadProducts();
      })
      .catch((e) => alert(e.message));
  };

  const handleEdit = (p) => {
    setEditId(p.id);
    setEditProduct({
      ...p,
      images: (p.images || []).join(", "),
    });
  };

  const handleEditSave = () => {
    const body = {
      ...editProduct,
      price: Number(editProduct.price),
      stock: Number(editProduct.stock),
      images: editProduct.images
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };

    fetch(`https://dkshopbot.ru/products/${editId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Basic ${token}` } : {}),
      },
      body: JSON.stringify(body),
    })
      .then((r) => {
        if (!r.ok) throw new Error("Ошибка сохранения");
        setEditId(null);
        setEditProduct(emptyProduct);
        loadProducts();
      })
      .catch((e) => alert(e.message));
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // --- Функция превью для картинок ---
  function renderImages(urls) {
    return urls
      .split(",")
      .map((url) => url.trim())
      .filter(Boolean)
      .map((url, i) => (
        <img
          key={i}
          src={url}
          alt="img"
          style={{
            height: 40,
            borderRadius: 4,
            marginRight: 4,
            background: "#fff",
            border: "1px solid #aaa",
          }}
        />
      ));
  }

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
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileUpload}
          style={{ minWidth: 120 }}
        />
        <button onClick={handleAdd}>Добавить товар</button>
      </div>

      {/* Превью картинок для нового товара */}
      {newProduct.images && (
        <div style={{ display: "flex", gap: 8, margin: "8px 0" }}>
          {renderImages(newProduct.images)}
        </div>
      )}

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
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) =>
              editId === p.id ? (
                <tr key={p.id}>
                  <td data-label="id">{p.id}</td>
                  <td data-label="Название">
                    <input value={editProduct.name} onChange={e => setEditProduct(ep => ({ ...ep, name: e.target.value }))} />
                  </td>
                  <td data-label="Цена">
                    <input value={editProduct.price} type="number" onChange={e => setEditProduct(ep => ({ ...ep, price: e.target.value }))} />
                  </td>
                  <td data-label="Совместимость">
                    <input value={editProduct.model_compat} onChange={e => setEditProduct(ep => ({ ...ep, model_compat: e.target.value }))} />
                  </td>
                  <td data-label="Тип">
                    <input value={editProduct.type} onChange={e => setEditProduct(ep => ({ ...ep, type: e.target.value }))} />
                  </td>
                  <td data-label="Остаток">
                    <input value={editProduct.stock} type="number" onChange={e => setEditProduct(ep => ({ ...ep, stock: e.target.value }))} />
                  </td>
                  <td data-label="Картинки">
                    <input value={editProduct.images} onChange={e => setEditProduct(ep => ({ ...ep, images: e.target.value }))} />
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleEditFileUpload}
                      style={{ minWidth: 80, marginTop: 4 }}
                    />
                    {/* Превью картинок при редактировании */}
                    {editProduct.images && (
                      <div style={{ display: "flex", gap: 6, margin: "4px 0" }}>
                        {renderImages(editProduct.images)}
                      </div>
                    )}
                  </td>
                  <td data-label="Действия">
                    <button onClick={handleEditSave}>Сохранить</button>
                    <button onClick={() => setEditId(null)}>Отмена</button>
                  </td>
                </tr>
              ) : (
                <tr key={p.id}>
                  <td data-label="id">{p.id}</td>
                  <td data-label="Название">{p.name}</td>
                  <td data-label="Цена">{p.price}</td>
                  <td data-label="Совместимость">{p.model_compat}</td>
                  <td data-label="Тип">{p.type}</td>
                  <td data-label="Остаток">{p.stock}</td>
                  <td data-label="Картинки" style={{ maxWidth: 120, wordBreak: "break-all" }}>
                    {(p.images || []).map
                      ? renderImages(p.images.join(","))
                      : renderImages(p.images)}
                  </td>
                  <td data-label="Действия">
                    <button onClick={() => handleEdit(p)}>Редактировать</button>
                    <button onClick={() => handleDelete(p.id)}>Удалить</button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
