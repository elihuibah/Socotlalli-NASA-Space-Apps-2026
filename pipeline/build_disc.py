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
from categories import Categories
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
#   categories: leyenda de colores fijos (nombre -> RGB) en vez de escala; cada frame
#            lleva "layers" con un valor por categoría y values es la suma (0..1)
#   layer_names: nombre de cada categoría para el texto y la interfaz
#   accent:  color de acento del disco para la interfaz, tomado de la leyenda de su visualización
DISCS = {
    "sst": {
        "title": "Temperatura del mar",
        "accent": "#3371eb",   # azul del extremo frío de su barra
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
        "accent": "#e06926",   # naranja de su barra (~440 ppm)
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
    "aerosols": {
        "title": "Aerosoles",
        "accent": "#c19adc",   # lila del polvo en su leyenda
        "units": "",
        "measure": "Intensidad de aerosoles en la celda (0 a 1), sumando los 4 tipos; "
                   "layers trae el valor de cada tipo",
        "range": (0.0, 1.0),
        "place": "auto",
        # colores medidos en la leyenda Aerosols_cbar.png
        "categories": {
            "black_carbon": (210, 94, 69),
            "dust": (193, 154, 220),
            "sea_salt": (133, 170, 169),
            "sulfate": (83, 220, 52),
        },
        "layer_names": {
            "black_carbon": "el carbono negro (humo de incendios)",
            "dust": "el polvo",
            "sea_salt": "la sal marina",
            "sulfate": "el sulfato",
        },
        "credit": "NASA Scientific Visualization Studio, GEOS Aerosols (2025) (visualización: Joseph V. "
                  "Ardizzone, Helen-Nicole Kostis; ciencia: Lesley Ott; modelo GEOS-FP 2 km Replay, "
                  "19 de agosto de 2025, 20:00 UTC). https://svs.gsfc.nasa.gov/5669",
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

    cats = Categories(cfg["categories"]) if "categories" in cfg else None
    cb = None if cats else Colorbar(raw / "colorbar.png", extent=cfg.get("extent"))
    out_frames = FRAMES_DIR / disc_id
    out_frames.mkdir(parents=True, exist_ok=True)
    DISCS_DIR.mkdir(parents=True, exist_ok=True)

    values, coverage, images, layers = [], [], [], []
    for i, f in enumerate(files):
        img = Image.open(f).convert("RGB")
        if cats:
            # BOX promedia: aquí la intensidad del color es el dato, así que mezclar es correcto
            per_px = cats.layers(img.resize(WORK_SIZE, Image.BOX))
            everywhere = np.ones(WORK_SIZE[::-1], dtype=bool)
            cell_layers = {k: to_grid(v, everywhere)[0] for k, v in per_px.items()}
            layers.append(cell_layers)
            cell_v = np.clip(sum(cell_layers.values()), 0.0, 1.0)
            cell_cov = np.ones(CELLS)
        else:
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
    diff_real = anomaly.diff(real, mask)

    frames = []
    for i, f in enumerate(files):
        date = f.stem  # los archivos se llaman AAAA-MM o AAAA-MM-DD
        frame = {
            "date": date,
            "image": images[i],
            "values": [round(float(x), 3) for x in values[i]],
            "anomaly": [round(float(x), 3) for x in anom[i]],
        }
        if cats:
            frame["layers"] = {k: [round(float(x), 3) for x in v] for k, v in layers[i].items()}
            frame["text"] = describe.sentence_layers(date, values[i], layers[i],
                                                     cfg["layer_names"], mask, cfg["place"])
        else:
            frame["text"] = describe.sentence(date, real[i], diff_real[i], mask, cfg["units"],
                                              cfg["text_threshold"], cfg["place"],
                                              cfg.get("show_mean", True), cfg.get("phrase"))
        frames.append(frame)

    disc = {
        "id": disc_id,
        "title": cfg["title"],
        "units": cfg["units"],
        "measure": cfg["measure"],
        "accent": cfg["accent"],
        "range": list(cfg["range"]),
        "credit": cfg["credit"],
        "grid": {"cols": COLS, "rows": ROWS},
        "mask": [int(m) for m in mask],
        "frames": frames,
    }
    if cats:
        disc["layer_names"] = cfg["layer_names"]
    out = DISCS_DIR / f"{disc_id}.json"
    out.write_text(json.dumps(disc, ensure_ascii=False), encoding="utf-8")
    print(f"OK: {out.name}, {len(frames)} fotogramas, {mask.sum()} de {CELLS} celdas con dato")


if __name__ == "__main__":
    main()
