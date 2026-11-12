# The Quiet Cup

A local café recipe app with 50 illustrated drinks: 27 warm and 23 cold. Explore the collection, follow preparation steps, and use an optional Gemini assistant to personalize recipes and illustrate them.

## Features

- Search drinks and ingredients, or filter by temperature.
- Follow step-by-step instructions, check off ingredients, and track completed steps.
- Ask the assistant for recipe changes, review them before applying, and undo changes.
- Prepare the whole recipe’s ingredient, tool and result illustrations automatically when it opens.
- Watch whisking, sifting and pouring blend into each prepared result, with pause and replay.
- Resume saved recipes, conversations and preparation progress in the same browser.

Browsing and preparation work without an API key. AI chat and illustration require a Gemini API key. Background removal uses OpenCV.js inside the app; no ComfyUI installation, Python setup or GPU is needed.

With AI configured, opening a recipe starts one background task to prepare all of its illustrations, prioritizing the selected step and any earlier preparations it needs. Each step animates once its artwork is ready, with the generated result blending in during the action. Moving between steps keeps preparation running; leaving the recipe or pressing **Stop preparing illustrations** cancels it. Failed preparation can be retried explicitly, reusing completed artwork. Playback and replay use the cached pictures.

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

The `dev-animations` prototype uses Anime.js 4 for reusable whisk, sift and pour scenes. Open `/animations` on the running app to compare the simple drawings or enter a custom step. Recipe steps use the same motions with available transparent artwork: whisks and sifters move and pouring ingredients tilt. Missing artwork falls back to simple drawings. Vessel openings are estimated from their upper contours, so contents land inside the rim and behind the front wall. During the final action, the generated result gradually fades into the same opening position while the tool continues moving above it, then withdraws. The result remains in the same scene without a zoom or layout swap. Compound steps keep the finished result hidden until their final action begins. Playback and replay require no new AI request. Compound instructions play the supported actions in order. Playback supports pause, resume, replay, reset and reduced motion. Action and asset selection use a small English vocabulary rather than full semantic understanding. Generated images remain flat cutouts; unusual perspectives, handles and decorations can still need explicit opening metadata for accurate alignment.

The frontend uses React, TypeScript and Vite. The backend uses Express, the Google GenAI SDK, Sharp and OpenCV.js. New illustrations request a uniform white background. GrabCut background removal runs in a Node worker, using image borders to seed background regions; older pink-background drawings can still be processed. Before preparation images appear, their pixels are checked for visible content and transparent margins, including cached images labelled as segmented. Opaque ingredient, tool and result pictures go through local background removal while placeholders remain visible. Failed removal keeps the unfinished image hidden and offers a retry for the recipe. Ambiguous edges and shadows can still require a new drawing. Cutout cache keys include the segmentation and validation versions so changes do not reuse stale cutouts.

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
