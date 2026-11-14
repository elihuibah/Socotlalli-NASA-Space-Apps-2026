"""Separa una imagen en capas por categoría, para leyendas de colores fijos (no escalas).

Caso de uso: GEOS Aerosols, donde cada tipo de partícula tiene un color y su cantidad
se ve como qué tan intenso (opaco) está ese color sobre el mapa oscuro.

Idea: a cada píxel se le quita su parte gris (mínimo de R, G, B). El mapa de fondo,
la nieve, el hielo y las luces de ciudad son casi grises, así que quedan cerca de cero.
Lo que sobra es el "croma": su dirección dice qué categoría es (el color de la leyenda
más parecido) y su tamaño, comparado con el de la leyenda, dice qué tan intensa es (0..1).

Prueba rápida:  python pipeline/categories.py pipeline/raw/aerosols/2025-08-19.png
"""
import sys

import numpy as np
from PIL import Image

MIN_CHROMA = 12.0   # croma menor a esto es fondo gris (en escala 0..255)
MIN_COS = 0.85      # qué tan parecida debe ser la dirección del color a la de la leyenda


def chroma(rgb: np.ndarray) -> np.ndarray:
    rgb = np.asarray(rgb, dtype=float)
    return rgb - rgb.min(axis=-1, keepdims=True)


class Categories:
    def __init__(self, colors: dict[str, tuple[int, int, int]]):
        """colors: nombre -> color RGB de la leyenda."""
        self.names = list(colors)
        c = np.stack([chroma(colors[n]) for n in self.names])
        self.size = np.linalg.norm(c, axis=1)
        self.direction = c / self.size[:, None]

    def layers(self, img: Image.Image) -> dict[str, np.ndarray]:
        """Devuelve, por categoría, la intensidad 0..1 de cada píxel (0 si es de otra)."""
        c = chroma(np.asarray(img.convert("RGB")))
        size = np.linalg.norm(c, axis=-1)
        cos = (c @ self.direction.T) / np.maximum(size[..., None], 1e-6)
        best = cos.argmax(axis=-1)
        valid = (size >= MIN_CHROMA) & (cos.max(axis=-1) >= MIN_COS)
        alpha = np.clip(size / self.size[best], 0.0, 1.0) * valid
        return {n: np.where(best == i, alpha, 0.0) for i, n in enumerate(self.names)}


if __name__ == "__main__":
    from build_disc import DISCS, WORK_SIZE
    cats = Categories(DISCS["aerosols"]["categories"])
    img = Image.open(sys.argv[1]).convert("RGB").resize(WORK_SIZE, Image.BOX)
    for name, layer in cats.layers(img).items():
        print(f"{name:14s} intensidad promedio en el mapa: {layer.mean():.3f}")
