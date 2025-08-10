# zeroprjv2

Zero-Base Learning App prototype (弱点検出 → 優先出題 → 定着確認)

## Local Development

Backend (FastAPI):

```
python -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload --port 8000
```

Frontend (Next.js):

```
cd frontend
echo "NEXT_PUBLIC_API_BASE=http://localhost:8000" > .env.local
npm install
npm run dev
```

## Deploy

### Backend (Render)
- Connect this repo in Render
- Use Blueprint: `backend/render.yaml`

### Frontend (Vercel)
- Import `frontend/` as a Vercel project
- Env: `NEXT_PUBLIC_API_BASE` → RenderのAPI URL
- Build: `npm run build`
- Start: `npm start`
# Force Vercel rebuild
