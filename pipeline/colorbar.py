"""Convierte colores de la imagen a valores de 0 a 1 usando la barra de colores.

Idea: cada color de la barra tiene un tono (hue) distinto, y el tono va bajando de forma
continua de azul a rojo. Leemos ese perfil de tono a lo largo de la barra y, para cada
píxel del mapa, buscamos en qué punto de la barra está su tono.

Se usa el tono y no el RGB porque en la visualización del SVS los trazos de corriente
se ven más oscuros o más claros, pero su tono es el mismo que en la barra.

Prueba rápida:  python pipeline/colorbar.py pipeline/raw/sst/colorbar.png
"""
import sys

import numpy as np
from PIL import Image

# Umbrales en escala 0..255 de PIL (HSV). Un píxel por debajo no cuenta como dato:
MIN_SAT = 100   # gris (la tierra en el mapa) tiene saturación casi 0
MIN_VAL = 40    # casi negro (el fondo entre trazos) tiene tono poco confiable


def to_hsv(rgb: Image.Image) -> np.ndarray:
    return np.asarray(rgb.convert("RGB").convert("HSV")).astype(float)


def unwrap(h: np.ndarray) -> np.ndarray:
    """El rojo puro cae en el borde del círculo (0 o ~250). Lo pasamos a negativo para que
    la escala azul→rojo sea continua: azul ≈ 155, verde ≈ 95, amarillo ≈ 43, rojo ≈ 0 o -6."""
    return np.where(h > 200, h - 256, h)


class Colorbar:
    def __init__(self, path, margin: int = 2):
        hsv = to_hsv(Image.open(path))
        colored = (hsv[..., 1] > 120) & (hsv[..., 2] > 120)
        ys, xs = np.nonzero(colored)
        y = (ys.min() + ys.max()) // 2
        # Cuántos píxeles se quitan en cada orilla, para no leer el borde negro difuminado.
        x0, x1 = xs.min() + margin, xs.max() - margin
        hue = unwrap(hsv[y, x0:x1 + 1, 0])
        pos = np.linspace(0, 1, hue.size)   # 0 = extremo izquierdo de la barra, 1 = derecho
        # np.interp necesita x creciente: el tono baja de izquierda a derecha, así que invertimos.
        hue_inc = np.minimum.accumulate(hue)[::-1]
        self.hue = hue_inc
        self.pos = pos[::-1]

    def values(self, img: Image.Image) -> tuple[np.ndarray, np.ndarray]:
        """Devuelve (valor 0..1 por píxel, máscara de píxeles que sí son dato)."""
        hsv = to_hsv(img)
        valid = (hsv[..., 1] >= MIN_SAT) & (hsv[..., 2] >= MIN_VAL)
        v = np.interp(unwrap(hsv[..., 0]), self.hue, self.pos)
        return v, valid


if __name__ == "__main__":
    cb = Colorbar(sys.argv[1])
    print(f"tono de {cb.hue[-1]:.0f} (valor 0) a {cb.hue[0]:.0f} (valor 1), {cb.hue.size} muestras")
    bar = Image.open(sys.argv[1]).convert("RGB")
    v, ok = cb.values(bar)
    row = v[48]
    print("lectura de la propia barra, izquierda a derecha:", np.round(row[16:290:30], 2))
