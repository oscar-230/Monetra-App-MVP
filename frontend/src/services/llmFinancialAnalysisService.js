// frontend/src/services/llmFinancialAnalysisService.js

import { generarContenidoConGemini } from './geminiService';

import {
  CASOS_USO_LLM,
  prepararInformacionFinancieraUsuarioParaLLM,
} from './llmFinancialContextService';

import {
  construirPromptAnalisisFinancieroIA,
  validarPromptAnalisisFinanciero,
} from './financialAnalysisPromptsService';

import { obtenerPeriodoMesActual } from './financialReportsService';

export const ESTADOS_ANALISIS_LLM = {
  GENERADO: 'generado',
  GENERADO_CON_ADVERTENCIAS: 'generado_con_advertencias',
  GENERADO_CON_RESPALDO: 'generado_con_respaldo',
  SIN_DATOS: 'sin_datos',
  ERROR: 'error',
};

const limpiarTexto = (valor) => String(valor || '').trim();

const generarIdAnalisis = (periodo = null) => {
  const fecha = new Date().toISOString().replace(/[:.]/g, '-');

  const inicio = periodo?.fechaInicio || 'sin-inicio';
  const fin = periodo?.fechaFin || 'sin-fin';

  return `analisis-llm-${inicio}-${fin}-${fecha}`;
};

const extraerJsonDesdeRespuesta = (texto) => {
  try {
    return JSON.parse(texto);
  } catch {
    const coincidenciaJson = texto.match(/\{[\s\S]*\}/);

    if (!coincidenciaJson) {
      throw new Error('La respuesta del LLM no contiene un JSON válido.');
    }

    return JSON.parse(coincidenciaJson[0]);
  }
};

const normalizarListaTexto = (lista) => {
  if (!Array.isArray(lista)) return [];

  return lista
    .map((item) => limpiarTexto(item))
    .filter(Boolean);
};

const normalizarPatronesDetectados = (patrones) => {
  if (!Array.isArray(patrones)) return [];

  return patrones.slice(0, 6).map((patron, index) => ({
    id: patron.id || `patron-${index + 1}`,
    titulo: limpiarTexto(patron.titulo || `Patrón ${index + 1}`),
    descripcion: limpiarTexto(patron.descripcion),
    categoria: limpiarTexto(patron.categoria || 'general'),
    nivel: limpiarTexto(patron.nivel || 'informativo'),
    evidencia: limpiarTexto(patron.evidencia || ''),
  }));
};

const validarAnalisisGenerado = (analisis) => {
  if (!analisis) {
    throw new Error('No se recibió análisis financiero generado.');
  }

  const resumenEjecutivo = limpiarTexto(analisis.resumenEjecutivo);
  const mensajeFinal = limpiarTexto(analisis.mensajeFinal);

  if (!resumenEjecutivo) {
    throw new Error('El análisis financiero no contiene resumen ejecutivo.');
  }

  if (!mensajeFinal) {
    throw new Error('El análisis financiero no contiene mensaje final.');
  }

  return {
    resumenEjecutivo,
    patronesDetectados: normalizarPatronesDetectados(
      analisis.patronesDetectados
    ),
    conclusiones: normalizarListaTexto(analisis.conclusiones),
    oportunidadesMejora: normalizarListaTexto(
      analisis.oportunidadesMejora
    ),
    advertencias: normalizarListaTexto(analisis.advertencias),
    mensajeFinal,
  };
};

