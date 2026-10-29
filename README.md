# The Quiet Cup

A local café recipe app with 50 illustrated drinks: 27 warm and 23 cold. Explore the collection, follow preparation steps, and use an optional Gemini assistant to personalize recipes and illustrate them.

## Features

- Search drinks and ingredients, or filter by temperature.
- Follow step-by-step instructions, check off ingredients, and track completed steps.
- Ask the assistant for recipe changes, review them before applying, and undo changes.
- Generate step illustrations with automatic background removal, pause and replay.
- Resume saved recipes, conversations and preparation progress in the same browser.

Browsing and preparation work without an API key. AI chat and illustration require a Gemini API key. Background removal uses OpenCV.js inside the app; no ComfyUI installation, Python setup or GPU is needed.

## Requirements

- Node.js 20.19+ within version 20, or 22.12+.
- npm, included with Node.js.
- A Gemini API key for the optional AI features.

## Run locally

Run these commands from the repository root to install dependencies:

```sh
npm --prefix backend ci
npm --prefix frontend ci
```

Copy `backend/.env.example` to `backend/.env`. To enable AI features, set your key in that file:

```env
GEMINI_API_KEY=your_key_here
```

The template includes the chat model, image model and server port. Model access and API charges depend on your Google account. Keep your key in the backend `.env` file, which Git ignores. Restart the backend after changing configuration.

Start the backend:

```sh
npm --prefix backend start
```

In a second terminal, also from the repository root, start the frontend:

```sh
npm --prefix frontend run dev
```

Open **http://127.0.0.1:5173**. The backend runs on **http://127.0.0.1:8080**; keep both terminals running.

On Windows, use `npm.cmd` instead of `npm` if PowerShell blocks `npm.ps1`.

## Run a built version

After installing dependencies and configuring the backend, build the frontend and start the server:

```sh
npm --prefix frontend run build
npm --prefix backend start
```

Open **http://127.0.0.1:8080**. This serves the built app without a separate frontend server. Keep `frontend/public/images` in place for reference images and artwork fallbacks.

The app is intended for local use. Saved progress belongs to the browser and address used to open it; it is not synced between devices or between the development and built versions. AI requests send recipe context and, for illustrations, reference images to Google. Generated artwork is cached locally in `backend/generated/`.

## Development

The frontend uses React, TypeScript and Vite. The backend uses Express, the Google GenAI SDK, Sharp and OpenCV.js. GrabCut background removal runs in a Node worker, using image borders to seed background regions. White, pink and other distinguishable backgrounds are supported; ambiguous or empty images can still require a new drawing. Existing ingredient and tool images are reused, with background removal applied locally when needed. Cutout cache keys include the segmentation version so algorithm changes do not reuse stale cutouts.

From the repository root:

```sh
npm --prefix backend test
npm --prefix frontend run lint
npm --prefix frontend run build
```

For browser tests, install Chromium once and run Playwright from the frontend directory:

```sh
cd frontend
npx playwright install chromium
npm test -- --workers=2
```

Automated tests mock AI responses and do not spend API credits. After changing recipe artwork, run `npm --prefix frontend run assets:prepare` from the repository root before building.
