// frontend/src/services/ocrService.js

import { createWorker } from 'tesseract.js';

import {
  extraerDatosRelevantesFactura,
  limpiarTextoOCR,
} from './receiptDataExtractor';

import {
  CODIGOS_ERROR_OCR,
  OCRError,
  crearRespuestaErrorOCR,
  obtenerAdvertenciasReconocimiento,
  validarTextoReconocido,
} from './ocrErrorHandler';

const TIPOS_IMAGEN_PERMITIDOS = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

const TAMANO_MAXIMO_MB = 10;

const validarArchivoImagen = (archivo) => {
  if (!archivo) {
    throw new OCRError(
      CODIGOS_ERROR_OCR.ARCHIVO_NO_RECIBIDO,
      'No se recibió ninguna imagen para procesar.',
      'El parámetro archivo llegó vacío o indefinido.'
    );
  }

  if (!TIPOS_IMAGEN_PERMITIDOS.includes(archivo.type)) {
    throw new OCRError(
      CODIGOS_ERROR_OCR.FORMATO_NO_VALIDO,
      'El archivo debe ser una imagen JPG, PNG o WEBP.',
      `Formato recibido: ${archivo.type || 'desconocido'}`
    );
  }

  const tamanoMb = archivo.size / 1024 / 1024;

  if (tamanoMb > TAMANO_MAXIMO_MB) {
    throw new OCRError(
      CODIGOS_ERROR_OCR.ARCHIVO_MUY_GRANDE,
      `La imagen no debe superar ${TAMANO_MAXIMO_MB} MB.`,
      `Tamaño recibido: ${tamanoMb.toFixed(2)} MB`
    );
  }

  return true;
};

export const procesarFacturaOCR = async (archivo, onProgress = null) => {
  let worker = null;

  try {
    validarArchivoImagen(archivo);

    worker = await createWorker(['spa', 'eng'], 1, {
      logger: (mensaje) => {
        if (typeof onProgress === 'function') {
          onProgress({
            estado: mensaje.status,
            progreso: mensaje.progress || 0,
          });
        }
      },
    });

    const resultado = await worker.recognize(archivo);

    const textoExtraido = limpiarTextoOCR(resultado?.data?.text || '');

    validarTextoReconocido(textoExtraido);

    const datosExtraidos = extraerDatosRelevantesFactura(textoExtraido);

    const confianza = Math.round(resultado?.data?.confidence || 0);

    const advertenciasReconocimiento = obtenerAdvertenciasReconocimiento({
      confianza,
      datosExtraidos,
    });

    const advertencias = Array.from(
      new Set([
        ...(datosExtraidos.advertencias || []),
        ...advertenciasReconocimiento,
      ])
    );

    const tieneAdvertencias = advertencias.length > 0;

    return {
      exito: true,
      codigo: tieneAdvertencias
        ? CODIGOS_ERROR_OCR.PROCESADO_CON_ADVERTENCIAS
        : CODIGOS_ERROR_OCR.PROCESADO_CORRECTAMENTE,
      mensaje: tieneAdvertencias
        ? 'Documento procesado, pero requiere revisión de algunos datos.'
        : 'Documento procesado correctamente.',
      confianza,
      textoExtraido,
      datosExtraidos: {
        ...datosExtraidos,
        advertencias,
      },
      requiereRevision: true,
      puedeReintentar: false,
      advertencias,
    };
  } catch (error) {
    console.error('Error durante el reconocimiento OCR:', error);

    return crearRespuestaErrorOCR(error);
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch (error) {
        console.warn('No fue posible cerrar el worker de OCR:', error);
      }
    }
  }
};