const construirAnalisisLocal = ({ contextoProcesado, error = null }) => {
  const contextoLLM = contextoProcesado?.contextoLLM || {};
  const resumen = contextoLLM.resumenFinanciero || {};
  const calidad = contextoLLM.calidadContexto || {};
  const hallazgos = contextoLLM.hallazgos || [];

  const totalMovimientos = resumen.totalMovimientos || 0;

  if (!totalMovimientos) {
    return {
      resumenEjecutivo:
        'No hay movimientos financieros suficientes para generar un análisis completo. Registra ingresos, gastos, ahorros o deudas para obtener conclusiones más útiles.',
      patronesDetectados: [
        {
          id: 'sin-datos',
          titulo: 'Información insuficiente',
          descripcion:
            'No se encontraron movimientos suficientes para identificar hábitos financieros.',
          categoria: 'general',
          nivel: 'advertencia',
          evidencia: 'Total de movimientos: 0',
        },
      ],
      conclusiones: [
        'El análisis financiero es limitado porque no hay historial suficiente.',
        'Mientras más movimientos registre el usuario, más preciso será el análisis.',
      ],
      oportunidadesMejora: [
        'Registrar movimientos de ingresos y gastos de forma constante.',
        'Clasificar los gastos por categoría para mejorar futuros análisis.',
      ],
      advertencias: [
        'El análisis se generó con información limitada.',
        ...(calidad.advertencias || []),
      ],
      mensajeFinal:
        'Empieza registrando tus movimientos financieros para recibir análisis más completos.',
      fuente: 'analisis-local',
      errorOriginal: error?.message || null,
    };
  }

  const patronesDetectados = hallazgos.slice(0, 6).map((hallazgo, index) => ({
    id: hallazgo.id || `hallazgo-${index + 1}`,
    titulo: hallazgo.titulo,
    descripcion: hallazgo.descripcion,
    categoria: hallazgo.categoria || 'general',
    nivel: hallazgo.nivel || 'informativo',
    evidencia:
      hallazgo.valor !== null && hallazgo.valor !== undefined
        ? String(hallazgo.valor)
        : '',
  }));

  const conclusiones = [];

  if (resumen.flujoNeto < 0) {
    conclusiones.push(
      'El flujo neto es negativo, lo que indica que los egresos superan los ingresos del período.'
    );
  } else if (resumen.flujoNeto > 0) {
    conclusiones.push(
      'El flujo neto es positivo, lo que indica que los ingresos superan los egresos del período.'
    );
  }

  if (resumen.porcentajeGastosSobreIngresos > 80) {
    conclusiones.push(
      'Los gastos representan una proporción alta frente a los ingresos.'
    );
  }

  if (resumen.porcentajeAhorroSobreIngresos < 10) {
         'Los gastos representan una proporción alta frente a los ingresos.'
    conclusiones.push(
      'El ahorro registrado es bajo frente a los ingresos del período.'
    );
  }

  if (conclusiones.length === 0) {
    conclusiones.push(
      'El comportamiento financiero del período no muestra alertas críticas con los datos disponibles.'
    );
  }

  return {
    resumenEjecutivo: `Se analizaron ${totalMovimientos} movimientos financieros del período seleccionado. Los gastos representan aproximadamente el ${resumen.porcentajeGastosSobreIngresos || 0}% de los ingresos y el flujo neto registrado es ${resumen.flujoNeto || 0}.`,
    patronesDetectados,
    conclusiones,
    oportunidadesMejora: [
      'Revisar las categorías con mayor gasto para identificar posibles ajustes.',
      'Mantener el registro constante de ingresos, gastos, ahorros y deudas.',
      'Usar el análisis como apoyo para tomar decisiones financieras más organizadas.',
    ],
    advertencias: [
      'Este análisis es aproximado y depende de la información registrada.',
      ...(calidad.advertencias || []),
    ],
    mensajeFinal:
      'Usa este análisis como una guía para entender tus hábitos y mejorar tu planificación financiera.',
    fuente: 'analisis-local',
    errorOriginal: error?.message || null,
  };
};

const construirRespuestaAnalisis = ({
  contextoProcesado,
  analisis,
  generadoPorLLM,
  modelo,
  estado,
  mensaje,
  tiempoRespuestaMs,
  textoOriginal = '',
  advertencias = [],
}) => {
  const contextoLLM = contextoProcesado?.contextoLLM || {};

  return {
    exito: true,
    id: generarIdAnalisis(contextoLLM.periodo),
    estado,
    mensaje,
    generadoPorLLM,
    modelo,
    periodo: contextoLLM.periodo || null,
    analisis,
    contextoResumen: {
      resumenFinanciero: contextoLLM.resumenFinanciero || null,
      perfilFinanciero: contextoLLM.perfilFinanciero || null,
      calidadContexto: contextoLLM.calidadContexto || null,
      prioridadesDetectadas: contextoLLM.prioridadesDetectadas || [],
    },
    textoOriginal,
    advertencias,
    tiempoRespuestaMs,
    generadoEn: new Date().toISOString(),
  };
};

