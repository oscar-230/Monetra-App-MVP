// frontend/src/services/expensePredictionService.js

import {
  escucharHistorialFinanciero,
  recopilarHistorialFinanciero,
} from './financialHistoryService';

export const ESTADOS_PREDICCION_GASTOS = {
  GENERADA: 'generada',
  DATOS_INSUFICIENTES: 'datos_insuficientes',
  ERROR: 'error',
};

const NOMBRE_MODELO = 'modelo_predictivo_gastos_combinado';
const VERSION_MODELO = '1.0';

const redondear = (valor, decimales = 2) => {
  const numero = Number(valor) || 0;
  const factor = 10 ** decimales;

  return Math.round((numero + Number.EPSILON) * factor) / factor;
};

const obtenerNombreMesDesdeFecha = (fecha) => {
  return fecha.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
  });
};

const obtenerClaveMesDesdeFecha = (fecha) => {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, '0');

  return `${year}-${month}`;
};

const convertirMesAFecha = (mes) => {
  if (!mes || mes === 'sin-fecha') return null;

  const [year, month] = mes.split('-');

  const fecha = new Date(Number(year), Number(month) - 1, 1);

  if (Number.isNaN(fecha.getTime())) {
    return null;
  }

  return fecha;
};

const obtenerSerieGastosMensuales = (historialMensual = []) => {
  return historialMensual
    .filter((item) => item.mes && item.mes !== 'sin-fecha')
    .map((item) => ({
      mes: item.mes,
      nombreMes: item.nombreMes,
      gastos: Number(item.gastos) || 0,
      totalMovimientos: Number(item.totalMovimientos) || 0,
    }))
    .sort((a, b) => a.mes.localeCompare(b.mes));
};

const calcularPromedio = (valores) => {
  if (!valores.length) return 0;

  const total = valores.reduce((suma, valor) => suma + valor, 0);

  return redondear(total / valores.length);
};

const calcularDesviacionEstandar = (valores) => {
  if (!valores.length) return 0;

  const promedio = calcularPromedio(valores);

  const varianza =
    valores.reduce((suma, valor) => {
      return suma + (valor - promedio) ** 2;
    }, 0) / valores.length;

  return redondear(Math.sqrt(varianza));
};

const calcularPromedioPonderadoReciente = (valores, limite = 3) => {
  if (!valores.length) return 0;

  const ultimosValores = valores.slice(-limite);

  let sumaPesos = 0;
  let sumaPonderada = 0;

  ultimosValores.forEach((valor, index) => {
    const peso = index + 1;

    sumaPesos += peso;
    sumaPonderada += valor * peso;
  });

  return sumaPesos ? redondear(sumaPonderada / sumaPesos) : 0;
};

const calcularRegresionLineal = (valores) => {
  const n = valores.length;

  if (n < 2) {
    return {
      pendiente: 0,
      intercepto: valores[0] || 0,
      r2: 0,
      descripcion: 'No hay suficientes meses para calcular tendencia lineal.',
    };
  }

  const puntos = valores.map((valor, index) => ({
    x: index,
    y: valor,
  }));

  const sumaX = puntos.reduce((suma, punto) => suma + punto.x, 0);
  const sumaY = puntos.reduce((suma, punto) => suma + punto.y, 0);
  const sumaXY = puntos.reduce((suma, punto) => suma + punto.x * punto.y, 0);
  const sumaX2 = puntos.reduce((suma, punto) => suma + punto.x ** 2, 0);

  const denominador = n * sumaX2 - sumaX ** 2;

  const pendiente =
    denominador === 0
      ? 0
      : (n * sumaXY - sumaX * sumaY) / denominador;

  const intercepto = (sumaY - pendiente * sumaX) / n;

  const promedioY = sumaY / n;

  const ssTotal = puntos.reduce(
    (suma, punto) => suma + (punto.y - promedioY) ** 2,
    0
  );

  const ssResiduo = puntos.reduce((suma, punto) => {
    const estimado = intercepto + pendiente * punto.x;

    return suma + (punto.y - estimado) ** 2;
  }, 0);

  const r2 = ssTotal === 0 ? 1 : 1 - ssResiduo / ssTotal;

  return {
    pendiente: redondear(pendiente),
    intercepto: redondear(intercepto),
    r2: redondear(Math.max(0, Math.min(1, r2)), 4),
    descripcion: 'Tendencia calculada mediante regresión lineal simple.',
  };
};

