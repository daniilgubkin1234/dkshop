import os
import requests
from urllib.parse import urlparse

API_URL = "https://dkshopbot.ru/products"
UPLOADS_DIR = "/var/dkshop/backend/app/static/uploads"

def get_filename_from_url(img_url):
    # Получаем только имя файла, без query-части
    path = urlparse(img_url).path
    fname = os.path.basename(path)
    return fname

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
            fname = get_filename_from_url(img)
            fpath = os.path.join(UPLOADS_DIR, fname)
            if os.path.isfile(fpath):
                filtered.append(img)
        if filtered != images:
            patch_images(product["id"], filtered)

if __name__ == "__main__":
    main()
