"""Pasa un mapa en proyección Mollweide (elíptica) a un mapa plano 2:1 (equirectangular).

La rejilla del disco (32x16) es de latitud y longitud, así que un mapa elíptico hay que
aplanarlo antes. Para cada píxel de salida (lat, lon) se busca de dónde viene en la elipse.

Medidas de la elipse (centro, semiejes) las da cada disco. Meridiano central: 0°.
"""
import numpy as np
from PIL import Image


def equirect_index(shape: tuple[int, int], cx: float, cy: float, a: float, b: float,
                   size: tuple[int, int]) -> tuple[np.ndarray, np.ndarray]:
    """Para cada píxel del mapa plano (ancho, alto = size), fila y columna de origen en la
    imagen elíptica de forma `shape` (alto, ancho). (cx, cy): centro; a, b: semiejes en píxeles."""
    w, h = size
    lat = np.radians(90 - (np.arange(h) + 0.5) * 180 / h)
    lon = np.radians(-180 + (np.arange(w) + 0.5) * 360 / w)
    # theta resuelve 2θ + sin 2θ = π sin φ (Newton; cerca de los polos converge más lento)
    theta = lat.copy()
    target = np.pi * np.sin(lat)
    for _ in range(40):
        f = 2 * theta + np.sin(2 * theta) - target
        d = 2 + 2 * np.cos(2 * theta)
        theta = theta - np.divide(f, d, out=np.zeros_like(f), where=np.abs(d) > 1e-9)
    x = cx + a * (lon[None, :] / np.pi) * np.cos(theta)[:, None]
    y = np.broadcast_to((cy - b * np.sin(theta))[:, None], (h, w))
    xi = np.clip(np.round(x).astype(int), 0, shape[1] - 1)
    yi = np.clip(np.round(y).astype(int), 0, shape[0] - 1)
    return yi, xi


def to_equirect(img: Image.Image, cx: float, cy: float, a: float, b: float,
                size: tuple[int, int]) -> Image.Image:
    """Mapa plano RGB de tamaño `size` a partir de una imagen elíptica."""
    src = np.asarray(img.convert("RGB"))
    yi, xi = equirect_index(src.shape[:2], cx, cy, a, b, size)
    return Image.fromarray(src[yi, xi])
