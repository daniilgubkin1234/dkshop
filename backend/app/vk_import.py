"""
Импорт товаров из VK Market → backend /api/products

  • Основной запрос: market.get с extended=1, чтобы сразу получить description.
  • Если description всё ещё пустое: дозапрашиваем market.getById.
  • extract_images() умеет работать, даже если field "photos" – это список
    или словарь.
"""

from __future__ import annotations
import os, time, re, html
from pathlib import Path
from typing import List, Dict, Any, Union

import requests
from dotenv import load_dotenv, find_dotenv

# ────────────────────────── Загрузка .env ──────────────────────────
load_dotenv(find_dotenv())

VK_TOKEN    = os.getenv("VK_TOKEN")
BACKEND_URL = os.getenv("BACKEND_URL", "https://dkshopbot.ru/api/products")
OWNER_ID    = int(os.getenv("OWNER_ID", "-135559990"))
API_V       = "5.131"

if not VK_TOKEN:
    raise RuntimeError("VK_TOKEN не найден в .env")


# ────────────────────────── Вспомогательные функции ──────────────────────────

def vk_request(method_url: str, **params) -> Dict[str, Any]:
    """
    Делает HTTP GET-запрос к VK API, проверяет наличие "error" и возвращает
    поле "response" для дальнейшей работы.
    """
    base = {"access_token": VK_TOKEN, "v": API_V}
    resp = requests.get(method_url, params={**base, **params}).json()
    if "error" in resp:
        raise RuntimeError(f"VK API Error: {resp['error']}")
    return resp["response"]


def extract_model(title: str) -> str:
    """
    Проверяет строку title на паттерн 'YYYY-XX' (например, '2101-07').
    Если что-то найдёт, вернёт это, иначе пустую строку.
    """
    m = re.search(r"\d{4}-\d{2}", title or "")
    return m.group(0) if m else ""


def extract_type(item: dict) -> str:
    """
    Если у item есть поле 'category' и это dict, возвращаем category['name'],
    иначе – 'запчасть'.
    """
    cat = item.get("category")
    if isinstance(cat, dict):
        return cat.get("name", "запчасть")
    return "запчасть"


def extract_images(item: dict) -> List[str]:
    """
    Собирает список URL-ов картинок:
      1) thumb_photo (если есть)
      2) из "photos", который может быть:
         a) dict с ключом "items" (список словарей),
         b) или просто список (например, list из словарей или строк).
    Для каждого элемента либо берём sizes с type=='x', либо последнее.
    Убираем дубли, возвращаем только уникальные URL.
    """
    imgs: List[str] = []

    # 1) thumbnail
    thumb = item.get("thumb_photo")
    if thumb:
        imgs.append(thumb)

    # 2) обрабатываем поле "photos"
    photos_field = item.get("photos")
    items_list: List[Union[dict, Any]] = []

    if isinstance(photos_field, dict):
        # Ожидаем, что есть ключ "items"
        items_list = photos_field.get("items", [])
    elif isinstance(photos_field, list):
        # Иногда VK отдаёт сразу список (без обёртки "items")
        items_list = photos_field
    else:
        # Если вовсе нет фото, оставляем пустой список
        items_list = []

    # Проходим по каждому ph в полученном списке
    for ph in items_list:
        if not isinstance(ph, dict):
            # Если элемент списка – не словарь, пропускаем
            continue

        sizes = ph.get("sizes", [])
        # Ищем тип 'x', иначе берём последний url
        url = None
        for s in sizes:
            if s.get("type") == "x" and s.get("url"):
                url = s["url"]
                break
        if not url and sizes:
            # Если не нашли type 'x', берём url последнего размера
            url = sizes[-1].get("url")

        if url:
            imgs.append(url)

    # Убираем дубли, сохраняя порядок вставки
    return list(dict.fromkeys(imgs))


def clean_description(text: str) -> str:
    """
    Убирает HTML-теги (<…>) и декодирует HTML-сущности (&quot; и т.п.),
    возвращает «чистый» текст без лишних пробелов.
    """
    unescaped = html.unescape(text or "")
    no_tags   = re.sub(r"<[^>]+>", "", unescaped)
    return no_tags.strip()


# ────────────────────────── Основной импорт ──────────────────────────

def fetch_items() -> List[Dict[str, Any]]:
    """
    Получаем все товары из VK Market, по 200 штук за раз (batch).
    Используем extended=1, чтобы сразу взять поле description, если оно заполнено.
    """
    all_items: List[Dict[str, Any]] = []
    offset = 0
    COUNT = 200

    while True:
        resp = vk_request(
            "https://api.vk.com/method/market.get",
            owner_id=OWNER_ID,
            count=COUNT,
            offset=offset,
            extended=1  # чтобы сразу включить description
        )
        batch = resp.get("items", [])
        if not batch:
            break
        all_items.extend(batch)
        offset += len(batch)
        time.sleep(0.25)  # пауза, чтобы не триггерить лимит
    return all_items


def ensure_description(item: dict) -> None:
    """
    Если у item['description'] пусто / None / пустая строка — дозапрашиваем
    через market.getById, чтобы гарантированно получить текст.
    """
    desc = item.get("description")
    if desc:
        return

    resp = vk_request(
        "https://api.vk.com/method/market.getById",
        item_ids=f"{OWNER_ID}_{item['id']}"
    )
    arr = resp.get("items", [])
    if arr and isinstance(arr, list):
        item["description"] = arr[0].get("description", "")


def push_to_backend(item: dict) -> None:
    """
    Собирает обязательный payload из полей item и выполняет POST в BACKEND_URL.
    Если статус-код >= 300, печатает ошибку.
    """
    payload = {
        "name":         (item.get("title") or "").strip(),
        "price":        int(item.get("price", {}).get("amount", 0)) // 100,
        "model_compat": extract_model(item.get("title", "")),
        "type":         extract_type(item),
        "images":       extract_images(item),
        "description":  clean_description(item.get("description", "")),
    }
    resp = requests.post(BACKEND_URL, json=payload, timeout=10)
    if resp.status_code >= 300:
        print(f"⛔ Ошибка {resp.status_code} при пуше товара id={item.get('id')}: {resp.text}")


def main() -> None:
    """
    1) Скачиваем ВСЕ товары (fetch_items).
    2) У каждого без description делаем ensure_description.
    3) Шлём в API backend по одному (push_to_backend).
    """
    goods = fetch_items()
    print(f"✅ Получено из VK: {len(goods)} товаров")

    reloaded = 0
    for item in goods:
        # Если description пустой, дозапрашиваем
        if not item.get("description"):
            ensure_description(item)
            if item.get("description"):
                reloaded += 1

        push_to_backend(item)

    print(f"✅ Импорт завершён. Описание догружено для {reloaded} товаров.")


if __name__ == "__main__":
    main()
