// frontend/src/services/futureExpenseEstimatesService.js

import {
  generarPrediccionGastosUsuario,
  escucharPrediccionGastosFuturos,
} from './expensePredictionService';

export const ESTADOS_ESTIMACION_FUTURA = {
  CALCULADA: 'calculada',
  DATOS_INSUFICIENTES: 'datos_insuficientes',
  ERROR: 'error',
};

const VERSION_ESTIMACION = '1.0';

const redondear = (valor, decimales = 2) => {
  const numero = Number(valor) || 0;
  const factor = 10 ** decimales;

  return Math.round((numero + Number.EPSILON) * factor) / factor;
};

const generarIdEstimacion = (periodoHistorico, horizontePrediccion) => {
  const fecha = new Date().toISOString().replace(/[:.]/g, '-');

  const inicio = periodoHistorico?.fechaInicio || 'sin-inicio';
  const fin = periodoHistorico?.fechaFin || 'sin-fin';
  const meses = horizontePrediccion?.mesesPrediccion || 0;

  return `estimacion-${inicio}-${fin}-${meses}m-${fecha}`;
};

const calcularVariacionPorcentual = (valor, referencia) => {
  if (!referencia || referencia <= 0) return 0;

  return redondear(((valor - referencia) / referencia) * 100);
};

const clasificarVariacion = (variacion) => {
  if (variacion > 15) return 'aumento_alto';
  if (variacion > 5) return 'aumento_moderado';
  if (variacion < -15) return 'disminucion_alta';
  if (variacion < -5) return 'disminucion_moderada';

  return 'estable';
};

const obtenerNivelImpacto = ({ estimacionProbable, promedioHistorico }) => {
  if (!promedioHistorico || promedioHistorico <= 0) {
    return {
      nivel: 'sin_referencia',
      descripcion: 'No existe un promedio histórico suficiente para comparar.',
    };
  }

  const variacion = calcularVariacionPorcentual(
    estimacionProbable,
    promedioHistorico
  );

  if (variacion > 15) {
    return {
      nivel: 'alto',
      descripcion: 'La estimación supera considerablemente el promedio histórico.',
    };
  }

  if (variacion > 5) {
    return {
      nivel: 'medio',
      descripcion: 'La estimación está por encima del promedio histórico.',
    };
  }

  if (variacion < -5) {
    return {
      nivel: 'bajo',
      descripcion: 'La estimación está por debajo del promedio histórico.',
    };
  }

  return {
    nivel: 'estable',
    descripcion: 'La estimación se mantiene cercana al promedio histórico.',
  };
};

const normalizarCategoriaEstimada = (categoria) => {
  return {
    categoria: categoria.categoria || 'Sin categoría',
    porcentajeHistorico: redondear(categoria.porcentajeHistorico),
    gastoEstimado: redondear(categoria.gastoEstimado),
  };
};

const normalizarEstimacionMensual = ({
  prediccionMensual,
  promedioHistorico,
}) => {
  const estimacionProbable = redondear(prediccionMensual.gastoEstimado);
  const estimacionMinima = redondear(prediccionMensual.rangoMinimo);
  const estimacionMaxima = redondear(prediccionMensual.rangoMaximo);

  const variacionVsPromedioHistorico = calcularVariacionPorcentual(
    estimacionProbable,
    promedioHistorico
  );

  return {
    mes: prediccionMensual.mes,
    nombreMes: prediccionMensual.nombreMes,
    estimacionMinima,
    estimacionProbable,
    estimacionMaxima,
    margenErrorEstimado: redondear(prediccionMensual.margenErrorEstimado),
    variacionVsPromedioHistorico,
    estadoComparativo: clasificarVariacion(variacionVsPromedioHistorico),
    nivelImpacto: obtenerNivelImpacto({
      estimacionProbable,
      promedioHistorico,
    }),
    categoriasEstimadas: (prediccionMensual.categoriasEstimadas || []).map(
      normalizarCategoriaEstimada
    ),
    explicacion:
      prediccionMensual.explicacion ||
      'Estimación calculada con base en el historial financiero disponible.',
  };
};

