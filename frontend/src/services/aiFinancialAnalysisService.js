// frontend/src/services/aiFinancialAnalysisService.js

import { generarContenidoConGemini } from './geminiService';

import { obtenerPeriodoMesActual } from './financialReportsService';

import {
  procesarAnalisisFinancieroParaIA,
  procesarInformacionFinancieraUsuario,
} from './financialDataProcessorService';

import {
  construirPromptAnalisisFinancieroIA,
} from './financialAnalysisPromptsService';

const limpiarTexto = (valor) => String(valor || '').trim();

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
    evidencia: limpiarTexto(patron.evidencia || ''),
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
    advertencias: normalizarListaTexto(respuestaIA.advertencias),
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