import os
import requests

API_URL = "https://dkshopbot.ru/products"   # локальный адрес API для быстроты
UPLOADS_DIR = "/var/dkshop/backend/app/static/uploads"

def patch_images(product_id, new_images):
    url = f"{API_URL}/{product_id}"
    payload = {"images": new_images}
    try:
        resp = requests.patch(url, json=payload, timeout=10)
        if resp.status_code < 300:
            print(f"Updated {product_id}")
        else:
            print(f"Failed to update {product_id}: {resp.text}")
    except Exception as e:
        print(f"Patch error for {product_id}: {e}")

def main():
    all_products = requests.get(API_URL).json()
    for product in all_products:
        images = product.get("images", [])
        filtered = []
        for img in images:
            # Получаем только имя файла из URL (после последнего '/')
            fname = os.path.basename(img)
            if os.path.exists(os.path.join(UPLOADS_DIR, fname)):
                filtered.append(img)
        if filtered != images:
            patch_images(product["id"], filtered)

if __name__ == "__main__":
    main()
