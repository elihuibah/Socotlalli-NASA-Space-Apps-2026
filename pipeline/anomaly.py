"""Anomalía por celda, con la definición operativa del plan.

anomalía = valor de la celda - promedio de esa celda en todos los fotogramas del disco,
escalada a -1..1 dividiendo entre la mayor desviación absoluta del disco completo.
Se escala con un solo número para todo el disco, así una anomalía de 0.5 significa
lo mismo en cualquier fotograma y zona.
"""
import numpy as np


def compute(values: np.ndarray) -> np.ndarray:
    """values: arreglo (n_frames, 512) con valores 0..1. Devuelve (n_frames, 512) en -1..1."""
    values = np.asarray(values, dtype=float)
    diff = values - values.mean(axis=0, keepdims=True)
    scale = np.abs(diff).max()
    if scale == 0:  # un solo fotograma o todos iguales: no hay anomalía
        return np.zeros_like(diff)
    return np.clip(diff / scale, -1.0, 1.0)
