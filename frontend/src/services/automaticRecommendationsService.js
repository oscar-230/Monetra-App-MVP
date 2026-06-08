// frontend/src/services/automaticRecommendationsService.js

import { generarContenidoConGemini } from './geminiService';

import {
  CASOS_USO_LLM,
  prepararInformacionFinancieraUsuarioParaLLM,
} from './llmFinancialContextService';

import { obtenerPeriodoMesActual } from './financialReportsService';

import {
  crearEstructuraRecomendaciones,
  crearRecomendacion,
  FUENTES_RECOMENDACION,
  PRIORIDADES_RECOMENDACION,
  TIPOS_RECOMENDACION,
} from './recommendationStructureService';

export const ESTADOS_RECOMENDACIONES_AUTOMATICAS = {
  GENERADAS: 'generadas',
  GENERADAS_CON_RESPALDO: 'generadas_con_respaldo',
  SIN_DATOS: 'sin_datos',
  ERROR: 'error',
};

const limpiarTexto = (valor) => String(valor || '').trim();

const formatearCOP = (valor) => {
  const numero = Number(valor) || 0;

  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(numero);
};

const extraerJsonDesdeRespuesta = (texto) => {
  try {
    return JSON.parse(texto);
  } catch {
    const coincidenciaJson = texto.match(/\{[\s\S]*\}/);

    if (!coincidenciaJson) {
      throw new Error('La respuesta de Gemini no contiene un JSON válido.');
    }

    return JSON.parse(coincidenciaJson[0]);
  }
};

const normalizarTipoRecomendacion = (tipo) => {
  const valor = limpiarTexto(tipo).toLowerCase();

  if (Object.values(TIPOS_RECOMENDACION).includes(valor)) {
    return valor;
  }

  if (valor.includes('ahorro')) {
    return TIPOS_RECOMENDACION.AHORRO;
  }

  if (valor.includes('gasto')) {
    return TIPOS_RECOMENDACION.CONTROL_GASTOS;
  }

  if (valor.includes('deuda')) {
    return TIPOS_RECOMENDACION.DEUDAS;
  }

  if (valor.includes('flujo')) {
    return TIPOS_RECOMENDACION.FLUJO_NETO;
  }

  if (valor.includes('habito') || valor.includes('hábito')) {
    return TIPOS_RECOMENDACION.HABITOS;
  }

  return TIPOS_RECOMENDACION.GENERAL;
};

const normalizarPrioridad = (prioridad) => {
  const valor = limpiarTexto(prioridad).toLowerCase();

  if (Object.values(PRIORIDADES_RECOMENDACION).includes(valor)) {
    return valor;
  }

  if (valor.includes('alta') || valor.includes('riesgo')) {
    return PRIORIDADES_RECOMENDACION.ALTA;
  }

  if (valor.includes('baja')) {
    return PRIORIDADES_RECOMENDACION.BAJA;
  }

  return PRIORIDADES_RECOMENDACION.MEDIA;
};

const normalizarEtiquetas = (etiquetas) => {
  if (!Array.isArray(etiquetas)) return [];

  return etiquetas
    .map((etiqueta) => limpiarTexto(etiqueta).toLowerCase())
    .filter(Boolean)
    .slice(0, 6);
};

const construirPromptRecomendacionesAutomaticas = (contextoLLM) => {
  return `
Eres el asistente financiero de Monetra.

Tu tarea es generar recomendaciones financieras personalizadas, claras y accionables para un usuario joven.

Usa únicamente la información financiera recibida.
No inventes datos.
No recomiendes productos financieros específicos, créditos, inversiones ni entidades.
No menciones que eres una IA.
No menciones identificadores técnicos, UID, IDs de documentos ni estructuras internas.
Escribe en español claro y fácil de entender.

Enfoca las recomendaciones en:
- ahorro,
- control de gastos,
- manejo de deudas,
- mejora del flujo neto,
- hábitos financieros saludables.

Responde únicamente con JSON válido, sin markdown, sin bloque de código y sin texto adicional.

La estructura exacta debe ser:

{
  "resumenGeneral": "Resumen breve sobre las recomendaciones generadas.",
  "recomendaciones": [
    {
      "tipo": "ahorro | control_gastos | deudas | flujo_neto | habitos | general",
      "prioridad": "alta | media | baja",
      "titulo": "Título corto de la recomendación",
      "descripcion": "Explicación clara de la situación detectada",
      "accionSugerida": "Acción concreta que el usuario puede realizar",
      "motivo": "Razón basada en los datos financieros",
      "beneficioEsperado": "Beneficio que podría obtener el usuario",
      "metricaRelacionada": {
        "nombre": "Nombre de la métrica",
        "valor": "Valor o dato usado como evidencia"
      },
      "etiquetas": ["etiqueta1", "etiqueta2"]
    }
  ],
  "mensajeFinal": "Mensaje corto y motivador para el usuario."
}

Reglas:
- Genera máximo 5 recomendaciones.
- Si hay pocos datos, indícalo con claridad.
- Cada recomendación debe tener una acción sugerida concreta.
- Las recomendaciones deben basarse en los datos enviados.
- Prioriza riesgos como gastos altos, ahorro bajo, deudas altas o flujo neto negativo.

Contexto financiero del usuario:

${JSON.stringify(contextoLLM, null, 2)}
`;
};

