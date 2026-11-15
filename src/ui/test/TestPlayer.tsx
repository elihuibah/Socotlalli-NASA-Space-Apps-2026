/**
 * Página de prueba del motor de audio con los disc.json reales.
 * Se abre con  http://localhost:5173/#test
 *
 * No es la interfaz final: solo sirve para comprobar que pipeline → audio
 * funciona de punta a punta (cargar disco, sonar, modos, región, eventos).
 */
import { useEffect, useState, type KeyboardEvent, type MouseEvent } from "react";
import {
  getCalibration,
  LEGEND,
  loadDisc,
  onFrame,
  onNote,
  pause,
  play,
  playLegend,
  setMode,
  setRegion,
  type Calibration,
  type Disc,
  type Mode,
  type NoteEvent,
} from "../../audio";
import "./test.css";

const DISC_IDS = ["fake", "sst", "co2", "ice", "rain", "fire", "giss"];
const BASE = import.meta.env.BASE_URL;
const MAX_NOTES = 24;

export default function TestPlayer() {
  const [discId, setDiscId] = useState(DISC_IDS[1]);
  const [disc, setDisc] = useState<Disc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [mode, setModeState] = useState<Mode>("scan");
  const [frameIndex, setFrameIndex] = useState(0);
  const [region, setRegionState] = useState({ col: 16, row: 8 });
  const [notes, setNotes] = useState<NoteEvent[]>([]);
  const [calibration, setCalibration] = useState<Calibration | null>(null);
  const lastNote = notes[0];

  // Cargar el disco elegido.
  useEffect(() => {
    let cancelled = false;
    fetch(`${BASE}discs/${discId}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<Disc>;
      })
      .then((d) => {
        if (cancelled) return;
        loadDisc(d);
        setMode(mode);
        const start = { col: Math.floor(d.grid.cols / 2), row: Math.floor(d.grid.rows / 2) };
        setRegion(start.col, start.row);
        setRegionState(start);
        setDisc(d);
        setCalibration(getCalibration());
      })
      .catch((e: unknown) => !cancelled && setError(`No se pudo cargar ${discId}.json: ${String(e)}`));
    return () => {
      cancelled = true;
    };
    // `mode` se aplica aparte; aquí solo importa el disco.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discId]);

  // Suscripciones a eventos del motor.
  useEffect(() => {
    const offNote = onNote((e) => setNotes((prev) => [e, ...prev].slice(0, MAX_NOTES)));
    const offFrame = onFrame((i) => setFrameIndex(i));
    return () => {
      offNote();
      offFrame();
      pause();
    };
  }, []);

  function selectDisc(id: string) {
    pause();
    setPlaying(false);
    setDisc(null);
    setError(null);
    setNotes([]);
    setFrameIndex(0);
    setDiscId(id);
  }

  async function togglePlay() {
    if (playing) {
      pause();
      setPlaying(false);
    } else {
      await play(); // dentro del clic: Tone.start()
      setPlaying(true);
    }
  }

  function changeMode(m: Mode) {
    setModeState(m);
    setMode(m);
  }

  function chooseRegion(col: number, row: number) {
    if (!disc) return;
    const c = Math.max(0, Math.min(disc.grid.cols - 1, col));
    const r = Math.max(0, Math.min(disc.grid.rows - 1, row));
    setRegionState({ col: c, row: r });
    setRegion(c, r);
  }

  function onMapClick(e: MouseEvent<HTMLDivElement>) {
    if (!disc) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const col = Math.floor(((e.clientX - rect.left) / rect.width) * disc.grid.cols);
    const row = Math.floor(((e.clientY - rect.top) / rect.height) * disc.grid.rows);
    chooseRegion(col, row);
    if (mode !== "region") changeMode("region");
  }

  function onMapKey(e: KeyboardEvent<HTMLDivElement>) {
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const m = moves[e.key];
    if (!m) return;
    e.preventDefault();
    chooseRegion(region.col + m[0], region.row + m[1]);
  }

  const frame = disc?.frames[frameIndex];
  const cols = disc?.grid.cols ?? 32;
  const rows = disc?.grid.rows ?? 16;

  return (
    <main className="tp">
      <header>
        <h1>Prueba del motor de audio</h1>
        <p className="tp-sub">pipeline (disc.json) → src/audio → navegador</p>
      </header>

      <section className="tp-controls" aria-label="Controles">
        <label>
          Disco{" "}
          <select value={discId} onChange={(e) => selectDisc(e.target.value)}>
            {DISC_IDS.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </label>

        <button type="button" onClick={togglePlay} disabled={!disc} className="tp-play">
          {playing ? "Pausar" : "Reproducir"}
        </button>

        <fieldset>
          <legend>Modo</legend>
          <label>
            <input type="radio" name="mode" checked={mode === "scan"} onChange={() => changeMode("scan")} /> Barrido
          </label>
          <label>
            <input type="radio" name="mode" checked={mode === "region"} onChange={() => changeMode("region")} />{" "}
            Lugar en el tiempo
          </label>
        </fieldset>
      </section>

      {error && <p role="alert" className="tp-error">{error}</p>}
      {!disc && !error && <p>Cargando…</p>}

      {disc && (
        <>
          <h2>{disc.title}</h2>
          <p className="tp-meta">
            {frame?.date} · fotograma {frameIndex + 1}/{disc.frames.length} · {disc.units}
          </p>

          <div
            className="tp-map"
            style={{ aspectRatio: `${cols} / ${rows}` }}
            onClick={onMapClick}
            onKeyDown={onMapKey}
            tabIndex={0}
            role="application"
            aria-label={`Mapa. Zona elegida: columna ${region.col}, fila ${region.row}. Usa las flechas para moverla.`}
          >
            {frame && <img src={`${BASE}${frame.image}`} alt="" />}
            {mode === "scan" && lastNote && (
              <div className="tp-scanline" style={{ left: `${((lastNote.col + 0.5) / cols) * 100}%` }} />
            )}
            {lastNote && (
              <div
                className={`tp-cell tp-t${lastNote.tension}`}
                style={cellStyle(lastNote.col, lastNote.row, cols, rows)}
              />
            )}
            {mode === "region" && (
              <div className="tp-cell tp-region" style={cellStyle(region.col, region.row, cols, rows)} />
            )}
          </div>

          {/* Texto en vivo: solo cambia con el fotograma, no con cada nota. */}
          <p className="tp-live" aria-live="polite">
            {frame?.text}
          </p>

          <section className="tp-grid2">
            <div>
              <h3>Últimas notas</h3>
              <ol className="tp-notes" aria-label="Últimas notas">
                {notes.map((n, i) => (
                  <li key={`${n.time}-${i}`} className={`tp-t${n.tension}`}>
                    <b>{n.note}</b> {n.duration} · tensión {n.tension} · celda ({n.col},{n.row}) · valor{" "}
                    {n.value.toFixed(2)} · anomalía {n.anomaly.toFixed(2)}
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <h3>Calibración del disco</h3>
              {calibration && (
                <dl className="tp-cal">
                  <dt>Cortes de tensión |anomalía|</dt>
                  <dd>{calibration.tensionCuts.map((x) => x.toFixed(3)).join(" / ")}</dd>
                  <dt>Cortes de densidad (vecinos)</dt>
                  <dd>{calibration.densityCuts.map((x) => x.toFixed(4)).join(" / ")}</dd>
                  <dt>Cambio que da 120 BPM</dt>
                  <dd>{calibration.maxFrameChange.toFixed(4)}</dd>
                </dl>
              )}

              <h3>Leyenda sonora</h3>
              <ul className="tp-legend">
                {LEGEND.map((l) => (
                  <li key={l.id}>
                    <button type="button" onClick={() => playLegend(l.id)}>
                      ▶ {l.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <p className="tp-credit">{disc.credit}</p>
        </>
      )}
    </main>
  );
}

function cellStyle(col: number, row: number, cols: number, rows: number) {
  return {
    left: `${(col / cols) * 100}%`,
    top: `${(row / rows) * 100}%`,
    width: `${100 / cols}%`,
    height: `${100 / rows}%`,
  };
}
