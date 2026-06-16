from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from firebase_admin import firestore

from services.firebase_service import get_firestore_client


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_monitoring_collection():
    db = get_firestore_client()
    return db.collection("ai_monitoring")


def register_ai_request(
    uid: str,
    tipo: str,                    # "analysis" | "recommendations" | "predictions" | "ocr"
    modelo: str,                  # "llama-3.1-8b-instant" | "analisis_local" | etc.
    generado_por_llm: bool,
    tiempo_respuesta_ms: int,
    estado: str,                  # "generado" | "sin_datos" | "generado_con_respaldo"
    advertencias: Optional[List[str]] = None,
) -> None:
    """
    Registra en Firestore cada solicitud hecha al servicio de IA.
    Se llama desde ai_router después de cada respuesta exitosa.
    Es silencioso — nunca interrumpe el flujo principal si falla.
    """
    try:
        collection_ref = get_monitoring_collection()

        document_data = {
            "uid": uid,
            "tipo": tipo,
            "modelo": modelo,
            "generadoPorLLM": generado_por_llm,
            "tiempoRespuestaMs": tiempo_respuesta_ms,
            "estado": estado,
            "advertencias": advertencias or [],
            "fecha": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "creadoEn": firestore.SERVER_TIMESTAMP,
        }

        collection_ref.document().set(document_data)

    except Exception:
        # El monitoreo nunca debe romper el flujo principal
        pass


def get_monitoring_stats(
    fecha_inicio: Optional[str] = None,
    fecha_fin: Optional[str] = None,
    limit_value: int = 500,
) -> Dict[str, Any]:
    """
    Consulta métricas de uso del servicio de IA.
    Para el administrador vía GET /api/monitoring/stats
    """
    collection_ref = get_monitoring_collection()

    query = collection_ref.order_by(
        "creadoEn", direction=firestore.Query.DESCENDING
    ).limit(limit_value)

    documents = list(query.stream())
    records = [doc.to_dict() for doc in documents]

    # Filtrar por fecha si se especifica
    if fecha_inicio:
        records = [r for r in records if r.get("fecha", "") >= fecha_inicio]
    if fecha_fin:
        records = [r for r in records if r.get("fecha", "") <= fecha_fin]

    total = len(records)
    por_tipo: Dict[str, int] = {}
    por_modelo: Dict[str, int] = {}
    por_estado: Dict[str, int] = {}
    por_dia: Dict[str, int] = {}
    tiempos: List[int] = []
    llm_count = 0

    for record in records:
        tipo = record.get("tipo", "desconocido")
        modelo = record.get("modelo", "desconocido")
        estado = record.get("estado", "desconocido")
        fecha = record.get("fecha", "sin-fecha")
        tiempo = record.get("tiempoRespuestaMs", 0)

        por_tipo[tipo] = por_tipo.get(tipo, 0) + 1
        por_modelo[modelo] = por_modelo.get(modelo, 0) + 1
        por_estado[estado] = por_estado.get(estado, 0) + 1
        por_dia[fecha] = por_dia.get(fecha, 0) + 1

        if tiempo:
            tiempos.append(tiempo)

        if record.get("generadoPorLLM"):
            llm_count += 1

    promedio_ms = round(sum(tiempos) / len(tiempos)) if tiempos else 0
    max_ms = max(tiempos) if tiempos else 0

    # Detectar días con consumo anormal (más del doble del promedio diario)
    promedio_diario = total / max(len(por_dia), 1)
    dias_anomalos = [
        {"fecha": fecha, "solicitudes": count}
        for fecha, count in por_dia.items()
        if count > promedio_diario * 2 and promedio_diario > 0
    ]

    return {
        "periodo": {
            "fechaInicio": fecha_inicio,
            "fechaFin": fecha_fin,
        },
        "totalSolicitudes": total,
        "solicitudesLLM": llm_count,
        "solicitudesRespaldoLocal": total - llm_count,
        "porcentajeUsoLLM": round((llm_count / total) * 100, 2) if total else 0,
        "tiempoRespuestaMs": {
            "promedio": promedio_ms,
            "maximo": max_ms,
        },
        "porTipo": por_tipo,
        "porModelo": por_modelo,
        "porEstado": por_estado,
        "porDia": dict(sorted(por_dia.items())),
        "alertas": {
            "diasConConsumoAnormal": dias_anomalos,
            "hayIncremento": len(dias_anomalos) > 0,
        },
        "generadoEn": now_iso(),
    }