const normalizarRecomendacionesIA = ({
  respuestaIA,
  contextoProcesado,
}) => {
  const recomendacionesIA = Array.isArray(respuestaIA.recomendaciones)
    ? respuestaIA.recomendaciones
    : [];

  const periodo = contextoProcesado?.contextoLLM?.periodo || null;

  return recomendacionesIA.slice(0, 5).map((recomendacion, index) =>
    crearRecomendacion({
      tipo: normalizarTipoRecomendacion(recomendacion.tipo),
      prioridad: normalizarPrioridad(recomendacion.prioridad),
      titulo: recomendacion.titulo || `Recomendación ${index + 1}`,
      descripcion:
        recomendacion.descripcion ||
        'Se detectó una oportunidad de mejora en el comportamiento financiero.',
      accionSugerida:
        recomendacion.accionSugerida ||
        'Revisar los movimientos financieros y definir una acción de mejora.',
      motivo:
        recomendacion.motivo ||
        'La recomendación se genera a partir del análisis financiero del usuario.',
      beneficioEsperado:
        recomendacion.beneficioEsperado ||
        'Mejorar el control de las finanzas personales.',
      metricaRelacionada: recomendacion.metricaRelacionada || null,
      fuente: FUENTES_RECOMENDACION.IA,
      etiquetas: normalizarEtiquetas(recomendacion.etiquetas),
      periodo,
      orden: index + 1,
    })
  );
};

const obtenerCategoriaPrincipalGasto = (contextoLLM) => {
  return contextoLLM?.categorias?.categoriaPrincipalGasto || null;
};

const crearRecomendacionSinDatos = ({ periodo }) => {
  return crearRecomendacion({
    tipo: TIPOS_RECOMENDACION.GENERAL,
    prioridad: PRIORIDADES_RECOMENDACION.MEDIA,
    titulo: 'Registrar más movimientos financieros',
    descripcion:
      'No hay información suficiente para generar recomendaciones financieras detalladas.',
    accionSugerida:
      'Registra ingresos, gastos, ahorros y deudas durante varios días para obtener recomendaciones más precisas.',
    motivo:
      'El análisis necesita historial financiero para detectar patrones de consumo y ahorro.',
    beneficioEsperado:
      'Mejorar la calidad de los análisis y recomendaciones futuras.',
    metricaRelacionada: {
      nombre: 'Total de movimientos',
      valor: 0,
    },
    fuente: FUENTES_RECOMENDACION.REGLA_NEGOCIO,
    etiquetas: ['historial', 'datos_insuficientes'],
    periodo,
    orden: 1,
  });
};

