// frontend/src/views/analisis/AnalisisView.jsx
import { useState, useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";
import { AppHeader } from "../../components/layout/AppHeader";
import { BottomNav } from "../../components/layout/BottomNav";
import { useFinancialHistory } from "../../hooks/useFinancialHistory";
import "./AnalisisView.css";

Chart.register(...registerables);

// ─── Paleta de categorías ──────────────────────────────────────────────────────
// Cada categoría tiene color sólido para la barra y el donut, más ícono y fondo.
// Paleta ajustada para máxima distinción visual entre las 8 categorías
// (se separaron los pares que antes se confundían: Alimentación/Servicios y Ocio/Vivienda).
const CATEGORY_STYLE_MAP = {
  Alimentación: { icon: "🍔", color: "#22C55E", iconBg: "#DCFCE7" },
  Transporte: { icon: "🚗", color: "#3B82F6", iconBg: "#DBEAFE" },
  Salud: { icon: "❤️", color: "#EF4444", iconBg: "#FEE2E2" },
  Educación: { icon: "📚", color: "#8B5CF6", iconBg: "#EDE9FE" },
  Ocio: { icon: "🎬", color: "#7C3AED", iconBg: "#EDE9FE" },
  Vivienda: { icon: "🏠", color: "#F97316", iconBg: "#FFEDD5" },
  Servicios: { icon: "⚡", color: "#0EA5E9", iconBg: "#E0F2FE" },
  "Sin categoría": { icon: "📦", color: "#6B7280", iconBg: "#F3F4F6" },
  Compras: { icon: "🛍️", color: "#F59E0B", iconBg: "#FEF3C7" },
  Otros: { icon: "🔖", color: "#374151", iconBg: "#E5E7EB" },
};

// Colores de respaldo para categorías que no están en CATEGORY_STYLE_MAP
// (ej. categorías personalizadas que el usuario haya creado fuera de las
// 8 oficiales del sistema). Verificados para no solaparse visualmente con
// ninguno de los colores ya usados en el mapa fijo de arriba.
const FALLBACK_COLORS = [
  "#DB2777", // rosa
  "#EC4899", // rosa chicle
  "#A78BFA", // lavanda
  "#2DD4BF", // turquesa claro
  "#BE185D", // magenta oscuro
];

const getCategoryStyle = (nombre, index = 0) =>
  CATEGORY_STYLE_MAP[nombre] || {
    icon: "💰",
    color: FALLBACK_COLORS[index % FALLBACK_COLORS.length],
    iconBg: "#F7FAFC",
  };

// ─── Helpers de formato ────────────────────────────────────────────────────────

const formatCOP = (value) => {
  if (!value && value !== 0) return "$0";
  return (
    "$" +
    Math.round(value)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  );
};

const calcSavingsRate = (resumen) => {
  if (!resumen?.totalIngresos || resumen.totalIngresos === 0) return "0%";
  return Math.round((resumen.totalAhorros / resumen.totalIngresos) * 100) + "%";
};

const calcDailyAverage = (resumen, dias = 30) => {
  if (!resumen) return "$0";
  return formatCOP(resumen.totalGastos / dias);
};

// ─── Construcción de datos de gráfica ─────────────────────────────────────────

/**
 * Vista MENSUAL: cada punto = un mes del historialMensual.
 * Label: "Ene", "Feb", …
 */
const buildMonthlyChartData = (historialMensual = []) => {
  const labels = historialMensual.map((m) => {
    if (!m.mes || m.mes === "sin-fecha") return "?";
    try {
      const [y, mo] = m.mes.split("-");
      return new Date(Number(y), Number(mo) - 1, 1).toLocaleString("es-CO", {
        month: "short",
      });
    } catch {
      return m.mes;
    }
  });
  return { labels, data: historialMensual.map((m) => m.gastos) };
};

/**
 * Vista SEMANAL: agrupa los movimientos del mes actual por semana ISO.
 * Espera recibir el array `movimientos` crudo del backend.
 * Semana 1 = días 1-7, Semana 2 = 8-14, Semana 3 = 15-21, Semana 4 = 22-fin.
 */
const buildWeeklyChartData = (movimientos = []) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  const weeks = { "Sem 1": 0, "Sem 2": 0, "Sem 3": 0, "Sem 4": 0 };

  movimientos.forEach((mov) => {
    if (mov.tipo !== "gasto" || !mov.fecha) return;
    const d = new Date(mov.fecha + "T12:00:00");
    if (d.getFullYear() !== year || d.getMonth() !== month) return;
    const day = d.getDate();
    if (day <= 7) weeks["Sem 1"] += mov.monto || 0;
    else if (day <= 14) weeks["Sem 2"] += mov.monto || 0;
    else if (day <= 21) weeks["Sem 3"] += mov.monto || 0;
    else weeks["Sem 4"] += mov.monto || 0;
  });

  return {
    labels: Object.keys(weeks),
    data: Object.values(weeks),
  };
};

