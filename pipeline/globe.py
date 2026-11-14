"""Lee visualizaciones de un globo que gira (GEDI Forest Height), donde no hay mapa plano.

La rejilla no es de latitud y longitud: se pone sobre el cuadrado que encierra al globo,
tal como se ve en pantalla. Así el barrido va de izquierda a derecha sobre el planeta.

Tres pasos:
  1. locate():  encuentra el disco del globo con el canal alfa (el espacio es transparente).
  2. RampBar:   lee la altura de cada píxel buscando el color más cercano (RGB) en la barra.
                Aquí no sirve el tono: la barra va de café a verde a crema, y el crema
                casi no tiene tono. Más claro = más alto, igual que lo lee una persona.
  3. read():    marca como dato solo la vegetación: descarta océano y hielo (más azul que
                rojo), espacio y el borde del globo, donde las agujas 3D se ven de lado.

Prueba rápida:  python pipeline/globe.py pipeline/raw/forest/1650.tif
"""
import sys

import numpy as np
from PIL import Image

MAX_DIST = 25.0      # distancia RGB máxima a la barra para contar como vegetación
LIMB = 0.85          # fracción del radio que se usa; afuera, las agujas 3D se ven de lado
SIZE = 1024          # el cuadrado del globo se lee a SIZE x SIZE píxeles


class RampBar:
    def __init__(self, path, row: int, x_range: tuple[int, int], extent: tuple[int, int], step: int = 2):
        """row: fila central de la barra; x_range: columnas con color; extent: columnas de
        los extremos de la escala (0 y el máximo). Devuelve posiciones 0..1 en la escala."""
        rgb = np.asarray(Image.open(path).convert("RGB")).astype(float)
        xs = np.arange(x_range[0], x_range[1] + 1, step)
        self.colors = rgb[row, xs]
        self.pos = (xs - extent[0]) / (extent[1] - extent[0])

    def values(self, rgb: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        """rgb: (alto, ancho, 3). Devuelve (posición 0..1, distancia al color más cercano)."""
        best = np.zeros(rgb.shape[:2], dtype=int)
        dist = np.full(rgb.shape[:2], np.inf)
        for i, c in enumerate(self.colors):  # por color, para no usar memoria de más
            d = ((rgb - c) ** 2).sum(axis=-1)
            closer = d < dist
            best[closer] = i
            dist[closer] = d[closer]
        return self.pos[best], np.sqrt(dist)


def locate(img: Image.Image) -> tuple[int, int, int]:
    """Centro (x, y) y radio del globo, con el canal alfa. Ignora las agujas sueltas
    contando solo filas y columnas con más de 60 píxeles opacos."""
    alpha = np.asarray(img.getchannel("A")) > 200
    rows = np.where(alpha.sum(axis=1) > 60)[0]
    cols = np.where(alpha.sum(axis=0) > 60)[0]
    cx = (cols.min() + cols.max()) // 2
    cy = (rows.min() + rows.max()) // 2
    r = min(rows.max() - rows.min(), cols.max() - cols.min()) // 2
    return int(cx), int(cy), int(r)


def square(img: Image.Image) -> Image.Image:
    """Recorta el cuadrado que encierra al globo (RGB)."""
    cx, cy, r = locate(img)
    return img.convert("RGB").crop((cx - r, cy - r, cx + r, cy + r))


def read(img: Image.Image, bar: RampBar) -> tuple[np.ndarray, np.ndarray]:
    """Devuelve (posición 0..1 en la escala, máscara de vegetación) del cuadrado del globo."""
    sq = np.asarray(square(img).resize((SIZE, SIZE), Image.NEAREST)).astype(float)
    pos, dist = bar.values(sq)
    yy, xx = np.mgrid[0:SIZE, 0:SIZE]
    radius = np.hypot(yy - (SIZE - 1) / 2, xx - (SIZE - 1) / 2) / (SIZE / 2)
    valid = (dist < MAX_DIST) & (sq[..., 0] >= sq[..., 2] - 5) & (radius < LIMB)
    return pos, valid


if __name__ == "__main__":
    from build_disc import DISCS
    from download import RAW
    b = DISCS["forest"]["bar"]
    bar = RampBar(RAW / "forest" / "colorbar.tif", b["row"], b["x_range"], b["extent"])
    print("barra: primer color", bar.colors[0].astype(int), "último", bar.colors[-1].astype(int))
    img = Image.open(sys.argv[1])
    print("globo (x, y, radio):", locate(img))
    pos, ok = read(img, bar)
    print(f"píxeles con vegetación: {ok.mean():.1%}; altura p90: {50 * np.percentile(pos[ok], 90):.1f} m")