const generarRecomendacionesLocales = ({ contextoProcesado }) => {
  const contextoLLM = contextoProcesado?.contextoLLM || {};
  const periodo = contextoLLM.periodo || null;
  const resumen = contextoLLM.resumenFinanciero || {};
  const predicciones = contextoLLM.predicciones || null;
  const prioridades = contextoLLM.prioridadesDetectadas || [];
  const calidad = contextoLLM.calidadContexto || {};
  const categoriaPrincipal = obtenerCategoriaPrincipalGasto(contextoLLM);

  const recomendaciones = [];

  if (!calidad.datosSuficientes || !resumen.totalMovimientos) {
    return [crearRecomendacionSinDatos({ periodo })];
  }

  if (
    prioridades.includes('control_gastos') ||
    resumen.porcentajeGastosSobreIngresos > 60
  ) {
    recomendaciones.push(
      crearRecomendacion({
        tipo: TIPOS_RECOMENDACION.CONTROL_GASTOS,
        prioridad:
          resumen.porcentajeGastosSobreIngresos > 80
            ? PRIORIDADES_RECOMENDACION.ALTA
            : PRIORIDADES_RECOMENDACION.MEDIA,
        titulo: 'Revisar el nivel de gastos',
        descripcion: `Los gastos representan aproximadamente el ${resumen.porcentajeGastosSobreIngresos}% de los ingresos del período.`,
        accionSugerida:
          'Define un límite de gasto semanal y revisa cuáles categorías pueden reducirse.',
        motivo:
          'El porcentaje de gastos sobre ingresos puede afectar la capacidad de ahorro.',
        beneficioEsperado:
          'Tener mayor control sobre el dinero disponible y evitar gastos innecesarios.',
        metricaRelacionada: {
          nombre: 'Gastos sobre ingresos',
          valor: `${resumen.porcentajeGastosSobreIngresos}%`,
        },
        fuente: FUENTES_RECOMENDACION.REGLA_NEGOCIO,
        etiquetas: ['gastos', 'control'],
        periodo,
        orden: recomendaciones.length + 1,
      })
    );
  }

  if (categoriaPrincipal) {
    recomendaciones.push(
      crearRecomendacion({
        tipo: TIPOS_RECOMENDACION.CONTROL_GASTOS,
        prioridad: PRIORIDADES_RECOMENDACION.MEDIA,
        titulo: `Controlar gastos en ${categoriaPrincipal.categoria}`,
        descripcion: `La categoría ${categoriaPrincipal.categoria} concentra una parte importante de los gastos registrados.`,
        accionSugerida:
          'Revisa los movimientos de esta categoría y define un presupuesto máximo para el próximo período.',
        motivo:
          'Identificar la categoría con mayor gasto ayuda a enfocar mejor los esfuerzos de control.',
        beneficioEsperado:
          'Reducir gastos en la categoría que más impacta el presupuesto.',
        metricaRelacionada: {
          nombre: 'Categoría principal de gasto',
          valor: categoriaPrincipal.categoria,
        },
        fuente: FUENTES_RECOMENDACION.REGLA_NEGOCIO,
        etiquetas: ['categoria', 'gasto'],
        periodo,
        orden: recomendaciones.length + 1,
      })
    );
  }

  if (
    prioridades.includes('fortalecer_ahorro') ||
    resumen.porcentajeAhorroSobreIngresos < 10
  ) {
    recomendaciones.push(
      crearRecomendacion({
        tipo: TIPOS_RECOMENDACION.AHORRO,
        prioridad: PRIORIDADES_RECOMENDACION.ALTA,
        titulo: 'Fortalecer el hábito de ahorro',
        descripcion: `El ahorro representa aproximadamente el ${resumen.porcentajeAhorroSobreIngresos}% de los ingresos del período.`,
        accionSugerida:
          'Separa un porcentaje fijo de cada ingreso para ahorro antes de realizar otros gastos.',
        motivo:
          'Un porcentaje bajo de ahorro puede dificultar el cumplimiento de metas financieras.',
        beneficioEsperado:
          'Construir un hábito de ahorro más constante y mejorar la planificación financiera.',
        metricaRelacionada: {
          nombre: 'Ahorro sobre ingresos',
          valor: `${resumen.porcentajeAhorroSobreIngresos}%`,
        },
        fuente: FUENTES_RECOMENDACION.REGLA_NEGOCIO,
        etiquetas: ['ahorro', 'habito'],
        periodo,
        orden: recomendaciones.length + 1,
      })
    );
  }

  if (
    prioridades.includes('control_deudas') ||
    resumen.porcentajeDeudasSobreIngresos > 15
  ) {
    recomendaciones.push(
      crearRecomendacion({
        tipo: TIPOS_RECOMENDACION.DEUDAS,
        prioridad:
          resumen.porcentajeDeudasSobreIngresos > 30
            ? PRIORIDADES_RECOMENDACION.ALTA
            : PRIORIDADES_RECOMENDACION.MEDIA,
        titulo: 'Revisar el peso de las deudas',
        descripcion: `Las deudas representan aproximadamente el ${resumen.porcentajeDeudasSobreIngresos}% de los ingresos del período.`,
        accionSugerida:
          'Organiza los pagos pendientes y evita asumir nuevas deudas mientras estabilizas el flujo de dinero.',
        motivo:
          'Un nivel alto de deudas puede limitar la capacidad de ahorro y planificación.',
        beneficioEsperado:
          'Reducir presión financiera y mejorar la estabilidad del presupuesto.',
        metricaRelacionada: {
          nombre: 'Deudas sobre ingresos',
          valor: `${resumen.porcentajeDeudasSobreIngresos}%`,
        },
        fuente: FUENTES_RECOMENDACION.REGLA_NEGOCIO,
        etiquetas: ['deudas', 'control'],
        periodo,
        orden: recomendaciones.length + 1,
      })
    );
  }

  if (
    prioridades.includes('mejorar_flujo_neto') ||
    resumen.flujoNeto < 0
  ) {
    recomendaciones.push(
      crearRecomendacion({
        tipo: TIPOS_RECOMENDACION.FLUJO_NETO,
        prioridad: PRIORIDADES_RECOMENDACION.ALTA,
        titulo: 'Mejorar el flujo neto',
        descripcion: `El flujo neto del período es ${formatearCOP(resumen.flujoNeto)}.`,
        accionSugerida:
          'Reduce egresos no esenciales y prioriza gastos necesarios hasta recuperar un flujo positivo.',
        motivo:
          'Un flujo neto negativo indica que los egresos superan los ingresos.',
        beneficioEsperado:
          'Evitar desbalance financiero y mejorar la disponibilidad de dinero.',
        metricaRelacionada: {
          nombre: 'Flujo neto',
          valor: resumen.flujoNeto,
        },
        fuente: FUENTES_RECOMENDACION.REGLA_NEGOCIO,
        etiquetas: ['flujo', 'egresos'],
        periodo,
        orden: recomendaciones.length + 1,
      })
    );
  }

  if (
    predicciones?.disponible &&
    predicciones?.tendenciaEstimaciones?.tendencia === 'aumento'
  ) {
    recomendaciones.push(
      crearRecomendacion({
        tipo: TIPOS_RECOMENDACION.CONTROL_GASTOS,
        prioridad: PRIORIDADES_RECOMENDACION.MEDIA,
        titulo: 'Prepararse para posibles aumentos de gasto',
        descripcion:
          predicciones.tendenciaEstimaciones.descripcion ||
          'Las estimaciones futuras muestran un posible aumento de gastos.',
        accionSugerida:
          'Revisa el presupuesto del próximo período y reserva dinero para cubrir gastos esperados.',
        motivo:
          'Las predicciones sugieren que los gastos podrían aumentar en los próximos meses.',
        beneficioEsperado:
          'Planificar con anticipación y evitar desbalances futuros.',
        metricaRelacionada: {
          nombre: 'Tendencia de estimaciones futuras',
          valor: predicciones.tendenciaEstimaciones.tendencia,
        },
        fuente: FUENTES_RECOMENDACION.REGLA_NEGOCIO,
        etiquetas: ['prediccion', 'gastos'],
        periodo,
        orden: recomendaciones.length + 1,
      })
    );
  }

  if (recomendaciones.length === 0) {
    recomendaciones.push(
      crearRecomendacion({
        tipo: TIPOS_RECOMENDACION.HABITOS,
        prioridad: PRIORIDADES_RECOMENDACION.BAJA,
        titulo: 'Mantener el registro financiero constante',
        descripcion:
          'El comportamiento financiero no muestra alertas fuertes en el período analizado.',
        accionSugerida:
          'Continúa registrando tus movimientos para mantener actualizados los análisis y recomendaciones.',
        motivo:
          'Un historial completo permite detectar patrones con mayor precisión.',
        beneficioEsperado:
          'Mejorar la calidad de los reportes y fortalecer la toma de decisiones.',
        metricaRelacionada: {
          nombre: 'Total de movimientos',
          valor: resumen.totalMovimientos,
        },
        fuente: FUENTES_RECOMENDACION.REGLA_NEGOCIO,
        etiquetas: ['habitos', 'registro'],
        periodo,
        orden: 1,
      })
    );
  }

  return recomendaciones.slice(0, 5);
};

