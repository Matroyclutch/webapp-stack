# Local Webapp Stack (React + FastAPI + Ollama)

## Start backend
```bash
cd /Users/matroy/mat\ test/webapp-stack
. .venv/bin/activate
uvicorn backend.main:app --reload --port 8000
```

## Start frontend
```bash
cd /Users/matroy/mat\ test/webapp-stack/frontend
npm run dev
```

Frontend: http://localhost:5173
Backend: http://127.0.0.1:8000

## Health check
```bash
curl http://127.0.0.1:8000/health
```

## Change models
Edit `webapp-stack/backend/.env` and restart the backend.

## Deployment (Free)

### Backend (Render)
1. Go to Render and create a **New Web Service** from this repo.
2. It will auto-detect `render.yaml`.
3. Set **Environment Variables** in Render:
   - `MAIL_TO` = `mat.roy@clutch.ca`
   - `SMTP_HOST` = `smtp.gmail.com`
   - `SMTP_PORT` = `587`
   - `SMTP_USER` = your Gmail address
   - `SMTP_PASS` = your Gmail App Password
   - `SMTP_FROM` = `Clutch Arbitration <your_gmail_address@gmail.com>`
   - `SMTP_DRY_RUN` = `false`
   - `CORS_ORIGINS` = your Cloudflare Pages URL (e.g. `https://your-app.pages.dev`)

### Frontend (Cloudflare Pages)
1. Create a new Pages project from this repo.
2. **Framework preset**: Vite
3. **Root directory**: `frontend`
4. **Build command**: `npm run build`
5. **Build output directory**: `dist`
6. Add Pages **Environment Variable**:
   - `VITE_API_BASE_URL` = your Render backend URL (e.g. `https://your-backend.onrender.com`)

### After Deploy
- Open the Pages URL and submit a test form.
- Confirm the email arrives at `mat.roy@clutch.ca` with attachment.