const calcularEstimacionTotal = ({
  estimacionesMensuales,
  promedioHistorico,
}) => {
  const estimacionMinima = redondear(
    estimacionesMensuales.reduce(
      (suma, item) => suma + item.estimacionMinima,
      0
    )
  );

  const estimacionProbable = redondear(
    estimacionesMensuales.reduce(
      (suma, item) => suma + item.estimacionProbable,
      0
    )
  );

  const estimacionMaxima = redondear(
    estimacionesMensuales.reduce(
      (suma, item) => suma + item.estimacionMaxima,
      0
    )
  );

  const meses = estimacionesMensuales.length || 1;

  const promedioMensualEstimado = redondear(estimacionProbable / meses);

  return {
    estimacionMinima,
    estimacionProbable,
    estimacionMaxima,
    promedioMensualEstimado,
    variacionPromedioVsHistorico: calcularVariacionPorcentual(
      promedioMensualEstimado,
      promedioHistorico
    ),
  };
};

const calcularCategoriasEstimadasTotales = (estimacionesMensuales) => {
  const acumulado = {};

  estimacionesMensuales.forEach((estimacion) => {
    estimacion.categoriasEstimadas.forEach((categoria) => {
      if (!acumulado[categoria.categoria]) {
        acumulado[categoria.categoria] = {
          categoria: categoria.categoria,
          gastoEstimado: 0,
          apariciones: 0,
        };
      }

      acumulado[categoria.categoria].gastoEstimado += categoria.gastoEstimado;
      acumulado[categoria.categoria].apariciones += 1;
    });
  });

  const totalEstimado = Object.values(acumulado).reduce(
    (suma, categoria) => suma + categoria.gastoEstimado,
    0
  );

  return Object.values(acumulado)
    .map((categoria) => ({
      categoria: categoria.categoria,
      gastoEstimado: redondear(categoria.gastoEstimado),
      porcentajeSobreTotalEstimado: totalEstimado
        ? redondear((categoria.gastoEstimado / totalEstimado) * 100)
        : 0,
      mesesEstimados: categoria.apariciones,
    }))
    .sort((a, b) => b.gastoEstimado - a.gastoEstimado);
};

const calcularTendenciaEstimaciones = (estimacionesMensuales) => {
  if (estimacionesMensuales.length < 2) {
    return {
      tendencia: 'insuficiente',
      variacionPorcentual: 0,
      descripcion: 'No hay suficientes meses estimados para calcular tendencia futura.',
    };
  }

  const primera = estimacionesMensuales[0];
  const ultima = estimacionesMensuales[estimacionesMensuales.length - 1];

  const variacionPorcentual = calcularVariacionPorcentual(
    ultima.estimacionProbable,
    primera.estimacionProbable
  );

  if (variacionPorcentual > 8) {
    return {
      tendencia: 'aumento',
      variacionPorcentual,
      descripcion: `Las estimaciones futuras muestran un posible aumento de ${variacionPorcentual}% en los gastos.`,
    };
  }

  if (variacionPorcentual < -8) {
    return {
      tendencia: 'disminucion',
      variacionPorcentual,
      descripcion: `Las estimaciones futuras muestran una posible disminución de ${Math.abs(
        variacionPorcentual
      )}% en los gastos.`,
    };
  }

  return {
    tendencia: 'estable',
    variacionPorcentual,
    descripcion: 'Las estimaciones futuras se mantienen relativamente estables.',
  };
};

const construirMensajesInterpretacion = ({
  estimacionTotal,
  tendenciaEstimaciones,
  confianza,
}) => {
  const mensajes = [];

  mensajes.push(
    `El gasto futuro probable estimado es de ${estimacionTotal.estimacionProbable}.`
  );

  mensajes.push(
    `El rango estimado se encuentra entre ${estimacionTotal.estimacionMinima} y ${estimacionTotal.estimacionMaxima}.`
  );

  if (tendenciaEstimaciones.tendencia === 'aumento') {
    mensajes.push(
      'Se observa una posible tendencia de aumento en los gastos futuros.'
    );
  }

  if (tendenciaEstimaciones.tendencia === 'disminucion') {
    mensajes.push(
      'Se observa una posible reducción en los gastos futuros.'
    );
  }

  if (confianza?.nivel === 'baja') {
    mensajes.push(
      'La estimación debe tomarse con cautela porque la confianza del modelo es baja.'
    );
  }

  mensajes.push(
    'Estas estimaciones son aproximaciones basadas en el historial financiero registrado.'
  );

  return mensajes;
};

