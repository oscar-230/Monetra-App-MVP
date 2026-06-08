// frontend/src/services/automatedFinancialAnalysisService.js

import { obtenerPeriodoMesActual } from './financialReportsService';

import {
  generarAnalisisIADesdeContextoProcesado,
} from './aiFinancialAnalysisService';

import {
  procesarAnalisisFinancieroParaIA,
  procesarInformacionFinancieraUsuario,
} from './financialDataProcessorService';

export const ESTADOS_ANALISIS_AUTOMATICO = {
  GENERADO: 'generado',
  GENERADO_CON_ADVERTENCIAS: 'generado_con_advertencias',
  SIN_DATOS: 'sin_datos',
  ERROR: 'error',
};

const generarIdAnalisis = (periodo = null) => {
  const fecha = new Date().toISOString().replace(/[:.]/g, '-');

  const inicio = periodo?.fechaInicio || 'sin-inicio';
  const fin = periodo?.fechaFin || 'sin-fin';

  return `analisis-${inicio}-${fin}-${fecha}`;
};

const limpiarTexto = (valor) => String(valor || '').trim();

const normalizarListaTexto = (lista) => {
  if (!Array.isArray(lista)) return [];

  return lista
    .map((item) => limpiarTexto(item))
    .filter(Boolean);
};

const normalizarPatrones = (patrones) => {
  if (!Array.isArray(patrones)) return [];

  return patrones.map((patron, index) => ({
    id: patron.id || `patron-auto-${index + 1}`,
    titulo: limpiarTexto(patron.titulo || `Patrón ${index + 1}`),
    descripcion: limpiarTexto(patron.descripcion),
    categoria: limpiarTexto(patron.categoria || 'general'),
    nivel: limpiarTexto(patron.nivel || 'informativo'),
  }));
};

const validarAnalisisGenerado = (analisis) => {
  if (!analisis) {
    throw new Error('No se recibió un análisis generado.');
  }

  const resumenEjecutivo = limpiarTexto(analisis.resumenEjecutivo);
  const mensajeFinal = limpiarTexto(analisis.mensajeFinal);

  if (!resumenEjecutivo) {
    throw new Error('El análisis generado no contiene resumen ejecutivo.');
  }

  if (!mensajeFinal) {
    throw new Error('El análisis generado no contiene mensaje final.');
  }

  return {
    ...analisis,
    resumenEjecutivo,
    patronesDetectados: normalizarPatrones(analisis.patronesDetectados),
    conclusiones: normalizarListaTexto(analisis.conclusiones),
    oportunidadesMejora: normalizarListaTexto(analisis.oportunidadesMejora),
    mensajeFinal,
  };
};

const crearConclusionesLocales = (contextoIA) => {
  const resumen = contextoIA?.resumenFinanciero || {};
  const conclusiones = [];

  if (!resumen.totalMovimientos) {
    conclusiones.push(
      'No hay movimientos suficientes para generar un análisis financiero detallado.'
    );

    return conclusiones;
  }

  if (resumen.flujoNeto < 0) {
    conclusiones.push(
      'Los egresos superan los ingresos en el período analizado.'
    );
  } else if (resumen.flujoNeto > 0) {
    conclusiones.push(
      'Los ingresos superan los egresos en el período analizado.'
    );
  } else {
    conclusiones.push(
      'Los ingresos y egresos se encuentran equilibrados en el período.'
    );
  }

  if (resumen.porcentajeGastosSobreIngresos > 80) {
    conclusiones.push(
      'Los gastos representan una proporción alta frente a los ingresos.'
    );
  }

  if (resumen.porcentajeAhorroSobreIngresos < 10) {
    conclusiones.push(
      'El ahorro registrado es bajo frente a los ingresos del período.'
    );
  }

  if (resumen.porcentajeDeudasSobreIngresos > 30) {
    conclusiones.push(
      'Las deudas representan una proporción importante frente a los ingresos.'
    );
  }

  return conclusiones;
};

