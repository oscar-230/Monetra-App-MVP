// frontend/src/services/geminiService.js

const MODELO_GEMINI = 'gemini-2.5-flash';

const URL_BASE_GEMINI =
  'https://generativelanguage.googleapis.com/v1beta/models';

const TIEMPO_MAXIMO_MS = 25000;

const obtenerApiKeyGemini = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey || apiKey === 'TU_API_KEY_DE_GEMINI') {
    throw new Error(
      'No se encontró la API Key de Gemini. Configura VITE_GEMINI_API_KEY en frontend/.env.local.'
    );
  }

  return apiKey;
};

const extraerTextoRespuesta = (respuestaGemini) => {
  const partes = respuestaGemini?.candidates?.[0]?.content?.parts || [];

  const texto = partes
    .map((parte) => parte.text || '')
    .join('\n')
    .trim();

  if (!texto) {
    throw new Error('Gemini no devolvió contenido de texto.');
  }

  return texto;
};

const crearPayloadGemini = ({
  prompt,
  temperature = 0.4,
  maxOutputTokens = 1200,
  responseMimeType = 'application/json',
}) => {
  return {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: prompt,
          },
        ],
      },
    ],
    generationConfig: {
      temperature,
      maxOutputTokens,
      responseMimeType,
    },
  };
};

export const generarContenidoConGemini = async ({
  prompt,
  temperature = 0.4,
  maxOutputTokens = 1200,
  responseMimeType = 'application/json',
} = {}) => {
  if (!prompt || !prompt.trim()) {
    throw new Error('No se recibió un prompt válido para Gemini.');
  }

  const apiKey = obtenerApiKeyGemini();

  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, TIEMPO_MAXIMO_MS);

  const url = `${URL_BASE_GEMINI}/${MODELO_GEMINI}:generateContent?key=${apiKey}`;

  try {
    const respuesta = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(
        crearPayloadGemini({
          prompt,
          temperature,
          maxOutputTokens,
          responseMimeType,
        })
      ),
      signal: controller.signal,
    });

    const data = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(
        data?.error?.message ||
          'No fue posible generar contenido con Gemini.'
      );
    }

    const texto = extraerTextoRespuesta(data);

    return {
      exito: true,
      modelo: MODELO_GEMINI,
      texto,
      respuestaOriginal: data,
      generadoEn: new Date().toISOString(),
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(
        'La solicitud a Gemini tardó demasiado tiempo. Intenta nuevamente.'
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const validarConfiguracionGemini = () => {
  obtenerApiKeyGemini();

  return {
    configurado: true,
    modelo: MODELO_GEMINI,
    mensaje: 'Gemini está configurado correctamente.',
  };
};