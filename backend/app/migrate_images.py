import requests
import os
import hashlib

API_URL = "https://dkshopbot.ru/products"
UPLOAD_DIR = "/var/dkshop/backend/app/static/uploads"

def download_and_save_image(url):
    try:
        response = requests.get(url, timeout=20)
        if response.status_code == 200:
            ext = url.split('.')[-1].split('?')[0]
            name = hashlib.md5(url.encode()).hexdigest()[:16]
            fname = f"{name}.{ext}"
            fpath = os.path.join(UPLOAD_DIR, fname)
            with open(fpath, "wb") as f:
                f.write(response.content)
            return fname
    except Exception as e:
        print(f"Failed to download {url}: {e}")
    return None

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
        new_images = []
        changed = False
        for img in images:
            if img.startswith("http") and "dkshopbot.ru/static/uploads" not in img:
                fname = download_and_save_image(img)
                if fname:
                    new_images.append(f"https://dkshopbot.ru/static/uploads/{fname}")
                    changed = True
                else:
                    new_images.append(img)
            else:
                new_images.append(img)
        if changed:
            patch_images(product["id"], new_images)

if __name__ == "__main__":
    main()
