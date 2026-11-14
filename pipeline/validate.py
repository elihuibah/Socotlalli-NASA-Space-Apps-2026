"""Revisa que cada disc.json cumpla el contrato 1.

Uso:  python pipeline/validate.py            (todos los de public/discs/)
      python pipeline/validate.py sst fake   (solo esos ids)
Sale con código 1 si algo falla, para poder usarlo antes de cada merge.
"""
import json
import sys

from contract import CELLS, COLS, DISCS_DIR, PUBLIC, ROWS

REQUIRED = ["id", "title", "units", "credit", "grid", "frames"]
FRAME_KEYS = ["date", "image", "values", "anomaly", "text"]


def check(path) -> list[str]:
    errs = []
    try:
        d = json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        return [f"no se pudo leer: {e}"]

    errs += [f"falta '{k}'" for k in REQUIRED if k not in d]
    if errs:
        return errs
    if d["id"] != path.stem:
        errs.append(f"id '{d['id']}' no coincide con el archivo '{path.stem}'")
    if d["grid"] != {"cols": COLS, "rows": ROWS}:
        errs.append(f"grid debe ser {COLS}x{ROWS}, es {d['grid']}")
    if "mask" in d and (len(d["mask"]) != CELLS or set(d["mask"]) - {0, 1}):
        errs.append(f"mask debe tener {CELLS} valores 0 o 1")
    if not d["frames"]:
        errs.append("no hay fotogramas")

    for i, f in enumerate(d["frames"]):
        p = f"frame {i}"
        missing = [k for k in FRAME_KEYS if k not in f]
        if missing:
            errs.append(f"{p}: faltan {missing}")
            continue
        for key, lo, hi in (("values", 0, 1), ("anomaly", -1, 1)):
            arr = f[key]
            if len(arr) != CELLS:
                errs.append(f"{p}: {key} tiene {len(arr)} números, deben ser {CELLS}")
            bad = [x for x in arr if not isinstance(x, (int, float)) or not lo <= x <= hi]
            if bad:
                errs.append(f"{p}: {len(bad)} valores de {key} fuera de [{lo}, {hi}]")
        if not (PUBLIC / f["image"]).is_file():
            errs.append(f"{p}: no existe la imagen public/{f['image']}")
        if not f["text"].strip():
            errs.append(f"{p}: text vacío")
    return errs


def main() -> None:
    ids = sys.argv[1:]
    paths = [DISCS_DIR / f"{i}.json" for i in ids] if ids else sorted(DISCS_DIR.glob("*.json"))
    if not paths:
        sys.exit("No hay discos en public/discs/")
    failed = False
    for path in paths:
        errs = check(path) if path.exists() else ["no existe"]
        print(f"{'OK  ' if not errs else 'FAIL'} {path.name}")
        for e in errs:
            print(f"     - {e}")
        failed |= bool(errs)
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