const crearRespuestaDatosInsuficientes = (prediccionGastos) => {
  return {
    exito: false,
    estado: ESTADOS_ESTIMACION_FUTURA.DATOS_INSUFICIENTES,
    version: VERSION_ESTIMACION,
    periodoHistorico: prediccionGastos?.periodoHistorico || null,
    horizontePrediccion: prediccionGastos?.horizontePrediccion || null,
    estimacionesMensuales: [],
    estimacionTotal: {
      estimacionMinima: 0,
      estimacionProbable: 0,
      estimacionMaxima: 0,
      promedioMensualEstimado: 0,
      variacionPromedioVsHistorico: 0,
    },
    categoriasEstimadasTotales: [],
    tendenciaEstimaciones: {
      tendencia: 'insuficiente',
      variacionPorcentual: 0,
      descripcion: 'No hay datos suficientes para calcular estimaciones futuras.',
    },
    confianza: prediccionGastos?.confianza || {
      nivel: 'baja',
      puntaje: 0,
      descripcion: 'No hay historial suficiente.',
    },
    mensajesInterpretacion: [
      'No hay historial financiero suficiente para calcular estimaciones futuras.',
      'Registra más movimientos para mejorar la calidad de las estimaciones.',
    ],
    advertencias: prediccionGastos?.advertencias || [
      'Las estimaciones requieren datos históricos para ser calculadas.',
    ],
    actualizadoEn: new Date().toISOString(),
  };
};

export const calcularEstimacionesFuturas = ({
  prediccionGastos,
} = {}) => {
  if (!prediccionGastos) {
    throw new Error('No se recibió una predicción de gastos para calcular estimaciones futuras.');
  }

  if (
    !prediccionGastos.exito ||
    !Array.isArray(prediccionGastos.prediccionesMensuales) ||
    prediccionGastos.prediccionesMensuales.length === 0
  ) {
    return crearRespuestaDatosInsuficientes(prediccionGastos);
  }

  const promedioHistorico =
    prediccionGastos.resumenHistorico?.gastoPromedioMensual || 0;

  const estimacionesMensuales = prediccionGastos.prediccionesMensuales.map(
    (prediccionMensual) =>
      normalizarEstimacionMensual({
        prediccionMensual,
        promedioHistorico,
      })
  );

  const estimacionTotal = calcularEstimacionTotal({
    estimacionesMensuales,
    promedioHistorico,
  });

  const categoriasEstimadasTotales = calcularCategoriasEstimadasTotales(
    estimacionesMensuales
  );

  const tendenciaEstimaciones = calcularTendenciaEstimaciones(
    estimacionesMensuales
  );

  const mensajesInterpretacion = construirMensajesInterpretacion({
    estimacionTotal,
    tendenciaEstimaciones,
    confianza: prediccionGastos.confianza,
  });

  return {
    exito: true,
    id: generarIdEstimacion(
      prediccionGastos.periodoHistorico,
      prediccionGastos.horizontePrediccion
    ),
    estado: ESTADOS_ESTIMACION_FUTURA.CALCULADA,
    version: VERSION_ESTIMACION,
    modeloReferencia: prediccionGastos.modelo || null,
    periodoHistorico: prediccionGastos.periodoHistorico || null,
    horizontePrediccion: prediccionGastos.horizontePrediccion || null,
    resumenHistorico: prediccionGastos.resumenHistorico || null,
    estimacionesMensuales,
    estimacionTotal,
    categoriasEstimadasTotales,
    tendenciaEstimaciones,
    confianza: prediccionGastos.confianza || null,
    mensajesInterpretacion,
    advertencias: [
      'Las estimaciones son aproximaciones basadas en datos históricos.',
      'Los resultados pueden cambiar cuando se registren nuevos movimientos.',
      ...(prediccionGastos.advertencias || []),
    ],
    actualizadoEn: new Date().toISOString(),
  };
};

export const calcularEstimacionesFuturasUsuario = async ({
  mesesHistorial = 6,
  mesesPrediccion = 3,
} = {}) => {
  const prediccionGastos = await generarPrediccionGastosUsuario({
    mesesHistorial,
    mesesPrediccion,
  });

  return calcularEstimacionesFuturas({
    prediccionGastos,
  });
};

export const escucharEstimacionesFuturas = ({
  mesesHistorial = 6,
  mesesPrediccion = 3,
  onEstimaciones,
  onError,
}) => {
  const cancelarEscucha = escucharPrediccionGastosFuturos({
    mesesHistorial,
    mesesPrediccion,
    onPrediccion: (prediccionGastos) => {
      try {
        const estimaciones = calcularEstimacionesFuturas({
          prediccionGastos,
        });

        if (typeof onEstimaciones === 'function') {
          onEstimaciones(estimaciones);
        }
      } catch (error) {
        if (typeof onError === 'function') {
          onError(error);
        } else {
          console.error('Error al calcular estimaciones futuras:', error);
        }
      }
    },
    onError,
  });

  return cancelarEscucha;
};