"""Arma la frase de "text" de cada fotograma.

La frase la lee el lector de pantalla cuando cambia el fotograma, así que va corta:
fecha, promedio del disco (si aplica) y la zona más alejada de lo normal, con su cifra.
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


def coords(lat: float, lon: float) -> str:
    ns = "N" if lat >= 0 else "S"
    ew = "E" if lon >= 0 else "O"
    return f"{abs(lat):.0f}°{ns} {abs(lon):.0f}°{ew}"


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


def land(lat: float, lon: float) -> str:
    """Región aproximada en tierra, con coordenadas para no depender solo de las cajas.
    Una celda mide 11°x11°, así que puede incluir costa y mar."""
    if lat < -60:
        name = "la Antártida"
    elif lat > 66:
        name = "el Ártico"
    elif -170 <= lon < -50 and lat >= 13:
        name = "Norteamérica"
    elif -92 <= lon < -77 and 7 <= lat < 13:
        name = "Centroamérica"
    elif -82 <= lon < -34 and lat < 13:
        name = "Sudamérica"
    elif 34 <= lon < 60 and 12 <= lat < 42:
        name = "Medio Oriente"
    elif -20 <= lon < 55 and -36 <= lat < 37:
        name = "África"
    elif -25 <= lon < 45 and lat >= 36:
        name = "Europa"
    elif 110 <= lon <= 180 and lat < -10:
        name = "Oceanía"
    elif 45 <= lon <= 180 and lat >= -10:
        name = "Asia"
    else:
        return f"cerca de {coords(lat, lon)}"
    return f"{name} ({coords(lat, lon)})"


PLACES = {"ocean": ocean, "land": land}


def date_label(date: str) -> str:
    """'2007-08' -> 'Agosto de 2007';  '2020-01-15' -> '15 de enero de 2020'."""
    parts = date.split("-")
    month = MONTHS[int(parts[1]) - 1]
    if len(parts) == 3:
        return f"{int(parts[2])} de {month} de {parts[0]}"
    return f"{month.capitalize()} de {parts[0]}"


def sentence(date: str, values_real: np.ndarray, diff_real: np.ndarray,
             mask: np.ndarray, units: str, threshold: float,
             place: str = "ocean", show_mean: bool = True) -> str:
    """values_real y diff_real en unidades reales (°C, ppm), 512 celdas."""
    label = date_label(date)
    head = f"{label}: promedio {values_real[mask].mean():.1f} {units}" if show_mean else label
    d = np.where(mask, diff_real, 0)
    i = int(np.argmax(np.abs(d)))
    if abs(d[i]) < threshold:
        return f"{head}, todo cerca de lo normal"
    lat, lon = lat_lon(*col_row(i))
    side = "sobre" if d[i] > 0 else "bajo"
    return f"{head}; mayor cambio en {PLACES[place](lat, lon)}, {abs(d[i]):.1f} {units} {side} lo normal"
