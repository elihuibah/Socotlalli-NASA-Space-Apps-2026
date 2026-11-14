"""Genera un disco falso con la forma exacta del contrato, para Audio y Frontend.

Patrón pensado para probar el mapeo, no ruido:
  - Latitud: más valor cerca del ecuador (filas centrales).
  - Onda oeste→este que se desplaza entre fotogramas (barrido y tempo tienen algo que mostrar).
  - Una "mancha cálida" al este que crece fotograma a fotograma: los primeros suenan
    normales y los últimos anómalos (sirve para el inicio del pitch).

Uso:  python pipeline/make_fake.py
Salida: public/discs/fake.json y public/frames/fake/000.png ...
"""
import json

import numpy as np
from PIL import Image

import anomaly
from contract import CELLS, COLS, DISCS_DIR, FRAMES_DIR, PUBLIC, ROWS, col_row

DISC_ID = "fake"
DATES = ["2024-01", "2024-02", "2024-03", "2024-04", "2024-05", "2024-06"]
MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio"]


def make_values(t: int, n: int) -> np.ndarray:
    rows, cols = np.mgrid[0:ROWS, 0:COLS]
    lat = 1 - np.abs(rows - (ROWS - 1) / 2) / ((ROWS - 1) / 2)          # 0 en polos, 1 en ecuador
    wave = 0.03 * np.sin(2 * np.pi * (cols / COLS * 2 + t / n))          # se mueve entre fotogramas
    blob_amp = 0.35 * t / (n - 1)                                        # 0 → 0.35
    blob = blob_amp * np.exp(-(((cols - 24) / 3.5) ** 2 + ((rows - 8) / 2.5) ** 2))
    v = 0.15 + 0.55 * lat + wave + blob
    return np.clip(v, 0, 1).reshape(CELLS)  # fila por fila: index = row*COLS + col


def render(values: np.ndarray, path) -> None:
    """Imagen de relleno: azul (0) → blanco → rojo (1), una celda = 20×20 px."""
    v = values.reshape(ROWS, COLS)
    r = np.clip(2 * v, 0, 1)
    b = np.clip(2 * (1 - v), 0, 1)
    g = np.minimum(r, b)
    rgb = (np.stack([r, g, b], axis=-1) * 255).astype(np.uint8)
    Image.fromarray(rgb).resize((COLS * 20, ROWS * 20), Image.NEAREST).save(path)


def describe(t: int, anom: np.ndarray) -> str:
    """Frase por fotograma: dónde está la mayor desviación y hacia qué lado."""
    i = int(np.argmax(np.abs(anom)))
    col, row = col_row(i)
    a = anom[i]
    month = f"{MONTHS[t].capitalize()} de 2024"
    if abs(a) < 0.4:
        return f"{month}: valores cercanos a lo normal"
    zone = "oeste" if col < COLS / 3 else "centro" if col < 2 * COLS / 3 else "este"
    side = "sobre" if a > 0 else "bajo"
    return f"{month}: zona {zone} {side} lo normal"


def main() -> None:
    n = len(DATES)
    values = np.stack([make_values(t, n) for t in range(n)])
    anom = anomaly.compute(values)

    out_frames = FRAMES_DIR / DISC_ID
    out_frames.mkdir(parents=True, exist_ok=True)
    DISCS_DIR.mkdir(parents=True, exist_ok=True)

    frames = []
    for t, date in enumerate(DATES):
        img = out_frames / f"{t:03d}.png"
        render(values[t], img)
        frames.append({
            "date": date,
            "image": img.relative_to(PUBLIC).as_posix(),
            "values": [round(float(x), 3) for x in values[t]],
            "anomaly": [round(float(x), 3) for x in anom[t]],
            "text": describe(t, anom[t]),
        })

    disc = {
        "id": DISC_ID,
        "title": "Disco de prueba",
        "units": "°C",
        "credit": "Datos sintéticos generados por pipeline/make_fake.py",
        "grid": {"cols": COLS, "rows": ROWS},
        "frames": frames,
    }
    out = DISCS_DIR / f"{DISC_ID}.json"
    out.write_text(json.dumps(disc, ensure_ascii=False), encoding="utf-8")
    print(f"OK: {out} ({n} fotogramas)")


if __name__ == "__main__":
    main()
