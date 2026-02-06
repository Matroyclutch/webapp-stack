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
