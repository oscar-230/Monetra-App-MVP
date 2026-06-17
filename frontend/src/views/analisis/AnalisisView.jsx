// frontend/src/views/analisis/AnalisisView.jsx
import { useState, useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";
import { AppHeader } from "../../components/layout/AppHeader";
import { BottomNav } from "../../components/layout/BottomNav";
import "./AnalisisView.css";

Chart.register(...registerables);

const CATEGORIAS = [
  {
    nombre: "Comida y Restaurantes",
    monto: "$300.440",
    porcentaje: 80,
    color: "#1A7A4A",
    iconBg: "#FEF3F2",
    icon: "🍽️",
  },
  {
    nombre: "Transporte",
    monto: "$230.000",
    porcentaje: 60,
    color: "#378ADD",
    iconBg: "#EFF6FF",
    icon: "🚗",
  },
  {
    nombre: "Estilo de Vida",
    monto: "$150.000",
    porcentaje: 40,
    color: "#BA7517",
    iconBg: "#FAEEDA",
    icon: "🏠",
  },
];

const TREND_DATA = {
  Mensual: {
    labels: ["Mar", "Abr", "May", "Jun", "Jul", "Ago"],
    data: [3200000, 3600000, 4100000, 3800000, 3500000, 4280000],
    total: "$4.280.000",
    ahorro: "18%",
    promedio: "$142.600",
  },
  Trimestral: {
    labels: ["Q1", "Q2", "Q3", "Q4"],
    data: [10200000, 11400000, 10800000, 12500000],
    total: "$12.500.000",
    ahorro: "21%",
    promedio: "$416.600",
  },
};

// Análisis anterior guardado (simulado)
const ANALISIS_ANTERIOR = {
  fecha: "Mayo 2025",
  contenido: `**Resumen del período — Mayo 2025**

Durante mayo registraste un gasto total de $3.800.000, un 7.3% menor al mes anterior. Tu categoría principal siguió siendo Comida y Restaurantes con $280.000, seguida de Transporte con $210.000.

**Puntos destacados:**
• Lograste reducir gastos en entretenimiento un 15% respecto a abril.
• El gasto diario promedio fue de $126.600, dentro del rango saludable.
• Tu tasa de ahorro del 16% estuvo por debajo de tu meta del 20%.

**Recomendación aplicada:** Preparar comida en casa al menos 3 veces por semana redujo tu gasto en restaurantes en $45.000 respecto a abril.`,
};

// Modal de IA
const ModalIA = ({ modo, onClose }) => {
  const [estado, setEstado] = useState("idle"); // idle | loading | done
  const [analisis, setAnalisis] = useState("");
  const esNuevo = modo === "nuevo";

  const generarAnalisis = async () => {
    setEstado("loading");
    setAnalisis("");

    const prompt = `Eres un asesor financiero personal experto. Analiza estos datos financieros del usuario y genera un análisis detallado en español con recomendaciones prácticas:

Período: Agosto 2025
Total gastado: $4.280.000
Límite de presupuesto: $5.000.000
Tasa de ahorro: 18%
Promedio diario: $142.600

Categorías de gasto:
- Comida y Restaurantes: $300.440 (80% del presupuesto de categoría)
- Transporte: $230.000 (60% del presupuesto de categoría)
- Estilo de Vida: $150.000 (40% del presupuesto de categoría)

Distribución: 55% Necesidades, 30% Deseos, 15% Inversión
Meta de ahorro activa: Nuevo MacBook ($1.800.000 de $2.500.000 ahorrados, 72%)
Suscripciones activas: 12 servicios por $148.500/mes
Salud crediticia: 782 puntos (+18 pts este mes)

Por favor genera:
1. Un resumen ejecutivo del estado financiero actual
2. Los 3 puntos más importantes a destacar (positivos y negativos)
3. Recomendaciones concretas y accionables para el próximo mes
4. Una proyección si sigue las recomendaciones

Usa un tono amigable, directo y motivador. Usa emojis moderadamente. Formatea con secciones claras.`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await response.json();
      const texto = data.content?.find((b) => b.type === "text")?.text || "";
      setAnalisis(texto);
      setEstado("done");
    } catch {
      setAnalisis("Ocurrió un error al generar el análisis. Intenta de nuevo.");
      setEstado("done");
    }
  };

  // Renderiza texto con formato básico (negritas y saltos de línea)
  const renderTexto = (texto) => {
    return texto.split("\n").map((linea, i) => {
      const partes = linea.split(/\*\*(.*?)\*\*/g);
      return (
        <p key={i} className={linea === "" ? "modal-spacer" : "modal-line"}>
          {partes.map((parte, j) =>
            j % 2 === 1 ? <strong key={j}>{parte}</strong> : parte,
          )}
        </p>
      );
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Header del modal */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-icon-wrap">{esNuevo ? "✨" : "📋"}</div>
            <div>
              <p className="modal-title">
                {esNuevo ? "Análisis con IA" : "Análisis Anterior"}
              </p>
              <p className="modal-subtitle">
                {esNuevo
                  ? "Generado para Agosto 2025"
                  : `Período: ${ANALISIS_ANTERIOR.fecha}`}
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Contenido */}
        <div className="modal-body">
          {/* Modo: consultar anterior */}
          {!esNuevo && (
            <div className="modal-content-text">
              {renderTexto(ANALISIS_ANTERIOR.contenido)}
            </div>
          )}

          {/* Modo: generar nuevo */}
          {esNuevo && estado === "idle" && (
            <div className="modal-empty-state">
              <div className="modal-empty-icon">🤖</div>
              <p className="modal-empty-title">
                Listo para analizar tus finanzas
              </p>
              <p className="modal-empty-desc">
                La IA revisará tus gastos, categorías, metas y tendencias del
                período actual para darte recomendaciones personalizadas.
              </p>
              <button className="modal-generate-btn" onClick={generarAnalisis}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                Generar ahora
              </button>
            </div>
          )}

          {estado === "loading" && (
            <div className="modal-loading">
              <div className="modal-spinner" />
              <p className="modal-loading-text">Analizando tus finanzas...</p>
              <p className="modal-loading-sub">
                Esto puede tomar unos segundos
              </p>
            </div>
          )}

          {estado === "done" && (
            <div className="modal-content-text">{renderTexto(analisis)}</div>
          )}
        </div>

        {/* Footer */}
        {esNuevo && estado === "done" && (
          <div className="modal-footer">
            <button className="modal-retry-btn" onClick={generarAnalisis}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Regenerar análisis
            </button>
            <button className="modal-close-btn" onClick={onClose}>
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export const AnalisisView = () => {
  const [periodo, setPeriodo] = useState("Mensual");
  const [modalModo, setModalModo] = useState(null); // null | "nuevo" | "anterior"
  const trendRef = useRef(null);
  const donutRef = useRef(null);
  const trendChart = useRef(null);
  const donutChart = useRef(null);

  // Cerrar modal con Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") setModalModo(null);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Donut — se monta una sola vez
  useEffect(() => {
    if (donutRef.current && !donutChart.current) {
      donutChart.current = new Chart(donutRef.current, {
        type: "doughnut",
        data: {
          datasets: [
            {
              data: [55, 30, 15],
              backgroundColor: ["#1A7A4A", "#378ADD", "#BA7517"],
              borderWidth: 0,
            },
          ],
        },
        options: {
          responsive: false,
          cutout: "68%",
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
        },
      });
    }
    return () => {
      if (donutChart.current) {
        donutChart.current.destroy();
        donutChart.current = null;
      }
    };
  }, []);

  // Línea — se recrea cuando cambia el periodo
  useEffect(() => {
    const d = TREND_DATA[periodo];
    if (trendChart.current) {
      trendChart.current.destroy();
      trendChart.current = null;
    }

    if (trendRef.current) {
      trendChart.current = new Chart(trendRef.current, {
        type: "line",
        data: {
          labels: d.labels,
          datasets: [
            {
              data: d.data,
              borderColor: "#1A7A4A",
              backgroundColor: "rgba(26,122,74,0.08)",
              borderWidth: 2,
              pointBackgroundColor: "#1A7A4A",
              pointRadius: 4,
              fill: true,
              tension: 0.4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => "$" + (ctx.raw / 1_000_000).toFixed(1) + "M",
              },
            },
          },
          scales: {
            x: {
              grid: { color: "rgba(0,0,0,0.05)" },
              ticks: { color: "#aaa", font: { size: 10 } },
            },
            y: {
              grid: { color: "rgba(0,0,0,0.05)" },
              ticks: {
                color: "#aaa",
                font: { size: 10 },
                callback: (v) => "$" + (v / 1_000_000).toFixed(1) + "M",
              },
            },
          },
        },
      });
    }

    return () => {
      if (trendChart.current) {
        trendChart.current.destroy();
        trendChart.current = null;
      }
    };
  }, [periodo]);

  const d = TREND_DATA[periodo];

  return (
    <div className="min-h-screen bg-[#f2f4f7] overflow-x-hidden">
      <AppHeader seccionActiva="analisis" setSeccionActiva={() => {}} />

      <div className="analisis-wrap">
        {/* Header */}
        <div className="analisis-header">
          <div>
            <p className="analisis-eyebrow">Resumen</p>
            <h2 className="analisis-title">Análisis Financiero</h2>
          </div>
          <div className="analisis-toggle">
            {["Mensual", "Trimestral"].map((p) => (
              <button
                key={p}
                className={`analisis-toggle-btn${periodo === p ? " active" : ""}`}
                onClick={() => setPeriodo(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Fila superior */}
        <div className="analisis-top-row">
          <div className="analisis-card">
            <div className="analisis-chart-header">
              <div>
                <p className="analisis-chart-title">Tendencias de Gastos</p>
                <p className="analisis-chart-sub">
                  Tus patrones de gasto en los últimos 6 meses
                </p>
              </div>
              <span className="analisis-trend-badge">
                ↗ 12.5% vs mes anterior
              </span>
            </div>
            <div className="analisis-chart-area">
              <canvas
                ref={trendRef}
                role="img"
                aria-label="Gráfica de tendencia de gastos"
              />
            </div>
            <div className="analisis-metrics-row">
              <div>
                <p className="analisis-metric-label">Total Gastado</p>
                <p className="analisis-metric-value">{d.total}</p>
              </div>
              <div>
                <p className="analisis-metric-label">Límite de Presupuesto</p>
                <p className="analisis-metric-value">$5.000.000</p>
              </div>
              <div>
                <p className="analisis-metric-label">Tasa de Ahorro</p>
                <p className="analisis-metric-value green">{d.ahorro}</p>
              </div>
              <div>
                <p className="analisis-metric-label">Promedio Diario</p>
                <p className="analisis-metric-value">{d.promedio}</p>
              </div>
            </div>
          </div>

          <div className="analisis-card">
            <p className="analisis-cat-title">Categorías Principales</p>
            {CATEGORIAS.map((cat) => (
              <div key={cat.nombre} className="analisis-cat-item">
                <div
                  className="analisis-cat-icon"
                  style={{ background: cat.iconBg }}
                >
                  <span role="img" aria-hidden="true">
                    {cat.icon}
                  </span>
                </div>
                <div className="analisis-cat-info">
                  <p className="analisis-cat-name">{cat.nombre}</p>
                  <div className="analisis-cat-bar">
                    <div
                      className="analisis-cat-bar-fill"
                      style={{
                        width: `${cat.porcentaje}%`,
                        background: cat.color,
                      }}
                    />
                  </div>
                </div>
                <p className="analisis-cat-amount">{cat.monto}</p>
              </div>
            ))}

            {/* Botones IA — reemplazan el tip */}
            <div className="analisis-ia-actions">
              <button
                className="analisis-ia-btn analisis-ia-btn--primary"
                onClick={() => setModalModo("nuevo")}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                Generar análisis con IA
              </button>
              <button
                className="analisis-ia-btn analisis-ia-btn--secondary"
                onClick={() => setModalModo("anterior")}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Consultar análisis anterior
              </button>
            </div>
          </div>
        </div>

        {/* Fila inferior */}
        <div className="analisis-bottom-row">
          <div className="analisis-card">
            <p className="analisis-card-eyebrow">Meta de Ahorro</p>
            <p className="analisis-card-name">Nuevo MacBook</p>
            <p className="analisis-goal-amounts">$1.800.000 / $2.500.000</p>
            <div className="analisis-goal-bar">
              <div className="analisis-goal-fill" style={{ width: "72%" }} />
            </div>
          </div>

          <div className="analisis-card">
            <p className="analisis-card-eyebrow">Suscripciones Activas</p>
            <div className="analisis-subs-row">
              <div className="analisis-subs-icon">🔄</div>
              <p className="analisis-subs-count">12 Servicios</p>
            </div>
            <p className="analisis-subs-amount">−$148.500/mes</p>
          </div>

          <div className="analisis-card">
            <p className="analisis-card-eyebrow">Salud Crediticia</p>
            <div className="analisis-score-row">
              <p className="analisis-score-num">782</p>
              <span className="analisis-score-badge">+18 pts</span>
            </div>
            <div className="analisis-score-bar">
              <div className="analisis-score-fill" style={{ width: "78%" }} />
            </div>
          </div>

          <div className="analisis-card">
            <p className="analisis-card-eyebrow">Distribución de Gastos</p>
            <div className="analisis-dist-row">
              <canvas
                ref={donutRef}
                width={56}
                height={56}
                role="img"
                aria-label="Distribución: 55% Necesidades, 30% Deseos, 15% Inversión"
              />
              <div className="analisis-dist-legend">
                <p>
                  <span className="dot" style={{ background: "#1A7A4A" }} />
                  Necesidades 55%
                </p>
                <p>
                  <span className="dot" style={{ background: "#378ADD" }} />
                  Deseos 30%
                </p>
                <p>
                  <span className="dot" style={{ background: "#BA7517" }} />
                  Inversión 15%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />

      {/* Modal IA */}
      {modalModo && (
        <ModalIA modo={modalModo} onClose={() => setModalModo(null)} />
      )}
    </div>
  );
};
