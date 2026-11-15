/**
 * Puente: la interfaz usa este "engine" (misma API que provisional.ts).
 * - forest y co2 -> motor real (Tone.js con los samples grabados).
 * - el resto -> motor provisional.
 * Si el motor real falla al cargar, cae al provisional.
 */
import * as Tone from "tone";
import * as real from "./index";
import { engine as provisional, type AudioEngine, type NoteEvent } from "./provisional";
import { loadDiscData } from "../data/realData";

// Para usar el motor real en otro disco, agrégalo aquí.
const REAL_ENGINE_DISCS = new Set<string>(["forest", "co2"]);

function createBridge(): AudioEngine {
  let useReal = false;
  let wantPlay = false;
  let token = 0; // invalida cargas viejas si cambias de disco rápido
  let cols = 32;
  let ready: Promise<void> = Promise.resolve();
  const listeners = new Set<(n: NoteEvent) => void>();

  // Avisos de notas del motor real -> formato de la interfaz.
  real.onNote((e) => {
    const pan = (e.col / Math.max(1, cols - 1)) * 2 - 1;
    listeners.forEach((cb) => cb({ midi: e.midi, tension: e.tension, pan }));
  });
  // Avisos del provisional.
  provisional.onNote((n) => listeners.forEach((cb) => cb(n)));

  return {
    async start() {
      try {
        await Tone.start();
      } catch {
        // si el navegador lo rechaza, la interfaz sigue sin sonido
      }
      await provisional.start();
    },

    loadDisc(d) {
      const mine = ++token;
      real.pause();
      provisional.pause();
      useReal = REAL_ENGINE_DISCS.has(d.id);

      if (!useReal) {
        provisional.loadDisc(d);
        ready = Promise.resolve();
        return;
      }

      ready = loadDiscData(d.id)
        .then((data) => {
          if (mine !== token) return;
          cols = data.grid.cols;
          real.loadDisc(data);
        })
        .catch((err) => {
          console.warn("Motor real no disponible, uso el provisional:", err);
          if (mine !== token) return;
          useReal = false;
          provisional.loadDisc(d);
        });
    },

    // El motor real avanza sus fotogramas solo; el provisional sí los recibe.
    setFrame(i) {
      if (!useReal) provisional.setFrame(i);
    },

    play() {
      wantPlay = true;
      const mine = token;
      void ready.then(() => {
        if (!wantPlay || mine !== token) return;
        if (useReal) void real.play();
        else provisional.play();
      });
    },

    pause() {
      wantPlay = false;
      real.pause();
      provisional.pause();
    },

    onNote(cb) {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },

    // Los ejemplos de "Cómo se escucha" siguen con el provisional.
    preview(rule) {
      provisional.preview(rule);
    },
  };
}

export const engine = createBridge();