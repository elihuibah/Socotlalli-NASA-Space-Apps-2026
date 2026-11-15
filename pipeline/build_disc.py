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
import globe
import mollweide
from categories import Categories
from colorbar import Colorbar
from contract import CELLS, COLS, DISCS_DIR, FRAMES_DIR, PUBLIC, ROWS
from download import RAW
from grid import to_grid, to_grid_percentile

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
#   globe:   la visualización es un globo que gira; cada vista (views: número -> nombre) es un
#            fotograma, la rejilla va sobre el cuadrado del globo y cada frame trae su mask
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
    "giss": {
        "title": "Temperatura global",
        "accent": "#d9421c",   # rojo cálido de su barra
        "units": "°C",
        "measure": "Cuánto más caliente o más frío que el promedio de 1951 a 1980 está el aire cerca de "
                   "la superficie, promedio móvil de cinco años",
        "range": (-2.0, 2.0),
        # barra horizontal, azul (-2 °C) a blanco (0) a rojo (+2 °C), medida en colorbar.png
        "ramp": {"row": 37, "extent": (33, 286)},
        "text_threshold": 0.5,
        "place": "auto",
        "credit": "NASA Scientific Visualization Studio, Global Temperature Anomalies from 1880 to 2021 "
                  "(visualización: Kathryn Mersmann; datos: NASA GISS, GISTEMP v4). "
                  "https://svs.gsfc.nasa.gov/4964",
    },
    "rain": {
        "title": "Lluvia",
        "accent": "#16b7c9",   # turquesa de su barra
        "units": "mm/día",
        "measure": "Lluvia promedio de la celda en un día, según el mes (promedio de 2001 a 2022)",
        "range": (0.0, 24.0),
        "ramp": {"row": 256, "x_range": (106, 916), "extent": (102, 920), "file": "colorbar.jpg", "all": True},
        "glob": "m[01][0-9].*",
        "text_threshold": 1.5,
        "place": "auto",
        "credit": "NASA Scientific Visualization Studio, IMERG Monthly Precipitation Climatology "
                  "(2001 - 2022) (datos: NASA IMERG, misión GPM). https://svs.gsfc.nasa.gov/5241",
    },
    "ice": {
        "title": "Hielo marino",
        "accent": "#a9d6f0",   # azul hielo
        "units": "%",
        "measure": "Porcentaje de la celda cubierto por hielo marino (concentración mayor a 15 %), "
                   "un día de cada mes de 2007. Solo hay dato cerca de los polos",
        "value": "area",
        "alpha": True,         # el hielo es lo único pintado; el resto es transparente
        "range": (0.0, 100.0),
        "mask_active": True,   # celdas que nunca tienen hielo cuentan como sin dato
        "text_threshold": 10.0,
        "place": "ocean",
        "show_mean": False,
        "phrase": ("hielo en {v:.0f} % más de la celda que lo normal del año",
                   "hielo en {v:.0f} % menos de la celda que lo normal del año"),
        "credit": "NASA Scientific Visualization Studio, Sea Ice over the Arctic and Antarctic designed for "
                  "Science On a Sphere (SOS) and WMS (datos: instrumento AMSR-E del satélite Aqua, "
                  "concentración de 15 % o más; un día de cada mes de 2007). https://svs.gsfc.nasa.gov/3564",
    },
    "fire": {
        "title": "Incendios",
        "accent": "#f0642a",   # naranja de su barra
        "units": "",
        "measure": "Actividad de incendios en la celda (0 a 1): cuántos puntos de fuego activos detectó el "
                   "satélite durante el mes y qué tan intensos son. Es relativa al mes más activo del disco",
        "range": (0.0, 1.0),
        # El video viene en proyección Mollweide: se aplana antes de leerlo. Medido en el fotograma.
        "mollweide": {"cx": 2052.0, "cy": 1150.5, "a": 2051.0, "b": 1025.0},
        # barra horizontal de 0.1 a 100 puntos de fuego por 1000 km² al día (escala logarítmica)
        "ramp": {"row": 2194, "x_range": (174, 935), "extent": (174, 935)},
        "fire_chroma": 40,      # el mapa de fondo es gris; el fuego tiene color
        "mask_active": True,
        "normalize_p": 99.5,    # valores 0..1: el percentil 99.5 de todos los meses pasa a ser 1
        "text_threshold": 0.08,
        "place": "land",
        "show_mean": False,
        "phrase": ("más incendios que lo normal en el año", "menos incendios que lo normal en el año"),
        "credit": "NASA Scientific Visualization Studio, Monthly Active Fires (datos: instrumento MODIS "
                  "del satélite Terra, NASA/GSFC y Universidad de Maryland; mes a mes, 2008). "
                  "https://svs.gsfc.nasa.gov/30378",
    },
    "forest": {
        "title": "Altura de los bosques",
        "accent": "#84974a",   # verde del centro de su barra (~25 m)
        "units": "m",
        "measure": "Altura de la vegetación más alta de la celda (percentil 90), en metros. La rejilla "
                   "va sobre el globo tal como se ve, no sobre un mapa; cada fotograma es una vista",
        "range": (0.0, 50.0),        # la barra marca de 0 a 50 m (la flecha es 50 o más)
        "globe": True,
        "bar": {"row": 2004, "x_range": (127, 938), "extent": (125, 939)},  # medido en colorbar.tif
        "percentile": 90,
        "date": "2019-04",           # el dato es un solo periodo: abril 2019 a abril 2020
        "period": "abril de 2019 a abril de 2020",
        "views": {
            "0230": "Asia oriental y Oceanía",
            "0600": "Asia del sur y el océano Índico",
            "0800": "África oriental y Medio Oriente",
            "1055": "África y Europa",
            "1400": "El Atlántico sur, entre Sudamérica y África",
            "1650": "Sudamérica",
            "1900": "Las Américas",
            "2200": "Norteamérica y el Pacífico",
        },
        "credit": "NASA Scientific Visualization Studio, GEDI Forest Height (visualización: Kel Elkins, "
                  "Horace Mitchell, Greg Shirah; ciencia: Temilola Fatoyinbo, Atticus Stovall; dato "
                  "GEDI L2B RH100, abril 2019 a abril 2020). https://svs.gsfc.nasa.gov/4950",
    },
}

