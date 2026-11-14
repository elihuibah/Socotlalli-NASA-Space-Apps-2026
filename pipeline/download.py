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

    fetch(src["base"] + src["dates"], out / "dates.txt")
    fetch(src["base"] + src["colorbar"], out / "colorbar.png")
    picks = src["pick"](src["read_dates"]((out / "dates.txt").read_text()))
    ext = src["frame"].rsplit(".", 1)[1]
    for n, d in picks:
        fetch(src["base"] + src["frame"].format(n=n), out / f"{d.strftime(src['label'])}.{ext}")
    print(f"OK: {len(picks)} fotogramas en {out}")


if __name__ == "__main__":
    main()
