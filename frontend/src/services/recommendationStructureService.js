// frontend/src/services/recommendationStructureService.js

export const TIPOS_RECOMENDACION = {
  AHORRO: 'ahorro',
  CONTROL_GASTOS: 'control_gastos',
  DEUDAS: 'deudas',
  FLUJO_NETO: 'flujo_neto',
  HABITOS: 'habitos',
  GENERAL: 'general',
};

export const PRIORIDADES_RECOMENDACION = {
  ALTA: 'alta',
  MEDIA: 'media',
  BAJA: 'baja',
};

export const ESTADOS_RECOMENDACION = {
  PENDIENTE: 'pendiente',
  REVISADA: 'revisada',
  APLICADA: 'aplicada',
  DESCARTADA: 'descartada',
};

export const FUENTES_RECOMENDACION = {
  ANALISIS_FINANCIERO: 'analisis_financiero',
  REGLA_NEGOCIO: 'regla_negocio',
  IA: 'ia',
};

const generarIdRecomendacion = (tipo, indice = 0) => {
  const fecha = Date.now();

  return `rec-${tipo}-${fecha}-${indice}`;
};

const normalizarTexto = (valor, textoPorDefecto = '') => {
  return String(valor || textoPorDefecto).trim();
};

const validarTipoRecomendacion = (tipo) => {
  return Object.values(TIPOS_RECOMENDACION).includes(tipo);
};

const validarPrioridad = (prioridad) => {
  return Object.values(PRIORIDADES_RECOMENDACION).includes(prioridad);
};

const validarEstado = (estado) => {
  return Object.values(ESTADOS_RECOMENDACION).includes(estado);
};

export const crearRecomendacion = ({
  id = null,
  tipo = TIPOS_RECOMENDACION.GENERAL,
  prioridad = PRIORIDADES_RECOMENDACION.MEDIA,
  titulo,
  descripcion,
  accionSugerida,
  motivo = '',
  beneficioEsperado = '',
  metricaRelacionada = null,
  fuente = FUENTES_RECOMENDACION.ANALISIS_FINANCIERO,
  estado = ESTADOS_RECOMENDACION.PENDIENTE,
  etiquetas = [],
  accionable = true,
  periodo = null,
  orden = 0,
}) => {
  if (!validarTipoRecomendacion(tipo)) {
    throw new Error('El tipo de recomendación no es válido.');
  }

  if (!validarPrioridad(prioridad)) {
    throw new Error('La prioridad de la recomendación no es válida.');
  }

  if (!validarEstado(estado)) {
    throw new Error('El estado de la recomendación no es válido.');
  }

  if (!titulo || !descripcion || !accionSugerida) {
    throw new Error(
      'La recomendación debe tener título, descripción y acción sugerida.'
    );
  }

  return {
    id: id || generarIdRecomendacion(tipo, orden),
    tipo,
    prioridad,
    titulo: normalizarTexto(titulo),
    descripcion: normalizarTexto(descripcion),
    accionSugerida: normalizarTexto(accionSugerida),
    motivo: normalizarTexto(motivo),
    beneficioEsperado: normalizarTexto(beneficioEsperado),
    metricaRelacionada,
    fuente,
    estado,
    etiquetas,
    accionable,
    periodo,
    orden,
    creadaEn: new Date().toISOString(),
    actualizadaEn: new Date().toISOString(),
  };
};

export const validarEstructuraRecomendacion = (recomendacion) => {
  if (!recomendacion) {
    throw new Error('No se recibió una recomendación para validar.');
  }

  if (!recomendacion.id) {
    throw new Error('La recomendación debe tener un ID.');
  }

  if (!validarTipoRecomendacion(recomendacion.tipo)) {
    throw new Error('El tipo de recomendación no es válido.');
  }

  if (!validarPrioridad(recomendacion.prioridad)) {
    throw new Error('La prioridad de la recomendación no es válida.');
  }

  if (!validarEstado(recomendacion.estado)) {
    throw new Error('El estado de la recomendación no es válido.');
  }

  if (!recomendacion.titulo || !recomendacion.descripcion) {
    throw new Error('La recomendación debe tener título y descripción.');
  }

  if (!recomendacion.accionSugerida) {
    throw new Error('La recomendación debe tener una acción sugerida.');
  }

  return true;
};

const contarPorCampo = (items, campo) => {
  return items.reduce((resultado, item) => {
    const clave = item[campo] || 'sin_clasificar';

    if (!resultado[clave]) {
      resultado[clave] = 0;
    }

    resultado[clave] += 1;

    return resultado;
  }, {});
};

export const crearResumenContextoRecomendaciones = (analisisFinanciero) => {
  const resumen = analisisFinanciero?.resumenAnalizado || {};
  const perfil = analisisFinanciero?.perfilFinanciero || {};
  const categorias = analisisFinanciero?.analisisCategorias || {};

  return {
    perfilFinanciero: {
      nivel: perfil.nivel || 'Sin datos',
      estado: perfil.estado || 'neutral',
      descripcion: perfil.descripcion || '',
    },
    resumenFinanciero: {
      totalMovimientos: resumen.totalMovimientos || 0,
      totalIngresos: resumen.totalIngresos || 0,
      totalGastos: resumen.totalGastos || 0,
      totalAhorros: resumen.totalAhorros || 0,
      totalDeudas: resumen.totalDeudas || 0,
      flujoNeto: resumen.flujoNeto || 0,
      porcentajeGastosSobreIngresos:
        resumen.porcentajeGastosSobreIngresos || 0,
      porcentajeAhorroSobreIngresos:
        resumen.porcentajeAhorroSobreIngresos || 0,
      porcentajeDeudasSobreIngresos:
        resumen.porcentajeDeudasSobreIngresos || 0,
    },
    categoriaPrincipalGasto:
      categorias.categoriaPrincipal || null,
    prioridadesDetectadas:
      analisisFinanciero?.prioridadesDetectadas || [],
    hallazgos:
      analisisFinanciero?.hallazgos || [],
  };
};

