import os
from google import genai
from google.genai import types
import json
import re

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

client = genai.Client(api_key=GEMINI_API_KEY)

EXTRACT_INVOICE_PROMPT = """
Eres un asistente especializado en análisis de facturas y comprobantes de pago.

A continuación recibirás el texto extraído de una factura o comprobante mediante OCR.
Tu tarea es identificar y estructurar la información relevante.

Texto del documento:
{text}

Extrae la siguiente información y responde ÚNICAMENTE con un JSON válido, sin texto adicional:
{{
    "monto_total": <número decimal o null si no se encuentra>,
    "moneda": <"COP", "USD", "EUR" u otra moneda identificada, o null>,
    "fecha": <"YYYY-MM-DD" si se puede inferir, o null>,
    "descripcion": <descripción breve del gasto o comercio, o null>,
    "proveedor": <nombre del comercio o empresa emisora, o null>,
    "numero_factura": <número de factura/comprobante, o null>,
    "impuesto": <monto del impuesto/IVA como número, o null>,
    "confianza": <"alta", "media" o "baja" según la calidad del texto reconocido>,
    "notas": <observaciones relevantes o advertencias, o null>
}}

Reglas:
- Si el texto es ilegible o no corresponde a una factura, devuelve confianza "baja" y null en los campos.
- Para montos, devuelve solo el número sin símbolos ni puntos de miles (ej: 150000.00).
- Si hay múltiples montos, usa el total final.
"""


async def analyze_invoice_text(ocr_text: str) -> dict:
    """
    Usa Gemini para estructurar los datos extraídos del OCR.

    Retorna:
        {
            "success": bool,
            "data": dict | None,   # campos estructurados de la factura
            "error": str | None
        }
    """
    if not ocr_text or not ocr_text.strip():
        return {
            "success": False,
            "data": None,
            "error": "No hay texto para analizar"
        }

    try:
        prompt = EXTRACT_INVOICE_PROMPT.format(text=ocr_text[:4000])  # Limitar tokens

        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.1,   # Bajo para respuestas consistentes/deterministas
                max_output_tokens=512,
            ),
        )

        raw_text = response.text.strip()

        # Limpiar posibles markdown fences que Gemini a veces añade
        raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text)
        raw_text = re.sub(r"\s*```$", "", raw_text)

        invoice_data = json.loads(raw_text)

        return {"success": True, "data": invoice_data, "error": None}

    except json.JSONDecodeError:
        return {
            "success": False,
            "data": None,
            "error": "No se pudo interpretar la respuesta del análisis"
        }
    except Exception as e:
        return {
            "success": False,
            "data": None,
            "error": f"Error al analizar el documento: {str(e)}"
        }