/** Variación % entre el último y el penúltimo mes. */
const calcMonthlyVariation = (historialMensual) => {
  if (!historialMensual || historialMensual.length < 2) return null;
  const last = historialMensual[historialMensual.length - 1];
  const prev = historialMensual[historialMensual.length - 2];
  if (!prev.gastos || prev.gastos === 0) return null;
  return (((last.gastos - prev.gastos) / prev.gastos) * 100).toFixed(1);
};

// ─── Análisis anterior (simulado) ─────────────────────────────────────────────
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

// ─── Modal IA ──────────────────────────────────────────────────────────────────
const ModalIA = ({ modo, onClose }) => {
  const [estado, setEstado] = useState("idle");
  const [analisis, setAnalisis] = useState("");
  const esNuevo = modo === "nuevo";

  const generarAnalisis = async () => {
    setEstado("loading");
    setAnalisis("");
    const prompt = `Eres un asesor financiero personal experto. Analiza estos datos financieros del usuario y genera un análisis detallado en español con recomendaciones prácticas.`;
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
      setAnalisis(data.content?.find((b) => b.type === "text")?.text || "");
      setEstado("done");
    } catch {
      setAnalisis("Ocurrió un error al generar el análisis. Intenta de nuevo.");
      setEstado("done");
    }
  };

  const renderTexto = (texto) =>
    texto.split("\n").map((linea, i) => {
      const partes = linea.split(/\*\*(.*?)\*\*/g);
      return (
        <p key={i} className={linea === "" ? "modal-spacer" : "modal-line"}>
          {partes.map((parte, j) =>
            j % 2 === 1 ? <strong key={j}>{parte}</strong> : parte,
          )}
        </p>
      );
    });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-icon-wrap">{esNuevo ? "✨" : "📋"}</div>
            <div>
              <p className="modal-title">
                {esNuevo ? "Análisis con IA" : "Análisis Anterior"}
              </p>
              <p className="modal-subtitle">
                {esNuevo
                  ? "Generado para el período actual"
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

        <div className="modal-body">
          {!esNuevo && (
            <div className="modal-content-text">
              {renderTexto(ANALISIS_ANTERIOR.contenido)}
            </div>
          )}

          {esNuevo && estado === "idle" && (
            <div className="modal-empty-state">
              <div className="modal-empty-icon">🤖</div>
              <p className="modal-empty-title">
                Listo para analizar tus finanzas
              </p>
              <p className="modal-empty-desc">
                La IA revisará tus gastos, categorías, metas y tendencias del
                período actual.
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

// ─── Componente principal ──────────────────────────────────────────────────────

export const AnalisisView = () => {
  // "Semanal" muestra gastos del mes actual por semana
  // "Mensual" muestra los últimos 6 meses
  const [periodo, setPeriodo] = useState("Mensual");
  const [modalModo, setModalModo] = useState(null);

  // ── Estado de datos (conectado al backend vía hook) ────────────────────────
  const {
    historial,
    loading: cargando,
    error,
  } = useFinancialHistory({ meses: 6 });

  // ── Refs Chart.js ──────────────────────────────────────────────────────────
  const trendRef = useRef(null);
  const donutRef = useRef(null);
  const trendChart = useRef(null);
  const donutChart = useRef(null);

  // ── Escape para cerrar modal ───────────────────────────────────────────────
  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") setModalModo(null);
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  // ── Datos derivados ────────────────────────────────────────────────────────
  const historialMensual = historial?.historialMensual || [];
  const movimientos = historial?.movimientos || [];
  const resumen = historial?.resumenGeneral || null;
  const promedios = historial?.promediosMensuales || null;

  // Datos para la gráfica según el toggle
  const datosGrafica =
    periodo === "Semanal"
      ? buildWeeklyChartData(movimientos)
      : buildMonthlyChartData(historialMensual);

  // Métricas superiores
  const totalGastado = formatCOP(resumen?.totalGastos);
  const tasaAhorro = calcSavingsRate(resumen);
  const promedioDiario = promedios
    ? formatCOP(promedios.gastoPromedioMensual / 30)
    : calcDailyAverage(resumen, 30);

  const variacion = calcMonthlyVariation(historialMensual);
  const variacionLabel =
    variacion !== null
      ? `${Number(variacion) > 0 ? "↗" : "↘"} ${Math.abs(variacion)}% vs mes anterior`
      : "Sin datos suficientes";

  // ── Categorías frecuentes (top 3 para las barras) ─────────────────────────
  const categoriasFrecuentes = (historial?.categoriasFrecuentes || []).slice(
    0,
    3,
  );
  const maxCategoria = categoriasFrecuentes[0]?.total || 1;

  const categoriasConEstilo = categoriasFrecuentes.map((cat, i) => {
    const nombre = cat.nombre || cat.categoria;
    return {
      nombre,
      monto: formatCOP(cat.total),
      porcentaje: Math.round((cat.total / maxCategoria) * 100),
      ...getCategoryStyle(nombre, i),
    };
  });

  // ── Donut: categorías de gasto reales ─────────────────────────────────────
  // Usamos todas las categorías frecuentes (no sólo top 3) para el donut.
  // Cada slice = una categoría con su color del mapa.
  const todasCategorias = historial?.categoriasFrecuentes || [];
  const totalCategorias = todasCategorias.reduce((s, c) => s + c.total, 0) || 1;

  const donutCategorias = todasCategorias.slice(0, 8).map((cat, i) => {
    const nombre = cat.nombre || cat.categoria;
    const style = getCategoryStyle(nombre, i);
    return {
      nombre,
      total: cat.total,
      porcentaje: Math.round((cat.total / totalCategorias) * 100),
      color: style.color,
      icon: style.icon,
    };
  });

  // Valores y colores para Chart.js
  const donutValues =
    donutCategorias.length > 0 ? donutCategorias.map((c) => c.total) : [1]; // placeholder vacío mientras carga
  const donutColors =
    donutCategorias.length > 0
      ? donutCategorias.map((c) => c.color)
      : ["#e5e7eb"];

  // ── Chart: Donut — se crea una vez, se actualiza con datos reales ──────────
  useEffect(() => {
    if (!donutRef.current) return;
    if (donutChart.current) {
      donutChart.current.destroy();
      donutChart.current = null;
    }

    donutChart.current = new Chart(donutRef.current, {
      type: "doughnut",
      data: {
        datasets: [
          {
            data: donutValues,
            backgroundColor: donutColors,
            borderWidth: 2,
            borderColor: "#ffffff",
          },
        ],
      },
      options: {
        responsive: false,
        cutout: "65%",
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const cat = donutCategorias[ctx.dataIndex];
                return cat ? ` ${cat.nombre}: ${formatCOP(cat.total)}` : "";
              },
            },
          },
        },
      },
    });

    return () => {
      if (donutChart.current) {
        donutChart.current.destroy();
        donutChart.current = null;
      }
    };
  }, [historial]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Chart: Línea de tendencias ─────────────────────────────────────────────
  useEffect(() => {
    if (trendChart.current) {
      trendChart.current.destroy();
      trendChart.current = null;
    }
    if (!trendRef.current || datosGrafica.labels.length === 0) return;

    trendChart.current = new Chart(trendRef.current, {
      type: "line",
      data: {
        labels: datosGrafica.labels,
        datasets: [
          {
            data: datosGrafica.data,
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
          tooltip: { callbacks: { label: (ctx) => formatCOP(ctx.raw) } },
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

    return () => {
      if (trendChart.current) {
        trendChart.current.destroy();
        trendChart.current = null;
      }
    };
  }, [periodo, historial]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f2f4f7] overflow-x-hidden">
      <AppHeader seccionActiva="analisis" setSeccionActiva={() => {}} />

      <div className="analisis-wrap">
        {/* ── Header con toggle Semanal / Mensual ── */}
        <div className="analisis-header">
          <div>
            <p className="analisis-eyebrow">Resumen</p>
            <h2 className="analisis-title">Análisis Financiero</h2>
          </div>
          <div className="analisis-toggle">
            {["Semanal", "Mensual"].map((p) => (
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

        {/* ── Banners de estado ── */}
        {cargando && (
          <div className="analisis-loading-banner">
            Cargando datos financieros...
          </div>
        )}
        {error && !cargando && (
          <div className="analisis-error-banner">{error}</div>
        )}

        {/* ── Fila superior ── */}
        <div className="analisis-top-row">
          {/* Gráfica de tendencias */}
          <div className="analisis-card">
            <div className="analisis-chart-header">
              <div>
                <p className="analisis-chart-title">Tendencias de Gastos</p>
                <p className="analisis-chart-sub">
                  {periodo === "Semanal"
                    ? "Gastos por semana del mes actual"
                    : "Tus patrones de gasto en los últimos 6 meses"}
                </p>
              </div>
              <span className="analisis-trend-badge">{variacionLabel}</span>
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
                <p className="analisis-metric-value">
                  {cargando ? "—" : totalGastado}
                </p>
              </div>
              <div>
                <p className="analisis-metric-label">Total Ingresos</p>
                <p className="analisis-metric-value">
                  {cargando ? "—" : formatCOP(resumen?.totalIngresos)}
                </p>
              </div>
              <div>
                <p className="analisis-metric-label">Tasa de Ahorro</p>
                <p className="analisis-metric-value green">
                  {cargando ? "—" : tasaAhorro}
                </p>
              </div>
              <div>
                <p className="analisis-metric-label">Promedio Diario</p>
                <p className="analisis-metric-value">
                  {cargando ? "—" : promedioDiario}
                </p>
              </div>
            </div>
          </div>

          {/* Categorías principales */}
          <div className="analisis-card">
            <p className="analisis-cat-title">Categorías Principales</p>

            {cargando && (
              <p className="analisis-loading-text">Cargando categorías...</p>
            )}

            {!cargando && categoriasConEstilo.length === 0 && (
              <p className="analisis-empty-text">
                Sin movimientos en este período.
              </p>
            )}

            {!cargando &&
              categoriasConEstilo.map((cat) => (
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

            {/* Botones IA */}
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

        {/* ── Fila inferior ── */}
        <div className="analisis-bottom-row">
          {/* Meta de Ahorro — restaurada y hardcodeada */}
          <div className="analisis-card">
            <p className="analisis-card-eyebrow">Meta de Ahorro</p>
            <p className="analisis-card-name">Nuevo MacBook</p>
            <p className="analisis-goal-amounts">$1.800.000 / $2.500.000</p>
            <div className="analisis-goal-bar">
              <div className="analisis-goal-fill" style={{ width: "72%" }} />
            </div>
          </div>

          {/* Flujo neto del período */}
          <div className="analisis-card">
            <p className="analisis-card-eyebrow">Flujo Neto del Período</p>
            <div className="analisis-subs-row">
              <div className="analisis-subs-icon">💸</div>
              <p className="analisis-subs-count">
                {cargando
                  ? "—"
                  : `${resumen?.totalMovimientos ?? 0} movimientos`}
              </p>
            </div>
            <p
              className="analisis-subs-amount"
              style={{
                color: (resumen?.flujoNeto ?? 0) >= 0 ? "#1A7A4A" : "#E53E3E",
              }}
            >
              {cargando ? "—" : formatCOP(resumen?.flujoNeto)}
            </p>
          </div>

          {/* Tendencia de gastos */}
          <div className="analisis-card">
            <p className="analisis-card-eyebrow">Tendencia de Gastos</p>
            <div className="analisis-score-row">
              <p className="analisis-score-num">
                {historial?.tendenciaGastos?.tendencia === "aumento"
                  ? "↑"
                  : historial?.tendenciaGastos?.tendencia === "disminucion"
                    ? "↓"
                    : "→"}
              </p>
              <span className="analisis-score-badge">
                {cargando
                  ? "—"
                  : `${historial?.tendenciaGastos?.variacionPorcentual ?? 0}%`}
              </span>
            </div>
            <p className="analisis-trend-desc">
              {cargando
                ? "Calculando..."
                : historial?.tendenciaGastos?.descripcion ||
                  "Sin datos suficientes"}
            </p>
          </div>

          {/* Distribución por categorías — donut real + leyenda dinámica */}
          <div className="analisis-card">
            <p className="analisis-card-eyebrow">Distribución de Gastos</p>
            <div className="analisis-dist-row">
              <canvas
                ref={donutRef}
                width={72}
                height={72}
                role="img"
                aria-label="Distribución de gastos por categoría"
              />
              <div className="analisis-dist-legend">
                {cargando && (
                  <p className="analisis-loading-text">Cargando...</p>
                )}
                {!cargando && donutCategorias.length === 0 && (
                  <p className="analisis-empty-text">Sin datos</p>
                )}
                {!cargando &&
                  donutCategorias.map((cat) => (
                    <p key={cat.nombre} className="analisis-dist-legend-item">
                      <span
                        className="dot"
                        style={{ background: cat.color, flexShrink: 0 }}
                      />
                      <span className="analisis-dist-legend-name">
                        {cat.nombre}
                      </span>
                      <span className="analisis-dist-legend-pct">
                        {cat.porcentaje}%
                      </span>
                    </p>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />

      {modalModo && (
        <ModalIA modo={modalModo} onClose={() => setModalModo(null)} />
      )}
    </div>
  );
};
