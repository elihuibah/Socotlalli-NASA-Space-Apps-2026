"""Anomalía por celda, con la definición operativa del plan.

anomalía = valor de la celda - promedio de esa celda en todos los fotogramas del disco,
escalada a -1..1 dividiendo entre la mayor desviación absoluta del disco completo.
Se escala con un solo número para todo el disco, así una anomalía de 0.5 significa
lo mismo en cualquier fotograma y zona.

Las celdas sin dato (mask = False) quedan en 0 y no cuentan para la escala.
"""
import numpy as np


def diff(values: np.ndarray) -> np.ndarray:
    """values: (n_frames, 512). Devuelve valor - promedio de la celda, en las mismas unidades."""
    values = np.asarray(values, dtype=float)
    return values - values.mean(axis=0, keepdims=True)


def compute(values: np.ndarray, mask: np.ndarray | None = None) -> np.ndarray:
    """values: (n_frames, 512) con valores 0..1. Devuelve (n_frames, 512) en -1..1."""
    d = diff(values)
    if mask is not None:
        d = np.where(mask, d, 0.0)
    scale = np.abs(d).max()
    if scale == 0:  # un solo fotograma o todos iguales: no hay anomalía
        return np.zeros_like(d)
    return np.clip(d / scale, -1.0, 1.0)
