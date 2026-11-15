"""Descarga los fotogramas originales de un disco desde el SVS de NASA.

Uso:  python pipeline/download.py sst
Salida: pipeline/raw/<id>/  (fotogramas AAAA-MM[-DD].<ext>, colorbar.png y dates.txt)

Cada fuente dice cómo leer su archivo de fechas y qué fotogramas elegir.
Solo usa la librería estándar.
"""
import subprocess
import sys
import urllib.request
from datetime import datetime
from pathlib import Path

RAW = Path(__file__).resolve().parent / "raw"


# --- Lectores de archivos de fechas: devuelven [(número de fotograma, fecha)] ---

def dates_numbered(txt: str) -> list[tuple[int, datetime]]:
    """Líneas '23000  2007-03-25T12:00Z': número de fotograma y fecha."""
    rows = []
    for line in txt.splitlines():
        parts = line.split()
        if len(parts) == 2:
            rows.append((int(parts[0]), datetime.strptime(parts[1], "%Y-%m-%dT%H:%MZ")))
    return rows


def dates_by_line(txt: str) -> list[tuple[int, datetime]]:
    """Una fecha por línea ('Jan 14, 2020'); la línea 1 es el fotograma 1."""
    return [(i, datetime.strptime(line.strip(), "%b %d, %Y"))
            for i, line in enumerate(txt.splitlines(), start=1) if line.strip()]


# --- Estrategias para elegir fotogramas: devuelven [(número, fecha)] ---

def pick_monthly(rows: list[tuple[int, datetime]]) -> list[tuple[int, datetime]]:
    """Un fotograma por mes: el más cercano al día 15. Descarta meses que no llegan al 15."""
    best: dict[str, tuple[int, datetime]] = {}
    for n, d in rows:
        key = d.strftime("%Y-%m")
        target = d.replace(day=15, hour=12, minute=0)
        if key not in best or abs(d - target) < abs(best[key][1] - target):
            best[key] = (n, d)
    return [v for v in best.values() if abs(v[1].day - 15) <= 2]


