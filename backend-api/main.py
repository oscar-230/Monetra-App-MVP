from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

from routers.ocr_router import router as ocr_router
# from routers.ai_router import router as ai_router  # descomenta cuando lo implementes

app = FastAPI(
    title="FinApp Backend API",
    description="API para gestión de gastos con OCR e IA",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:5173")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ocr_router)
# app.include_router(ai_router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}