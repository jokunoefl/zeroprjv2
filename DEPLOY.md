# Deploy

## Backend (Render)
- Dashboard → New Web Service → Build from repo
- Select this repo, use Blueprint: `backend/render.yaml`
- Health check path: `/health`

## Frontend (Vercel)
- Import Project → Framework: Next.js → Root directory: `frontend`
- Environment Variables:
  - `NEXT_PUBLIC_API_BASE`: Renderで作成したAPIのURL（例: `https://zerobasics-api.onrender.com`）
- Build Command: `npm run build`
- Start Command: `npm start`
