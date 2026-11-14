"""Constantes del contrato 1 (disc.json), compartidas por todo el pipeline.

Convención de índices (avisar a Audio y Frontend B):
    index = row * COLS + col
    row 0 = fila de arriba (norte), col 0 = columna de la izquierda (oeste).
    Así, values[index] es la celda (col, row) y el barrido oeste→este recorre col 0..31.
"""
from pathlib import Path

COLS = 32
ROWS = 16
CELLS = COLS * ROWS  # 512

REPO = Path(__file__).resolve().parent.parent
PUBLIC = REPO / "public"
# Ruta pendiente de confirmar con Frontend B. Las rutas "image" del JSON son relativas a public/.
DISCS_DIR = PUBLIC / "discs"      # public/discs/<id>.json
FRAMES_DIR = PUBLIC / "frames"    # public/frames/<id>/000.png


def idx(col: int, row: int) -> int:
    return row * COLS + col


def col_row(index: int) -> tuple[int, int]:
    return index % COLS, index // COLS
