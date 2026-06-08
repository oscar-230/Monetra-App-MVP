// frontend/src/services/ocrErrorHandler.js

export const CODIGOS_ERROR_OCR = {
  PROCESADO_CORRECTAMENTE: 'OCR_OK',
  PROCESADO_CON_ADVERTENCIAS: 'OCR_CON_ADVERTENCIAS',
  ARCHIVO_NO_RECIBIDO: 'OCR_ARCHIVO_NO_RECIBIDO',
  FORMATO_NO_VALIDO: 'OCR_FORMATO_NO_VALIDO',
  ARCHIVO_MUY_GRANDE: 'OCR_ARCHIVO_MUY_GRANDE',
  TEXTO_NO_DETECTADO: 'OCR_TEXTO_NO_DETECTADO',
  BAJA_CONFIANZA: 'OCR_BAJA_CONFIANZA',
  ERROR_PROCESAMIENTO: 'OCR_ERROR_PROCESAMIENTO',
  ERROR_DESCONOCIDO: 'OCR_ERROR_DESCONOCIDO',
};

const UMBRAL_CONFIANZA_MINIMA = 55;

export class OCRError extends Error {
  constructor(codigo, mensajeUsuario, detalleTecnico = '') {
    super(mensajeUsuario);

    this.name = 'OCRError';
    this.codigo = codigo;
    this.mensajeUsuario = mensajeUsuario;
    this.detalleTecnico = detalleTecnico || mensajeUsuario;
  }
}

export const validarTextoReconocido = (textoExtraido) => {
  const texto = String(textoExtraido || '').trim();

  if (!texto || texto.length < 8) {
    throw new OCRError(
      CODIGOS_ERROR_OCR.TEXTO_NO_DETECTADO,
      'No fue posible reconocer texto útil en el comprobante. Intenta con una imagen más clara.',
      'El texto extraído por OCR está vacío o es demasiado corto.'
    );
  }

  return true;
};

export const obtenerAdvertenciasReconocimiento = ({
  confianza = 0,
  datosExtraidos = null,
}) => {
  const advertencias = [];

  if (typeof confianza === 'number' && confianza < UMBRAL_CONFIANZA_MINIMA) {
    advertencias.push(
      'La confianza del reconocimiento es baja. Se recomienda revisar los datos extraídos.'
    );
  }

  if (!datosExtraidos) {
    advertencias.push(
      'No fue posible extraer datos estructurados del comprobante.'
    );

    return advertencias;
  }

  if (!datosExtraidos.camposDetectados?.monto) {
    advertencias.push(
      'No se pudo identificar el monto automáticamente.'
    );
  }

  if (!datosExtraidos.camposDetectados?.fecha) {
    advertencias.push(
      'No se pudo identificar la fecha automáticamente.'
    );
  }

  if (!datosExtraidos.camposDetectados?.descripcion) {
    advertencias.push(
      'No se pudo identificar una descripción clara.'
    );
  }

  return advertencias;
};

export const crearRespuestaErrorOCR = (error) => {
  const esErrorOCR = error instanceof OCRError;

  const codigo = esErrorOCR
    ? error.codigo
    : CODIGOS_ERROR_OCR.ERROR_PROCESAMIENTO;

  const mensajeUsuario = esErrorOCR
    ? error.mensajeUsuario
    : 'No fue posible procesar el documento. Intenta nuevamente con una imagen más clara.';

  const detalleTecnico = esErrorOCR
    ? error.detalleTecnico
    : error?.message || 'Error desconocido durante el reconocimiento OCR.';

  return {
    exito: false,
    codigo,
    mensaje: mensajeUsuario,
    mensajeUsuario,
    detalleTecnico,
    confianza: 0,
    textoExtraido: '',
    datosExtraidos: null,
    requiereRevision: false,
    puedeReintentar: true,
    advertencias: [mensajeUsuario],
  };
};