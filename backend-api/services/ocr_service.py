import io
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import pytesseract
from fastapi import UploadFile
from PIL import Image, ImageOps

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


def clean_text(text: str) -> str:
    return (
        str(text or "")
        .replace("\r", "\n")
        .replace("\t", " ")
        .strip()
    )


def normalize_text(text: str) -> str:
    return (
        clean_text(text)
        .lower()
        .replace("á", "a")
        .replace("é", "e")
        .replace("í", "i")
        .replace("ó", "o")
        .replace("ú", "u")
        .replace("ñ", "n")
    )


def convert_amount_to_number(value: str) -> Optional[float]:
    if not value:
        return None

    cleaned = (
        str(value)
        .replace("COP", "")
        .replace("$", "")
        .replace(" ", "")
    )

    cleaned = re.sub(r"[^\d.,]", "", cleaned)

    if not cleaned:
        return None

    has_dot = "." in cleaned
    has_comma = "," in cleaned

    if has_dot and has_comma:
        last_dot = cleaned.rfind(".")
        last_comma = cleaned.rfind(",")

        if last_dot > last_comma:
            cleaned = cleaned.replace(",", "")
        else:
            cleaned = cleaned.replace(".", "").replace(",", ".")
    elif has_comma:
        parts = cleaned.split(",")

        if len(parts) == 2 and len(parts[1]) <= 2:
            cleaned = cleaned.replace(",", ".")
        else:
            cleaned = cleaned.replace(",", "")
    elif has_dot:
        parts = cleaned.split(".")

        if len(parts) > 2 or len(parts[-1]) == 3:
            cleaned = cleaned.replace(".", "")

    try:
        amount = float(cleaned)

        return amount if amount > 0 else None
    except ValueError:
        return None


def extract_amount(text: str) -> Optional[float]:
    lines = [line.strip() for line in text.splitlines() if line.strip()]

    keywords = [
        "total a pagar",
        "valor total",
        "total compra",
        "total",
        "importe total",
        "monto total",
        "valor pagado",
    ]

    for line in lines:
        normalized = normalize_text(line)

        if any(keyword in normalized for keyword in keywords):
            possible_amounts = re.findall(r"(?:COP|\$)?\s*\d[\d.,]*", line, re.I)

            amounts = [
                amount
                for amount in (convert_amount_to_number(item) for item in possible_amounts)
                if amount is not None and amount >= 100
            ]

            if amounts:
                return max(amounts)

    all_amounts = re.findall(r"(?:COP|\$)?\s*\d[\d.,]{2,}", text, re.I)

    amounts = [
        amount
        for amount in (convert_amount_to_number(item) for item in all_amounts)
        if amount is not None and amount >= 100
    ]

    return max(amounts) if amounts else None


def format_date_iso(year: int, month: int, day: int) -> Optional[str]:
    try:
        date = datetime(year, month, day)

        return date.strftime("%Y-%m-%d")
    except ValueError:
        return None


def extract_date(text: str) -> Optional[str]:
    patterns = [
        r"(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})",
        r"(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})",
    ]

    for pattern in patterns:
        match = re.search(pattern, text)

        if not match:
            continue

        groups = match.groups()

        if len(groups[0]) == 4:
            return format_date_iso(
                int(groups[0]),
                int(groups[1]),
                int(groups[2]),
            )

        year = int(groups[2])

        if year < 100:
            year += 2000

        return format_date_iso(
            year,
            int(groups[1]),
            int(groups[0]),
        )

    return None


def extract_store(text: str) -> Optional[str]:
    ignored_words = [
        "factura",
        "nit",
        "fecha",
        "total",
        "iva",
        "subtotal",
        "resolucion",
        "autorizacion",
    ]

    lines = [line.strip() for line in text.splitlines() if line.strip()]

    for line in lines:
        normalized = normalize_text(line)

        if len(line) < 3:
            continue

        if any(word in normalized for word in ignored_words):
            continue

        if re.fullmatch(r"\d+", line):
            continue

        return line[:80]

    return None


