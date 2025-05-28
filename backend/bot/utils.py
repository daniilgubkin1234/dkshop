# utils.py
import os
from urllib.parse import urljoin

FRONT_URL = os.getenv("FRONT_URL", "").rstrip("/")

def https_product_url(pid: int) -> str | None:
    """Возвращает HTTPS-ссылку на карточку товара или None,
       если FRONT_URL не начинается с https://."""
    if FRONT_URL.startswith("https://"):
        return urljoin(FRONT_URL + "/", f"product/{pid}")
    return None