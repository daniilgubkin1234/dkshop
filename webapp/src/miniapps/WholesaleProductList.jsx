// webapp/src/miniapps/WholesaleProductList.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchProducts } from "../api.js";
import { useCart } from "../context/CartContext.jsx";
import { fetchClients, updateClientWholesale } from "../api.js";
import "./ProductList.css";

export default function WholesaleProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const user = JSON.parse(localStorage.getItem('dkshop_user') || '{}');
  useEffect(() => {
    fetchProducts({
      wholesale: 1,
      user_id: user.id,
      username: user.username || ""
    })
      .then(setProducts)
      .catch(() => setError("Не удалось загрузить оптовые товары"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <h2 className="catalog-title">Каталог (Опт)</h2>
      {loading && <p className="pl-status">Загрузка…</p>}
      {error && <p className="pl-status">{error}</p>}
      {!loading && !error && products.length === 0 && (
        <p className="pl-status">Нет оптовых товаров</p>
      )}
      {!loading && !error && products.length > 0 && (
        <div className="product-grid">
          {products.map((p) => (
            <div key={p.id} className="product-card" onClick={() => navigate(`/product/${p.id}`)}>
              <img
                src={p.images?.[0] || '/static/no-image.png'}
                alt={p.name}
                className="product-image"
                onError={e => { e.currentTarget.src = '/static/no-image.png'; }}
              />
              <div className="product-info">
                <h3 className="product-title">{p.name}</h3>
                <p className="product-price">
                {(p.personal_price ?? p.price).toLocaleString()} ₽
                </p>
              </div>
              <button className="btn-add-cart" onClick={e => { e.stopPropagation(); addToCart(p); }}>
                В корзину
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
