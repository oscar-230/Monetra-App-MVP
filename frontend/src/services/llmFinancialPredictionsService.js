// frontend/src/services/llmFinancialPredictionsService.js

import { generarContenidoConGemini } from './geminiService';

import {
  CASOS_USO_LLM,
  prepararInformacionFinancieraUsuarioParaLLM,
} from './llmFinancialContextService';

import { obtenerPeriodoMesActual } from './financialReportsService';

export const ESTADOS_PREDICCIONES_LLM = {
  GENERADAS: 'generadas',
  GENERADAS_CON_ADVERTENCIAS: 'generadas_con_advertencias',
  GENERADAS_CON_RESPALDO: 'generadas_con_respaldo',
  SIN_DATOS: 'sin_datos',
  ERROR: 'error',
};

const limpiarTexto = (valor) => String(valor || '').trim();

const redondear = (valor, decimales = 2) => {
  const numero = Number(valor) || 0;
  const factor = 10 ** decimales;

  return Math.round((numero + Number.EPSILON) * factor) / factor;
};

const formatearCOP = (valor) => {
  const numero = Number(valor) || 0;

  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(numero);
};

const generarIdPrediccion = (periodo = null, horizonte = null) => {
  const fecha = new Date().toISOString().replace(/[:.]/g, '-');

  const inicio = periodo?.fechaInicio || 'sin-inicio';
  const fin = periodo?.fechaFin || 'sin-fin';
  const meses = horizonte?.mesesPrediccion || 0;

  return `prediccion-llm-${inicio}-${fin}-${meses}m-${fecha}`;
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

const obtenerPrediccionesDelContexto = (contextoProcesado) => {
  return contextoProcesado?.contextoLLM?.predicciones || null;
};

const tienePrediccionesDisponibles = (predicciones) => {
  return Boolean(
    predicciones?.disponible &&
      Array.isArray(predicciones.estimacionesMensuales) &&
      predicciones.estimacionesMensuales.length > 0
  );
};

const construirPromptPrediccionesFinancieras = (contextoLLM) => {
  return `
Eres el asistente financiero de Monetra.

Tu tarea es generar predicciones financieras claras y comprensibles para el usuario, usando únicamente el historial financiero y las estimaciones disponibles.

Usa únicamente la información entregada en el contexto.
No inventes gastos, ingresos, fechas, categorías ni montos.
No recomiendes productos financieros, créditos, inversiones ni entidades.
No menciones que eres una IA.
No menciones identificadores técnicos, UID, IDs de documentos ni estructuras internas.
El usuario debe entender que las predicciones son aproximaciones basadas en datos históricos.

Responde únicamente en JSON válido, sin markdown, sin bloque de código y sin texto adicional.

La estructura exacta debe ser:

{
  "resumenPredictivo": "Resumen breve de la predicción financiera.",
  "horizonteAnalizado": "Descripción del período futuro estimado.",
  "predicciones": [
    {
      "periodo": "Mes o período estimado",
      "gastoEstimado": 0,
      "rangoMinimo": 0,
      "rangoMaximo": 0,
      "interpretacion": "Explicación clara del resultado estimado",
      "nivelConfianza": "alta | media | baja",
      "categoriaPrincipalEsperada": "Categoría esperada o Sin datos",
      "advertencia": "Advertencia específica si aplica"
    }
  ],
  "escenarios": {
    "optimista": "Escenario con menor gasto estimado",
    "probable": "Escenario más probable",
    "preventivo": "Escenario de mayor gasto o de cuidado"
  },
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
}

Reglas:
- Genera máximo 6 predicciones mensuales.
- Usa los rangos mínimo, probable y máximo cuando existan.
- Explica las predicciones en lenguaje sencillo.
- Si la confianza es baja, dilo claramente.
- Incluye siempre una advertencia indicando que son aproximaciones.
- Relaciona las predicciones con hábitos de gasto, ahorro o planificación.

Contexto financiero del usuario:

${JSON.stringify(contextoLLM, null, 2)}
`;
};

const normalizarPrediccionesIA = (predicciones) => {
  if (!Array.isArray(predicciones)) return [];

  return predicciones.slice(0, 6).map((prediccion, index) => ({
    id: prediccion.id || `prediccion-${index + 1}`,
    periodo: limpiarTexto(prediccion.periodo || `Período ${index + 1}`),
    gastoEstimado: redondear(prediccion.gastoEstimado),
    rangoMinimo: redondear(prediccion.rangoMinimo),
    rangoMaximo: redondear(prediccion.rangoMaximo),
    interpretacion: limpiarTexto(prediccion.interpretacion),
    nivelConfianza: limpiarTexto(prediccion.nivelConfianza || 'media'),
    categoriaPrincipalEsperada: limpiarTexto(
      prediccion.categoriaPrincipalEsperada || 'Sin datos'
    ),
    advertencia: limpiarTexto(prediccion.advertencia || ''),
  }));
};

const validarPrediccionGenerada = (respuestaIA) => {
  if (!respuestaIA) {
    throw new Error('No se recibió una predicción financiera generada.');
  }

  const resumenPredictivo = limpiarTexto(respuestaIA.resumenPredictivo);
  const mensajeFinal = limpiarTexto(respuestaIA.mensajeFinal);

  if (!resumenPredictivo) {
    throw new Error('La predicción financiera no contiene resumen predictivo.');
  }

  if (!mensajeFinal) {
    throw new Error('La predicción financiera no contiene mensaje final.');
  }

  return {
    resumenPredictivo,
    horizonteAnalizado: limpiarTexto(respuestaIA.horizonteAnalizado),
    predicciones: normalizarPrediccionesIA(respuestaIA.predicciones),
    escenarios: {
      optimista: limpiarTexto(respuestaIA.escenarios?.optimista),
      probable: limpiarTexto(respuestaIA.escenarios?.probable),
      preventivo: limpiarTexto(respuestaIA.escenarios?.preventivo),
    },
    conclusiones: normalizarListaTexto(respuestaIA.conclusiones),
    accionesSugeridas: normalizarListaTexto(respuestaIA.accionesSugeridas),
    advertencias: normalizarListaTexto(respuestaIA.advertencias),
    mensajeFinal,
  };
};

const obtenerCategoriaPrincipalEstimada = (estimacionMensual) => {
  const categorias = estimacionMensual?.categoriasEstimadas || [];

  if (!Array.isArray(categorias) || categorias.length === 0) {
    return 'Sin datos';
  }

  const categoriaMayor = [...categorias].sort(
    (a, b) => (b.gastoEstimado || 0) - (a.gastoEstimado || 0)
  )[0];

  return categoriaMayor?.categoria || 'Sin datos';
};

const construirPrediccionesLocales = (prediccionesContexto) => {
  const confianza = prediccionesContexto?.confianza || {};

  return (prediccionesContexto?.estimacionesMensuales || []).map(
    (estimacion, index) => ({
      id: `prediccion-local-${index + 1}`,
      periodo: estimacion.nombreMes || estimacion.mes || `Mes ${index + 1}`,
      gastoEstimado: redondear(estimacion.estimacionProbable),
      rangoMinimo: redondear(estimacion.estimacionMinima),
      rangoMaximo: redondear(estimacion.estimacionMaxima),
      interpretacion: `Para ${estimacion.nombreMes || estimacion.mes}, el gasto probable estimado es ${formatearCOP(
        estimacion.estimacionProbable
      )}.`,
      nivelConfianza: confianza.nivel || 'media',
      categoriaPrincipalEsperada: obtenerCategoriaPrincipalEstimada(estimacion),
      advertencia:
        confianza.nivel === 'baja'
          ? 'La confianza de esta predicción es baja por la cantidad o variabilidad de los datos.'
          : 'Predicción aproximada basada en historial financiero.',
    })
  );
};

const construirPrediccionLocal = ({ contextoProcesado, error = null }) => {
  const contextoLLM = contextoProcesado?.contextoLLM || {};
  const prediccionesContexto = contextoLLM.predicciones || {};
  const calidad = contextoLLM.calidadContexto || {};

  if (!tienePrediccionesDisponibles(prediccionesContexto)) {
    return {
      resumenPredictivo:
        'No hay historial financiero suficiente para generar predicciones futuras detalladas.',
      horizonteAnalizado: 'Sin horizonte disponible',
      predicciones: [],
      escenarios: {
        optimista:
          'No es posible calcular un escenario optimista sin historial suficiente.',
        probable:
          'No es posible calcular un escenario probable sin datos históricos.',
        preventivo:
          'Registra más movimientos para obtener predicciones más útiles.',
      },
      conclusiones: [
        'La predicción financiera es limitada por falta de datos históricos.',
        'Mientras más movimientos se registren, más útiles serán las estimaciones.',
      ],
      accionesSugeridas: [
        'Registrar gastos de forma constante durante varios períodos.',
        'Clasificar los gastos por categoría para mejorar futuras predicciones.',
      ],
      advertencias: [
        'No hay datos suficientes para generar predicciones confiables.',
        ...(calidad.advertencias || []),
      ],
      mensajeFinal:
        'Registra más movimientos financieros para obtener predicciones futuras más precisas.',
      fuente: 'prediccion-local',
      errorOriginal: error?.message || null,
    };
  }

  const estimacionTotal = prediccionesContexto.estimacionTotal || {};
  const tendencia = prediccionesContexto.tendenciaEstimaciones || {};
  const confianza = prediccionesContexto.confianza || {};

  const prediccionesLocales = construirPrediccionesLocales(
    prediccionesContexto
  );

  return {
    resumenPredictivo: `Con base en el historial registrado, el gasto futuro probable estimado es ${formatearCOP(
      estimacionTotal.estimacionProbable
    )}. El rango estimado se encuentra entre ${formatearCOP(
      estimacionTotal.estimacionMinima
    )} y ${formatearCOP(estimacionTotal.estimacionMaxima)}.`,
    horizonteAnalizado: `Predicción para ${
      prediccionesContexto.horizontePrediccion?.mesesPrediccion || 0
    } mes(es) futuros.`,
    predicciones: prediccionesLocales,
    escenarios: {
      optimista: `Si el gasto se mantiene controlado, podría acercarse a ${formatearCOP(
        estimacionTotal.estimacionMinima
      )}.`,
      probable: `El escenario más probable estima un gasto cercano a ${formatearCOP(
        estimacionTotal.estimacionProbable
      )}.`,
      preventivo: `Si los gastos aumentan, podrían acercarse a ${formatearCOP(
        estimacionTotal.estimacionMaxima
      )}.`,
    },
    conclusiones: [
      tendencia.descripcion ||
        'La tendencia futura depende del comportamiento registrado en el historial.',
      confianza.descripcion ||
        'La confianza depende de la cantidad y consistencia de los datos disponibles.',
    ],
    accionesSugeridas: [
      'Usar el rango máximo como referencia preventiva para planificar el presupuesto.',
      'Revisar las categorías con mayor gasto esperado antes del siguiente período.',
      'Actualizar los movimientos constantemente para mejorar futuras predicciones.',
    ],
    advertencias: [
      'Las predicciones son aproximaciones basadas en datos históricos.',
      'Los resultados pueden cambiar cuando se registren nuevos movimientos.',
      ...(prediccionesContexto.advertencias || []),
      ...(calidad.advertencias || []),
    ],
    mensajeFinal:
      'Usa esta predicción como una guía para planificar, no como un valor exacto.',
    fuente: 'prediccion-local',
    errorOriginal: error?.message || null,
  };
};

const construirRespuestaPredicciones = ({
  contextoProcesado,
  prediccion,
  generadoPorLLM,
  modelo,
  estado,
  mensaje,
  tiempoRespuestaMs,
  textoOriginal = '',
  advertencias = [],
}) => {
  const contextoLLM = contextoProcesado?.contextoLLM || {};
  const prediccionesContexto = contextoLLM.predicciones || {};

  return {
    exito: true,
    id: generarIdPrediccion(
      prediccionesContexto.periodoHistorico,
      prediccionesContexto.horizontePrediccion
    ),
    estado,
    mensaje,
    generadoPorLLM,
    modelo,
    periodoHistorico: prediccionesContexto.periodoHistorico || null,
    horizontePrediccion: prediccionesContexto.horizontePrediccion || null,
    prediccion,
    contextoResumen: {
      resumenFinanciero: contextoLLM.resumenFinanciero || null,
      prediccionesBase: prediccionesContexto,
      calidadContexto: contextoLLM.calidadContexto || null,
    },
    textoOriginal,
    advertencias,
    tiempoRespuestaMs,
    generadoEn: new Date().toISOString(),
  };
};

export const generarPrediccionesFinancierasLLMDesdeContexto = async ({
  contextoProcesado,
  permitirRespaldoLocal = true,
} = {}) => {
  if (!contextoProcesado?.contextoLLM) {
    throw new Error(
      'No se recibió contexto financiero procesado para generar predicciones financieras.'
    );
  }

  const inicio = Date.now();
  const contextoLLM = contextoProcesado.contextoLLM;
  const prediccionesContexto = obtenerPrediccionesDelContexto(contextoProcesado);
  const calidad = contextoLLM.calidadContexto || {};

  if (!tienePrediccionesDisponibles(prediccionesContexto)) {
    const prediccionLocal = construirPrediccionLocal({
      contextoProcesado,
    });

    return construirRespuestaPredicciones({
      contextoProcesado,
      prediccion: prediccionLocal,
      generadoPorLLM: false,
      modelo: 'prediccion-local',
      estado: ESTADOS_PREDICCIONES_LLM.SIN_DATOS,
      mensaje:
        'No hay datos suficientes para generar predicciones con LLM. Se generó una respuesta básica.',
      tiempoRespuestaMs: Date.now() - inicio,
      advertencias: prediccionLocal.advertencias,
    });
  }

  try {
    const prompt = construirPromptPrediccionesFinancieras(contextoLLM);

    const respuestaGemini = await generarContenidoConGemini({
      prompt,
      temperature: 0.3,
      maxOutputTokens: 1600,
      responseMimeType: 'application/json',
    });

    const respuestaJson = extraerJsonDesdeRespuesta(respuestaGemini.texto);

    const prediccionValidada = validarPrediccionGenerada(respuestaJson);

    const advertencias = [
      ...(prediccionValidada.advertencias || []),
      ...(prediccionesContexto.advertencias || []),
      ...(calidad.advertencias || []),
    ];

    return construirRespuestaPredicciones({
      contextoProcesado,
      prediccion: prediccionValidada,
      generadoPorLLM: true,
      modelo: respuestaGemini.modelo,
      estado:
        advertencias.length > 0
          ? ESTADOS_PREDICCIONES_LLM.GENERADAS_CON_ADVERTENCIAS
          : ESTADOS_PREDICCIONES_LLM.GENERADAS,
      mensaje:
        advertencias.length > 0
          ? 'Predicciones financieras generadas con advertencias.'
          : 'Predicciones financieras generadas correctamente.',
      tiempoRespuestaMs: Date.now() - inicio,
      textoOriginal: respuestaGemini.texto,
      advertencias,
    });
  } catch (error) {
    if (!permitirRespaldoLocal) {
      throw error;
    }

    const prediccionLocal = construirPrediccionLocal({
      contextoProcesado,
      error,
    });

    return construirRespuestaPredicciones({
      contextoProcesado,
      prediccion: prediccionLocal,
      generadoPorLLM: false,
      modelo: 'prediccion-local',
      estado: ESTADOS_PREDICCIONES_LLM.GENERADAS_CON_RESPALDO,
      mensaje:
        'No fue posible generar predicciones con LLM. Se generó una predicción financiera de respaldo.',
      tiempoRespuestaMs: Date.now() - inicio,
      advertencias: [
        ...(prediccionLocal.advertencias || []),
        error.message || 'Error al generar predicciones financieras con LLM.',
      ],
    });
  }
};

export const generarPrediccionesFinancierasLLMUsuario = async ({
  periodo = obtenerPeriodoMesActual(),
  mesesHistorial = 6,
  mesesPrediccion = 3,
  limiteMovimientos = 20,
  permitirRespaldoLocal = true,
} = {}) => {
  const contextoProcesado = await prepararInformacionFinancieraUsuarioParaLLM({
    periodo,
    casoUso: CASOS_USO_LLM.PREDICCIONES,
    incluirEstimaciones: true,
    mesesHistorial,
    mesesPrediccion,
    limiteMovimientos,
  });

  return generarPrediccionesFinancierasLLMDesdeContexto({
    contextoProcesado,
    permitirRespaldoLocal,
  });
};