"""Reduce un mapa a la rejilla de 32x16 celdas.

Cada celda es el promedio de los píxeles que SÍ son dato (ver colorbar.values).
Si una celda tiene muy pocos píxeles de dato (por ejemplo, es casi toda tierra),
se marca como sin dato: valor 0 y cobertura baja.

Asume un mapa global plano 2:1 (equirectangular) que ocupa toda la imagen.
Si un disco trae márgenes o título, se recorta antes con el parámetro `crop`.
"""
import numpy as np

from contract import COLS, ROWS

MIN_COVERAGE = 0.03  # fracción mínima de píxeles con dato para que la celda cuente


def to_grid(values: np.ndarray, valid: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """values, valid: arreglos (alto, ancho) por píxel.
    Devuelve (valor promedio por celda, cobertura 0..1 por celda), ambos de 512, fila por fila."""
    h, w = values.shape
    ch, cw = h // ROWS, w // COLS
    # recorta el sobrante para que la imagen se divida exacto en celdas
    v = values[: ch * ROWS, : cw * COLS].reshape(ROWS, ch, COLS, cw)
    m = valid[: ch * ROWS, : cw * COLS].reshape(ROWS, ch, COLS, cw)
    count = m.sum(axis=(1, 3))
    total = (v * m).sum(axis=(1, 3))
    mean = np.divide(total, count, out=np.zeros_like(total), where=count > 0)
    coverage = count / (ch * cw)
    mean[coverage < MIN_COVERAGE] = 0.0
    return mean.reshape(-1), coverage.reshape(-1)


def to_grid_percentile(values: np.ndarray, valid: np.ndarray, q: float) -> tuple[np.ndarray, np.ndarray]:
    """Como to_grid, pero cada celda es el percentil q de sus píxeles con dato en vez del
    promedio. Sirve cuando el dato llega en trazos con huecos (GEDI mide en franjas de
    órbita y entre ellas se ve el suelo): q=90 da "lo más alto de la zona"."""
    h, w = values.shape
    ch, cw = h // ROWS, w // COLS
    v = values[: ch * ROWS, : cw * COLS].reshape(ROWS, ch, COLS, cw).transpose(0, 2, 1, 3).reshape(ROWS, COLS, -1)
    m = valid[: ch * ROWS, : cw * COLS].reshape(ROWS, ch, COLS, cw).transpose(0, 2, 1, 3).reshape(ROWS, COLS, -1)
    coverage = m.mean(axis=-1)
    out = np.zeros((ROWS, COLS))
    for r in range(ROWS):
        for c in range(COLS):
            if coverage[r, c] >= MIN_COVERAGE:
                out[r, c] = np.percentile(v[r, c][m[r, c]], q)
    return out.reshape(-1), coverage.reshape(-1)
