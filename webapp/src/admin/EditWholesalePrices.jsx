import React, { useEffect, useState } from "react";
import { fetchProducts, updateClientWholesalePrices } from "../api.js";

export default function EditWholesalePrices({ user, onClose, onSaved }) {
  const [products, setProducts] = useState([]);
  const [prices, setPrices] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProducts().then(setProducts);
    setPrices(user.wholesale_prices || {});
  }, [user]);

  const handleChange = (productId, value) => {
    setPrices(p => ({
      ...p,
      [productId]: value === "" ? undefined : Number(value)
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    await updateClientWholesalePrices(user.id, prices);
    setSaving(false);
    onSaved && onSaved();
    onClose();
  };

  return (
    <div className="modal-backdrop" style={{
      position: "fixed", left: 0, top: 0, width: "100vw", height: "100vh",
      background: "rgba(0,0,0,0.25)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div style={{
        background: "#232323", color: "#fff", padding: 28, borderRadius: 12, minWidth: 360, maxHeight: "70vh", overflow: "auto", boxShadow: "0 6px 24px #0009"
      }}>
        <h3>Индивидуальные цены для {user.username || user.first_name}</h3>
        <table style={{ minWidth: 320, margin: "16px 0" }}>
          <thead>
            <tr>
              <th>Товар</th>
              <th>Опт. цена</th>
              <th>Персональная цена</th>
            </tr>
          </thead>
          <tbody>
            {products.filter(p => p.is_wholesale).map(prod => (
              <tr key={prod.id}>
                <td>{prod.name}</td>
                <td>{prod.price?.toLocaleString()} ₽</td>
                <td>
                  <input
                    type="number"
                    value={prices[prod.id] ?? ""}
                    min={0}
                    style={{ width: 80, padding: "2px 6px", fontSize: 15, background: "#191919", color: "#fff", borderRadius: 4, border: "1px solid #666" }}
                    onChange={e => handleChange(prod.id, e.target.value)}
                    placeholder="нет"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: "flex", gap: 14 }}>
          <button disabled={saving} onClick={handleSave} style={{ background: "#167c38", color: "#fff", borderRadius: 4, border: "none", padding: "8px 18px", fontWeight: 600 }}>
            Сохранить
          </button>
          <button onClick={onClose} style={{ background: "#444", color: "#fff", borderRadius: 4, border: "none", padding: "8px 16px" }}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}
