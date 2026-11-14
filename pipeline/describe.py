"""Arma la frase de "text" de cada fotograma.

La frase la lee el lector de pantalla cuando cambia el fotograma, así que va corta:
fecha, promedio del disco y la zona más alejada de lo normal, con su cifra.
"""
import numpy as np

from contract import COLS, ROWS, col_row

MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
          "agosto", "septiembre", "octubre", "noviembre", "diciembre"]


def lat_lon(col: int, row: int) -> tuple[float, float]:
    """Centro de la celda en un mapa equirectangular global."""
    lon = -180 + (col + 0.5) * 360 / COLS
    lat = 90 - (row + 0.5) * 180 / ROWS
    return lat, lon


def ocean(lat: float, lon: float) -> str:
    """Nombre aproximado del océano. Es una aproximación por cajas, suficiente para orientar."""
    if lat > 66:
        return "el Ártico"
    if lat < -55:
        return "el océano Austral"
    hemi = "norte" if lat > 15 else "sur" if lat < -15 else "ecuatorial"
    if 20 <= lon < 110 and lat < 30:
        return "el Índico" + ("" if hemi == "ecuatorial" else f" {hemi}")
    if (-70 <= lon < 20) or (lat > 10 and -100 <= lon < -70):
        return f"el Atlántico {hemi}"
    return f"el Pacífico {hemi}"


def date_label(date: str) -> str:
    year, month = date.split("-")[:2]
    return f"{MONTHS[int(month) - 1].capitalize()} de {year}"


def sentence(date: str, values_real: np.ndarray, diff_real: np.ndarray,
             mask: np.ndarray, units: str, threshold: float) -> str:
    """values_real y diff_real en unidades reales (°C, etc.), 512 celdas."""
    label = date_label(date)
    mean = values_real[mask].mean()
    d = np.where(mask, diff_real, 0)
    i = int(np.argmax(np.abs(d)))
    if abs(d[i]) < threshold:
        return f"{label}: promedio {mean:.1f} {units}, todo cerca de lo normal"
    lat, lon = lat_lon(*col_row(i))
    side = "sobre" if d[i] > 0 else "bajo"
    return f"{label}: promedio {mean:.1f} {units}; mayor cambio en {ocean(lat, lon)}, {abs(d[i]):.1f} {units} {side} lo normal"
