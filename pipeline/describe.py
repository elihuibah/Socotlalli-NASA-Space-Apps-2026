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


_SEA: list[int] | None = None


def auto(lat: float, lon: float) -> str:
    """Nombra la celda como océano o como tierra según la máscara del disco de temperatura
    del mar (celda con dato = mar). Para discos con dato en mar y en tierra, como aerosoles."""
    global _SEA
    if _SEA is None:
        import json
        from contract import DISCS_DIR
        path = DISCS_DIR / "sst.json"
        _SEA = json.loads(path.read_text(encoding="utf-8"))["mask"] if path.exists() else []
    if not _SEA:
        return f"cerca de {coords(lat, lon)}"
    col = min(COLS - 1, int((lon + 180) / 360 * COLS))
    row = min(ROWS - 1, int((90 - lat) / 180 * ROWS))
    if _SEA[row * COLS + col]:
        return f"{ocean(lat, lon)} ({coords(lat, lon)})"
    return land(lat, lon)


PLACES = {"ocean": ocean, "land": land, "auto": auto}


def date_label(date: str) -> str:
    """'2007-08' -> 'Agosto de 2007';  '2020-01-15' -> '15 de enero de 2020'."""
    if len(date) == 3 and date[0] == "m":  # mes de un promedio de varios años: m01 .. m12
        return f"{MONTHS[int(date[1:]) - 1].capitalize()}, promedio de varios años"
    parts = date.split("-")
    if len(parts) == 1:  # solo año (promedio móvil de cinco años)
        return f"Años {int(parts[0]) - 4} a {parts[0]}"
    month = MONTHS[int(parts[1]) - 1]
    if len(parts) == 3:
        return f"{int(parts[2])} de {month} de {parts[0]}"
    return f"{month.capitalize()} de {parts[0]}"


def sentence(date: str, values_real: np.ndarray, diff_real: np.ndarray,
             mask: np.ndarray, units: str, threshold: float,
             place: str = "ocean", show_mean: bool = True,
             phrase: tuple[str, str] | None = None) -> str:
    """values_real y diff_real en unidades reales (°C, %), 512 celdas.
    phrase: plantillas (sobre, bajo) para la cantidad, con {v} y {units}. Por defecto
    '{v:.1f} {units} sobre lo normal' y '... bajo lo normal'."""
    label = date_label(date)
    head = f"{label}: promedio {values_real[mask].mean():.1f} {units}" if show_mean else label
    d = np.where(mask, diff_real, 0)
    i = int(np.argmax(np.abs(d)))
    if abs(d[i]) < threshold:
        return f"{head}, todo cerca de lo normal"
    lat, lon = lat_lon(*col_row(i))
    above, below = phrase or ("{v:.1f} {units} sobre lo normal", "{v:.1f} {units} bajo lo normal")
    amount = (above if d[i] > 0 else below).format(v=abs(d[i]), units=units)
    return f"{head}; mayor cambio en {PLACES[place](lat, lon)}, {amount}"


def sentence_layers(date: str, values: np.ndarray, layers: dict[str, np.ndarray],
                    names: dict[str, str], mask: np.ndarray, place: str = "land") -> str:
    """Frase para discos por categoría (aerosoles): qué tipo predomina en el mapa y
    dónde está la mayor carga. values y layers: 512 celdas de 0 a 1; names: id -> nombre."""
    label = date_label(date)
    totals = {k: float(v[mask].mean()) for k, v in layers.items()}
    main = max(totals, key=totals.get)
    i = int(np.argmax(np.where(mask, values, -1)))
    top = max(layers, key=lambda k: layers[k][i])
    lat, lon = lat_lon(*col_row(i))
    return (f"{label}: en todo el mapa predomina {names[main]}; "
            f"la mayor carga está en {PLACES[place](lat, lon)}, sobre todo {names[top]}")


def screen_position(col: int, row: int) -> str:
    """Posición de la celda en pantalla, para discos sin coordenadas (vistas del globo)."""
    vert = "arriba" if row < 5 else "abajo" if row >= 11 else "al centro"
    horiz = "a la izquierda" if col < 11 else "a la derecha" if col >= 21 else ""
    if vert == "al centro" and horiz:
        return f"al centro, {horiz}"
    return f"{vert} {horiz}".strip()


def sentence_view(view: str, heights: np.ndarray, mask: np.ndarray, tall: float = 20.0) -> str:
    """Frase para una vista del globo de altura de bosques. heights en metros, 512 celdas."""
    if not mask.any():
        return f"{view}: casi todo lo visible es océano"
    i = int(np.argmax(np.where(mask, heights, -1)))
    share = float((heights[mask] >= tall).mean()) * 100
    return (f"{view}: la vegetación más alta, unos {heights[i]:.0f} m, está "
            f"{screen_position(*col_row(i))}; {share:.0f} % de la tierra visible tiene "
            f"árboles de {tall:.0f} m o más")