const crearOportunidadesLocales = (contextoIA) => {
  const prioridades = contextoIA?.prioridadesDetectadas || [];
  const oportunidades = [];

  if (prioridades.includes('control_gastos')) {
    oportunidades.push(
      'Revisar las categorías con mayor gasto y definir límites de consumo.'
    );
  }

  if (prioridades.includes('fortalecer_ahorro')) {
    oportunidades.push(
      'Separar un porcentaje fijo de los ingresos para ahorro antes de gastar.'
    );
  }

  if (prioridades.includes('control_deudas')) {
    oportunidades.push(
      'Organizar los pagos de deudas y evitar asumir nuevos compromisos innecesarios.'
    );
  }

  if (prioridades.includes('mejorar_flujo_neto')) {
    oportunidades.push(
      'Reducir egresos no esenciales para mejorar el flujo neto del período.'
    );
  }

  if (oportunidades.length === 0) {
    oportunidades.push(
      'Mantener el registro constante de movimientos para mejorar la calidad del análisis.'
    );
  }

  return oportunidades;
};

const crearAnalisisLocalDeRespaldo = ({
  contextoProcesado,
  error = null,
}) => {
  const contextoIA = contextoProcesado?.contextoIA || {};
  const resumen = contextoIA.resumenFinanciero || {};
  const calidadDatos = contextoIA.calidadDatos || {};

  const patronesBase = contextoIA.patronesBase || [];

  const patronesDetectados = patronesBase.map((patron, index) => ({
    id: patron.id || `patron-local-${index + 1}`,
    titulo: patron.titulo || `Patrón ${index + 1}`,
    descripcion: patron.descripcion || '',
    categoria: patron.categoria || 'general',
    nivel: patron.nivel || 'informativo',
  }));

  const totalMovimientos = resumen.totalMovimientos || 0;

  const resumenEjecutivo =
    totalMovimientos === 0
      ? 'No hay movimientos suficientes para generar un análisis financiero detallado. Registra ingresos, gastos, ahorros o deudas para obtener mejores conclusiones.'
      : `Se analizaron ${totalMovimientos} movimientos financieros del período seleccionado. El flujo neto registrado es ${resumen.flujoNeto || 0}, con gastos equivalentes al ${resumen.porcentajeGastosSobreIngresos || 0}% de los ingresos.`;

  return {
    resumenEjecutivo,
    patronesDetectados,
    conclusiones: crearConclusionesLocales(contextoIA),
    oportunidadesMejora: crearOportunidadesLocales(contextoIA),
    mensajeFinal:
      totalMovimientos === 0
        ? 'Registra más movimientos para recibir un análisis financiero más útil.'
        : 'Este análisis puede ayudarte a identificar hábitos y tomar mejores decisiones financieras.',
    periodo: contextoIA.periodo || null,
    perfilFinanciero: contextoIA.perfilFinanciero || null,
    calidadDatos,
    prioridadesDetectadas: contextoIA.prioridadesDetectadas || [],
    fuente: 'analisis-automatico-local',
    errorOriginal: error?.message || null,
    generadoEn: new Date().toISOString(),
  };
};

const construirRespuestaAutomatizada = ({
  contextoProcesado,
  analisis,
  modelo = 'gemini-2.5-flash',
  estado = ESTADOS_ANALISIS_AUTOMATICO.GENERADO,
  mensaje = 'Análisis automatizado generado correctamente.',
  tiempoRespuestaMs = 0,
  generadoPorIA = true,
  advertencias = [],
}) => {
  const contextoIA = contextoProcesado?.contextoIA || {};

  return {
    exito: true,
    id: generarIdAnalisis(contextoIA.periodo),
    estado,
    mensaje,
    automatizado: true,
    generadoPorIA,
    modelo,
    periodo: contextoIA.periodo || null,
    analisis,
    contextoResumen: {
      perfilFinanciero: contextoIA.perfilFinanciero || null,
      calidadDatos: contextoIA.calidadDatos || null,
      resumenFinanciero: contextoIA.resumenFinanciero || null,
      prioridadesDetectadas: contextoIA.prioridadesDetectadas || [],
    },
    advertencias,
    tiempoRespuestaMs,
    generadoEn: new Date().toISOString(),
  };
};

