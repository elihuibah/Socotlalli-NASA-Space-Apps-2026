"""Convierte colores de la imagen a una posición de 0 a 1 en la barra de colores.

Idea: cada color de la barra tiene un tono (hue) distinto, y el tono va bajando de forma
continua de azul a rojo. Leemos ese perfil de tono a lo largo de la barra y, para cada
píxel del mapa, buscamos en qué punto de la barra está su tono.

Se usa el tono y no el RGB porque en las visualizaciones del SVS el color del dato se
ve más claro u oscuro (trazos de corriente, mezcla con el mapa de fondo), pero su tono
se mantiene parecido al de la barra.

Posición 0 = extremo izquierdo de la escala, 1 = extremo derecho. El paso a unidades
reales (°C, ppm) lo hace build_disc con la escala de cada disco.

Prueba rápida:  python pipeline/colorbar.py pipeline/raw/sst/colorbar.png
"""
import sys

import numpy as np
from PIL import Image

# Umbrales en escala 0..255 de PIL (HSV). Un píxel por debajo no cuenta como dato:
MIN_SAT = 100   # gris, blanco y desierto (mapa de fondo) tienen saturación baja
MIN_VAL = 40    # casi negro (el fondo entre trazos) tiene tono poco confiable
HUE_TOL = 6     # cuánto puede salirse el tono del rango de la barra y seguir contando


def to_hsv(rgb: Image.Image) -> np.ndarray:
    return np.asarray(rgb.convert("RGB").convert("HSV")).astype(float)


def unwrap(h: np.ndarray) -> np.ndarray:
    """El rojo puro cae en el borde del círculo (0 o ~250). Lo pasamos a negativo para que
    la escala azul→rojo sea continua: azul ≈ 155, verde ≈ 95, amarillo ≈ 43, rojo ≈ 0 o -6."""
    return np.where(h > 200, h - 256, h)


class Colorbar:
    def __init__(self, path, extent: tuple[int, int] | None = None, margin: int = 2):
        """extent: columnas (x) de los extremos de la escala en la imagen de la barra.
        Si no se da, la escala es la parte con color de la barra. Hace falta cuando una
        parte de la barra es transparente (por ejemplo, el CO2 abajo de ~430 ppm)."""
        hsv = to_hsv(Image.open(path))
        colored = (hsv[..., 1] > 120) & (hsv[..., 2] > 120)
        ys, xs = np.nonzero(colored)
        y = (ys.min() + ys.max()) // 2
        # Cuántos píxeles se quitan en cada orilla, para no leer el borde difuminado.
        x0, x1 = xs.min() + margin, xs.max() - margin
        hue = unwrap(hsv[y, x0:x1 + 1, 0])
        left, right = extent if extent else (x0, x1)
        pos = (np.arange(x0, x1 + 1) - left) / (right - left)
        # np.interp necesita x creciente: el tono baja de izquierda a derecha, así que invertimos.
        self.hue = np.minimum.accumulate(hue)[::-1]
        self.pos = pos[::-1]
        self.hue_range = (hue.min() - HUE_TOL, hue.max() + HUE_TOL)

    def values(self, img: Image.Image) -> tuple[np.ndarray, np.ndarray]:
        """Devuelve (posición 0..1 en la escala por píxel, máscara de píxeles que sí son dato)."""
        hsv = to_hsv(img)
        h = unwrap(hsv[..., 0])
        lo, hi = self.hue_range
        valid = (hsv[..., 1] >= MIN_SAT) & (hsv[..., 2] >= MIN_VAL) & (h >= lo) & (h <= hi)
        v = np.interp(h, self.hue, self.pos)
        return v, valid


if __name__ == "__main__":
    cb = Colorbar(sys.argv[1])
    print(f"tono de {cb.hue[-1]:.0f} (inicio) a {cb.hue[0]:.0f} (final), {cb.hue.size} muestras")
    bar = Image.open(sys.argv[1]).convert("RGB")
    v, ok = cb.values(bar)
    row = v[48]
    print("lectura de la propia barra, izquierda a derecha:", np.round(row[16:290:30], 2))
