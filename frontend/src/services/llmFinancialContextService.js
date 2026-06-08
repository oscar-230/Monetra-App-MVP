// frontend/src/services/llmFinancialContextService.js

import { obtenerPeriodoMesActual } from './financialReportsService';

import { obtenerAnalisisFinancieroUsuario } from './userFinancialAnalysisService';

import { calcularEstimacionesFuturasUsuario } from './futureExpenseEstimatesService';

export const VERSION_CONTEXTO_LLM = '1.0';

export const CASOS_USO_LLM = {
  ANALISIS: 'analisis_financiero',
  RECOMENDACIONES: 'recomendaciones_financieras',
  PREDICCIONES: 'predicciones_financieras',
  GENERAL: 'general',
};

const TIPOS_MOVIMIENTO = ['ingreso', 'gasto', 'ahorro', 'deuda'];

const redondear = (valor, decimales = 2) => {
  const numero = Number(valor) || 0;
  const factor = 10 ** decimales;

  return Math.round((numero + Number.EPSILON) * factor) / factor;
};

const limpiarTexto = (valor, limite = 140) => {
  const texto = String(valor || '')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[correo_oculto]')
    .replace(/\b(?:\+?\d[\d\s().-]{7,}\d)\b/g, '[telefono_oculto]')
    .replace(/\s+/g, ' ')
    .trim();

  if (texto.length <= limite) {
    return texto;
  }

  return `${texto.slice(0, limite)}...`;
};

const limitarLista = (lista = [], limite = 10) => {
  if (!Array.isArray(lista)) return [];

  return lista.slice(0, limite);
};

const normalizarMovimiento = (movimiento) => {
  const tipo = movimiento?.tipo;
  const monto = Number(movimiento?.monto) || 0;

  if (!TIPOS_MOVIMIENTO.includes(tipo) || monto <= 0) {
    return null;
  }

  return {
    tipo,
    monto: redondear(monto),
    categoria: limpiarTexto(movimiento.categoria || 'Sin categoría', 80),
    fecha: movimiento.fecha || null,
    descripcion: limpiarTexto(movimiento.descripcion || '', 100),
    origen: movimiento.origen || 'manual',
  };
};

const normalizarHallazgo = (hallazgo) => {
  return {
    titulo: limpiarTexto(hallazgo.titulo, 90),
    descripcion: limpiarTexto(hallazgo.descripcion, 180),
    nivel: hallazgo.nivel || 'informativo',
    categoria: hallazgo.categoria || 'general',
    valor: hallazgo.valor ?? null,
  };
};

const normalizarCategoria = (categoria) => {
  return {
    categoria: limpiarTexto(categoria.categoria || 'Sin categoría', 80),
    total: redondear(categoria.total || categoria.gastoEstimado),
    porcentajeSobreGastos: redondear(categoria.porcentajeSobreGastos),
    porcentajeSobreTotalEstimado: redondear(
      categoria.porcentajeSobreTotalEstimado
    ),
    cantidad: categoria.cantidad || null,
  };
};

const ordenarPorMontoDesc = (movimientos) => {
  return [...movimientos].sort((a, b) => b.monto - a.monto);
};

const ordenarPorFechaDesc = (movimientos) => {
  return [...movimientos].sort((a, b) => {
    const fechaA = new Date(a.fecha || 0).getTime();
    const fechaB = new Date(b.fecha || 0).getTime();

    return fechaB - fechaA;
  });
};

const normalizarPredicciones = (estimacionesFuturas) => {
  if (!estimacionesFuturas) {
    return null;
  }

  return {
    disponible: Boolean(estimacionesFuturas.exito),
    estado: estimacionesFuturas.estado || 'no_disponible',
    periodoHistorico: estimacionesFuturas.periodoHistorico || null,
    horizontePrediccion: estimacionesFuturas.horizontePrediccion || null,
    estimacionTotal: estimacionesFuturas.estimacionTotal || null,
    tendenciaEstimaciones: estimacionesFuturas.tendenciaEstimaciones || null,
    confianza: estimacionesFuturas.confianza || null,
    estimacionesMensuales: limitarLista(
      estimacionesFuturas.estimacionesMensuales || [],
      6
    ).map((estimacion) => ({
      mes: estimacion.mes,
      nombreMes: estimacion.nombreMes,
      estimacionMinima: redondear(estimacion.estimacionMinima),
      estimacionProbable: redondear(estimacion.estimacionProbable),
      estimacionMaxima: redondear(estimacion.estimacionMaxima),
      variacionVsPromedioHistorico: redondear(
        estimacion.variacionVsPromedioHistorico
      ),
      estadoComparativo: estimacion.estadoComparativo,
    })),
    categoriasEstimadasTotales: limitarLista(
      estimacionesFuturas.categoriasEstimadasTotales || [],
      8
    ).map(normalizarCategoria),
    advertencias: limitarLista(estimacionesFuturas.advertencias || [], 5).map(
      (advertencia) => limpiarTexto(advertencia, 160)
    ),
  };
};

