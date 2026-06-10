from fastapi import APIRouter, HTTPException

from schemas.financial_ai_schemas import FinancialAIRequest
from services.financial_ai_service import (
    generate_financial_analysis,
    generate_predictions,
    generate_recommendations,
)

router = APIRouter()


@router.post("/analysis")
async def financial_analysis(request: FinancialAIRequest):
    try:
        return await generate_financial_analysis(request)
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error


@router.post("/recommendations")
async def financial_recommendations(request: FinancialAIRequest):
    try:
        return await generate_recommendations(request)
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error


@router.post("/predictions")
async def financial_predictions(request: FinancialAIRequest):
    try:
        return await generate_predictions(request)
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error