const construirRespuestaRecomendaciones = ({
  contextoProcesado,
  recomendaciones,
  generadoPorIA,
  modelo,
  estado,
  mensaje,
  resumenGeneral = '',
  mensajeFinal = '',
  advertencias = [],
}) => {
  const contextoLLM = contextoProcesado?.contextoLLM || {};

  const estructura = crearEstructuraRecomendaciones({
    uid: null,
    periodo: contextoLLM.periodo || null,
    analisisFinanciero: contextoProcesado?.analisisOriginal || null,
    recomendaciones,
  });

  return {
    exito: true,
    estado,
    mensaje,
    generadoPorIA,
    modelo,
    resumenGeneral:
      resumenGeneral ||
      'Se generaron recomendaciones financieras automáticas con base en la información disponible.',
    mensajeFinal:
      mensajeFinal ||
      'Revisa estas recomendaciones y ajusta tus hábitos financieros paso a paso.',
    totalRecomendaciones: recomendaciones.length,
    recomendaciones,
    estructura,
    contextoResumen: {
      periodo: contextoLLM.periodo || null,
      resumenFinanciero: contextoLLM.resumenFinanciero || null,
      calidadContexto: contextoLLM.calidadContexto || null,
      prioridadesDetectadas: contextoLLM.prioridadesDetectadas || [],
    },
    advertencias,
    generadoEn: new Date().toISOString(),
  };
};

