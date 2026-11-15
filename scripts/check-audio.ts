/**
 * Une el pipeline de Python con el motor de audio: pasa cada public/discs/<id>.json
 * (lo escribe pipeline/build_disc.py) por el mismo mapeo que usa el navegador, sin
 * Tone.js, y resume cómo va a sonar. Sale con código 1 si un disco no se puede tocar.
 *
 * Uso:  npm run audio:check            (todos los discos)
 *       npm run audio:check -- sst co2 (solo esos ids)
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { calibrate, normalizedFrameChange } from '../src/audio/calibration.ts'
import { Harmony } from '../src/audio/harmony.ts'
import { mapCell } from '../src/audio/mapping.ts'
import { ScanMode } from '../src/audio/modes/scan.ts'
import { changeToTempo, rawFrameChange } from '../src/audio/rhythm.ts'
import type { Disc, Subdivision } from '../src/audio/types.ts'

const DISCS_DIR = join(import.meta.dirname, '..', 'public', 'discs')
const BEATS: Record<Subdivision, number> = { '4n': 1, '8n': 0.5, '8t': 1 / 3, '16n': 0.25 }
const SILENCE_BEATS = BEATS['8n'] // celda sin dato: el motor espera una corchea

const ids = process.argv.slice(2)
const files = readdirSync(DISCS_DIR)
  .filter((f) => f.endsWith('.json'))
  .filter((f) => ids.length === 0 || ids.includes(f.replace(/\.json$/, '')))

if (files.length === 0) {
  console.error(`No hay discos en ${DISCS_DIR}. Corre primero pipeline/build_disc.py.`)
  process.exit(1)
}

let failed = false

for (const file of files) {
  const disc = JSON.parse(readFileSync(join(DISCS_DIR, file), 'utf-8')) as Disc
  const errors: string[] = []
  const cells = disc.grid.cols * disc.grid.rows
  disc.frames.forEach((f, i) => {
    if (f.values.length !== cells || f.anomaly.length !== cells) errors.push(`fotograma ${i}: faltan celdas`)
  })
  if (errors.length) {
    console.log(`✗ ${disc.id}: ${errors.join('; ')}`)
    failed = true
    continue
  }

  const cal = calibrate(disc)
  const harmony = new Harmony('majorPentatonic', 60)
  const scan = new ScanMode(disc)
  const tension = [0, 0, 0, 0]
  const pitches = new Set<number>()
  const perFrame: string[] = []
  const cols = disc.grid.cols

  for (let k = 0; k < disc.frames.length; k++) {
    let change = 0.5
    if (disc.view_mode !== 'globe' && disc.frames.length > 1) {
      const prev = disc.frames[(k - 1 + disc.frames.length) % disc.frames.length]
      change = normalizedFrameChange(rawFrameChange(prev, disc.frames[k], disc.mask), cal)
    }
    const bpm = changeToTempo(change)
    let beats = 0
    let notes = 0
    let tense = 0
    scan.seek(k)
    for (let c = 0; c < disc.grid.cols; c++) {
      const s = scan.next()
      if (!s) {
        beats += SILENCE_BEATS
        continue
      }
      const p = mapCell(s, disc, harmony, cal, { useLatLon: true })
      if (!Number.isFinite(p.midi) || p.midi < 21 || p.midi > 108) errors.push(`fotograma ${k}: nota fuera de rango (${p.midi})`)
      tension[p.tension]++
      if (p.tension >= 2) tense++
      pitches.add(p.midi)
      beats += BEATS[p.subdivision]
      notes++
    }
    if (notes === 0) errors.push(`fotograma ${k}: no suena ninguna nota`)
    const label = disc.frames[k].view ?? disc.frames[k].date
    perFrame.push(`      ${String(k).padStart(2)} ${label.padEnd(28)} ${bpm} BPM  ${((beats * 60) / bpm).toFixed(1).padStart(4)} s  ${'█'.repeat(tense).padEnd(cols)} ${tense} notas tensas`)
  }

  const total = tension.reduce((a, b) => a + b, 0)
  const pct = tension.map((t) => `${Math.round((100 * t) / Math.max(1, total))}%`).join(' / ')
  const mark = errors.length ? '✗' : '✓'
  if (errors.length) failed = true
  console.log(`${mark} ${disc.id} — ${disc.frames.length} fotogramas, ${total} notas, ${pitches.size} alturas distintas`)
  console.log(`    tensión limpia / séptima / novena / tritono: ${pct}`)
  console.log('    por fotograma (barrido):')
  perFrame.forEach((line) => console.log(line))
  errors.forEach((e) => console.log(`    ✗ ${e}`))
}

process.exit(failed ? 1 : 0)