def suggest_category(text: str) -> str:
    normalized = normalize_text(text)

    categories = [
        (
            "Alimentación",
            [
                "restaurante",
                "comida",
                "almuerzo",
                "cafe",
                "panaderia",
                "mercado",
                "supermercado",
            ],
        ),
        (
            "Transporte",
            [
                "taxi",
                "uber",
                "didi",
                "gasolina",
                "combustible",
                "parqueadero",
                "peaje",
            ],
        ),
        (
            "Salud",
            [
                "farmacia",
                "drogueria",
                "medicamento",
                "clinica",
                "salud",
            ],
        ),
        (
            "Educación",
            [
                "universidad",
                "colegio",
                "libro",
                "curso",
                "papeleria",
            ],
        ),
        (
            "Ocio",
            [
                "cine",
                "bar",
                "juego",
                "entretenimiento",
                "discoteca",
            ],
        ),
    ]

    for category, keywords in categories:
        if any(keyword in normalized for keyword in keywords):
            return category

    return "Sin categoría"


def build_description(text: str, store: Optional[str]) -> str:
    if store:
        return f"Compra en {store}"

    return "Gasto registrado por OCR"


def get_ocr_confidence(image: Image.Image) -> float:
    try:
        data = pytesseract.image_to_data(
            image,
            lang="spa+eng",
            output_type=pytesseract.Output.DICT,
        )

        confidences: List[float] = []

        for value in data.get("conf", []):
            try:
                confidence = float(value)

                if confidence >= 0:
                    confidences.append(confidence)
            except ValueError:
                continue

        if not confidences:
            return 0.0

        return round(sum(confidences) / len(confidences), 2)
    except Exception:
        return 0.0


def preprocess_image(image: Image.Image) -> Image.Image:
    image = ImageOps.exif_transpose(image)
    image = image.convert("L")
    image = ImageOps.autocontrast(image)

    return image


async def validate_image_file(file: UploadFile) -> bytes:
    if not file:
        raise OCRServiceError("No se recibió ninguna imagen para procesar.")

    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise OCRServiceError("El archivo debe ser una imagen JPG, PNG o WEBP.")

    content = await file.read()

    size_mb = len(content) / 1024 / 1024

    if size_mb > MAX_IMAGE_SIZE_MB:
        raise OCRServiceError(f"La imagen no debe superar {MAX_IMAGE_SIZE_MB} MB.")

    if not content:
        raise OCRServiceError("El archivo recibido está vacío.")

    return content


def extract_receipt_data(text: str) -> Dict[str, Any]:
    cleaned_text = clean_text(text)

    if not cleaned_text or len(cleaned_text) < 8:
        raise OCRServiceError(
            "No fue posible reconocer texto útil en el comprobante."
        )

    amount = extract_amount(cleaned_text)
    date = extract_date(cleaned_text)
    store = extract_store(cleaned_text)
    description = build_description(cleaned_text, store)
    category = suggest_category(cleaned_text)

    warnings = []

    if amount is None:
        warnings.append("No se pudo identificar el monto automáticamente.")

    if date is None:
        warnings.append("No se pudo identificar la fecha automáticamente.")

    if store is None:
        warnings.append("No se pudo identificar claramente el comercio.")

    return {
        "tipo": "gasto",
        "monto": amount,
        "fecha": date,
        "comercio": store,
        "descripcion": description,
        "categoria": category,
        "origen": "ocr",
        "requiereRevision": True,
        "camposDetectados": {
            "monto": amount is not None,
            "fecha": date is not None,
            "comercio": store is not None,
            "descripcion": bool(description),
        },
        "advertencias": warnings,
        "textoOriginal": cleaned_text,
    }


async def process_receipt_image(file: UploadFile) -> Dict[str, Any]:
    content = await validate_image_file(file)

    try:
        image = Image.open(io.BytesIO(content))
        image = preprocess_image(image)
    except Exception as error:
        raise OCRServiceError(
            "No fue posible abrir la imagen. Verifica que el archivo sea válido."
        ) from error

    try:
        text = pytesseract.image_to_string(image, lang="spa+eng")
        confidence = get_ocr_confidence(image)
        data = extract_receipt_data(text)

        return {
            "exito": True,
            "mensaje": "Documento procesado correctamente.",
            "archivo": {
                "nombre": file.filename,
                "tipo": file.content_type,
                "tamanoBytes": len(content),
            },
            "confianza": confidence,
            "textoExtraido": data["textoOriginal"],
            "datosExtraidos": data,
            "requiereRevision": True,
            "advertencias": data["advertencias"],
            "procesadoEn": now_iso(),
        }
    except OCRServiceError:
        raise
    except pytesseract.TesseractNotFoundError as error:
        raise OCRServiceError(
            "Tesseract OCR no está instalado o no está configurado en el sistema."
        ) from error
    except Exception as error:
        raise OCRServiceError(
            "No fue posible procesar el documento con OCR."
        ) from error