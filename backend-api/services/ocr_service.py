import base64
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import UploadFile

from services.gemini_service import (
    GeminiServiceError,
    generate_content_with_gemini_image,
)

ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
}

MAX_IMAGE_SIZE_MB = 10


class OCRServiceError(Exception):
    pass


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def validate_image_file(file: UploadFile) -> bytes:
    if not file:
        raise OCRServiceError("No se recibió ninguna imagen para procesar.")

    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise OCRServiceError("El archivo debe ser una imagen JPG, PNG o WEBP.")

    content = await file.read()

    if not content:
        raise OCRServiceError("El archivo recibido está vacío.")

    size_mb = len(content) / 1024 / 1024

    if size_mb > MAX_IMAGE_SIZE_MB:
        raise OCRServiceError(f"La imagen no debe superar {MAX_IMAGE_SIZE_MB} MB.")

    return content


def build_receipt_ocr_prompt() -> str:
    return """
Eres el módulo OCR inteligente de Monetra.

Tu tarea es analizar la imagen de una factura, recibo o comprobante y extraer información financiera útil para registrar un gasto automáticamente.

Usa únicamente la información visible en la imagen.
No inventes datos.
Si no puedes identificar un campo, usa null.
No incluyas markdown.
Responde únicamente con JSON válido.

La estructura exacta debe ser:

{
  "textoExtraido": "Texto completo reconocido en la imagen, lo más fiel posible.",
  "datosExtraidos": {
    "tipo": "gasto",
    "monto": 0,
    "fecha": "YYYY-MM-DD o null",
    "comercio": "Nombre del comercio o null",
    "descripcion": "Descripción breve del gasto",
    "categoria": "Alimentación | Transporte | Salud | Educación | Ocio | Vivienda | Servicios | Sin categoría",
    "moneda": "COP",
    "origen": "ocr",
    "requiereRevision": true,
    "camposDetectados": {
      "monto": true,
      "fecha": true,
      "comercio": true,
      "descripcion": true
    },
    "advertencias": [
      "Lista de advertencias si algún dato no pudo detectarse o si la imagen es poco clara"
    ]
  }
}

Reglas:
- El monto debe ser numérico, sin símbolos de moneda ni separadores.
- Si hay varios montos, prioriza total, total a pagar, valor total o importe total.
- La fecha debe ir en formato YYYY-MM-DD cuando sea posible.
- La descripción debe ser corta, por ejemplo: "Compra en Supermercado X".
- La categoría debe inferirse solo si hay señales claras en el texto.
- Siempre marca requiereRevision como true.
"""


def normalize_bool(value: Any) -> bool:
    return bool(value)


def normalize_amount(value: Any) -> Optional[float]:
    if value is None:
        return None

    try:
        amount = float(value)
        return amount if amount > 0 else None
    except (TypeError, ValueError):
        return None


def normalize_text(value: Any) -> Optional[str]:
    if value is None:
        return None

    text = str(value).strip()

    return text if text else None


def normalize_detected_fields(fields: Dict[str, Any]) -> Dict[str, bool]:
    return {
        "monto": normalize_bool(fields.get("monto")),
        "fecha": normalize_bool(fields.get("fecha")),
        "comercio": normalize_bool(fields.get("comercio")),
        "descripcion": normalize_bool(fields.get("descripcion")),
    }


def normalize_ocr_response(response_json: Dict[str, Any]) -> Dict[str, Any]:
    raw_text = normalize_text(response_json.get("textoExtraido")) or ""

    data = response_json.get("datosExtraidos") or {}

    amount = normalize_amount(data.get("monto"))
    date = normalize_text(data.get("fecha"))
    store = normalize_text(data.get("comercio"))
    description = (
        normalize_text(data.get("descripcion"))
        or f"Compra en {store}"
        if store
        else "Gasto registrado por OCR"
    )

    category = normalize_text(data.get("categoria")) or "Sin categoría"

    warnings = data.get("advertencias") or []

    if not isinstance(warnings, list):
        warnings = [str(warnings)]

    detected_fields = normalize_detected_fields(
        data.get("camposDetectados") or {}
    )

    if amount is None:
        detected_fields["monto"] = False
        warnings.append("No se pudo identificar el monto automáticamente.")

    if not date:
        detected_fields["fecha"] = False
        warnings.append("No se pudo identificar la fecha automáticamente.")

    if not store:
        detected_fields["comercio"] = False
        warnings.append("No se pudo identificar claramente el comercio.")

    if not description:
        detected_fields["descripcion"] = False
        description = "Gasto registrado por OCR"

    return {
        "tipo": "gasto",
        "monto": amount,
        "fecha": date,
        "comercio": store,
        "descripcion": description,
        "categoria": category,
        "moneda": "COP",
        "origen": "ocr",
        "requiereRevision": True,
        "camposDetectados": detected_fields,
        "advertencias": list(dict.fromkeys(warnings)),
        "textoOriginal": raw_text,
    }


async def process_receipt_image(file: UploadFile) -> Dict[str, Any]:
    content = await validate_image_file(file)

    image_base64 = base64.b64encode(content).decode("utf-8")

    prompt = build_receipt_ocr_prompt()

    try:
        gemini_response = await generate_content_with_gemini_image(
            prompt=prompt,
            image_base64=image_base64,
            mime_type=file.content_type,
            temperature=0.2,
            max_output_tokens=1600,
            response_mime_type="application/json",
        )

        response_json = gemini_response.get("json") or {}

        data = normalize_ocr_response(response_json)

        return {
            "exito": True,
            "mensaje": "Documento procesado correctamente con OCR inteligente.",
            "motor": "gemini-vision",
            "modelo": gemini_response.get("modelo"),
            "archivo": {
                "nombre": file.filename,
                "tipo": file.content_type,
                "tamanoBytes": len(content),
            },
            "confianza": None,
            "textoExtraido": data["textoOriginal"],
            "datosExtraidos": data,
            "requiereRevision": True,
            "advertencias": data["advertencias"],
            "procesadoEn": now_iso(),
        }
    except GeminiServiceError as error:
        raise OCRServiceError(
            f"No fue posible procesar el documento con Gemini OCR: {str(error)}"
        ) from error
    except Exception as error:
        raise OCRServiceError(
            "No fue posible procesar el documento con OCR inteligente."
        ) from error