import json
import os
import re
from typing import Any, Dict

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


def extract_json_from_text(text: str) -> Dict[str, Any]:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", text)

        if not match:
            raise GeminiServiceError(
                "La respuesta de Gemini no contiene JSON válido."
            )

        return json.loads(match.group(0))


async def generate_content_with_gemini(
    prompt: str,
    temperature: float = 0.3,
    max_output_tokens: int = 1400,
    response_mime_type: str = "application/json",
    model: str = DEFAULT_MODEL,
) -> Dict[str, Any]:
    if not prompt or not prompt.strip():
        raise GeminiServiceError("No se recibió un prompt válido.")

    api_key = get_gemini_api_key()
    url = GEMINI_API_URL.format(model=model)

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

    return {
        "exito": True,
        "modelo": model,
        "texto": text,
        "json": extract_json_from_text(text)
        if response_mime_type == "application/json"
        else None,
        "respuestaOriginal": response_data,
    }