const describirTendencia = ({ pendiente, promedio }) => {
  if (!promedio || promedio <= 0) {
    return {
      tendencia: 'insuficiente',
      descripcion: 'No hay gastos promedio suficientes para describir tendencia.',
    };
  }

  const variacionMensual = redondear((pendiente / promedio) * 100);

  if (variacionMensual > 8) {
    return {
      tendencia: 'aumento',
      variacionMensual,
      descripcion: `Los gastos muestran una tendencia de aumento aproximada de ${variacionMensual}% mensual.`,
    };
  }

  if (variacionMensual < -8) {
    return {
      tendencia: 'disminucion',
      variacionMensual,
      descripcion: `Los gastos muestran una tendencia de disminución aproximada de ${Math.abs(
        variacionMensual
      )}% mensual.`,
    };
  }

  return {
    tendencia: 'estable',
    variacionMensual,
    descripcion: 'Los gastos se mantienen relativamente estables.',
  };
};

const limitarEstimacion = ({ estimacion, promedio }) => {
  if (!Number.isFinite(estimacion) || estimacion < 0) {
    return 0;
  }

  if (!promedio || promedio <= 0) {
    return redondear(estimacion);
  }

  const maximoPermitido = promedio * 2.2;

  return redondear(Math.min(estimacion, maximoPermitido));
};

const calcularRangoPrediccion = ({ gastoEstimado, desviacionEstandar }) => {
  const margenMinimo = gastoEstimado * 0.12;
  const margenEstadistico = desviacionEstandar * 0.7;
  const margen = Math.max(margenMinimo, margenEstadistico);

  return {
    rangoMinimo: redondear(Math.max(0, gastoEstimado - margen)),
    rangoMaximo: redondear(gastoEstimado + margen),
    margenErrorEstimado: redondear(margen),
  };
};

const calcularConfianzaPrediccion = ({
  totalMeses,
  totalMovimientos,
  coeficienteVariacion,
  r2,
}) => {
  let puntaje = 35;

  if (totalMeses >= 6) {
    puntaje += 25;
  } else if (totalMeses >= 3) {
    puntaje += 15;
  } else if (totalMeses > 0) {
    puntaje += 5;
  }

  if (totalMovimientos >= 30) {
    puntaje += 20;
  } else if (totalMovimientos >= 10) {
    puntaje += 12;
  } else if (totalMovimientos > 0) {
    puntaje += 5;
  }

  if (coeficienteVariacion <= 20) {
    puntaje += 20;
  } else if (coeficienteVariacion <= 40) {
    puntaje += 12;
  } else if (coeficienteVariacion <= 60) {
    puntaje += 5;
  } else {
    puntaje -= 5;
  }

  if (r2 >= 0.6) {
    puntaje += 10;
  } else if (r2 >= 0.3) {
    puntaje += 5;
  }

  puntaje = Math.max(0, Math.min(100, Math.round(puntaje)));

  if (puntaje >= 75) {
    return {
      nivel: 'alta',
      puntaje,
      descripcion: 'La predicción tiene buena base histórica.',
    };
  }

  if (puntaje >= 50) {
    return {
      nivel: 'media',
      puntaje,
      descripcion: 'La predicción es útil, pero debe revisarse con cautela.',
    };
  }

  return {
    nivel: 'baja',
    puntaje,
    descripcion: 'La predicción es aproximada y requiere más historial financiero.',
  };
};

const calcularCategoriasEstimadas = ({
  categoriasFrecuentes = [],
  gastoEstimado,
}) => {
  const totalCategorias = categoriasFrecuentes.reduce(
    (suma, categoria) => suma + (Number(categoria.total) || 0),
    0
  );

  if (!totalCategorias || totalCategorias <= 0) {
    return [];
  }

  return categoriasFrecuentes.slice(0, 5).map((categoria) => {
    const porcentaje = redondear(
      ((Number(categoria.total) || 0) / totalCategorias) * 100
    );

    return {
      categoria: categoria.categoria,
      porcentajeHistorico: porcentaje,
      gastoEstimado: redondear((gastoEstimado * porcentaje) / 100),
    };
  });
};