const evaluarCalidadContexto = ({
  resumenAnalizado,
  movimientosProcesados,
  estimacionesFuturas,
}) => {
  const advertencias = [];

  if (!resumenAnalizado?.totalMovimientos) {
    advertencias.push('No hay movimientos registrados en el período analizado.');
  }

  if (resumenAnalizado?.totalMovimientos > 0 && movimientosProcesados.length === 0) {
    advertencias.push(
      'Existen movimientos, pero no pudieron procesarse correctamente.'
    );
  }

  if (!resumenAnalizado?.totalIngresos) {
    advertencias.push(
      'No hay ingresos registrados; algunos porcentajes financieros pueden ser limitados.'
    );
  }

  if (!resumenAnalizado?.totalGastos) {
    advertencias.push(
      'No hay gastos registrados; el análisis de consumo puede ser limitado.'
    );
  }

  if (estimacionesFuturas && !estimacionesFuturas.exito) {
    advertencias.push(
      'Las estimaciones futuras no están disponibles o no tienen datos suficientes.'
    );
  }

  return {
    datosSuficientes:
      Number(resumenAnalizado?.totalMovimientos || 0) > 0 &&
      movimientosProcesados.length > 0,
    totalAdvertencias: advertencias.length,
    advertencias,
  };
};

const construirObjetivoPorCasoUso = (casoUso) => {
  const objetivos = {
    [CASOS_USO_LLM.ANALISIS]:
      'Generar un análisis financiero claro y comprensible sobre los hábitos del usuario.',
    [CASOS_USO_LLM.RECOMENDACIONES]:
      'Generar recomendaciones financieras personalizadas enfocadas en ahorro, control de gastos y mejora financiera.',
    [CASOS_USO_LLM.PREDICCIONES]:
      'Explicar predicciones y estimaciones futuras basadas en el historial financiero disponible.',
    [CASOS_USO_LLM.GENERAL]:
      'Procesar información financiera del usuario para análisis, recomendaciones y predicciones.',
  };

  return objetivos[casoUso] || objetivos[CASOS_USO_LLM.GENERAL];
};