RAMP_TOL = 60.0  # distancia RGB máxima a la barra; las costas y el relieve oscurecen el color

GLOBE_WEB_SIZE = (768, 768)  # las vistas del globo son cuadradas

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
    if "views" in cfg:
        files = [raw / f"{n}.tif" for n in cfg["views"]]
        files = [f for f in files if f.exists()]
    else:
        files = sorted(p for p in raw.glob(cfg.get("glob", "[12][0-9][0-9][0-9]*.*")))  # AAAA-MM[-DD].ext
    if not files:
        sys.exit(f"No hay fotogramas en {raw}. Corre primero: python pipeline/download.py {disc_id}")

    cats = Categories(cfg["categories"]) if "categories" in cfg else None
    bar = None
    if cfg.get("globe"):
        b = cfg["bar"]
        bar = globe.RampBar(raw / "colorbar.tif", b["row"], b["x_range"], b["extent"])
    ramp = None
    if "ramp" in cfg:
        r = cfg["ramp"]
        x0, x1 = r["extent"]
        ramp = globe.RampBar(raw / r.get("file", "colorbar.png"), r["row"], r.get("x_range", (x0, x1)), r["extent"],
                             step=2 if "mollweide" in cfg else 1)
    cb = None if (cats or bar or ramp or cfg.get("alpha")) else Colorbar(raw / "colorbar.png", extent=cfg.get("extent"))
    out_frames = FRAMES_DIR / disc_id
    out_frames.mkdir(parents=True, exist_ok=True)
    DISCS_DIR.mkdir(parents=True, exist_ok=True)

    values, coverage, images, layers = [], [], [], []
    for i, f in enumerate(files):
        if bar:
            raw_img = Image.open(f)
            pos, ok = globe.read(raw_img, bar)
            cell_v, cell_cov = to_grid_percentile(pos, ok, cfg["percentile"])
            values.append(cell_v)
            coverage.append(cell_cov)
            web = out_frames / f"{i:03d}.jpg"
            globe.square(raw_img).resize(GLOBE_WEB_SIZE, Image.LANCZOS).save(web, quality=85)
            images.append(web.relative_to(PUBLIC).as_posix())
            print(f"  {cfg['views'][f.stem]}: {np.mean(cell_cov >= 0.03):.0%} de celdas con vegetación")
            continue
        if cfg.get("alpha"):
            rgba = Image.open(f).convert("RGBA")
            covered = np.asarray(rgba.getchannel("A")) > 0
            cell_v, cell_cov = to_grid(covered.astype(float), np.ones_like(covered))
            back = Image.new("RGBA", rgba.size, (37, 58, 90, 255))  # el mar, oscuro, para que el hielo se vea
            back.alpha_composite(rgba)
            img = back.convert("RGB")
            values.append(cell_v)
            coverage.append(cell_cov)
            web = out_frames / f"{i:03d}.jpg"
            img.resize(WEB_SIZE, Image.LANCZOS).save(web, quality=85)
            images.append(web.relative_to(PUBLIC).as_posix())
            print(f"  {f.stem}: {covered.mean():.1%} del mapa con hielo")
            continue
        img = Image.open(f).convert("RGB")
        if cats:
            # BOX promedia: aquí la intensidad del color es el dato, así que mezclar es correcto
            per_px = cats.layers(img.resize(WORK_SIZE, Image.BOX))
            everywhere = np.ones(WORK_SIZE[::-1], dtype=bool)
            cell_layers = {k: to_grid(v, everywhere)[0] for k, v in per_px.items()}
            layers.append(cell_layers)
            cell_v = np.clip(sum(cell_layers.values()), 0.0, 1.0)
            cell_cov = np.ones(CELLS)
        elif ramp and "mollweide" in cfg:
            m = cfg["mollweide"]
            src = np.asarray(img).astype(float)
            # solo los píxeles con color (fuego) se buscan en la barra; el resto es fondo gris
            fire = (src.max(axis=-1) - src.min(axis=-1)) >= cfg["fire_chroma"]
            level = np.zeros(src.shape[:2])
            pos, _ = ramp.values(src[fire][None, :, :])
            level[fire] = 0.15 + 0.85 * np.clip(pos[0], 0.0, 1.0)  # que el fuego más tenue no valga 0
            yi, xi = mollweide.equirect_index(src.shape[:2], m["cx"], m["cy"], m["a"], m["b"], (4096, 2048))
            cell_v, cell_cov = to_grid(level[yi, xi], np.ones((2048, 4096), dtype=bool))
            flat = mollweide.to_equirect(img, m["cx"], m["cy"], m["a"], m["b"], WEB_SIZE)
            img = flat  # la imagen que ve el navegador es el mapa ya aplanado
        elif ramp:
            rgb = np.asarray(img.resize(WORK_SIZE, Image.NEAREST)).astype(float)
            pos, dist = ramp.values(rgb)
            v = np.clip(pos, 0.0, 1.0)
            ok = np.ones_like(dist, dtype=bool) if cfg["ramp"].get("all") else dist < RAMP_TOL
            cell_v, cell_cov = to_grid(v, ok)
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
    if "normalize_p" in cfg:
        values = np.clip(values / np.percentile(values, cfg["normalize_p"]), 0.0, 1.0)
    frame_masks = np.stack(coverage) >= 0.03
    if cfg.get("mask_active"):
        # celdas que nunca tienen fuego (océano, hielo) cuentan como sin dato
        frame_masks[:] = (values > 0).any(axis=0)
    if bar:
        # cada vista tiene su propia tierra visible; el disco marca la unión de todas
        mask = frame_masks.any(axis=0)
        values[~frame_masks] = 0.0
        anom, _ = anomaly.compute_per_frame(values, frame_masks)
    else:
        # una celda cuenta si tiene dato en todos los fotogramas (la tierra no cambia)
        mask = frame_masks.all(axis=0)
        values[:, ~mask] = 0.0
        anom = anomaly.compute(values, mask)

    lo, hi = cfg["range"]
    real = lo + values * (hi - lo)
    diff_real = anomaly.diff(real, mask)

    frames = []
    for i, f in enumerate(files):
        date = cfg.get("date", f.stem)  # los archivos se llaman AAAA-MM o AAAA-MM-DD
        frame = {
            "date": date,
            "image": images[i],
            "values": [round(float(x), 3) for x in values[i]],
            "anomaly": [round(float(x), 3) for x in anom[i]],
        }
        if bar:
            view = cfg["views"][f.stem]
            frame["view"] = view
            frame["mask"] = [int(m) for m in frame_masks[i]]
            frame["text"] = describe.sentence_view(view, real[i], frame_masks[i])
        elif cats:
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
    if bar:
        disc["period"] = cfg["period"]
        disc["view_mode"] = "globe"
    out = DISCS_DIR / f"{disc_id}.json"
    out.write_text(json.dumps(disc, ensure_ascii=False), encoding="utf-8")
    print(f"OK: {out.name}, {len(frames)} fotogramas, {mask.sum()} de {CELLS} celdas con dato")


if __name__ == "__main__":
    main()