const obtenerFechaUltimoMesHistorico = (serieGastos) => {
  if (!serieGastos.length) {
    return new Date();
  }

  const ultimoMes = serieGastos[serieGastos.length - 1].mes;

  return convertirMesAFecha(ultimoMes) || new Date();
};

const calcularPrediccionesMensuales = ({
  serieGastos,
  mesesPrediccion,
  promedioHistorico,
  promedioPonderado,
  desviacionEstandar,
  regresion,
  categoriasFrecuentes,
}) => {
  const predicciones = [];
  const fechaBase = obtenerFechaUltimoMesHistorico(serieGastos);
  const ultimoGasto = serieGastos[serieGastos.length - 1]?.gastos || promedioHistorico;

  for (let i = 1; i <= mesesPrediccion; i += 1) {
    const fechaPrediccion = new Date(
      fechaBase.getFullYear(),
      fechaBase.getMonth() + i,
      1
    );

    const indiceFuturo = serieGastos.length + i - 1;

    const estimacionTendencia =
      serieGastos.length >= 2
        ? regresion.intercepto + regresion.pendiente * indiceFuturo
        : promedioHistorico;

    const estimacionCombinada =
      serieGastos.length >= 2
        ? estimacionTendencia * 0.5 +
          promedioPonderado * 0.3 +
          promedioHistorico * 0.2
        : promedioHistorico || ultimoGasto;

    const gastoEstimado = limitarEstimacion({
      estimacion: estimacionCombinada,
      promedio: promedioHistorico,
    });

    const rango = calcularRangoPrediccion({
      gastoEstimado,
      desviacionEstandar,
    });

    predicciones.push({
      mes: obtenerClaveMesDesdeFecha(fechaPrediccion),
      nombreMes: obtenerNombreMesDesdeFecha(fechaPrediccion),
      gastoEstimado,
      ...rango,
      categoriasEstimadas: calcularCategoriasEstimadas({
        categoriasFrecuentes,
        gastoEstimado,
      }),
      explicacion:
        'Estimación calculada combinando promedio histórico, comportamiento reciente y tendencia mensual de gastos.',
    });
  }

  return predicciones;
};

const crearRespuestaSinDatos = ({ historialFinanciero, mesesPrediccion }) => {
  return {
    exito: false,
    estado: ESTADOS_PREDICCION_GASTOS.DATOS_INSUFICIENTES,
    modelo: {
      nombre: NOMBRE_MODELO,
      version: VERSION_MODELO,
      metodo: 'No aplicado por falta de datos.',
    },
    periodoHistorico: historialFinanciero?.periodo || null,
    horizontePrediccion: {
      mesesPrediccion,
    },
    prediccionesMensuales: [],
    prediccionTotal: {
      gastoEstimado: 0,
      rangoMinimo: 0,
      rangoMaximo: 0,
    },
    confianza: {
      nivel: 'baja',
      puntaje: 0,
      descripcion: 'No hay historial suficiente para generar predicciones.',
    },
    advertencias: [
      'No hay historial financiero suficiente para generar predicciones.',
      'Las predicciones son aproximaciones y dependen de la calidad de los datos históricos.',
    ],
    actualizadoEn: new Date().toISOString(),
  };
};

