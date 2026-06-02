# Quick deploy guide — frontend (Vercel) + backend (Render)

This project contains a Vite React frontend in `frontend/` and a FastAPI backend in `backend/`.

Recommended easy setup:

- Frontend: Deploy to Vercel (Static Site)
  - Connect your GitHub repo to Vercel.
  - Set the root directory to `frontend`.
  - Build command: `npm run build`.
  - Output directory: `dist`.

- Backend: Deploy to Render (Web Service)
  - Create a new Web Service on Render and connect your repo.
  - Select the `backend/` folder as the root for the service.
  - Render will use `requirements.txt`. Set the Start Command to:

```
uvicorn main:app --host 0.0.0.0 --port $PORT
```

Environment variables to set on the host (do NOT commit these to source control):

- `GEMINI_API_KEY` — Google Gemini API key (optional). From your `.env`.
- `MONGO_URI` — MongoDB connection string.
- `MONGO_DB_NAME` — Mongo database name.
- `AUTH_SECRET` — Optional auth signing secret (change from default).
- `FRONTEND_ORIGINS` — Comma-separated allowed origins for CORS (e.g. `https://your-app.vercel.app`).

Persistent storage note:

The app stores a local Chroma DB under `backend/chroma_db/`. To keep this data across deploys you must:

- Use a Render persistent disk for the service, or
- Use an external vector DB or re-run `generate_kb.py` on first boot to rebuild the DB from `backend/pdf_kb/`.

Optional: Docker

- A `backend/Dockerfile` is included if you prefer Docker-based deployment (Railway, Fly, or your VPS).

Docker Compose (fullstack local deploy)

1. Copy environment variables into a `.env` file at the repository root or export them in your shell. Example `.env` keys used by the compose file:

```
MONGO_URI=
MONGO_DB_NAME=
GEMINI_API_KEY=
AUTH_SECRET=
FRONTEND_ORIGINS=http://localhost:3000
VITE_API_BASE_URL=http://localhost:8000/api
```

2. Build and start the services:

```bash
docker compose up --build
```

3. App endpoints:

- Frontend: http://localhost:3000
- Backend: http://localhost:8000

Note: The `backend` service mounts `./backend/chroma_db` to persist the local Chroma DB across restarts. For production, use a managed vector DB or attach a persistent volume on your host.

Security reminder:

- Remove or rotate any API keys in `.env` before sharing the repo.

If you want, I can:

- Add Render or Vercel configuration files, or
- Create a GitHub Actions workflow to automate deploys.

Render quick setup (using `render.yaml` example)

1. Push your repo to GitHub.
2. In Render, choose "New +" → "Import from GitHub" and select this repository.
3. You can either let Render auto-detect services or use the provided `render.yaml` as a manifest.
4. In the Render dashboard, add the environment variables listed above as secure secrets for the backend service.
5. For the backend, mount a Persistent Disk (in the Render service settings) if you want to persist `backend/chroma_db`.

If you'd like, I can: (a) create a ready-to-use `render.yaml` (done) and (b) add a GitHub Action to auto-deploy on push.
