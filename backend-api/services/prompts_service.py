import json
from typing import Any, Dict

VALID_CATEGORIES = [
    "ingresos",
    "gastos",
    "ahorro",
    "deudas",
    "flujo",
    "general",
]

VALID_LEVELS = [
    "positivo",
    "informativo",
    "advertencia",
    "riesgo",
]


def build_privacy_rules() -> str:
    return """
Reglas de privacidad y seguridad:
- Usa únicamente la información financiera enviada en el contexto.
- No solicites datos personales adicionales.
- No inventes ingresos, gastos, deudas, nombres, entidades ni fechas.
- No menciones UID, IDs de documentos, correos, teléfonos ni datos internos.
- No des asesoría de inversión, crédito ni productos financieros específicos.
- Indica cuando el análisis sea limitado por falta de datos.
- Recuerda que las conclusiones son aproximadas y dependen del historial registrado.
"""


def build_common_response_rules() -> str:
    return """
Instrucciones de respuesta:
- Escribe en español claro, natural y fácil de entender.
- Usa un tono útil, cercano y responsable.
- No menciones que eres una IA.
- No uses markdown.
- Responde únicamente con JSON válido.
- Evita frases genéricas.
- Relaciona la respuesta con los datos financieros recibidos.
"""


def build_financial_analysis_prompt(context: Dict[str, Any]) -> str:
    return f"""
Eres el asistente financiero de Monetra.

Tu tarea es analizar la información financiera del usuario para ayudarle a comprender mejor sus hábitos de consumo, ahorro, ingresos, deudas y flujo de dinero.

Objetivo:
Generar un análisis financiero personalizado, claro y comprensible, basado únicamente en los datos entregados.

{build_privacy_rules()}

{build_common_response_rules()}

La respuesta debe tener exactamente esta estructura JSON:

{{
  "resumenEjecutivo": "Texto breve de 2 a 4 frases.",
  "patronesDetectados": [
    {{
      "titulo": "Nombre del patrón detectado",
      "descripcion": "Explicación clara del patrón",
      "categoria": "ingresos | gastos | ahorro | deudas | flujo | general",
      "nivel": "positivo | informativo | advertencia | riesgo",
      "evidencia": "Dato financiero que respalda el patrón"
    }}
  ],
  "conclusiones": [
    "Conclusión clara y útil 1",
    "Conclusión clara y útil 2"
  ],
  "oportunidadesMejora": [
    "Oportunidad de mejora 1",
    "Oportunidad de mejora 2"
  ],
  "advertencias": [
    "Advertencia si los datos son insuficientes o si el análisis debe tomarse con cautela"
  ],
  "mensajeFinal": "Mensaje corto y motivador para el usuario."
}}

Categorías válidas:
{json.dumps(VALID_CATEGORIES, ensure_ascii=False)}

Niveles válidos:
{json.dumps(VALID_LEVELS, ensure_ascii=False)}

Contexto financiero del usuario:
{json.dumps(context, ensure_ascii=False, indent=2)}
"""


def build_recommendations_prompt(context: Dict[str, Any]) -> str:
    return f"""
Eres el asistente financiero de Monetra.

Tu tarea es generar recomendaciones financieras personalizadas, claras y accionables para un usuario joven.

Enfoca las recomendaciones en:
- ahorro,
- control de gastos,
- manejo de deudas,
- mejora del flujo neto,
- hábitos financieros saludables.

{build_privacy_rules()}

{build_common_response_rules()}

La respuesta debe tener exactamente esta estructura JSON:

{{
  "resumenGeneral": "Resumen breve sobre las recomendaciones generadas.",
  "recomendaciones": [
    {{
      "tipo": "ahorro | control_gastos | deudas | flujo_neto | habitos | general",
      "prioridad": "alta | media | baja",
      "titulo": "Título corto de la recomendación",
      "descripcion": "Explicación clara de la situación detectada",
      "accionSugerida": "Acción concreta que el usuario puede realizar",
      "motivo": "Razón basada en los datos financieros",
      "beneficioEsperado": "Beneficio que podría obtener el usuario",
      "metricaRelacionada": {{
        "nombre": "Nombre de la métrica",
        "valor": "Valor o dato usado como evidencia"
      }},
      "etiquetas": ["etiqueta1", "etiqueta2"]
    }}
  ],
  "mensajeFinal": "Mensaje corto y motivador para el usuario."
}}

Reglas:
- Genera máximo 5 recomendaciones.
- Si hay pocos datos, indícalo con claridad.
- Cada recomendación debe tener una acción sugerida concreta.
- Prioriza riesgos como gastos altos, ahorro bajo, deudas altas o flujo neto negativo.
- No recomiendes productos financieros específicos.

Contexto financiero del usuario:
{json.dumps(context, ensure_ascii=False, indent=2)}
"""


def build_predictions_prompt(context: Dict[str, Any]) -> str:
    return f"""
Eres el asistente financiero de Monetra.

Tu tarea es generar predicciones financieras claras y comprensibles para el usuario, usando únicamente el historial financiero y las estimaciones disponibles.

{build_privacy_rules()}

{build_common_response_rules()}

El usuario debe entender que las predicciones son aproximaciones basadas en datos históricos.

La respuesta debe tener exactamente esta estructura JSON:

{{
  "resumenPredictivo": "Resumen breve de la predicción financiera.",
  "horizonteAnalizado": "Descripción del período futuro estimado.",
  "predicciones": [
    {{
      "periodo": "Mes o período estimado",
      "gastoEstimado": 0,
      "rangoMinimo": 0,
      "rangoMaximo": 0,
      "interpretacion": "Explicación clara del resultado estimado",
      "nivelConfianza": "alta | media | baja",
      "categoriaPrincipalEsperada": "Categoría esperada o Sin datos",
      "advertencia": "Advertencia específica si aplica"
    }}
  ],
  "escenarios": {{
    "optimista": "Escenario con menor gasto estimado",
    "probable": "Escenario más probable",
    "preventivo": "Escenario de mayor gasto o de cuidado"
  }},
  "conclusiones": [
    "Conclusión útil 1",
    "Conclusión útil 2"
  ],
  "accionesSugeridas": [
    "Acción sugerida 1",
    "Acción sugerida 2"
  ],
  "advertencias": [
    "Advertencia general sobre la predicción"
  ],
  "mensajeFinal": "Mensaje corto y claro para el usuario."
}}

Reglas:
- Genera máximo 6 predicciones mensuales.
- Usa los rangos mínimo, probable y máximo cuando existan.
- Si la confianza es baja, dilo claramente.
- Incluye siempre una advertencia indicando que son aproximaciones.
- No inventes montos, fechas ni categorías.

Contexto financiero del usuario:
{json.dumps(context, ensure_ascii=False, indent=2)}
"""


def validate_prompt(prompt: str) -> Dict[str, Any]:
    if not prompt or not isinstance(prompt, str):
        raise ValueError("No se recibió un prompt válido.")

    if "Contexto financiero del usuario" not in prompt:
        raise ValueError("El prompt no incluye contexto financiero.")

    if "JSON" not in prompt and "json" not in prompt:
        raise ValueError("El prompt no especifica salida JSON.")

    return {
        "valido": True,
        "longitud": len(prompt),
        "mensaje": "Prompt válido.",
    }