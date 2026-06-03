# 💸 Monetra

> Educación y gestión financiera personal automatizada con IA para jóvenes colombianos.

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS v4 |
| Auth & DB | Firebase v10 (Authentication + Firestore) |
| Backend IA | Python 3.11+ + FastAPI |
| LLM | Google Gemini 2.5 Flash (`google-genai`) |
| OCR | Por definir |

## Estructura del Monorepo
monetra-app/

├── frontend/        → App React (cliente)

├── backend-api/     → Servicios IA/OCR (FastAPI)

└── README.md

## Cómo correr el proyecto

### Frontend
```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

### Backend API
```bash
cd backend-api
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload  # http://localhost:8000
```

## Variables de entorno
- `frontend/.env.local` — credenciales Firebase (ver `.env.local.example`)
- `backend-api/.env`    — API keys de Gemini (ver `.env.example`)

## Módulos planificados
- [ ] Autenticación (Firebase Auth)
- [ ] Dashboard personal
- [ ] Gestión de gastos con OCR
- [ ] Metas de ahorro
- [ ] Recomendaciones IA (Gemini)