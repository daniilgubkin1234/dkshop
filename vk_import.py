# vk_import.py (полная версия, с добавлением extract_images и images в payload)
import os
import time
import re
import requests
from dotenv import load_dotenv
from pathlib import Path

# Загружаем переменные окружения из .env
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

VK_TOKEN = os.getenv("VK_TOKEN")
if not VK_TOKEN:
    raise RuntimeError("VK_TOKEN не найден в .env")

# Настройки VK API
OWNER_ID    = -135559990  # ID сообщества со знаком "-"
CATEGORY_ID = None        # или нужный category_id (число)
COUNT       = 200
API_VERSION = "5.131"
API_URL     = "https://api.vk.com/method/market.get"

# URL вашего бэкенда для сохранения продуктов
BACKEND_URL = "http://localhost:8001/products"


def extract_model(title: str) -> str:
    """
    Ищем шаблон «4 цифры-минус-2 цифры» (например, «2101-07») в названии.
    """
    match = re.search(r"\d{4}-\d{2}", title)
    return match.group(0) if match else ""


def extract_type(item: dict) -> str:
    """
    Определяем тип товара: если есть category.name — возвращаем его, 
    иначе — возвращаем «запчасть».
    """
    cat = item.get("category")
    if isinstance(cat, dict) and cat.get("name"):
        return cat["name"]
    return "запчасть"


def extract_images(item: dict) -> list[str]:
    """
    Собираем список URL-ов фотографий для одного товара из VK Market.
    1) Если есть thumb_photo, добавляем его.
    2) Если есть блок photos.items — забираем самый крупный размер ("x" или последний).
    Возвращаем список (возможно, пустой).
    """
    images = []

    # 1) thumb_photo (обычно это маленькая превьюшка)
    thumb = item.get("thumb_photo")
    if thumb:
        images.append(thumb)

    # 2) идём по item["photos"]["items"], если они есть
    photos_list = item.get("photos", {}).get("items", [])
    for photo in photos_list:
        sizes = photo.get("sizes", [])
        # Ищем размер "x" (средний/крупный). Если нет — последний элемент массива.
        url_to_use = None
        for size in sizes:
            if size.get("type") == "x":
                url_to_use = size.get("url")
                break
        if not url_to_use and sizes:
            url_to_use = sizes[-1].get("url")
        if url_to_use:
            images.append(url_to_use)

    # Убираем дубли (если thumb_photo совпал с каким-то из sizes)
    unique_images = list(dict.fromkeys(images))
    return unique_images


def fetch_all_items() -> list[dict]:
    """
    Загружаем все товары из VK Market с пагинацией.
    Возвращает список словарей (item из VK).
    """
    items = []
    offset = 0

    while True:
        params = {
            "owner_id":     OWNER_ID,
            "count":        COUNT,
            "offset":       offset,
            "access_token": VK_TOKEN,
            "v":            API_VERSION
        }
        if CATEGORY_ID is not None:
            params["category_id"] = CATEGORY_ID

        resp = requests.get(API_URL, params=params).json()
        if "error" in resp:
            raise RuntimeError(f"VK API Error: {resp['error']}")

        batch = resp.get("response", {}).get("items", [])
        if not batch:
            break

        items.extend(batch)
        offset += len(batch)
        time.sleep(0.3)  # небольшая задержка, чтобы не задеть rate limit

    return items


def push_to_backend(item: dict) -> None:
    """
    Формируем и отправляем JSON с нужными полями в ваш API.
    Теперь включает поле "images" — список URL-ов картинок.
    """
    title = item.get("title", "").strip()
    if not title:
        print(f"⚠️ Пропускаем товар без названия (id={item.get('id')})")
        return

    payload = {
        "name":         title,
        "price":        int(item["price"]["amount"]) // 100,
        "model_compat": extract_model(title),
        "type":         extract_type(item),
        "images":       extract_images(item),
        # stock остаётся дефолтом (10) или вы его не передаёте, сервер сам ставит
    }

    try:
        r = requests.post(BACKEND_URL, json=payload)
        if not r.ok:
            print(f"Ошибка при отправке {item.get('id')}: {r.status_code} {r.text}")
    except requests.RequestException as e:
        print(f"Ошибка запроса при отправке {item.get('id')}: {e}")


def main() -> None:
    all_items = fetch_all_items()
    print(f"Загружено товаров: {len(all_items)}")
    for itm in all_items:
        push_to_backend(itm)
    print("Импорт завершён.")


if __name__ == "__main__":
    main()
