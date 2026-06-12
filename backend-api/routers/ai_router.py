from fastapi import APIRouter, HTTPException, Request

from schemas.financial_ai_schemas import FinancialAIRequest
from services.financial_ai_service import (
    generate_financial_analysis,
    generate_predictions,
    generate_recommendations,
)

from services.firebase_service import get_authenticated_uid
from services.recommendations_storage_service import (
     RecommendationStorageError,
     delete_recommendation,
     get_recommendation,
     list_recommendations,
     save_recommendation,
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
    
 
@router.post("/recommendations/save")
async def financial_recommendations_save(request: FinancialAIRequest, http_request: Request):
    """
    Genera recomendaciones financieras con IA y las almacena en Firestore
    asociadas al usuario autenticado.
 
    Retorna tanto el resultado generado como la confirmación de almacenamiento.
    """
    uid = get_authenticated_uid(http_request)
 
    try:
        recommendation_response = await generate_recommendations(request)
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error
 
    try:
        storage_result = save_recommendation(
            uid,
            recommendation_response,
            periodo=request.periodo,
        )
    except RecommendationStorageError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
 
    return {
        **recommendation_response,
        "almacenamiento": storage_result,
    }
 
@router.get("/recommendations/history")
def financial_recommendations_history(
    request: Request,
    limite: int = 20,
):
    """
    Retorna el historial de recomendaciones almacenadas del usuario,
    de la más reciente a la más antigua.
    """
    uid = get_authenticated_uid(request)
 
    recomendaciones = list_recommendations(uid, limit_value=limite)
 
    return {
        "uid": uid,
        "total": len(recomendaciones),
        "recomendaciones": recomendaciones,
    }
 
 
@router.get("/recommendations/history/{recommendation_id}")
def financial_recommendation_detail(recommendation_id: str, request: Request):
    """Retorna una recomendación almacenada específica."""
    uid = get_authenticated_uid(request)
 
    try:
        return get_recommendation(uid, recommendation_id)
    except RecommendationStorageError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
 
 
@router.delete("/recommendations/history/{recommendation_id}")
def financial_recommendation_delete(recommendation_id: str, request: Request):
    """Elimina una recomendación almacenada del usuario."""
    uid = get_authenticated_uid(request)
 
    try:
        return delete_recommendation(uid, recommendation_id)
    except RecommendationStorageError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error