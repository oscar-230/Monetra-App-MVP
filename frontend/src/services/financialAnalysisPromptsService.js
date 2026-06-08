// frontend/src/services/financialAnalysisPromptsService.js

export const VERSION_PROMPT_ANALISIS_FINANCIERO = '1.0';

export const TIPOS_SALIDA_ANALISIS = {
  JSON: 'json',
};

const CATEGORIAS_VALIDAS = [
  'ingresos',
  'gastos',
  'ahorro',
  'deudas',
  'flujo',
  'general',
];

const NIVELES_VALIDOS = [
  'positivo',
  'informativo',
  'advertencia',
  'riesgo',
];

const limpiarTextoParaPrompt = (valor, limite = 160) => {
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

const redondear = (valor, decimales = 2) => {
  const numero = Number(valor) || 0;
  const factor = 10 ** decimales;

  return Math.round((numero + Number.EPSILON) * factor) / factor;
};

const limitarLista = (lista = [], limite = 10) => {
  if (!Array.isArray(lista)) return [];

  return lista.slice(0, limite);
};

const sanitizarMovimiento = (movimiento) => {
  return {
    tipo: movimiento.tipo || 'gasto',
    monto: redondear(movimiento.monto),
    categoria: limpiarTextoParaPrompt(movimiento.categoria || 'Sin categoría', 80),
    fecha: movimiento.fecha || null,
    descripcion: limpiarTextoParaPrompt(movimiento.descripcion || '', 100),
    origen: movimiento.origen || 'manual',
  };
};

const sanitizarCategoriaGasto = (categoria) => {
  return {
    categoria: limpiarTextoParaPrompt(categoria.categoria || 'Sin categoría', 80),
    total: redondear(categoria.total || categoria.gastoEstimado),
    porcentajeSobreGastos: redondear(categoria.porcentajeSobreGastos),
    porcentajeSobreTotalEstimado: redondear(categoria.porcentajeSobreTotalEstimado),
    cantidad: categoria.cantidad || null,
  };
};

const sanitizarHallazgo = (hallazgo) => {
  return {
    titulo: limpiarTextoParaPrompt(hallazgo.titulo, 90),
    descripcion: limpiarTextoParaPrompt(hallazgo.descripcion, 180),
    nivel: NIVELES_VALIDOS.includes(hallazgo.nivel)
      ? hallazgo.nivel
      : 'informativo',
    categoria: hallazgo.categoria || 'general',
    valor: hallazgo.valor ?? null,
  };
};

const sanitizarPatronBase = (patron) => {
  return {
    titulo: limpiarTextoParaPrompt(patron.titulo, 90),
    descripcion: limpiarTextoParaPrompt(patron.descripcion, 180),
    categoria: patron.categoria || 'general',
    nivel: NIVELES_VALIDOS.includes(patron.nivel)
      ? patron.nivel
      : 'informativo',
  };
};

export const sanitizarContextoFinancieroParaPrompt = (contextoProcesado) => {
  const contextoIA = contextoProcesado?.contextoIA || contextoProcesado || {};

  const resumenMovimientos = contextoIA.resumenMovimientos || {};

  return {
    versionPrompt: VERSION_PROMPT_ANALISIS_FINANCIERO,
    periodo: contextoIA.periodo || null,
    perfilFinanciero: {
      nivel: limpiarTextoParaPrompt(contextoIA.perfilFinanciero?.nivel || 'Sin datos', 60),
      estado: limpiarTextoParaPrompt(contextoIA.perfilFinanciero?.estado || 'neutral', 60),
      descripcion: limpiarTextoParaPrompt(contextoIA.perfilFinanciero?.descripcion || '', 180),
    },
    calidadDatos: {
      datosSuficientes: Boolean(contextoIA.calidadDatos?.datosSuficientes),
      totalAdvertencias: contextoIA.calidadDatos?.totalAdvertencias || 0,
      advertencias: limitarLista(contextoIA.calidadDatos?.advertencias || [], 5).map(
        (advertencia) => limpiarTextoParaPrompt(advertencia, 160)
      ),
    },
    resumenFinanciero: {
      totalMovimientos: contextoIA.resumenFinanciero?.totalMovimientos || 0,
      totalIngresos: redondear(contextoIA.resumenFinanciero?.totalIngresos),
      totalGastos: redondear(contextoIA.resumenFinanciero?.totalGastos),
      totalAhorros: redondear(contextoIA.resumenFinanciero?.totalAhorros),
      totalDeudas: redondear(contextoIA.resumenFinanciero?.totalDeudas),
      flujoNeto: redondear(contextoIA.resumenFinanciero?.flujoNeto),
      porcentajeGastosSobreIngresos: redondear(
        contextoIA.resumenFinanciero?.porcentajeGastosSobreIngresos
      ),
      porcentajeAhorroSobreIngresos: redondear(
        contextoIA.resumenFinanciero?.porcentajeAhorroSobreIngresos
      ),
      porcentajeDeudasSobreIngresos: redondear(
        contextoIA.resumenFinanciero?.porcentajeDeudasSobreIngresos
      ),
    },
    resumenMovimientos: {
      porTipo: resumenMovimientos.porTipo || {},
      gastosPorCategoria: limitarLista(
        resumenMovimientos.gastosPorCategoria || [],
        8
      ).map(sanitizarCategoriaGasto),
      movimientosRecientes: limitarLista(
        resumenMovimientos.movimientosRecientes || [],
        8
      ).map(sanitizarMovimiento),
      movimientosMayorValor: limitarLista(
        resumenMovimientos.movimientosMayorValor || [],
        8
      ).map(sanitizarMovimiento),
      totalMovimientosProcesados:
        resumenMovimientos.totalMovimientosProcesados || 0,
      totalMovimientosEnviados:
        resumenMovimientos.totalMovimientosEnviados || 0,
    },
    patronesBase: limitarLista(contextoIA.patronesBase || [], 8).map(
      sanitizarPatronBase
    ),
    hallazgos: limitarLista(contextoIA.hallazgos || [], 8).map(
      sanitizarHallazgo
    ),
    prioridadesDetectadas: limitarLista(
      contextoIA.prioridadesDetectadas || [],
      6
    ).map((prioridad) => limpiarTextoParaPrompt(prioridad, 80)),
  };
};

const construirReglasPrivacidad = () => {
  return `
Reglas de privacidad y seguridad:
- Usa únicamente la información financiera enviada en el contexto.
- No solicites datos personales adicionales.
- No inventes ingresos, gastos, deudas, nombres, entidades ni fechas.
- No menciones identificadores técnicos, UID, IDs de documentos o datos internos.
- No des asesoría de inversión, crédito o productos financieros específicos.
- Indica cuando el análisis sea limitado por falta de datos.
- Recuerda que las conclusiones son aproximadas y dependen del historial registrado.
`;
};

const construirInstruccionesRespuesta = () => {
  return `
Instrucciones de respuesta:
- Escribe en español claro, natural y fácil de entender.
- Usa un tono útil, cercano y responsable.
- No menciones que eres una IA.
- No uses markdown.
- Responde únicamente con JSON válido.
- Cada conclusión debe ayudar al usuario a comprender sus hábitos financieros.
- Evita frases genéricas; relaciona el análisis con los datos recibidos.
`;
};

const construirFormatoSalida = () => {
  return `
La respuesta debe tener exactamente esta estructura JSON:

{
  "resumenEjecutivo": "Texto breve de 2 a 4 frases.",
  "patronesDetectados": [
    {
      "titulo": "Nombre del patrón detectado",
      "descripcion": "Explicación clara del patrón",
      "categoria": "ingresos | gastos | ahorro | deudas | flujo | general",
      "nivel": "positivo | informativo | advertencia | riesgo",
      "evidencia": "Dato financiero que respalda el patrón"
    }
  ],
  "conclusiones": [
    "Conclusión clara y útil 1",
    "Conclusión clara y útil 2"
  ],
  "oportunidadesMejora": [
    "Oportunidad de mejora 1",
    "Oportunidad de mejora 2"
  ],
  "advertencias": [
    "Advertencia si los datos son insuficientes o si el análisis debe tomarse con cautela"
  ],
  "mensajeFinal": "Mensaje corto y motivador para el usuario."
}
`;
};

export const construirPromptAnalisisFinancieroIA = (
  contextoProcesado,
  opciones = {}
) => {
  const contextoSanitizado = sanitizarContextoFinancieroParaPrompt(
    contextoProcesado
  );

  const tono = opciones.tono || 'claro, responsable y amigable';
  const maxPatrones = opciones.maxPatrones || 5;
  const maxConclusiones = opciones.maxConclusiones || 3;
  const maxOportunidades = opciones.maxOportunidades || 3;

  return `
Eres el asistente financiero de Monetra.

Tu tarea es analizar la información financiera del usuario para ayudarle a comprender mejor sus hábitos de consumo, ahorro, ingresos, deudas y flujo de dinero.

Objetivo del análisis:
Generar un análisis financiero personalizado, claro y comprensible, basado únicamente en los datos entregados.

Tono esperado:
${tono}

Límites de contenido:
- Máximo ${maxPatrones} patrones detectados.
- Máximo ${maxConclusiones} conclusiones.
- Máximo ${maxOportunidades} oportunidades de mejora.

${construirReglasPrivacidad()}

${construirInstruccionesRespuesta()}

${construirFormatoSalida()}

Categorías válidas:
${JSON.stringify(CATEGORIAS_VALIDAS)}

Niveles válidos:
${JSON.stringify(NIVELES_VALIDOS)}

Contexto financiero del usuario:
${JSON.stringify(contextoSanitizado, null, 2)}
`;
};

export const validarPromptAnalisisFinanciero = (prompt) => {
  if (!prompt || typeof prompt !== 'string') {
    throw new Error('No se recibió un prompt válido.');
  }

  if (!prompt.includes('Contexto financiero del usuario')) {
    throw new Error('El prompt no incluye el contexto financiero del usuario.');
  }

  if (!prompt.includes('"resumenEjecutivo"')) {
    throw new Error('El prompt no incluye la estructura JSON esperada.');
  }

  if (!prompt.includes('Reglas de privacidad')) {
    throw new Error('El prompt no incluye reglas de privacidad.');
  }

  return {
    valido: true,
    longitud: prompt.length,
    version: VERSION_PROMPT_ANALISIS_FINANCIERO,
    mensaje: 'Prompt de análisis financiero válido.',
  };
};

export const construirMensajesAnalisisFinanciero = (
  contextoProcesado,
  opciones = {}
) => {
  const prompt = construirPromptAnalisisFinancieroIA(
    contextoProcesado,
    opciones
  );

  return [
    {
      role: 'user',
      parts: [
        {
          text: prompt,
        },
      ],
    },
  ];
};