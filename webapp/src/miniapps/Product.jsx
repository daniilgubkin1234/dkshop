import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function Product() {
  const { id } = useParams();
  const [item, setItem] = useState(undefined);   // undefined — ещё не загрузили

  useEffect(() => {
    fetch(`http://localhost:8001/products?q=${id}`)
      .then(r => r.json())
      .then(arr => setItem(arr[0]))
      .catch(console.error);
  }, [id]);

  if (item === undefined) return <p style={{ padding: 20 }}>Загрузка…</p>;
  if (!item)               return <p style={{ padding: 20 }}>Товар не найден</p>;

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <h2>{item.name}</h2>
      <p>Цена: <b>{item.price} ₽</b></p>
      <p>Совместимость: {item.model_compat}</p>
    </div>
  );
}