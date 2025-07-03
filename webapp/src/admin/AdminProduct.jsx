import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Admin.css";
import AdminHeader from "./AdminHeader";

const API = "/api/products";
const MODEL_CARDS_API = "/api/admin/model_cards";
const UPLOAD_API = "/api/upload";
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
  const [modelCards, setModelCards] = useState([]);

  // Для кнопки пересчёта авто-хитов
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [recalcResult, setRecalcResult] = useState(null);

  // Получить карточки моделей
  useEffect(() => {
    fetch(MODEL_CARDS_API, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then(setModelCards)
      .catch(() => setModelCards([]));
  }, []);

  // Получить товары
  const loadProducts = () => {
    setLoading(true);
    fetch(API, { credentials: "include" })
      .then(async (r) => {
        if (r.status === 401) {
          navigate("/admin/login");
          return [];
        }
        return r.json();
      })
      .then(setProducts)
      .catch(() => navigate("/admin/login"))
      .finally(() => setLoading(false));
  };

  // Пересчёт авто-хитов
  const handleRecalcHits = async () => {
    if (!window.confirm("Пересчитать авто-хиты на основе свежих заказов?")) return;
    setRecalcLoading(true);
    setRecalcResult(null);
    try {
      const res = await fetch("/api/admin/recalc_hits", {
        method: "POST",
        credentials: "include"
      });
      const data = await res.json();
      setRecalcResult(data.updated ? `Обновлено: ${data.updated.join(", ")}` : "Нет обновлений");
      loadProducts();
    } catch {
      setRecalcResult("Ошибка при пересчёте");
    } finally {
      setRecalcLoading(false);
    }
  };

  const toggleHit = async (prod) => {
    const updated = await fetch(`${API}/${prod.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: "include",
      body: JSON.stringify({ is_hit: !prod.is_hit }),
    }).then(r => r.json());
    setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(UPLOAD_API, {
        method: "POST",
        body: formData,
        credentials: "include"
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
      const res = await fetch(UPLOAD_API, {
        method: "POST",
        body: formData,
        credentials: "include"
      });
      const data = await res.json();
      setEditProduct((p) => ({
        ...p,
        images: p.images ? p.images + ", " + data.url : data.url,
      }));
    }
  };

  const handleAdd = () => {
    const body = {
      ...newProduct,
      is_hit: newProduct.is_hit || false,
      price: Number(newProduct.price),
      stock: Number(newProduct.stock),
      images: newProduct.images
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };
    fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
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
    if (!window.confirm("Удалить этот товар?")) return;
    fetch(`${API}/${id}`, {
      method: "DELETE",
      credentials: "include",
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
    const body = {
      ...editProduct,
      price: Number(editProduct.price),
      stock: Number(editProduct.stock),
      images: editProduct.images
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };
    fetch(`${API}/${editId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
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
      .map((url, i) => {
        const srcUrl = url.startsWith("http")
          ? url
          : `/static/${url.startsWith("/") ? url.slice(1) : url}`;
        return (
          <img
            key={i}
            src={srcUrl}
            alt="img"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = "/static/no-image.png";
            }}
            style={{
              height: 40,
              borderRadius: 4,
              marginRight: 4,
              background: "#fff",
              border: "1px solid #aaa",
            }}
          />
        );
      });
  }

  return (
    <div className="admin-container admin-products">
      <AdminHeader />
      <h2>Товары — управление</h2>

      {/* Кнопка пересчёта авто-хитов */}
      <div style={{ marginBottom: 16 }}>
        <button onClick={handleRecalcHits} disabled={recalcLoading}>
          {recalcLoading ? "Пересчёт..." : "Пересчитать авто-хиты"}
        </button>
        {recalcResult && (
          <span style={{ marginLeft: 16, color: "#2a7" }}>{recalcResult}</span>
        )}
      </div>

      {/* --- Форма добавления --- */}
      <div className="product-add-row" style={{ marginBottom: 24 }}>
        <input
          placeholder="Название"
          value={newProduct.name}
          onChange={e =>
            setNewProduct((p) => ({ ...p, name: e.target.value }))
          }
        />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <select
            multiple
            value={newProduct.model_compat.split(',').map(x => x.trim()).filter(Boolean)}
            onChange={e => {
              const selected = Array.from(e.target.selectedOptions).map(opt => opt.value);
              setNewProduct(p => ({
                ...p,
                model_compat: selected.join(", ")
              }));
            }}
            className="product-multiselect"
          >
            {modelCards.flatMap(card =>
              (card.models || []).map(model => (
                <option key={card.label + model} value={model}>
                  {card.label}: {model}
                </option>
              ))
            )}
          </select>
        </div>
        <input
          placeholder="Совместимость (напр. 2101-07)"
          value={newProduct.model_compat}
          onChange={e =>
            setNewProduct((p) => ({ ...p, model_compat: e.target.value }))
          }
        />
        <input
          placeholder="Тип (напр. глушитель)"
          value={newProduct.type}
          onChange={e =>
            setNewProduct((p) => ({ ...p, type: e.target.value }))
          }
        />
        <input
          placeholder="Остаток"
          type="number"
          value={newProduct.stock}
          onChange={e =>
            setNewProduct((p) => ({ ...p, stock: e.target.value }))
          }
        />
        <input
          placeholder="URL картинок (через запятую)"
          value={newProduct.images}
          onChange={e =>
            setNewProduct((p) => ({ ...p, images: e.target.value }))
          }
        />
        <input
          placeholder="Описание"
          value={newProduct.description}
          onChange={e =>
            setNewProduct((p) => ({ ...p, description: e.target.value }))
          }
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
              <th>Хит продаж</th>
              <th>Картинки</th>
              <th>Описание</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) =>
              editId === p.id ? (
                <tr key={p.id}>
                  {/* Режим редактирования */}
                  <td>{p.id}</td>
                  <td>
                    <input
                      value={editProduct.name}
                      onChange={e =>
                        setEditProduct((v) => ({ ...v, name: e.target.value }))
                      }
                    />
                  </td>
                  <td>
                    <input
                      value={editProduct.price}
                      type="number"
                      onChange={e =>
                        setEditProduct((v) => ({ ...v, price: e.target.value }))
                      }
                    />
                  </td>
                  <td>
                    <input
                      value={editProduct.model_compat}
                      onChange={e =>
                        setEditProduct((v) => ({ ...v, model_compat: e.target.value }))
                      }
                    />
                  </td>
                  <td>
                    <input
                      value={editProduct.type}
                      onChange={e =>
                        setEditProduct((v) => ({ ...v, type: e.target.value }))
                      }
                    />
                  </td>
                  <td>
                    <input
                      value={editProduct.stock}
                      type="number"
                      onChange={e =>
                        setEditProduct((v) => ({ ...v, stock: e.target.value }))
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={p.is_hit}
                      onChange={() => toggleHit(p)}
                    />
                    {p.is_hit_auto && (
                      <span
                        title="Популярный (авто-хит)"
                        style={{
                          marginLeft: 6,
                          color: "#ffa800",
                          fontWeight: "bold",
                          fontSize: 20,
                          verticalAlign: "middle"
                        }}
                      >★</span>
                    )}
                  </td>
                  <td>
                    <input
                      value={editProduct.images}
                      onChange={e =>
                        setEditProduct((v) => ({ ...v, images: e.target.value }))
                      }
                    />
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleEditFileUpload}
                      style={{ marginTop: 6 }}
                    />
                    {/* Список картинок с удалением */}
                    {editProduct.images && (
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          marginTop: 6,
                          flexWrap: "wrap"
                        }}
                      >
                        {editProduct.images
                          .split(",")
                          .map((imgUrl, idx) => {
                            const url = imgUrl.trim();
                            if (!url) return null;
                            const srcUrl = url.startsWith("http")
                              ? url
                              : `/static/${url.startsWith("/") ? url.slice(1) : url}`;
                            return (
                              <span key={idx} style={{ display: "inline-block", marginRight: 8, position: "relative" }}>
                                <img
                                  src={srcUrl}
                                  alt=""
                                  style={{ height: 40, borderRadius: 4, border: "1px solid #aaa", background: "#fff" }}
                                />
                                <button
                                  type="button"
                                  style={{
                                    position: "absolute",
                                    top: 0,
                                    right: 0,
                                    background: "#e53935",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "50%",
                                    width: 22,
                                    height: 22,
                                    cursor: "pointer",
                                    fontWeight: "bold",
                                    padding: 0,
                                    transform: "translate(35%,-35%)",
                                  }}
                                  title="Удалить картинку"
                                  onClick={() => {
                                    const arr = editProduct.images
                                      .split(",")
                                      .map(s => s.trim())
                                      .filter(Boolean)
                                      .filter((_, i) => i !== idx);
                                    setEditProduct(v => ({
                                      ...v,
                                      images: arr.join(", ")
                                    }));
                                  }}
                                >
                                  ×
                                </button>
                              </span>
                            );
                          })}
                      </div>
                    )}
                  </td>
                  <td>
                    <input
                      value={editProduct.description}
                      onChange={e =>
                        setEditProduct((v) => ({ ...v, description: e.target.value }))
                      }
                    />
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
                  {/* Обычный режим отображения */}
                  <td>{p.id}</td>
                  <td>{p.name}</td>
                  <td>{p.price}</td>
                  <td>{p.model_compat}</td>
                  <td>{p.type}</td>
                  <td>{p.stock}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={p.is_hit}
                      onChange={() => toggleHit(p)}
                    />
                    {p.is_hit_auto && (
                      <span
                        title="Популярный (авто-хит)"
                        style={{
                          marginLeft: 6,
                          color: "#ffa800",
                          fontWeight: "bold",
                          fontSize: 20,
                          verticalAlign: "middle"
                        }}
                      >★</span>
                    )}
                  </td>
                  <td>
                    {p.images && p.images.length > 0
                      ? renderImages(
                          (Array.isArray(p.images) ? p.images : [p.images]).join(",")
                        )
                      : ""}
                  </td>
                  <td>{p.description}</td>
                  <td>
                    <button onClick={() => handleEdit(p)}>
                      ✎
                    </button>
                    <button
                      style={{ background: "#e53935", color: "#fff" }}
                      onClick={() => handleDelete(p.id)}
                    >
                      🗑
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
