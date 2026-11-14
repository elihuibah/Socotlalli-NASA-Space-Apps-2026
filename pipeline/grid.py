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