export const generarRecomendacionesAutomaticasDesdeContexto = async ({
  contextoProcesado,
  permitirRespaldoLocal = true,
} = {}) => {
  if (!contextoProcesado?.contextoLLM) {
    throw new Error(
      'No se recibió contexto financiero procesado para generar recomendaciones.'
    );
  }

  const contextoLLM = contextoProcesado.contextoLLM;
  const calidad = contextoLLM.calidadContexto || {};

  if (!calidad.datosSuficientes) {
    const recomendacionesLocales = generarRecomendacionesLocales({
      contextoProcesado,
    });

    return construirRespuestaRecomendaciones({
      contextoProcesado,
      recomendaciones: recomendacionesLocales,
      generadoPorIA: false,
      modelo: 'reglas-locales',
      estado: ESTADOS_RECOMENDACIONES_AUTOMATICAS.SIN_DATOS,
      mensaje:
        'No hay datos suficientes para generar recomendaciones con IA. Se generaron recomendaciones básicas.',
      advertencias: calidad.advertencias || [],
    });
  }

  try {
    const prompt = construirPromptRecomendacionesAutomaticas(contextoLLM);

    const respuestaGemini = await generarContenidoConGemini({
      prompt,
      temperature: 0.4,
      maxOutputTokens: 1600,
      responseMimeType: 'application/json',
    });

    const respuestaIA = extraerJsonDesdeRespuesta(respuestaGemini.texto);

    const recomendaciones = normalizarRecomendacionesIA({
      respuestaIA,
      contextoProcesado,
    });

    if (recomendaciones.length === 0) {
      throw new Error('Gemini no generó recomendaciones válidas.');
    }

    return construirRespuestaRecomendaciones({
      contextoProcesado,
      recomendaciones,
      generadoPorIA: true,
      modelo: respuestaGemini.modelo,
      estado: ESTADOS_RECOMENDACIONES_AUTOMATICAS.GENERADAS,
      mensaje: 'Recomendaciones automáticas generadas correctamente.',
      resumenGeneral: respuestaIA.resumenGeneral,
      mensajeFinal: respuestaIA.mensajeFinal,
      advertencias: calidad.advertencias || [],
    });
  } catch (error) {
    if (!permitirRespaldoLocal) {
      throw error;
    }

    const recomendacionesLocales = generarRecomendacionesLocales({
      contextoProcesado,
    });

    return construirRespuestaRecomendaciones({
      contextoProcesado,
      recomendaciones: recomendacionesLocales,
      generadoPorIA: false,
      modelo: 'reglas-locales',
      estado: ESTADOS_RECOMENDACIONES_AUTOMATICAS.GENERADAS_CON_RESPALDO,
      mensaje:
        'No fue posible generar recomendaciones con IA. Se generaron recomendaciones automáticas de respaldo.',
      advertencias: [
        ...(calidad.advertencias || []),
        error.message || 'Error al generar recomendaciones con IA.',
      ],
    });
  }
};

export const generarRecomendacionesAutomaticasUsuario = async ({
  periodo = obtenerPeriodoMesActual(),
  incluirEstimaciones = true,
  mesesHistorial = 6,
  mesesPrediccion = 3,
  limiteMovimientos = 20,
  permitirRespaldoLocal = true,
} = {}) => {
  const contextoProcesado = await prepararInformacionFinancieraUsuarioParaLLM({
    periodo,
    casoUso: CASOS_USO_LLM.RECOMENDACIONES,
    incluirEstimaciones,
    mesesHistorial,
    mesesPrediccion,
    limiteMovimientos,
  });

  return generarRecomendacionesAutomaticasDesdeContexto({
    contextoProcesado,
    permitirRespaldoLocal,
  });
};