export const calcularPrediccionGastosFuturos = ({
  historialFinanciero,
  mesesPrediccion = 3,
} = {}) => {
  if (!historialFinanciero) {
    throw new Error('No se recibió el historial financiero para la predicción.');
  }

  const serieGastos = obtenerSerieGastosMensuales(
    historialFinanciero.historialMensual || []
  );

  if (!serieGastos.length) {
    return crearRespuestaSinDatos({
      historialFinanciero,
      mesesPrediccion,
    });
  }

  const valoresGastos = serieGastos.map((item) => item.gastos);

  const promedioHistorico = calcularPromedio(valoresGastos);
  const promedioPonderado = calcularPromedioPonderadoReciente(valoresGastos);
  const desviacionEstandar = calcularDesviacionEstandar(valoresGastos);

  const coeficienteVariacion =
    promedioHistorico > 0
      ? redondear((desviacionEstandar / promedioHistorico) * 100)
      : 0;

  const regresion = calcularRegresionLineal(valoresGastos);

  const tendenciaDetectada = describirTendencia({
    pendiente: regresion.pendiente,
    promedio: promedioHistorico,
  });

  const prediccionesMensuales = calcularPrediccionesMensuales({
    serieGastos,
    mesesPrediccion,
    promedioHistorico,
    promedioPonderado,
    desviacionEstandar,
    regresion,
    categoriasFrecuentes: historialFinanciero.categoriasFrecuentes || [],
  });

  const gastoEstimadoTotal = redondear(
    prediccionesMensuales.reduce(
      (suma, prediccion) => suma + prediccion.gastoEstimado,
      0
    )
  );

  const rangoMinimoTotal = redondear(
    prediccionesMensuales.reduce(
      (suma, prediccion) => suma + prediccion.rangoMinimo,
      0
    )
  );

  const rangoMaximoTotal = redondear(
    prediccionesMensuales.reduce(
      (suma, prediccion) => suma + prediccion.rangoMaximo,
      0
    )
  );

  const confianza = calcularConfianzaPrediccion({
    totalMeses: serieGastos.length,
    totalMovimientos: historialFinanciero.totalMovimientosRecopilados || 0,
    coeficienteVariacion,
    r2: regresion.r2,
  });

  return {
    exito: true,
    estado: ESTADOS_PREDICCION_GASTOS.GENERADA,
    modelo: {
      nombre: NOMBRE_MODELO,
      version: VERSION_MODELO,
      metodo:
        'Modelo combinado basado en promedio histórico, promedio ponderado reciente y tendencia lineal simple.',
      variablesUsadas: [
        'gastos mensuales históricos',
        'categorías frecuentes',
        'tendencia de gastos',
        'promedio ponderado reciente',
      ],
    },
    periodoHistorico: historialFinanciero.periodo || null,
    horizontePrediccion: {
      mesesPrediccion,
    },
    resumenHistorico: {
      totalMesesAnalizados: serieGastos.length,
      totalMovimientosAnalizados:
        historialFinanciero.totalMovimientosRecopilados || 0,
      gastoPromedioMensual: promedioHistorico,
      gastoPromedioReciente: promedioPonderado,
      desviacionEstandar,
      coeficienteVariacion,
    },
    tendenciaDetectada: {
      ...tendenciaDetectada,
      pendienteMensual: regresion.pendiente,
      r2: regresion.r2,
    },
    prediccionesMensuales,
    prediccionTotal: {
      gastoEstimado: gastoEstimadoTotal,
      rangoMinimo: rangoMinimoTotal,
      rangoMaximo: rangoMaximoTotal,
    },
    confianza,
    advertencias: [
      'Las predicciones son aproximaciones basadas en datos históricos.',
      'Los resultados pueden cambiar si se registran nuevos movimientos financieros.',
      'Este modelo no reemplaza la revisión personal del usuario sobre sus finanzas.',
      ...(historialFinanciero.advertencias || []),
    ],
    actualizadoEn: new Date().toISOString(),
  };
};

export const generarPrediccionGastosUsuario = async ({
  mesesHistorial = 6,
  mesesPrediccion = 3,
} = {}) => {
  const historialFinanciero = await recopilarHistorialFinanciero({
    meses: mesesHistorial,
  });

  return calcularPrediccionGastosFuturos({
    historialFinanciero,
    mesesPrediccion,
  });
};

export const escucharPrediccionGastosFuturos = ({
  mesesHistorial = 6,
  mesesPrediccion = 3,
  onPrediccion,
  onError,
}) => {
  const cancelarEscucha = escucharHistorialFinanciero({
    meses: mesesHistorial,
    onHistorial: (historialFinanciero) => {
      try {
        const prediccion = calcularPrediccionGastosFuturos({
          historialFinanciero,
          mesesPrediccion,
        });

        if (typeof onPrediccion === 'function') {
          onPrediccion(prediccion);
        }
      } catch (error) {
        if (typeof onError === 'function') {
          onError(error);
        } else {
          console.error('Error al calcular predicción de gastos:', error);
        }
      }
    },
    onError,
  });

  return cancelarEscucha;
};