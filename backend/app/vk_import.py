import os
import requests
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(dotenv_path="/var/dkshop/webapp/.env.production", override=True)


VK_TOKEN    = os.getenv("VK_TOKEN")
API_V       = "5.131"
OWNER_ID    = int(os.getenv("OWNER_ID", "-135559990"))
BACKEND_URL = os.getenv("BACKEND_URL", "https://dkshopbot.ru/api/products")

def vk_request(method_url: str, **params):
    base = {"access_token": VK_TOKEN, "v": API_V}
    resp = requests.get(method_url, params={**base, **params}).json()
    if "error" in resp:
        raise RuntimeError(f"VK API Error: {resp['error']}")
    return resp["response"]

def extract_images(item: dict):
    imgs = []
    thumb = item.get("thumb_photo")
    if thumb:
        imgs.append(thumb)
    photos_field = item.get("photos")
    items_list = []
    if isinstance(photos_field, dict) and "items" in photos_field:
        items_list = photos_field["items"]
    elif isinstance(photos_field, list):
        items_list = photos_field
    for entry in items_list:
        if isinstance(entry, dict):
            sizes = entry.get("sizes", [])
            url = None
            for size in sizes:
                if size.get("type") == "x":
                    url = size.get("url")
                    break
            if not url and sizes:
                url = sizes[-1].get("url")
            if url:
                imgs.append(url)
        elif isinstance(entry, str):
            imgs.append(entry)
    return list(dict.fromkeys(imgs))

def fetch_items():
    all_items = []
    offset = 0
    COUNT = 200
    while True:
        resp = vk_request(
            "https://api.vk.com/method/market.get",
            owner_id=OWNER_ID,
            count=COUNT,
            offset=offset,
            extended=1
        )
        batch = resp.get("items", [])
        if not batch:
            break
        all_items.extend(batch)
        offset += len(batch)
    return all_items

def patch_images(product_id, images):
    url = f"{BACKEND_URL}/{product_id}"
    payload = {"images": images}
    try:
        resp = requests.patch(url, json=payload, timeout=10)
        print(f"Patched {product_id}: {resp.status_code}")
    except Exception as e:
        print(f"Patch error for {product_id}: {e}")

def main():
    # Получить товары из VK
    vk_goods = fetch_items()
    print(f"Из VK получено: {len(vk_goods)} товаров")

    # Получить товары из API (чтобы связать с vk)
    api_goods = requests.get(BACKEND_URL).json()
    print(f"В API: {len(api_goods)} товаров")

    # Тебе нужно связать товары по id или названию (лучше по title, если совпадают!)
    api_goods_by_name = {item['name']: item for item in api_goods}

    matched = 0
    for vk_item in vk_goods:
        name = (vk_item.get('title') or '').strip()
        images = extract_images(vk_item)
        api_item = api_goods_by_name.get(name)
        if api_item and images:
            patch_images(api_item['id'], images)
            matched += 1

    print(f"Обновлено изображений для {matched} товаров.")

if __name__ == "__main__":
    main()
