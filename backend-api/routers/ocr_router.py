from fastapi import APIRouter, File, HTTPException, UploadFile

from services.ocr_service import OCRServiceError, process_receipt_image

router = APIRouter()


@router.post("/process")
async def process_receipt(file: UploadFile = File(...)):
    try:
        return await process_receipt_image(file)
    except OCRServiceError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail="Error interno procesando OCR.",
        ) from error