export const procesarContextoFinancieroParaLLM = ({
  analisisFinanciero,
  estimacionesFuturas = null,
  casoUso = CASOS_USO_LLM.GENERAL,
  limiteMovimientos = 20,
} = {}) => {
  if (!analisisFinanciero) {
    throw new Error('No se recibió análisis financiero para procesar.');
  }

  const reporteBase = analisisFinanciero.reporteBase || {};
  const movimientosOriginales = reporteBase.movimientos || [];

  const movimientosProcesados = movimientosOriginales
    .map(normalizarMovimiento)
    .filter(Boolean);

  const movimientosRecientes = limitarLista(
    ordenarPorFechaDesc(movimientosProcesados),
    10
  );

  const movimientosMayorValor = limitarLista(
    ordenarPorMontoDesc(movimientosProcesados),
    10
  );

  const muestraMovimientos = limitarLista(
    movimientosProcesados,
    limiteMovimientos
  );

  const resumenAnalizado = analisisFinanciero.resumenAnalizado || {};
  const analisisCategorias = analisisFinanciero.analisisCategorias || {};
  const metricasBase = analisisFinanciero.metricasBase || {};

  const calidadContexto = evaluarCalidadContexto({
    resumenAnalizado,
    movimientosProcesados,
    estimacionesFuturas,
  });

  const contextoLLM = {
    version: VERSION_CONTEXTO_LLM,
    casoUso,
    objetivo: construirObjetivoPorCasoUso(casoUso),
    privacidad: {
      identificadoresUsuarioIncluidos: false,
      idsDocumentosIncluidos: false,
      datosContactoIncluidos: false,
      descripcion:
        'El contexto fue procesado para excluir identificadores técnicos y limitar datos innecesarios.',
    },
    periodo: analisisFinanciero.periodo || null,
    calidadContexto,
    resumenFinanciero: {
      totalMovimientos: resumenAnalizado.totalMovimientos || 0,
      totalIngresos: redondear(resumenAnalizado.totalIngresos),
      totalGastos: redondear(resumenAnalizado.totalGastos),
      totalAhorros: redondear(resumenAnalizado.totalAhorros),
      totalDeudas: redondear(resumenAnalizado.totalDeudas),
      flujoNeto: redondear(resumenAnalizado.flujoNeto),
      porcentajeGastosSobreIngresos: redondear(
        resumenAnalizado.porcentajeGastosSobreIngresos
      ),
      porcentajeAhorroSobreIngresos: redondear(
        resumenAnalizado.porcentajeAhorroSobreIngresos
      ),
      porcentajeDeudasSobreIngresos: redondear(
        resumenAnalizado.porcentajeDeudasSobreIngresos
      ),
    },
    perfilFinanciero: {
      nivel: analisisFinanciero.perfilFinanciero?.nivel || 'Sin datos',
      estado: analisisFinanciero.perfilFinanciero?.estado || 'neutral',
      descripcion: limpiarTexto(
        analisisFinanciero.perfilFinanciero?.descripcion || '',
        180
      ),
    },
    hallazgos: limitarLista(analisisFinanciero.hallazgos || [], 10).map(
      normalizarHallazgo
    ),
    prioridadesDetectadas: limitarLista(
      analisisFinanciero.prioridadesDetectadas || [],
      8
    ).map((prioridad) => limpiarTexto(prioridad, 80)),
    categorias: {
      categoriaPrincipalGasto:
        analisisCategorias.categoriaPrincipal || null,
      descripcion: limpiarTexto(analisisCategorias.descripcion || '', 180),
      gastosPorCategoria: limitarLista(
        analisisCategorias.gastosPorCategoria || [],
        10
      ).map(normalizarCategoria),
    },
    movimientos: {
      totalProcesados: movimientosProcesados.length,
      totalEnviados: muestraMovimientos.length,
      muestra: muestraMovimientos,
      recientes: movimientosRecientes,
      mayorValor: movimientosMayorValor,
    },
    metricasBase: {
      saludFinanciera: metricasBase.saludFinanciera || null,
      alertas: limitarLista(metricasBase.alertas || [], 8).map((alerta) =>
        limpiarTexto(alerta, 160)
      ),
      indicadores: metricasBase.indicadores || null,
    },
    predicciones: normalizarPredicciones(estimacionesFuturas),
    instruccionesParaLLM: [
      'Usar únicamente la información incluida en este contexto.',
      'No inventar movimientos, ingresos, gastos, deudas ni ahorros.',
      'No solicitar información personal adicional.',
      'No mencionar identificadores técnicos ni estructuras internas.',
      'Responder en lenguaje claro y comprensible.',
      'Aclarar cuando el análisis o predicción sea aproximado por falta de datos.',
      'No recomendar productos financieros específicos.',
    ],
  };

  return {
    exito: true,
    mensaje: 'Información financiera del usuario procesada para LLM.',
    contextoLLM,
    analisisOriginal: analisisFinanciero,
    estimacionesOriginales: estimacionesFuturas,
    generadoEn: new Date().toISOString(),
  };
};

export const prepararInformacionFinancieraUsuarioParaLLM = async ({
  periodo = obtenerPeriodoMesActual(),
  casoUso = CASOS_USO_LLM.GENERAL,
  incluirEstimaciones = true,
  mesesHistorial = 6,
  mesesPrediccion = 3,
  limiteMovimientos = 20,
} = {}) => {
  const analisisFinanciero = await obtenerAnalisisFinancieroUsuario(periodo);

  let estimacionesFuturas = null;

  if (incluirEstimaciones) {
    try {
      estimacionesFuturas = await calcularEstimacionesFuturasUsuario({
        mesesHistorial,
        mesesPrediccion,
      });
    } catch (error) {
      estimacionesFuturas = {
        exito: false,
        estado: 'no_disponible',
        advertencias: [
          error.message ||
            'No fue posible calcular estimaciones futuras para el contexto LLM.',
        ],
      };
    }
  }

  return procesarContextoFinancieroParaLLM({
    analisisFinanciero,
    estimacionesFuturas,
    casoUso,
    limiteMovimientos,
  });
};