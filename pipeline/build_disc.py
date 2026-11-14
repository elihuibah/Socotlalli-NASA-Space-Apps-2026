"""Orquestador: convierte los fotogramas de pipeline/raw/<id>/ en public/discs/<id>.json.

Uso:  python pipeline/download.py sst      (una vez, baja los originales)
      python pipeline/build_disc.py sst
      python pipeline/validate.py sst

Pasos por fotograma: imagen -> colorbar (valor por píxel) -> grid (32x16) -> anomaly -> describe.
"""
import json
import sys

import numpy as np
from PIL import Image

import anomaly
import describe
from colorbar import Colorbar
from contract import CELLS, COLS, DISCS_DIR, FRAMES_DIR, PUBLIC, ROWS
from download import RAW
from grid import to_grid

# Datos fijos de cada disco. Para agregar un disco: una entrada aquí y otra en download.SOURCES.
DISCS = {
    "sst": {
        "title": "Temperatura del mar",
        "units": "°C",
        "range": (0.0, 32.0),        # lo que marcan los extremos de la barra de colores
        "text_threshold": 1.0,       # en °C: menos que esto se describe como "cerca de lo normal"
        "credit": "NASA Scientific Visualization Studio, Global Sea Surface Currents and Temperature "
                  "(Greg Shirah, Horace Mitchell, Eric Sokolowsky; datos ECCO2 de Hong Zhang y "
                  "Dimitris Menemenlis, NASA/JPL). https://svs.gsfc.nasa.gov/3912",
    },
}

WEB_SIZE = (1024, 512)  # tamaño de la imagen que ve el navegador


def main() -> None:
    disc_id = sys.argv[1] if len(sys.argv) > 1 else "sst"
    cfg = DISCS[disc_id]
    raw = RAW / disc_id
    files = sorted(p for p in raw.glob("*.tif"))
    if not files:
        sys.exit(f"No hay fotogramas en {raw}. Corre primero: python pipeline/download.py {disc_id}")

    cb = Colorbar(raw / "colorbar.png")
    out_frames = FRAMES_DIR / disc_id
    out_frames.mkdir(parents=True, exist_ok=True)
    DISCS_DIR.mkdir(parents=True, exist_ok=True)

    values, coverage, images = [], [], []
    for i, f in enumerate(files):
        img = Image.open(f).convert("RGB")
        v, ok = cb.values(img)
        cell_v, cell_cov = to_grid(v, ok)
        values.append(cell_v)
        coverage.append(cell_cov)
        web = out_frames / f"{i:03d}.jpg"
        img.resize(WEB_SIZE, Image.LANCZOS).save(web, quality=85)
        images.append(web.relative_to(PUBLIC).as_posix())
        print(f"  {f.stem}: {np.mean(cell_cov > 0.03):.0%} de celdas con dato")

    values = np.stack(values)
    # una celda cuenta si tiene dato en todos los fotogramas (la tierra no cambia)
    mask = (np.stack(coverage) >= 0.03).all(axis=0)
    values[:, ~mask] = 0.0
    anom = anomaly.compute(values, mask)

    lo, hi = cfg["range"]
    real = lo + values * (hi - lo)
    diff_real = anomaly.diff(real)

    frames = []
    for i, f in enumerate(files):
        date = f.stem  # los archivos se llaman AAAA-MM.tif
        frames.append({
            "date": date,
            "image": images[i],
            "values": [round(float(x), 3) for x in values[i]],
            "anomaly": [round(float(x), 3) for x in anom[i]],
            "text": describe.sentence(date, real[i], diff_real[i], mask, cfg["units"], cfg["text_threshold"]),
        })

    disc = {
        "id": disc_id,
        "title": cfg["title"],
        "units": cfg["units"],
        "range": list(cfg["range"]),
        "credit": cfg["credit"],
        "grid": {"cols": COLS, "rows": ROWS},
        "mask": [int(m) for m in mask],
        "frames": frames,
    }
    out = DISCS_DIR / f"{disc_id}.json"
    out.write_text(json.dumps(disc, ensure_ascii=False), encoding="utf-8")
    print(f"OK: {out.name}, {len(frames)} fotogramas, {mask.sum()} de {CELLS} celdas con dato")


if __name__ == "__main__":
    main()