export const crearEstructuraRecomendaciones = ({
  uid = null,
  periodo = null,
  analisisFinanciero = null,
  recomendaciones = [],
} = {}) => {
  const recomendacionesValidadas = recomendaciones.map(
    (recomendacion, index) => {
      const recomendacionOrdenada = {
        ...recomendacion,
        orden: recomendacion.orden ?? index + 1,
      };

      validarEstructuraRecomendacion(recomendacionOrdenada);

      return recomendacionOrdenada;
    }
  );

  return {
    version: '1.0',
    uid,
    periodo,
    contexto: crearResumenContextoRecomendaciones(analisisFinanciero),
    totalRecomendaciones: recomendacionesValidadas.length,
    recomendaciones: recomendacionesValidadas,
    resumen: {
      porTipo: contarPorCampo(recomendacionesValidadas, 'tipo'),
      porPrioridad: contarPorCampo(recomendacionesValidadas, 'prioridad'),
      porEstado: contarPorCampo(recomendacionesValidadas, 'estado'),
    },
    estado: 'generado',
    actualizadoEn: new Date().toISOString(),
  };
};

export const crearRecomendacionDesdeHallazgo = ({
  hallazgo,
  periodo = null,
  orden = 0,
}) => {
  if (!hallazgo) {
    throw new Error('No se recibió un hallazgo para crear la recomendación.');
  }

  const mapaTipoPorCategoria = {
    gastos: TIPOS_RECOMENDACION.CONTROL_GASTOS,
    ahorro: TIPOS_RECOMENDACION.AHORRO,
    deudas: TIPOS_RECOMENDACION.DEUDAS,
    flujo: TIPOS_RECOMENDACION.FLUJO_NETO,
  };

  const mapaPrioridadPorNivel = {
    riesgo: PRIORIDADES_RECOMENDACION.ALTA,
    advertencia: PRIORIDADES_RECOMENDACION.MEDIA,
    informativo: PRIORIDADES_RECOMENDACION.BAJA,
    positivo: PRIORIDADES_RECOMENDACION.BAJA,
  };

  const tipo =
    mapaTipoPorCategoria[hallazgo.categoria] ||
    TIPOS_RECOMENDACION.GENERAL;

  const prioridad =
    mapaPrioridadPorNivel[hallazgo.nivel] ||
    PRIORIDADES_RECOMENDACION.MEDIA;

  return crearRecomendacion({
    tipo,
    prioridad,
    titulo: `Revisar: ${hallazgo.titulo}`,
    descripcion: hallazgo.descripcion,
    accionSugerida:
      'Revisar este comportamiento financiero y definir una acción de mejora.',
    motivo: `Esta recomendación se genera a partir del hallazgo: ${hallazgo.titulo}.`,
    beneficioEsperado:
      'Ayudar al usuario a mejorar el control de sus finanzas personales.',
    metricaRelacionada: {
      categoria: hallazgo.categoria,
      valor: hallazgo.valor,
      nivel: hallazgo.nivel,
    },
    fuente: FUENTES_RECOMENDACION.ANALISIS_FINANCIERO,
    etiquetas: [hallazgo.categoria, hallazgo.nivel],
    periodo,
    orden,
  });
};

export const crearRecomendacionesBaseDesdeAnalisis = ({
  analisisFinanciero,
  periodo = null,
}) => {
  const hallazgos = analisisFinanciero?.hallazgos || [];

  if (hallazgos.length === 0) {
    return [];
  }

  return hallazgos.map((hallazgo, index) =>
    crearRecomendacionDesdeHallazgo({
      hallazgo,
      periodo,
      orden: index + 1,
    })
  );
};

export const prepararEstructuraParaIA = (analisisFinanciero) => {
  const contexto = crearResumenContextoRecomendaciones(analisisFinanciero);

  return {
    objetivo:
      'Generar recomendaciones financieras personalizadas para mejorar ahorro, controlar gastos y fortalecer hábitos financieros.',
    perfilFinanciero: contexto.perfilFinanciero,
    resumenFinanciero: contexto.resumenFinanciero,
    categoriaPrincipalGasto: contexto.categoriaPrincipalGasto,
    prioridadesDetectadas: contexto.prioridadesDetectadas,
    hallazgos: contexto.hallazgos.map((hallazgo) => ({
      titulo: hallazgo.titulo,
      descripcion: hallazgo.descripcion,
      nivel: hallazgo.nivel,
      categoria: hallazgo.categoria,
      valor: hallazgo.valor,
    })),
    formatoEsperado: {
      tipo: Object.values(TIPOS_RECOMENDACION),
      prioridad: Object.values(PRIORIDADES_RECOMENDACION),
      camposObligatorios: [
        'titulo',
        'descripcion',
        'accionSugerida',
        'motivo',
        'beneficioEsperado',
      ],
    },
  };
};