export const generarAnalisisFinancieroAutomatizadoDesdeContexto = async ({
  contextoProcesado,
  permitirRespaldoLocal = true,
} = {}) => {
  if (!contextoProcesado?.contextoIA) {
    throw new Error(
      'No se recibió información financiera procesada para generar el análisis automatizado.'
    );
  }

  const inicio = Date.now();
  const contextoIA = contextoProcesado.contextoIA;
  const calidadDatos = contextoIA.calidadDatos || {};

  if (!calidadDatos.datosSuficientes) {
    const analisisLocal = crearAnalisisLocalDeRespaldo({
      contextoProcesado,
    });

    return construirRespuestaAutomatizada({
      contextoProcesado,
      analisis: analisisLocal,
      modelo: 'analisis-local',
      estado: ESTADOS_ANALISIS_AUTOMATICO.SIN_DATOS,
      mensaje:
        'No hay datos suficientes para generar un análisis con IA. Se generó un análisis básico.',
      tiempoRespuestaMs: Date.now() - inicio,
      generadoPorIA: false,
      advertencias: calidadDatos.advertencias || [],
    });
  }

  try {
    const resultadoIA = await generarAnalisisIADesdeContextoProcesado({
      contextoProcesado,
    });

    const analisisValidado = validarAnalisisGenerado(
      resultadoIA.analisis
    );

    const advertencias = calidadDatos.advertencias || [];

    return construirRespuestaAutomatizada({
      contextoProcesado,
      analisis: analisisValidado,
      modelo: resultadoIA.modelo || 'gemini-2.5-flash',
      estado:
        advertencias.length > 0
          ? ESTADOS_ANALISIS_AUTOMATICO.GENERADO_CON_ADVERTENCIAS
          : ESTADOS_ANALISIS_AUTOMATICO.GENERADO,
      mensaje:
        advertencias.length > 0
          ? 'Análisis generado correctamente, pero existen advertencias sobre la calidad de los datos.'
          : 'Análisis automatizado generado correctamente.',
      tiempoRespuestaMs: Date.now() - inicio,
      generadoPorIA: true,
      advertencias,
    });
  } catch (error) {
    if (!permitirRespaldoLocal) {
      throw error;
    }

    const analisisLocal = crearAnalisisLocalDeRespaldo({
      contextoProcesado,
      error,
    });

    return construirRespuestaAutomatizada({
      contextoProcesado,
      analisis: analisisLocal,
      modelo: 'analisis-local',
      estado: ESTADOS_ANALISIS_AUTOMATICO.GENERADO_CON_ADVERTENCIAS,
      mensaje:
        'No fue posible generar el análisis con IA. Se generó un análisis automático de respaldo.',
      tiempoRespuestaMs: Date.now() - inicio,
      generadoPorIA: false,
      advertencias: [
        ...(calidadDatos.advertencias || []),
        error.message || 'Error al generar análisis con IA.',
      ],
    });
  }
};

export const generarAnalisisFinancieroAutomatizadoDesdeAnalisis = async ({
  analisisFinanciero,
  permitirRespaldoLocal = true,
} = {}) => {
  if (!analisisFinanciero) {
    throw new Error(
      'No se recibió el análisis financiero base para generar el análisis automatizado.'
    );
  }

  const contextoProcesado = procesarAnalisisFinancieroParaIA({
    analisisFinanciero,
  });

  return generarAnalisisFinancieroAutomatizadoDesdeContexto({
    contextoProcesado,
    permitirRespaldoLocal,
  });
};

export const generarAnalisisFinancieroAutomatizado = async ({
  periodo = obtenerPeriodoMesActual(),
  permitirRespaldoLocal = true,
} = {}) => {
  const contextoProcesado = await procesarInformacionFinancieraUsuario(
    periodo
  );

  return generarAnalisisFinancieroAutomatizadoDesdeContexto({
    contextoProcesado,
    permitirRespaldoLocal,
  });
};