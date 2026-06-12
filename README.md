# MORSECOD — CW Station

A Morse code trainer PWA built with SvelteKit. Realistic CW sidetone audio
(WebAudio sine keyed with 5 ms raised-cosine edges), PARIS-standard timing,
optional Farnsworth spacing, and full offline support.

## Pages

- **`/` — Tap key board**: a faithful replica of the nuxgadgets PCB gadget.
  Tap the pad (or hold <kbd>Space</kbd>) — short press = dit, long press =
  dah — and the LEDs walk the tree as you key: dah `-` lights T, another dah
  lights M, a dit lights G, one more dah lights Q. Pause to commit the letter
  to the RX readout. Letters only, like the original gadget. Lit trace
  segments are coloured by the symbol they represent — dit green, dah red —
  with a legend at the top (DAH on the left, matching the tree's dah side).
- **`/tree` — Decoder board**: a full morse trie (dah branches left, dit
  branches right) down to depth 5 — A–Z, 0–9 and `/ = + ( &`. Send a message
  — or a hidden random word — and watch the LED path light up in sync with
  the audio. Tap any letter to hear it.
- **`/trainer` — CW station**: the four training modes below.

## Trainer modes

- **TX · Send** — type a message and hear it transmitted; symbols and letters
  light up in sync with the audio.
- **RX · Copy** — a hidden word is sent in CW; copy it by ear. Three
  difficulty levels, streak and best-score tracking.
- **KEY · Tap** — a straight key (tap the big button or hold <kbd>Space</kbd>);
  your dits and dahs are decoded to text in real time.
- **CODE · Chart** — the full A–Z / 0–9 reference; tap any character to hear it.

Controls: speed (5–40 WPM), tone pitch (400–1000 Hz), volume, and Farnsworth
character spacing. Settings persist in `localStorage`.

## Develop

```sh
npm install
npm run dev
```

## Test & verify

```sh
npx vitest run        # unit tests for encoding/timing logic
npm run build
npx vite preview --port 4173
node verify.mjs       # drives the trainer in Edge via playwright-core
node tap-test.mjs     # keys T→M→G→Q on the tap board and checks the LEDs
```

## Build / deploy

`npm run build` produces a fully static site in `build/` (adapter-static,
prerendered, with a service worker for offline use). Host it on any static
file server; `404.html` is the SPA fallback.

## PWA

Installable from the browser menu. The service worker precaches the app and
caches Google Fonts on first use, so everything works offline afterwards.
App shortcuts jump straight to a mode via `/?mode=tx|rx|key|code`.
