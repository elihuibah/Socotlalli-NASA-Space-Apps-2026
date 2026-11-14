"""Anomalía por celda, con la definición operativa del plan.

anomalía = valor de la celda - promedio de esa celda en todos los fotogramas del disco,
escalada a -1..1 dividiendo entre la mayor desviación absoluta del disco completo.
Se escala con un solo número para todo el disco, así una anomalía de 0.5 significa
lo mismo en cualquier fotograma y zona.

Discos de un solo fotograma (aerosoles, altura de bosques): no hay otras fechas contra
cuáles comparar, así que "lo normal" es el promedio de todas las celdas con dato del mapa.
Ahí la anomalía dice qué tanto se aleja cada zona del resto del planeta.

Las celdas sin dato (mask = False) quedan en 0 y no cuentan para la escala ni el promedio.
"""
import numpy as np


def diff(values: np.ndarray, mask: np.ndarray | None = None) -> np.ndarray:
    """values: (n_frames, 512). Devuelve valor - lo normal, en las mismas unidades."""
    values = np.asarray(values, dtype=float)
    if values.shape[0] == 1:
        cells = values[0] if mask is None else values[0][mask]
        return values - cells.mean()
    return values - values.mean(axis=0, keepdims=True)


def compute(values: np.ndarray, mask: np.ndarray | None = None) -> np.ndarray:
    """values: (n_frames, 512) con valores 0..1. Devuelve (n_frames, 512) en -1..1."""
    d = diff(values, mask)
    if mask is not None:
        d = np.where(mask, d, 0.0)
    scale = np.abs(d).max()
    if scale == 0:  # todos iguales: no hay anomalía
        return np.zeros_like(d)
    return np.clip(d / scale, -1.0, 1.0)
