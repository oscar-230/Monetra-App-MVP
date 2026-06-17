from unittest.mock import MagicMock, patch
from services.ai_monitoring_service import get_monitoring_stats


def test_monitoring_sin_registros():
    """Sin registros, las métricas deben ser 0 y sin alertas."""
    with patch("services.ai_monitoring_service.get_firestore_client") as mock_db:
        mock_collection = MagicMock()
        mock_collection.order_by.return_value.limit.return_value.stream.return_value = []
        mock_db.return_value.collection.return_value = mock_collection

        result = get_monitoring_stats()

        assert result["totalSolicitudes"] == 0
        assert result["solicitudesLLM"] == 0
        assert result["porcentajeUsoLLM"] == 0
        assert result["alertas"]["hayIncremento"] is False


def test_monitoring_con_registros():
    """Con registros, debe calcular métricas correctamente."""
    fake_docs = []

    for tipo in ["analysis", "recommendations", "predictions"]:
        doc = MagicMock()
        doc.to_dict.return_value = {
            "uid": "user123",
            "tipo": tipo,
            "modelo": "llama-3.1-8b-instant",
            "generadoPorLLM": True,
            "tiempoRespuestaMs": 800,
            "estado": "generado",
            "fecha": "2026-06-15",
            "advertencias": [],
        }
        fake_docs.append(doc)

    with patch("services.ai_monitoring_service.get_firestore_client") as mock_db:
        mock_collection = MagicMock()
        mock_collection.order_by.return_value.limit.return_value.stream.return_value = fake_docs
        mock_db.return_value.collection.return_value = mock_collection

        result = get_monitoring_stats()

        assert result["totalSolicitudes"] == 3
        assert result["solicitudesLLM"] == 3
        assert result["porcentajeUsoLLM"] == 100.0
        assert result["tiempoRespuestaMs"]["promedio"] == 800
        assert "analysis" in result["porTipo"]
        assert "recommendations" in result["porTipo"]
        assert "predictions" in result["porTipo"]


def test_monitoring_detecta_dia_anormal():
    """Debe detectar días con consumo anormal."""
    fake_docs = []

    # 10 solicitudes en un día = anormal si el promedio es 1
    for _ in range(10):
        doc = MagicMock()
        doc.to_dict.return_value = {
            "uid": "user123",
            "tipo": "analysis",
            "modelo": "llama-3.1-8b-instant",
            "generadoPorLLM": True,
            "tiempoRespuestaMs": 500,
            "estado": "generado",
            "fecha": "2026-06-15",
            "advertencias": [],
        }
        fake_docs.append(doc)

    # 1 solicitud en otro día = normal
    doc_normal = MagicMock()
    doc_normal.to_dict.return_value = {
        "uid": "user456",
        "tipo": "recommendations",
        "modelo": "analisis_local",
        "generadoPorLLM": False,
        "tiempoRespuestaMs": 100,
        "estado": "sin_datos",
        "fecha": "2026-06-10",
        "advertencias": [],
    }
    fake_docs.append(doc_normal)

    with patch("services.ai_monitoring_service.get_firestore_client") as mock_db:
        mock_collection = MagicMock()
        mock_collection.order_by.return_value.limit.return_value.stream.return_value = fake_docs
        mock_db.return_value.collection.return_value = mock_collection

        result = get_monitoring_stats()

        assert result["alertas"]["hayIncremento"] is True
        assert len(result["alertas"]["diasConConsumoAnormal"]) > 0