export const generarAnalisisFinancieroLLMDesdeContexto = async ({
  contextoProcesado,
  permitirRespaldoLocal = true,
} = {}) => {
  if (!contextoProcesado?.contextoLLM) {
    throw new Error(
      'No se recibió contexto financiero procesado para generar análisis financiero.'
    );
  }

  const inicio = Date.now();
  const contextoLLM = contextoProcesado.contextoLLM;
  const calidad = contextoLLM.calidadContexto || {};

  if (!calidad.datosSuficientes) {
    const analisisLocal = construirAnalisisLocal({
      contextoProcesado,
    });

    return construirRespuestaAnalisis({
      contextoProcesado,
      analisis: analisisLocal,
      generadoPorLLM: false,
      modelo: 'analisis-local',
      estado: ESTADOS_ANALISIS_LLM.SIN_DATOS,
      mensaje:
        'No hay datos suficientes para generar análisis con LLM. Se generó un análisis básico.',
      tiempoRespuestaMs: Date.now() - inicio,
      advertencias: calidad.advertencias || [],
    });
  }

  try {
    const prompt = construirPromptAnalisisFinancieroIA(contextoProcesado, {
      tono: 'claro, responsable y fácil de entender',
      maxPatrones: 5,
      maxConclusiones: 3,
      maxOportunidades: 3,
    });

    validarPromptAnalisisFinanciero(prompt);

    const respuestaGemini = await generarContenidoConGemini({
      prompt,
      temperature: 0.3,
      maxOutputTokens: 1500,
      responseMimeType: 'application/json',
    });

    const respuestaJson = extraerJsonDesdeRespuesta(respuestaGemini.texto);

    const analisisValidado = validarAnalisisGenerado(respuestaJson);

    const advertencias = [
      ...(analisisValidado.advertencias || []),
      ...(calidad.advertencias || []),
    ];

    return construirRespuestaAnalisis({
      contextoProcesado,
      analisis: analisisValidado,
      generadoPorLLM: true,
      modelo: respuestaGemini.modelo,
      estado:
        advertencias.length > 0
          ? ESTADOS_ANALISIS_LLM.GENERADO_CON_ADVERTENCIAS
          : ESTADOS_ANALISIS_LLM.GENERADO,
      mensaje:
        advertencias.length > 0
          ? 'Análisis financiero generado con advertencias.'
          : 'Análisis financiero generado correctamente.',
      tiempoRespuestaMs: Date.now() - inicio,
      textoOriginal: respuestaGemini.texto,
      advertencias,
    });
  } catch (error) {
    if (!permitirRespaldoLocal) {
      throw error;
    }

    const analisisLocal = construirAnalisisLocal({
      contextoProcesado,
      error,
    });

    return construirRespuestaAnalisis({
      contextoProcesado,
      analisis: analisisLocal,
      generadoPorLLM: false,
      modelo: 'analisis-local',
      estado: ESTADOS_ANALISIS_LLM.GENERADO_CON_RESPALDO,
      mensaje:
        'No fue posible generar el análisis con LLM. Se generó un análisis financiero de respaldo.',
      tiempoRespuestaMs: Date.now() - inicio,
      advertencias: [
        ...(calidad.advertencias || []),
        error.message || 'Error al generar análisis financiero con LLM.',
      ],
    });
  }
};

export const generarAnalisisFinancieroLLMUsuario = async ({
  periodo = obtenerPeriodoMesActual(),
  incluirEstimaciones = true,
  mesesHistorial = 6,
  mesesPrediccion = 3,
  limiteMovimientos = 20,
  permitirRespaldoLocal = true,
} = {}) => {
  const contextoProcesado = await prepararInformacionFinancieraUsuarioParaLLM({
    periodo,
    casoUso: CASOS_USO_LLM.ANALISIS,
    incluirEstimaciones,
    mesesHistorial,
    mesesPrediccion,
    limiteMovimientos,
  });

  return generarAnalisisFinancieroLLMDesdeContexto({
    contextoProcesado,
    permitirRespaldoLocal,
  });
};