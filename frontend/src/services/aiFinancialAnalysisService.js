// frontend/src/services/aiFinancialAnalysisService.js

import { generarContenidoConGemini } from './geminiService';

import { obtenerPeriodoMesActual } from './financialReportsService';

import {
  procesarAnalisisFinancieroParaIA,
  procesarInformacionFinancieraUsuario,
} from './financialDataProcessorService';

const limpiarTexto = (valor) => String(valor || '').trim();

const construirPromptAnalisisFinancieroIA = (contextoProcesado) => {
  return `
Eres el asistente financiero de Monetra.

Tu tarea es generar un análisis financiero claro, breve y útil para un usuario joven que quiere entender sus hábitos de consumo.

Usa únicamente la información financiera procesada.
No inventes datos.
No des asesoría de inversión, crédito o productos financieros específicos.
No menciones que eres una IA.
Escribe en español claro y fácil de entender.

Responde únicamente en JSON válido, sin markdown, sin bloque de código y sin texto adicional.

La estructura exacta debe ser:

{
  "resumenEjecutivo": "Texto breve de 2 a 4 frases.",
  "patronesDetectados": [
    {
      "titulo": "Nombre del patrón",
      "descripcion": "Explicación clara del patrón detectado",
      "categoria": "ingresos | gastos | ahorro | deudas | flujo",
      "nivel": "positivo | informativo | advertencia | riesgo"
    }
  ],
  "conclusiones": [
    "Conclusión útil 1",
    "Conclusión útil 2"
  ],
  "oportunidadesMejora": [
    "Oportunidad de mejora 1",
    "Oportunidad de mejora 2"
  ],
  "mensajeFinal": "Mensaje corto y motivador para el usuario."
}

Información financiera procesada:

${JSON.stringify(contextoProcesado.contextoIA, null, 2)}
`;
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

const normalizarListaTexto = (valor) => {
  if (!Array.isArray(valor)) return [];

  return valor
    .map((item) => limpiarTexto(item))
    .filter(Boolean);
};

const normalizarPatrones = (patrones) => {
  if (!Array.isArray(patrones)) return [];

  return patrones.map((patron, index) => ({
    id: `patron-${index + 1}`,
    titulo: limpiarTexto(patron.titulo || `Patrón ${index + 1}`),
    descripcion: limpiarTexto(patron.descripcion),
    categoria: limpiarTexto(patron.categoria || 'general'),
    nivel: limpiarTexto(patron.nivel || 'informativo'),
  }));
};

const normalizarAnalisisIA = ({
  respuestaIA,
  contextoProcesado,
  textoOriginal,
}) => {
  const contextoIA = contextoProcesado?.contextoIA || {};

  return {
    resumenEjecutivo: limpiarTexto(respuestaIA.resumenEjecutivo),
    patronesDetectados: normalizarPatrones(
      respuestaIA.patronesDetectados
    ),
    conclusiones: normalizarListaTexto(respuestaIA.conclusiones),
    oportunidadesMejora: normalizarListaTexto(
      respuestaIA.oportunidadesMejora
    ),
    mensajeFinal: limpiarTexto(respuestaIA.mensajeFinal),
    periodo: contextoIA.periodo || null,
    perfilFinanciero: contextoIA.perfilFinanciero || null,
    calidadDatos: contextoIA.calidadDatos || null,
    prioridadesDetectadas: contextoIA.prioridadesDetectadas || [],
    fuente: 'gemini-2.5-flash',
    textoOriginal,
    generadoEn: new Date().toISOString(),
  };
};

export const generarAnalisisIADesdeContextoProcesado = async ({
  contextoProcesado,
} = {}) => {
  if (!contextoProcesado?.contextoIA) {
    throw new Error(
      'No se recibió información financiera procesada para generar el análisis con IA.'
    );
  }

  const prompt = construirPromptAnalisisFinancieroIA(contextoProcesado);

  const respuestaGemini = await generarContenidoConGemini({
    prompt,
    temperature: 0.3,
    maxOutputTokens: 1400,
    responseMimeType: 'application/json',
  });

  const respuestaIA = extraerJsonDesdeRespuesta(respuestaGemini.texto);

  return {
    exito: true,
    mensaje: 'Análisis financiero generado correctamente.',
    modelo: respuestaGemini.modelo,
    analisis: normalizarAnalisisIA({
      respuestaIA,
      contextoProcesado,
      textoOriginal: respuestaGemini.texto,
    }),
    contextoProcesado,
  };
};

export const generarAnalisisIADesdeAnalisisFinanciero = async ({
  analisisFinanciero,
} = {}) => {
  if (!analisisFinanciero) {
    throw new Error(
      'No se recibió el análisis financiero base para generar el análisis con IA.'
    );
  }

  const contextoProcesado = procesarAnalisisFinancieroParaIA({
    analisisFinanciero,
  });

  return generarAnalisisIADesdeContextoProcesado({
    contextoProcesado,
  });
};

export const generarAnalisisIAUsuario = async (
  periodo = obtenerPeriodoMesActual()
) => {
  const contextoProcesado = await procesarInformacionFinancieraUsuario(
    periodo
  );

  return generarAnalisisIADesdeContextoProcesado({
    contextoProcesado,
  });
};