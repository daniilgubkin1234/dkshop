import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();

  const loadProducts = () => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      navigate("/admin/login");
      return;
    }
    setLoading(true);
    fetch("https://dkshopbot.ru/products", {
      headers: { Authorization: `Basic ${token}` }
    })
      .then(async r => {
        if (r.status === 401) {
          localStorage.removeItem("auth_token");
          navigate("/admin/login");
          return [];
        }
        return r.json();
      })
      .then(setProducts)
      .catch(() => {
        localStorage.removeItem("auth_token");
        navigate("/admin/login");
      })
      .finally(() => setLoading(false));
  };

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
        images: p.images ? p.images + ", " + data.url : data.url,
      }));
    }
  };

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
        images: p.images ? p.images + ", " + data.url : data.url,
      }));
    }
  };

  const handleAdd = () => {
    const token = localStorage.getItem("auth_token");
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
        Authorization: `Basic ${token}`,
      },
      body: JSON.stringify(body),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("Ошибка добавления товара");
        const createdProduct = await r.json();
        setProducts((prev) => [...prev, createdProduct]);
        setNewProduct(emptyProduct);
      })
      .catch((e) => alert(e.message));
  };

  const handleDelete = (id) => {
    const token = localStorage.getItem("auth_token");
    if (!window.confirm("Удалить этот товар?")) return;
    fetch(`https://dkshopbot.ru/products/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Basic ${token}`,
      },
    })
      .then((r) => {
        if (!r.ok) throw new Error("Ошибка удаления");
        setProducts((prev) => prev.filter((p) => p.id !== id));
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
    const token = localStorage.getItem("auth_token");
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
        Authorization: `Basic ${token}`,
      },
      body: JSON.stringify(body),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("Ошибка сохранения");
        const updatedProduct = await r.json();
        setProducts((prev) =>
          prev.map((item) =>
            item.id === updatedProduct.id ? updatedProduct : item
          )
        );
        setEditId(null);
        setEditProduct(emptyProduct);
      })
      .catch((e) => alert(e.message));
  };

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line
  }, []);

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
                  <td>{p.id}</td>
                  <td>
                    <input
                      value={editProduct.name}
                      onChange={(e) =>
                        setEditProduct((v) => ({ ...v, name: e.target.value }))
                      }
                    />
                  </td>
                  <td>
                    <input
                      value={editProduct.price}
                      type="number"
                      onChange={(e) =>
                        setEditProduct((v) => ({ ...v, price: e.target.value }))
                      }
                    />
                  </td>
                  <td>
                    <input
                      value={editProduct.model_compat}
                      onChange={(e) =>
                        setEditProduct((v) => ({
                          ...v,
                          model_compat: e.target.value,
                        }))
                      }
                    />
                  </td>
                  <td>
                    <input
                      value={editProduct.type}
                      onChange={(e) =>
                        setEditProduct((v) => ({ ...v, type: e.target.value }))
                      }
                    />
                  </td>
                  <td>
                    <input
                      value={editProduct.stock}
                      type="number"
                      onChange={(e) =>
                        setEditProduct((v) => ({ ...v, stock: e.target.value }))
                      }
                    />
                  </td>
                  <td>
                    <input
                      value={editProduct.images}
                      onChange={(e) =>
                        setEditProduct((v) => ({
                          ...v,
                          images: e.target.value,
                        }))
                      }
                    />
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleEditFileUpload}
                      style={{ marginTop: 6 }}
                    />
                    {editProduct.images && (
                      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                        {renderImages(editProduct.images)}
                      </div>
                    )}
                  </td>
                  <td>
                    <button onClick={handleEditSave}>Сохранить</button>
                    <button
                      style={{ background: "#c32", color: "#fff" }}
                      onClick={() => setEditId(null)}
                    >
                      Отмена
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td>{p.name}</td>
                  <td>{p.price}</td>
                  <td>{p.model_compat}</td>
                  <td>{p.type}</td>
                  <td>{p.stock}</td>
                  <td>
                    {p.images && p.images.length > 0
                      ? renderImages((Array.isArray(p.images) ? p.images : [p.images]).join(","))
                      : ""}
                  </td>
                  <td>
                    <button onClick={() => handleEdit(p)}>Редактировать</button>
                    <button
                      style={{ background: "#e53935", color: "#fff" }}
                      onClick={() => handleDelete(p.id)}
                    >
                      Удалить
                    </button>
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
