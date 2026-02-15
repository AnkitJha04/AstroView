# AstroView

Vite + React app that renders a real-time sky view using Astronomy Engine. It supports GPS location and device orientation for an immersive mobile experience.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy env file and add keys:
   ```bash
   copy .env.example .env
   ```

3. Start dev server:
   ```bash
   npm run dev
   ```

## Sensors

- Device orientation and geolocation require HTTPS (or localhost) and user permission.
- iOS Safari requires a tap to grant gyro access; use the sensor button in the UI.
- For best results on mobile, wrap the app with Capacitor.

## Location name

- City lookup uses the public Nominatim reverse geocoding endpoint.

## Satellites

- TLE data is fetched from CelesTrak (groups: stations, visual) and cached locally.

## NASA data

- Global updates use NASA APOD and DONKI (solar flare) APIs.
- Set `VITE_NASA_API_KEY` to your key, otherwise the demo key is used.
- The landing page background uses the APOD image when available.

## 360 sky mode

- Toggle between 2D and 360 mode in the top-right controls.
- 360 mode uses a WebGL sky dome (three.js) with live azimuth/altitude.

## AstronomyAPI (fixed)

- 360 mode can use AstronomyAPI body positions for the Solar System.
- Set `VITE_ASTRONOMY_APP_ID` and `VITE_ASTRONOMY_APP_SECRET` in `.env`.
- If credentials are missing, AstroView falls back to local ephemerides.

## Satellite view

- A full-screen overlay lets you switch between Hubble and JWST tracking.
- Data comes from CelesTrak TLE feeds and updates when those entries are available.

## Catalogs and accuracy

- Solar System bodies use Astronomy Engine ephemerides.
- Stars use a small bundled bright-star sample in [src/data/bright-stars.json](src/data/bright-stars.json).
- For large catalogs (multi-GB), place your files under public/catalogs and load them in the app. This repo does not include those datasets.

## AI assistant

- Default provider is OpenRouter with `mistralai/mistral-7b-instruct:free`.
- Set `VITE_OPENROUTER_API_KEY` to enable OpenRouter.
- To switch back to local Ollama, set `VITE_AI_PROVIDER=ollama` and start Ollama.
- Optional: `VITE_OLLAMA_MODEL` (default: `llama3.1:latest`) and `VITE_OLLAMA_BASE_URL`.

## Env vars

- `VITE_ASTRONOMY_APP_ID` / `VITE_ASTRONOMY_APP_SECRET` for 360 mode Solar System sync.
- `VITE_NASA_API_KEY` for APOD and DONKI updates (demo key is used otherwise).
- `VITE_AI_PROVIDER` to switch between `openrouter` and `ollama`.
- `VITE_OPENROUTER_API_KEY` for OpenRouter access.
- `VITE_OPENROUTER_MODEL` (default: `mistralai/mistral-7b-instruct:free`).
- `VITE_OLLAMA_MODEL` to change the local assistant model.

No API keys are required for the core 2D sky map.