def pick_every_days(step: int):
    """Un fotograma cada `step` días: el de en medio de cada día, para comparar siempre
    la misma hora y que el ciclo día/noche no se confunda con un cambio entre fechas.
    Descarta días incompletos (menos de 12 fotogramas, como el primero y el último)."""
    def pick(rows):
        days: dict[datetime, list[int]] = {}
        for n, d in rows:
            days.setdefault(d, []).append(n)
        full = [(d, ns) for d, ns in sorted(days.items()) if len(ns) >= 12]
        return [(ns[len(ns) // 2], d) for d, ns in full[::step]]
    return pick


SOURCES = {
    "sst": {
        "base": "https://svs.gsfc.nasa.gov/vis/a000000/a003900/a003912/",
        "dates": "flat_ecco2_dates.txt",
        "read_dates": dates_numbered,
        "pick": pick_monthly,
        "label": "%Y-%m",
        "colorbar": "sst_ecco2_cbar.png",
        "frame": "frames/2048x1024_1x1_30p/orig/flat_global_ecco2_2028x1024.{n}.tif",
    },
    # Versión para esfera (mapa plano 2:1) de la visualización 5196, que gira alrededor del globo.
    "co2": {
        "base": "https://svs.gsfc.nasa.gov/vis/a000000/a005400/a005436/",
        "dates": "dyamond_timestamps.txt",
        "read_dates": dates_by_line,
        "pick": pick_every_days(4),
        "label": "%Y-%m-%d",
        "colorbar": "dyamondCbar_6-27-2024a.png",
        "frame": "frames/8192x4096_2x1_30p/soscomp_1-29-2025a_pngs/soscomp_1-29-2025a.{n:05d}.png",
    },
    # Imagen fija (un solo fotograma): mapa plano completo, estirado a 16:9.
    "aerosols": {
        "base": "https://svs.gsfc.nasa.gov/vis/a000000/a005600/a005669/",
        "colorbar": "Aerosols_cbar.png",
        "stills": {"2025-08-19": "Aerosols_2025-08-19T20_00_00_3840x2160.png"},
    },
    # Globo que gira (no hay versión en mapa plano). Cada vista es un fotograma del disco;
    # el nombre de cada vista vive en build_disc.DISCS["forest"]["views"].
    "forest": {
        "base": "https://svs.gsfc.nasa.gov/vis/a000000/a004900/a004950/",
        "colorbar": "GEDI_global_w_colorbar_0230_print.tif",  # imagen 4K con la barra abajo
        "colorbar_name": "colorbar.tif",
        "numbers": ["0230", "0600", "0800", "1055", "1400", "1650", "1900", "2200"],
        "frame": "frames/3840x2160_16x9_60p/GEDI_global/GEDI_global.{n}.tif",
    },
    # Mapa plano 2:1 de Science On a Sphere. El nombre de cada fotograma es el año (promedio móvil de 5 años).
    "giss": {
        "base": "https://svs.gsfc.nasa.gov/vis/a000000/a004900/a004964/",
        "colorbar": "giss_navy_anomaly_celsius.png",
        "numbers": ["1885", "1897", "1909", "1921", "1933", "1945", "1957", "1969", "1981", "1993", "2005", "2015", "2021"],
        "frame": "frames/2048x1024_2x1_30p/SOSGISS2021c-Rolling1peryear-RollingAverageperyear.{n}.tif",
    },
    # Promedio de lluvia de cada mes (IMERG, 2001 a 2022), mapa plano 2:1. Los archivos se llaman m01 a m12.
    "rain": {
        "base": "https://svs.gsfc.nasa.gov/vis/a000000/a005200/a005241/",
        "colorbar": "IMERGclim_cbaronly_print.jpg",
        "colorbar_name": "colorbar.jpg",
        "stills": {f"m{i:02d}": f"IMERG_{m}_print.jpg" for i, m in enumerate(
            ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], start=1)},
    },
    # Extensión del hielo marino, un fotograma por día desde el 21 de junio de 2002 (el fotograma 1).
    # Fondo transparente: el hielo es lo único pintado. Se eligen los días 15 de cada mes de 2007.
    "ice": {
        "base": "https://svs.gsfc.nasa.gov/vis/a000000/a003500/a003564/",
        "frame": "frames/4000x2000_2x1_10p/AMSR_E_SeaIce.{n:04d}.png",
        "named": {"2007-01-15": 1670, "2007-02-15": 1701, "2007-03-15": 1729, "2007-04-15": 1760,
                  "2007-05-15": 1790, "2007-06-15": 1821, "2007-07-15": 1851, "2007-08-15": 1882,
                  "2007-09-15": 1913, "2007-10-15": 1943, "2007-11-15": 1974, "2007-12-15": 2004},
    },
    # Video de 163 fotogramas (un mes cada uno, desde marzo de 2000) en proyección Mollweide.
    # Se extraen los 12 meses de 2008 con ffmpeg; la barra de color va dentro de cada fotograma.
    "fire": {
        "base": "https://svs.gsfc.nasa.gov/vis/a030000/a030300/a030378/",
        "video": "mod14a1_m_fire_2304p.mp4",
        "first_month": (2000, 3),
        "months": [(2008, m) for m in range(1, 13)],
    },
}


def fetch(url: str, dest: Path) -> None:
    if dest.exists():
        print(f"  ya existe {dest.name}")
        return
    req = urllib.request.Request(url, headers={"User-Agent": "earth-jukebox-pipeline"})
    with urllib.request.urlopen(req, timeout=120) as r:
        dest.write_bytes(r.read())
    print(f"  bajado    {dest.name}")


def extract_video(src: dict, out: Path) -> None:
    """Saca de un video un fotograma por mes (el video tiene uno por mes) con ffmpeg."""
    video = out / src["video"]
    fetch(src["base"] + src["video"], video)
    y0, m0 = src["first_month"]
    for y, m in src["months"]:
        dest = out / f"{y}-{m:02d}.png"
        if dest.exists():
            continue
        n = (y - y0) * 12 + (m - m0)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(video), "-vf", f"select=eq(n\,{n})",
                        "-frames:v", "1", str(dest)], check=True)
        print(f"  extraído  {dest.name}")
    # la barra de color es la parte de abajo de cualquier fotograma
    first = out / f"{src['months'][0][0]}-{src['months'][0][1]:02d}.png"
    (out / "colorbar.png").write_bytes(first.read_bytes())
    print(f"OK: {len(src['months'])} fotogramas en {out}")


def main() -> None:
    disc_id = sys.argv[1] if len(sys.argv) > 1 else "sst"
    src = SOURCES[disc_id]
    out = RAW / disc_id
    out.mkdir(parents=True, exist_ok=True)
    if "video" in src:
        extract_video(src, out)
        return
    if "named" in src:  # fotogramas por número, guardados con el nombre (fecha) que les toca
        for name, n in src["named"].items():
            fetch(src["base"] + src["frame"].format(n=n), out / f"{name}.{src['frame'].rsplit('.', 1)[1]}")
        print(f"OK: {len(src['named'])} fotogramas en {out}")
        return

    fetch(src["base"] + src["colorbar"], out / src.get("colorbar_name", "colorbar.png"))
    if "numbers" in src:  # fotogramas elegidos a mano por número (vistas del globo)
        for n in src["numbers"]:
            fetch(src["base"] + src["frame"].format(n=n), out / f"{n}.{src['frame'].rsplit('.', 1)[1]}")
        print(f"OK: {len(src['numbers'])} fotogramas en {out}")
        return
    if "stills" in src:  # imágenes fijas: la fecha viene en la configuración
        for date, name in src["stills"].items():
            fetch(src["base"] + name, out / f"{date}.{name.rsplit('.', 1)[1]}")
        print(f"OK: {len(src['stills'])} fotogramas en {out}")
        return
    fetch(src["base"] + src["dates"], out / "dates.txt")
    picks = src["pick"](src["read_dates"]((out / "dates.txt").read_text()))
    ext = src["frame"].rsplit(".", 1)[1]
    for n, d in picks:
        fetch(src["base"] + src["frame"].format(n=n), out / f"{d.strftime(src['label'])}.{ext}")
    print(f"OK: {len(picks)} fotogramas en {out}")


if __name__ == "__main__":
    main()
