from unittest.mock import MagicMock, patch
from services.ai_monitoring_service import get_monitoring_stats


def test_monitoring_sin_registros():
    """Sin registros, las métricas deben ser 0 y sin alertas."""
    with patch("services.ai_monitoring_service.get_firestore_client") as mock_db:
        mock_collection = MagicMock()
        
        # Hacemos que cualquier método encadenado retorne el mismo mock antes del stream
        mock_collection.where.return_value = mock_collection
        mock_collection.order_by.return_value = mock_collection
        mock_collection.limit.return_value = mock_collection
        mock_collection.stream.return_value = []
        
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
        
        # Hacemos que cualquier método encadenado retorne el mismo mock antes del stream
        mock_collection.where.return_value = mock_collection
        mock_collection.order_by.return_value = mock_collection
        mock_collection.limit.return_value = mock_collection
        mock_collection.stream.return_value = fake_docs
        
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
    """Debe detectar días con consumo anormal superando los umbrales del backend."""
    from datetime import date, timedelta
    
    hoy_str = date.today().isoformat()
    fake_docs = []

    # 1. Creamos un pico masivo el día de hoy (50 solicitudes)
    for _ in range(50):
        doc = MagicMock()
        doc.to_dict.return_value = {
            "uid": "user123",
            "tipo": "analysis",
            "modelo": "llama-3.1-8b-instant",
            "generadoPorLLM": True,
            "tiempoRespuestaMs": 300,
            "estado": "generado",
            "fecha": hoy_str,
            "advertencias": [],
        }
        fake_docs.append(doc)

    # 2. Creamos un historial estable de días anteriores con uso mínimo (1 sol. por día)
    for i in range(1, 6):
        fecha_pasada = (date.today() - timedelta(days=i)).isoformat()
        doc_normal = MagicMock()
        doc_normal.to_dict.return_value = {
            "uid": "user456",
            "tipo": "recommendations",
            "modelo": "analisis_local",
            "generadoPorLLM": False,
            "tiempoRespuestaMs": 100,
            "estado": "sin_datos",
            "fecha": fecha_pasada,
            "advertencias": [],
        }
        fake_docs.append(doc_normal)

    # 3. Ejecución del entorno Mock (Aislado de internet)
    with patch("google.cloud.firestore.Client") as mock_firestore_client:
        mock_collection = MagicMock()

        mock_collection.where.return_value = mock_collection
        mock_collection.order_by.return_value = mock_collection
        mock_collection.limit.return_value = mock_collection
        mock_collection.stream.return_value = fake_docs

        mock_firestore_client.return_value.collection.return_value = mock_collection
        
        with patch("services.ai_monitoring_service.get_firestore_client", return_value=mock_firestore_client.return_value):
            result = get_monitoring_stats()

            # Forzamos la impresión en consola por si necesitas ver qué calcula tu backend
            print("\nResultado Alertas Recibidas:", result["alertas"])

            assert result["alertas"]["hayIncremento"] is True
            assert len(result["alertas"]["diasConConsumoAnormal"]) > 0