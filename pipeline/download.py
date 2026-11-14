"""Descarga los fotogramas originales de un disco desde el SVS de NASA.

Uso:  python pipeline/download.py sst
Salida: pipeline/raw/<id>/  (fotogramas AAAA-MM[-DD].<ext>, colorbar.png y dates.txt)

Cada fuente dice cómo leer su archivo de fechas y qué fotogramas elegir.
Solo usa la librería estándar.
"""
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
}


def fetch(url: str, dest: Path) -> None:
    if dest.exists():
        print(f"  ya existe {dest.name}")
        return
    req = urllib.request.Request(url, headers={"User-Agent": "earth-jukebox-pipeline"})
    with urllib.request.urlopen(req, timeout=120) as r:
        dest.write_bytes(r.read())
    print(f"  bajado    {dest.name}")


def main() -> None:
    disc_id = sys.argv[1] if len(sys.argv) > 1 else "sst"
    src = SOURCES[disc_id]
    out = RAW / disc_id
    out.mkdir(parents=True, exist_ok=True)

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
