# Socotlalli

> Earth's data, for everyone who listens.
Socoteam · NASA Space Apps Challenge 2026, Ensenada, Baja California, Mexico · Challenge: The Earth Information Jukebox

<img width="1920" height="913" alt="image" src="https://github.com/user-attachments/assets/598fb973-7cec-45aa-99cd-db77ac372366" />

## Summary

Socotlalli lets you hear NASA Earth data instead of only looking at it. Most Earth data tools are maps and charts, which people who are blind or have low vision cannot use. Socotlalli turns each NASA satellite image into music: higher values play higher notes, and the harmony grows tense where a place moves away from normal.

You choose one of four vinyl records (sea temperature, aerosols, forest height, carbon dioxide), put it on a turntable and listen. It is meant for people who are blind or have low vision, and for anyone who understands data better by ear, in classrooms, museums and science centers.

## Contents

[How to use it](#how-to-use-it) · [How it works](#how-it-works) · [Musical decisions](#musical-decisions) · [Accessibility](#accessibility) · [Data and limits](#data-and-limits) · [Run it locally](#run-it-locally) · [Credits and licenses](#credits-and-licenses) · [Use of AI](#use-of-ai) · [Team](#team)

## How to use it

1. **Choose a record.** Pick one of the four vinyl records on the shelf. With a keyboard, use Tab to reach the shelf, the left and right arrow keys (and Home and End) to move between records, and Enter to choose.
2. **Press play.** Drag the record onto the turntable, or press its play button. This first click is what allows the browser to play sound.
3. **Listen in sweep mode.** The sound travels across the map from west to east. One full sweep lasts one frame (one date), then the next frame begins.
4. **Listen to one place through time.** Press "Conocer más" to open the blackboard (map and statistics), choose a cell, and press "Escuchar solo este lugar a lo largo del tiempo". The same cell then plays date after date. This mode is available for sea temperature and carbon dioxide. It is not offered for forest height (each view is a different place) or aerosols (a single date).
5. **Learn how to listen.** The "Cómo se escucha" button plays an audio example of each rule: pitch, tension, rhythm and tempo. The "Accesibilidad" panel offers "Reducir movimiento" and "Texto más grande".

Tlalli ("earth" in Nahuatl), the character on screen, guides you and describes any cell you select.

| Record | Name | Variable | Sound |
|---|---|---|---|
| 1 | Fiebre del océano | Sea surface temperature | Electric guitar records with chorus, delay & reverb |
| 2 | Bruma | Aerosols | Electric guitar records with chorus, delay & reverbr |
| 3 | Pastoral | Forest height | Electric guitar records with chorus, delay & reverb |
| 4 | Respiración | Carbon dioxide | Electric guitar records with chorus, delay & reverb |
| 5 | Cristal| Snow in the sea | Electric guitar records with chorus, delay & reverb |
| 6 | Aguacero | Raining | Electric guitar records with chorus, delay & reverbr |
| 7 | Brasas | Heat & fire | Electric guitar records with chorus, delay & reverb |
| 8 | Siglo de calor | Only heat | Electric guitar records with chorus, delay & reverb |


## How it works

Everything is precomputed once, except the sound, which is generated live in your browser. There is no server.

1. A Python script (`pipeline/`) takes the frames of each NASA visualization and reduces them to a grid of 32 × 16 cells (512 in total).
2. The script converts the color of each cell into a value from 0 to 1 using the image's own color bar, calculates the anomaly of each cell, and saves everything to `public/discs/<id>.json`.
3. The React interface shows the image and passes that `disc.json` to the audio engine.
4. The audio engine, built with Tone.js, reads the file cell by cell and plays the sound in the browser.

Each cell carries two numbers: its **value** (0 to 1) and its **anomaly** (−1 to 1).

### Two listening modes

- **Sweep.** The sound travels from west to east, one column at a time (32 notes per frame). In each column it plays the cell farthest from normal. A full sweep takes 8 to 16 seconds, depending on tempo and rhythm.
- **One place through time.** One cell you choose plays 4 notes per frame, date after date.

### From image to music

| Image feature | Musical parameter |
|---|---|
| Value of the cell | Pitch: the higher the value, the higher the recording that plays (8 recordings per disc, from low to high) |
| Size of the anomaly | Tension: four levels; more tension means more recordings sounding together |
| Size of the anomaly | Loudness: from 50% to 100% |
| Variation between neighbouring cells | Rhythmic density: quarter notes, eighth notes, eighth-note triplets or sixteenth notes |
| Change between frames | Tempo, from 60 to 120 BPM |

The cutoffs for tension and density are set per disc from its own data. Tension splits the notes into about 55% level 0, 25% level 1, 15% level 2 and 5% level 3. Density splits them into about 40% quarter notes, 30% eighth notes, 20% triplets and 10% sixteenth notes. Tempo is measured against the largest change between frames of that same disc. For forest height (each frame is another view of the globe) and aerosols (a single frame) it stays fixed at 90 BPM.

"Anomaly" means the value of a cell minus the average of that same cell across all frames of the disc, scaled to −1..1 with a single number per disc. For a disc with a single frame (aerosols), it is measured against the map's average. For forest height, each view is compared with its own average, because each view shows a different place.

Cells with no data (land in the sea temperature disc, ocean or the edge of the globe in forest height) stay silent. The same image always produces the same music: the engine uses no randomness.

## Musical decisions

### What you hear

- **The engine plays the disc cell by cell.** It reads the exact `disc.json` the pipeline writes, not an average of the map. An earlier prototype reduced each frame to four numbers and picked notes at random. We replaced it so every sound can be traced back to a pixel.
- **The sweep plays the most unusual cell of each column.** That keeps the sweep short (32 notes) and makes the places that differ most from normal the ones you hear.
- **Two families of sound, to tell variables apart.** Sea temperature and forest height use recordings of wind and water. Aerosols and carbon dioxide use recordings of dust and lightning. Each disc uses 8 of the 16 recordings in its set: the lower 8 for sea temperature and carbon dioxide, the upper 8 for forest height and aerosols.
- **Recordings play whole.** They are neither cut nor pitch-shifted. The value of the cell chooses which recording sounds, so the pitch you hear is always a real recording.
- **Tension adds sounds.** At level 0, one recording plays (two on the carbon dioxide disc). At level 3, up to three recordings (four on carbon dioxide) sound together. Carbon dioxide is designed to feel heavier and to accumulate.

### How the engine behaves

- **Tension is calibrated on the cells the sweep actually plays.** With cutoffs measured over all cells, 95% of the sea temperature notes sounded tense, and a normal month could not be told from an anomalous one. Now each disc has about 55% level 0, 25% level 1, 15% level 2 and 5% level 3. Discs with almost no variation have minimum cutoffs, so noise does not sound tense.
- **The audio engine owns the clock.** The interface changes frame when the engine finishes a sweep, so image and sound never drift apart.
- **Globe views use a fixed tempo.** For forest height the tempo stays at 90 BPM, because each view is another place, not another date.
- **Cells with no data are silent.** Land in the sea temperature disc plays nothing instead of sounding like "cold water".

### Not audible yet

- The engine includes a bright/dark filter (for the sign of the anomaly) and a stereo pan with a register shift (for longitude and latitude). The recordings go straight to the output, so those two rules are not heard in the current version.
- The pipeline stores a value for each aerosol particle type (black carbon, dust, sea salt, sulfate), and the engine can give each one its own voice, but that option is switched off. The aerosol disc currently plays as one voice.

## Accessibility

Round 1 of testing (November 14, 2026) found no blocking failures and one open issue: some controls are announced only as their name plus "button". The full results are in [`src/docs/accesibility-tests.md`](src/docs/accesibility-tests.md).

- **Keyboard.** The shelf, player controls, blackboard, map and timeline can all be operated with the keyboard: Tab to move, arrow keys between records and between map cells (the map wraps from east to west), Enter or Space to choose. Result: pass.
- **Screen reader.** Records have labels with their number, name and variable, and say "Sonando ahora" when playing. The map has a description of the current frame, and the timeline announces the date. Result: partial, because of the open issue above. Screen reader and browser used: [complete, for example NVDA with Chrome].
- **Live text.** Tlalli's speech bubble is a polite live region: it announces the chosen record, the description of each selected cell, and the first time the harmony grows tense. Result: pass, it does not interrupt the audio.
- **Visual settings.** Visible keyboard focus, "Reducir movimiento" (which also follows the system `prefers-reduced-motion` setting) and "Texto más grande". Both are remembered in the browser. Text contrast and focus: pass.
- **Sound guide.** "Cómo se escucha" plays an audio example of each musical rule.

What we have **not** done:

- The eyes-closed test with someone outside the team. A team member read the on-page text instead, which shows that the explanation is clear but not that the sound alone communicates the data.
- Any test with blind or low-vision users. That is our next step.
- Tests were done by one person, with one screen reader and one browser.

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

- **It reads the picture, not the data.** Values come from the hue of each pixel, matched against the image's own color bar. It is not the raw NASA measurement.
- **Sea temperature.** The anomaly shows the seasonal cycle of one year, not climate change. Land cells have no data (131 of 512 cells).
- **Carbon dioxide.** The value is the share of each cell with 430 ppm or more, not exact ppm. Reading the color bar has an error of about 2 ppm.
- **Aerosols.** The value is color intensity, not µg/m³. The anomaly measures how far each area is from the rest of the planet on that single date.
- **Forest height.** The globe is read as it appears on screen. Height is exaggerated in 3D and the night side looks darker, so those zones read lower. Each cell takes the 90th percentile of its pixels, because the GEDI data comes in strips. The grid has no real latitude or longitude.

## Run it locally

You need Node.js 22 or later.

```bash
npm install
npm run dev
```

Other commands: `npm run build` (production build) and `npm run lint`. The page `/#test` opens a test player for the audio engine.

To rebuild a disc from the NASA images (Python 3 and `pip install -r pipeline/requirements.txt`), and then check that the audio engine can play it:

```bash
python pipeline/download.py sst      # once: downloads the original frames
python pipeline/build_disc.py sst    # writes public/discs/sst.json
npm run discs:check                  # validates every disc.json and simulates the audio engine on it
```

Disc ids: `sst`, `co2`, `aerosols`, `forest`.

## Credits and licenses

### NASA data and visualizations

| Title | Author | Link | Used in |
|---|---|---|---|
| Global Sea Surface Currents and Temperature | NASA Scientific Visualization Studio: Greg Shirah, Horace Mitchell, Eric Sokolowsky; ECCO2 model data: Hong Zhang (UCLA), Dimitris Menemenlis (NASA/JPL) | https://svs.gsfc.nasa.gov/3912 | Disc `sst` |
| DYAMOND Global Carbon Dioxide for Science On A Sphere | NASA SVS: AJ Christensen, Greg Shirah, Helen-Nicole Kostis, Mark SubbaRao; scientists: Lesley Ott, Brad Weir, William Putman, Tomohiro Oda; DYAMOND GEOS-MITgcm model (NASA/GMAO, NASA/JPL) | https://svs.gsfc.nasa.gov/5436 | Disc `co2` (flat-map version of https://svs.gsfc.nasa.gov/5196) |
| GEDI Forest Height | NASA SVS: Kel Elkins, Horace Mitchell, Greg Shirah; scientists: Temilola Fatoyinbo (NASA/GSFC), Atticus Stovall (University of Maryland); GEDI L2B RH100 | https://svs.gsfc.nasa.gov/4950 | Disc `forest` |
| GEOS Aerosols (2025) | NASA SVS: Joseph V. Ardizzone, Helen-Nicole Kostis; scientist: Lesley Ott; GEOS-FP 2 km Replay model | https://svs.gsfc.nasa.gov/5669 | Disc `aerosols` |

### Software

| Item | Author | License | Link |
|---|---|---|---|
| React | Meta and contributors | MIT | https://react.dev |
| Tone.js | Yotam Mann and contributors | MIT | https://tonejs.github.io |
| Vite | Evan You and contributors | MIT | https://vite.dev |
| TypeScript | Microsoft | Apache-2.0 | https://www.typescriptlang.org |
| ESLint | OpenJS Foundation and contributors | MIT | https://eslint.org |
| NumPy | NumPy developers | BSD-3-Clause | https://numpy.org |
| Pillow | Jeffrey A. Clark and contributors | MIT-CMU | https://python-pillow.org |
| Vercel (hosting) | Vercel Inc. | Service | https://vercel.com |

### Fonts, recordings and images

| Item | Author |Link |
|---|---|---|
| Wind and water recordings (`public/samples/calm`) |Jared Delgado & Bryan Jeronimo| https://drive.google.com/drive/folders/1SVq7l1JCypAUfIDjOuHR3mNrvUfltJQr?usp=drive_link |
| Dust and lightning recordings (`public/samples/stress`) | Jared Delgado & Bryan Jeronimo | https://drive.google.com/drive/folders/1MhDm0rG35WYnDY_0CcXZww5w3Lj0gDsa?usp=sharing |

## Use of AI
We used generative AI tools as assistants during development. All AI-assisted output was reviewed, tested and edited by the team, which is responsible for the final project. No audio was generated with AI: the recordings in `public/samples/` were made by team members (see Credits).

| Tool | Provider | Model and access dates | Used for | Where |
|---|---|---|---|---|
| Claude | Anthropic | Opus 5.5, Nov 2026 | Project structure; checking and following the visual design, color and responsive layout; structuring the classes that play the recordings and read the NASA data | `src/audio/`, `src/data/`, `src/styles/`, `pipeline/` |
| Claude | Anthropic | Fable 5.2, Nov 2026 | Built the Python pipeline to download and process NASA visualizations into eight discs. Integrated real data into the React interface, including turntable playback, Tlalli's animation, and the interactive map with real values, historical comparisons, and global summaries. Improved responsive layout and tested core features. | `pipeline/`, `src/App.tsx`, `src/components/`, `src/data/realData.ts`, `src/styles/`, `scripts/` |
| ChatGPT | OpenAI | GPT-6, Nov 2026 | Language correction and wording; help implementing the interface | README, `src/components/` |

### AI References

Anthropic. (2026). *Claude Opus 5.5* [Large language model]. https://claude.ai

Anthropic. (2026). *Claude Fable 5.2* [Large language model]. https://claude.ai

OpenAI. (2026). *GPT-6* [Large language model]. https://chat.openai.com

## Team

Socoteam, Ensenada, Baja California, Mexico.

**Interface (UI)**
- Elihú Ibarra: visual direction and interface structure.
- Bryan Jeronimo: Interface and music structure.

**Logic**
  - ALejandro Segovia: Logic and sound management
  - Jared Delgado: Logic and sound management

## License

[MIT](LICENSE) 
