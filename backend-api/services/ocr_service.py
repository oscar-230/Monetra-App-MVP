import base64
import re
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

Analiza la imagen de una factura, recibo o comprobante y extrae información financiera útil para registrar un gasto automáticamente.

Usa únicamente la información visible en la imagen.
No inventes datos.
Si no puedes identificar un campo, usa null.
Responde únicamente con JSON válido, sin markdown y sin texto adicional.

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

    if isinstance(value, (int, float)):
        amount = float(value)
        return amount if amount > 0 else None

    text = str(value)
    text = text.replace("COP", "")
    text = text.replace("$", "")
    text = text.replace(" ", "")
    text = re.sub(r"[^\d.,]", "", text)

    if not text:
        return None

    has_dot = "." in text
    has_comma = "," in text

    if has_dot and has_comma:
        last_dot = text.rfind(".")
        last_comma = text.rfind(",")

        if last_dot > last_comma:
            text = text.replace(",", "")
        else:
            text = text.replace(".", "").replace(",", ".")
    elif has_comma:
        parts = text.split(",")

        if len(parts) == 2 and len(parts[1]) <= 2:
            text = text.replace(",", ".")
        else:
            text = text.replace(",", "")
    elif has_dot:
        parts = text.split(".")

        if len(parts) > 2 or len(parts[-1]) == 3:
            text = text.replace(".", "")

    try:
        amount = float(text)
        return amount if amount > 0 else None
    except ValueError:
        return None


def normalize_text(value: Any) -> Optional[str]:
    if value is None:
        return None

    text = str(value).strip()

    return text if text else None


def extract_amount_from_text(text: str) -> Optional[float]:
    possible_amounts = re.findall(r"(?:COP|\$)?\s*\d[\d.,]{2,}", text, re.I)

    amounts = [
        amount
        for amount in (normalize_amount(item) for item in possible_amounts)
        if amount is not None and amount >= 100
    ]

    return max(amounts) if amounts else None


def extract_date_from_text(text: str) -> Optional[str]:
    patterns = [
        r"(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})",
        r"(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})",
    ]

    for pattern in patterns:
        match = re.search(pattern, text)

        if not match:
            continue

        groups = match.groups()

        try:
            if len(groups[0]) == 4:
                date = datetime(
                    int(groups[0]),
                    int(groups[1]),
                    int(groups[2]),
                )
            else:
                year = int(groups[2])

                if year < 100:
                    year += 2000

                date = datetime(
                    year,
                    int(groups[1]),
                    int(groups[0]),
                )

            return date.strftime("%Y-%m-%d")
        except ValueError:
            continue

    return None


def suggest_category(text: str) -> str:
    normalized = str(text or "").lower()

    categories = [
        ("Alimentación", ["restaurante", "comida", "mercado", "supermercado", "panaderia", "cafe"]),
        ("Transporte", ["taxi", "uber", "didi", "gasolina", "combustible", "parqueadero", "peaje"]),
        ("Salud", ["farmacia", "drogueria", "medicamento", "clinica", "salud"]),
        ("Educación", ["universidad", "colegio", "libro", "curso", "papeleria"]),
        ("Ocio", ["cine", "bar", "juego", "entretenimiento", "discoteca"]),
        ("Servicios", ["servicio", "energia", "agua", "internet", "telefono"]),
    ]

    for category, keywords in categories:
        if any(keyword in normalized for keyword in keywords):
            return category

    return "Sin categoría"


def normalize_detected_fields(fields: Dict[str, Any]) -> Dict[str, bool]:
    return {
        "monto": normalize_bool(fields.get("monto")),
        "fecha": normalize_bool(fields.get("fecha")),
        "comercio": normalize_bool(fields.get("comercio")),
        "descripcion": normalize_bool(fields.get("descripcion")),
    }


def build_fallback_data_from_text(raw_text: str) -> Dict[str, Any]:
    amount = extract_amount_from_text(raw_text)
    date = extract_date_from_text(raw_text)
    category = suggest_category(raw_text)

    warnings = [
        "Gemini no devolvió JSON válido; se generó una extracción básica desde el texto recibido."
    ]

    if amount is None:
        warnings.append("No se pudo identificar el monto automáticamente.")

    if not date:
        warnings.append("No se pudo identificar la fecha automáticamente.")

    return {
        "tipo": "gasto",
        "monto": amount,
        "fecha": date,
        "comercio": None,
        "descripcion": "Gasto registrado por OCR",
        "categoria": category,
        "moneda": "COP",
        "origen": "ocr",
        "requiereRevision": True,
        "camposDetectados": {
            "monto": amount is not None,
            "fecha": date is not None,
            "comercio": False,
            "descripcion": True,
        },
        "advertencias": warnings,
        "textoOriginal": raw_text,
    }


def normalize_ocr_response(response_json: Dict[str, Any], raw_text: str = "") -> Dict[str, Any]:
    if not response_json:
        return build_fallback_data_from_text(raw_text)

    extracted_text = normalize_text(response_json.get("textoExtraido")) or raw_text or ""

    data = response_json.get("datosExtraidos") or {}

    amount = normalize_amount(data.get("monto"))
    date = normalize_text(data.get("fecha"))
    store = normalize_text(data.get("comercio"))

    if store:
        default_description = f"Compra en {store}"
    else:
        default_description = "Gasto registrado por OCR"

    description = normalize_text(data.get("descripcion")) or default_description
    category = normalize_text(data.get("categoria")) or suggest_category(extracted_text)

    warnings = data.get("advertencias") or []

    if not isinstance(warnings, list):
        warnings = [str(warnings)]

    detected_fields = normalize_detected_fields(
        data.get("camposDetectados") or {}
    )

    if amount is None:
        amount = extract_amount_from_text(extracted_text)
        detected_fields["monto"] = amount is not None

    if not date:
        date = extract_date_from_text(extracted_text)
        detected_fields["fecha"] = date is not None

    if not store:
        detected_fields["comercio"] = False

    if not description:
        detected_fields["descripcion"] = False
        description = "Gasto registrado por OCR"
    else:
        detected_fields["descripcion"] = True

    if amount is None:
        warnings.append("No se pudo identificar el monto automáticamente.")

    if not date:
        warnings.append("No se pudo identificar la fecha automáticamente.")

    if not store:
        warnings.append("No se pudo identificar claramente el comercio.")

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
        "textoOriginal": extracted_text,
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

        response_json = gemini_response.get("json")
        raw_text = gemini_response.get("texto") or ""

        data = normalize_ocr_response(response_json, raw_text)

        advertencias = data["advertencias"]

        if gemini_response.get("jsonParseError"):
            advertencias.append(gemini_response["jsonParseError"])

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
            "advertencias": list(dict.fromkeys(advertencias)),
            "procesadoEn": now_iso(),
        }
    except GeminiServiceError as error:
        raise OCRServiceError(
            f"No fue posible procesar el documento con Gemini OCR: {str(error)}"
        ) from error
    except Exception as error:
        raise OCRServiceError(
            f"No fue posible procesar el documento con OCR inteligente: {str(error)}"
        ) from error