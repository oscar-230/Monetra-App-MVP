import json
import os
import re
from typing import Any, Dict, Optional

import httpx
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
DEFAULT_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
DEFAULT_TIMEOUT_SECONDS = 25


class GeminiServiceError(Exception):
    pass


def get_gemini_api_key() -> str:
    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key or api_key == "tu_api_key_de_google_ai_studio_aqui":
        raise GeminiServiceError(
            "No se encontró GEMINI_API_KEY. Configúrala en backend-api/.env."
        )

    return api_key


def extract_text_from_gemini_response(response_data: Dict[str, Any]) -> str:
    candidates = response_data.get("candidates", [])

    if not candidates:
        raise GeminiServiceError("Gemini no devolvió candidatos de respuesta.")

    parts = candidates[0].get("content", {}).get("parts", [])

    text = "\n".join(part.get("text", "") for part in parts).strip()

    if not text:
        raise GeminiServiceError("Gemini no devolvió texto en la respuesta.")

    return text


def clean_json_text(text: str) -> str:
    cleaned = str(text or "").strip()

    cleaned = re.sub(r"^```json", "", cleaned, flags=re.IGNORECASE).strip()
    cleaned = re.sub(r"^```", "", cleaned).strip()
    cleaned = re.sub(r"```$", "", cleaned).strip()

    return cleaned


def try_extract_json_from_text(text: str) -> Optional[Dict[str, Any]]:
    cleaned = clean_json_text(text)

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{[\s\S]*\}", cleaned)

    if not match:
        return None

    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError:
        return None


def extract_json_from_text(text: str) -> Dict[str, Any]:
    parsed = try_extract_json_from_text(text)

    if parsed is None:
        raise GeminiServiceError(
            "La respuesta de Gemini no contiene JSON válido."
        )

    return parsed


async def call_gemini_generate_content(
    payload: Dict[str, Any],
    model: str = DEFAULT_MODEL,
    strict_json: bool = True,
) -> Dict[str, Any]:
    api_key = get_gemini_api_key()
    url = GEMINI_API_URL.format(model=model)

    async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT_SECONDS) as client:
        response = await client.post(
            url,
            params={"key": api_key},
            headers={"Content-Type": "application/json"},
            json=payload,
        )

    response_data = response.json()

    if response.status_code >= 400:
        message = response_data.get("error", {}).get(
            "message",
            "No fue posible comunicarse con Gemini.",
        )

        raise GeminiServiceError(message)

    text = extract_text_from_gemini_response(response_data)

    wants_json = (
        payload.get("generationConfig", {}).get("responseMimeType")
        == "application/json"
    )

    parsed_json = None
    json_parse_error = None

    if wants_json:
        parsed_json = try_extract_json_from_text(text)

        if parsed_json is None:
            json_parse_error = "La respuesta de Gemini no contiene JSON válido."

            if strict_json:
                raise GeminiServiceError(json_parse_error)

    return {
        "exito": True,
        "modelo": model,
        "texto": text,
        "json": parsed_json,
        "jsonParseError": json_parse_error,
        "respuestaOriginal": response_data,
    }


async def generate_content_with_gemini(
    prompt: str,
    temperature: float = 0.3,
    max_output_tokens: int = 1400,
    response_mime_type: str = "application/json",
    model: str = DEFAULT_MODEL,
) -> Dict[str, Any]:
    if not prompt or not prompt.strip():
        raise GeminiServiceError("No se recibió un prompt válido.")

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {
                        "text": prompt,
                    }
                ],
            }
        ],
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": max_output_tokens,
            "responseMimeType": response_mime_type,
        },
    }

    return await call_gemini_generate_content(
        payload=payload,
        model=model,
        strict_json=True,
    )


async def generate_content_with_gemini_image(
    *,
    prompt: str,
    image_base64: str,
    mime_type: str,
    temperature: float = 0.2,
    max_output_tokens: int = 1400,
    response_mime_type: str = "application/json",
    model: str = DEFAULT_MODEL,
) -> Dict[str, Any]:
    if not prompt or not prompt.strip():
        raise GeminiServiceError("No se recibió un prompt válido para procesar la imagen.")

    if not image_base64:
        raise GeminiServiceError("No se recibió imagen en base64.")

    if not mime_type:
        raise GeminiServiceError("No se recibió el tipo MIME de la imagen.")

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {
                        "text": prompt,
                    },
                    {
                        "inline_data": {
                            "mime_type": mime_type,
                            "data": image_base64,
                        }
                    },
                ],
            }
        ],
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": max_output_tokens,
            "responseMimeType": response_mime_type,
        },
    }

    return await call_gemini_generate_content(
        payload=payload,
        model=model,
        strict_json=False,
    )