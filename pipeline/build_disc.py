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
#   scale:   valores reales en los extremos de la barra de colores completa
#   extent:  columnas (x) de esos extremos en colorbar.png, si parte de la barra es transparente
#   range:   lo que el disco puede leer de verdad; values 0..1 se reparten en este rango
#   transparent_below: el dato no se pinta abajo del rango; esos píxeles cuentan como el
#            mínimo del rango (no como "sin dato")
#   value:   'color' (por defecto) = valor leído de la barra;
#            'area' = fracción de la celda donde la visualización pinta el dato (0..1)
#   measure: qué significa el valor, en una frase (va al disc.json para Frontend y Audio)
#   place:   cómo nombrar la zona en el texto ('ocean' o 'land')
#   phrase:  plantillas (sobre, bajo) para la cantidad en el texto
DISCS = {
    "sst": {
        "title": "Temperatura del mar",
        "units": "°C",
        "measure": "Temperatura de la superficie del mar, promedio de la celda",
        "scale": (0.0, 32.0),
        "range": (0.0, 32.0),
        "text_threshold": 1.0,       # en °C: menos que esto se describe como "cerca de lo normal"
        "place": "ocean",
        "credit": "NASA Scientific Visualization Studio, Global Sea Surface Currents and Temperature "
                  "(Greg Shirah, Horace Mitchell, Eric Sokolowsky; datos ECCO2 de Hong Zhang y "
                  "Dimitris Menemenlis, NASA/JPL). https://svs.gsfc.nasa.gov/3912",
    },
    "co2": {
        "title": "Dióxido de carbono",
        # La mitad de los píxeles pintados está en ~431 ppm, así que leer los ppm deja el disco
        # casi plano. Se usa el área: qué parte de la celda tiene CO2 acumulado (>= ~430 ppm).
        "units": "%",
        "measure": "Porcentaje de la celda con CO2 cerca de la superficie de 430 ppm o más",
        "value": "area",
        "scale": (380.0, 460.0),
        "extent": (238, 1681),       # marcas de 380 y 460 ppm medidas en colorbar.png
        "range": (0.0, 100.0),       # % del área de la celda
        "text_threshold": 10.0,      # en puntos de %: menos que esto es "cerca de lo normal"
        "place": "land",
        "show_mean": False,          # el promedio global de área no le dice nada al oyente
        "phrase": ("CO2 alto en {v:.0f} % más de la celda que lo normal",
                   "CO2 alto en {v:.0f} % menos de la celda que lo normal"),
        "credit": "NASA Scientific Visualization Studio, DYAMOND Global Carbon Dioxide for Science On "
                  "A Sphere (visualización: AJ Christensen, Greg Shirah, Helen-Nicole Kostis, Mark "
                  "SubbaRao; ciencia: Lesley Ott, Brad Weir, William Putman, Tomohiro Oda; modelo "
                  "DYAMOND GEOS-MITgcm, NASA/GMAO y NASA/JPL). https://svs.gsfc.nasa.gov/5436",
    },
}

WEB_SIZE = (1024, 512)    # tamaño de la imagen que ve el navegador
WORK_SIZE = (2048, 1024)  # tamaño al que se lee la imagen (64x64 píxeles por celda)


def read_frame(img: Image.Image, cb: Colorbar, cfg: dict) -> tuple[np.ndarray, np.ndarray]:
    """Valor 0..1 dentro de cfg['range'] y máscara de dato, por píxel."""
    if img.size != WORK_SIZE:
        # NEAREST toma píxeles tal cual, sin mezclar el color del dato con el fondo
        img = img.resize(WORK_SIZE, Image.NEAREST)
    pos, ok = cb.values(img)
    if cfg.get("value") == "area":
        # cada píxel vale 1 si tiene el dato pintado; el promedio de la celda es la fracción
        return ok.astype(float), np.ones_like(ok)
    s_lo, s_hi = cfg["scale"]
    r_lo, r_hi = cfg["range"]
    v = np.clip((s_lo + pos * (s_hi - s_lo) - r_lo) / (r_hi - r_lo), 0.0, 1.0)
    if cfg.get("transparent_below"):
        v = np.where(ok, v, 0.0)
        ok = np.ones_like(ok)
    return v, ok


def main() -> None:
    disc_id = sys.argv[1] if len(sys.argv) > 1 else "sst"
    cfg = DISCS[disc_id]
    raw = RAW / disc_id
    files = sorted(p for p in raw.glob("[12][0-9][0-9][0-9]-*.*"))  # AAAA-MM[-DD].ext
    if not files:
        sys.exit(f"No hay fotogramas en {raw}. Corre primero: python pipeline/download.py {disc_id}")

    cb = Colorbar(raw / "colorbar.png", extent=cfg.get("extent"))
    out_frames = FRAMES_DIR / disc_id
    out_frames.mkdir(parents=True, exist_ok=True)
    DISCS_DIR.mkdir(parents=True, exist_ok=True)

    values, coverage, images = [], [], []
    for i, f in enumerate(files):
        img = Image.open(f).convert("RGB")
        v, ok = read_frame(img, cb, cfg)
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
        date = f.stem  # los archivos se llaman AAAA-MM o AAAA-MM-DD
        frames.append({
            "date": date,
            "image": images[i],
            "values": [round(float(x), 3) for x in values[i]],
            "anomaly": [round(float(x), 3) for x in anom[i]],
            "text": describe.sentence(date, real[i], diff_real[i], mask, cfg["units"],
                                      cfg["text_threshold"], cfg["place"], cfg.get("show_mean", True),
                                      cfg.get("phrase")),
        })

    disc = {
        "id": disc_id,
        "title": cfg["title"],
        "units": cfg["units"],
        "measure": cfg["measure"],
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
