
from fastapi import APIRouter, HTTPException, Query, Request

from schemas.savings_goal_schemas import SavingsGoalCreate, SavingsGoalUpdate
from services.firebase_service import get_authenticated_uid
from services.savings_goal_validation_service import (
    SavingsGoalValidationError,
    validate_savings_goal_create,
    validate_savings_goal_update,
)
from services.savings_goals_service import (
    SavingsGoalServiceError,
    create_goal,
    delete_goal,
    get_goal,
    list_goals,
    update_goal,
)

router = APIRouter()


@router.post("/")
def create_savings_goal(payload: SavingsGoalCreate, request: Request):
    
    uid = get_authenticated_uid(request)

    try:
        validate_savings_goal_create(payload)
    except SavingsGoalValidationError as error:
        raise HTTPException(
            status_code=422,
            detail={
                "mensaje": "Los datos de la meta no son válidos.",
                "errores": error.errors,
            },
        ) from error

    try:
        return create_goal(uid, payload)
    except SavingsGoalServiceError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.get("/")
def list_savings_goals(
    request: Request,
    soloActivas: bool = Query(default=False),
):
    
    uid = get_authenticated_uid(request)

    try:
        metas = list_goals(uid, solo_activas=soloActivas)
        return {
            "uid": uid,
            "total": len(metas),
            "metas": metas,
        }
    except SavingsGoalServiceError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.get("/{goal_id}")
def get_savings_goal(goal_id: str, request: Request):
    """Retorna una meta específica del usuario."""
    uid = get_authenticated_uid(request)

    try:
        return get_goal(uid, goal_id)
    except SavingsGoalServiceError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@router.put("/{goal_id}")
def update_savings_goal(goal_id: str, payload: SavingsGoalUpdate, request: Request):
    """Actualiza los campos enviados de una meta existente."""
    uid = get_authenticated_uid(request)

    try:
        validate_savings_goal_update(payload)
    except SavingsGoalValidationError as error:
        raise HTTPException(
            status_code=422,
            detail={
                "mensaje": "Los datos enviados no son válidos.",
                "errores": error.errors,
            },
        ) from error

    try:
        return update_goal(uid, goal_id, payload)
    except SavingsGoalServiceError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.delete("/{goal_id}")
def delete_savings_goal(
    goal_id: str,
    request: Request,
    confirmar: bool = Query(default=False),
):
    
    uid = get_authenticated_uid(request)

    if not confirmar:
        raise HTTPException(
            status_code=400,
            detail="Debes confirmar la eliminación usando ?confirmar=true.",
        )

    try:
        return delete_goal(uid, goal_id)
    except SavingsGoalServiceError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error