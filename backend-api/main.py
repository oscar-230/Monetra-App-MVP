import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.ai_router import router as ai_router
from routers.movements_router import router as movements_router
from routers.ocr_router import router as ocr_router
from routers.predictions_router import router as predictions_router
from routers.reports_router import router as reports_router

load_dotenv()

app = FastAPI(
    title="Monetra Backend API",
    description="API backend para movimientos, reportes, IA, OCR, recomendaciones y predicciones financieras.",
    version="1.0.0",
)

frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        frontend_url,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(movements_router, prefix="/api/movements", tags=["Movimientos"])
app.include_router(reports_router, prefix="/api/reports", tags=["Reportes"])
app.include_router(predictions_router, prefix="/api/predictions", tags=["Predicciones"])
app.include_router(ai_router, prefix="/api/ai", tags=["IA Financiera"])
app.include_router(ocr_router, prefix="/api/ocr", tags=["OCR"])


@app.get("/")
def root():
    return {
        "message": "Monetra Backend API funcionando correctamente",
        "docs": "/docs",
        "health": "/api/health",
    }


@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "service": "Monetra Backend API",
        "version": "1.0.0",
    }