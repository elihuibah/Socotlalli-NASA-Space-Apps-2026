# Socotlalli

> Earth's data, for everyone who listens. (Replace with the final one-line pitch.)

**Live demo:** https://socotlalli-nasa-space-apps-2026.vercel.app

**Team:** Socoteam · NASA Space Apps Challenge 2026, Ensenada · Challenge: The Earth Information Jukebox

![Screenshot of the interface](docs/screenshot.png)

## Summary
Socotlalli lets you hear NASA Earth data instead of only seeing it. Most Earth data tools are maps and charts, which people who are blind or have low vision cannot use. Socotlalli shrinks each NASA satellite image to a grid of 32 by 16 numbers and turns those numbers into music that the browser synthesizes live: higher values play higher notes, and the harmony gets tense when a place moves away from normal. You choose one of four "vinyl records" (sea temperature, aerosols, forest height, carbon dioxide), put it on a turntable, and listen. It was made by Socoteam for the NASA Space Apps Challenge 2026, challenge "Earth Information Jukebox".

## How to use it
1. **Choose a disc.** Pick one of the four vinyl records on the shelf. With a keyboard, use Tab to reach the shelf, the arrow keys (and Home/End) to move between records, and Enter to choose.
2. **Press play.** Drag the record onto the turntable or press its play button. The first click is what lets the browser play sound.
3. **Listen in sweep mode.** The sound travels from west to east across the map. Each frame lasts one full sweep, then the next date begins.
4. **Switch to "one place through time".** Press "Learn more" to go to the blackboard (map and statistics), choose a map cell, and press "Listen to this place only". The same cell then plays date after date. This mode is not offered for forest height (each view is a different place) or aerosols (a single date).
5. **Learn how to listen.** The "How it sounds" button plays a short audio example for each rule (pitch, tension, stereo position, rhythm, tempo). The Accessibility panel offers "Reduce motion" and "Larger text".
## How it works
Everything is precomputed once, except the sound, which is generated live in your browser. There is no server.

| Image feature | Musical parameter |
|---|---|
| Value of the cell | Pitch within the scale: higher value, higher note |
| Sign of the anomaly | Timbre: bright above normal, dark below |
| Size of the anomaly | Tension: clean triad, then sevenths, then ninths, then tritones |
| Variation between neighbouring pixels | Rhythmic density: from quarter notes to sixteenth notes |
| Change between frames | Tempo, from 60 to 120 BPM |
| Longitude and latitude | Stereo pan and register in sweep mode |

"Anomaly" means the value of a cell minus the average of that same cell across all frames of the disc. For a disc with a single frame (aerosols), it is measured against the map's average. For forest height, each view is compared with its own average, because each view shows a different place.

The same image always produces the same music.
## Musical decisions
- **The engine plays the disc cell by cell.** It reads the exact `disc.json` the pipeline writes, not an average of the map. An earlier prototype reduced each frame to four numbers and picked notes at random; we replaced it so the sound can be traced back to the pixels.
- **Tension is calibrated on the cells the sweep actually plays.** The sweep plays the cell farthest from normal in each column. With cutoffs measured over all cells, 95% of the sea temperature notes sounded tense and a normal month could not be told from an anomalous one. Now every disc has 55% clean triads, 25% sevenths, 15% ninths and 5% tritones.
- **One timbre per disc, so each variable is recognizable.** Sea temperature: piano (FM, dry attack). Aerosols: harmonics (AM bells). Forest height: classical guitar (plucked, no sustain). Carbon dioxide: organ (sustained, low register).
- **Aerosols have one voice per particle type.** Smoke is low and rough, dust is warm, sea salt is clean and high, sulfate is bell-like.
- **Distortion follows the anomaly (organ only).** On the carbon dioxide disc, the organ gets dirtier in proportion to the anomaly, only at maximum tension. A limiter at -1 dB keeps 4- and 5-note chords from clipping the speaker.
- **The audio engine owns the clock.** Each frame lasts one full sweep (32 columns, 6 to 16 seconds depending on tempo and rhythm) and the interface follows the engine, so image and sound never drift apart.
- **Cells with no data are silent.** Land in the sea temperature disc, and the ocean or edge of the globe in forest height, play nothing instead of sounding like "cold water".
- **Globe views use a fixed tempo.** For forest height the tempo stays at 90 BPM, because each view is another place, not another date.

## Accessibility
Round 1 of testing found no blocking failures and one open issue (see `src/docs/accesibility-tests.md`).

- **Keyboard:** the shelf, the player controls, the blackboard and the map can be operated with Tab, arrow keys and Enter. Tested by one team member on the published demo: pass.
- **Screen reader:** controls have text labels, the active record is announced, and the map has a description. Result: partial. Some controls are announced only as their name plus "button". ⚠️ CONFIRMAR: screen reader and browser used (for example NVDA with Chrome).
- **Text that accompanies the audio:** a short description of the current frame (date, zone, value) is shown with the music. ⚠️ CONFIRMAR que se anuncie al cambiar de fotograma (`aria-live`) antes de afirmarlo.
- **Visual settings:** visible keyboard focus, a "Reduce motion" option that also follows the system `prefers-reduced-motion` setting, and a "Larger text" option.
- **A sound guide:** "How it sounds" plays an audio example of each musical rule.

What we have **not** done: the eyes-closed test with someone outside the team (a team member read the on-page text instead, which shows the explanation is clear but not that the sound alone communicates the data), and any test with blind or low-vision users. That is our next step.

## Data and limits
We read the published NASA visualizations, not the raw scientific data.

| Disc | NASA visualization | Frames |
|---|---|---|
| Sea temperature (`sst`) | Global Sea Surface Currents and Temperature (SVS 3912) | 11 monthly frames, Apr 2007 to Feb 2008 |
| Carbon dioxide (`co2`) | DYAMOND Global Carbon Dioxide for Science On A Sphere (SVS 5436) | 13 frames, Jan to Mar 2020 |
| Forest height (`forest`) | GEDI Forest Height (SVS 4950) | 8 views of a rotating globe, Apr 2019 to Apr 2020 |
| Aerosols (`aerosols`) | GEOS Aerosols (2025) (SVS 5669) | 1 still, Aug 19 2025 20:00 UTC |

Grid: 32 × 16 cells, about 11° × 11° each.

What this project does **not** measure:
- **It reads the picture, not the data.** Values come from the color of the published image, matched against the image's own color bar. It is not the raw NASA measurement.
- **Sea temperature:** the anomaly shows the seasonal cycle of one year, not climate change.
- **Carbon dioxide:** the value is the share of each cell with 430 ppm or more, not exact ppm. Reading the color bar has an error of about 2 ppm.
- **Aerosols:** the value is color intensity, not µg/m³.
- **Forest height:** the globe is read as it appears on screen. Height is exaggerated in 3D and the night side looks darker, so those zones read lower. The grid has no real latitude or longitude.

## Run it locally
```bash
npm install
npm run dev
```

Rebuild a disc from the NASA images (Python 3 with `pip install -r pipeline/requirements.txt`), then check that the audio engine can play it:

```bash
python pipeline/download.py sst      # once: downloads the original frames
python pipeline/build_disc.py sst    # writes public/discs/sst.json
npm run discs:check                  # validates every disc.json and simulates the audio engine on it
```

## Credits and licenses
| Item | Author | License | Link |
|------|--------|---------|------|
| TODO | TODO | TODO | TODO |

## Use of AI
TODO: which tools were used, for what, and in which files.

## Team
Socoteam
