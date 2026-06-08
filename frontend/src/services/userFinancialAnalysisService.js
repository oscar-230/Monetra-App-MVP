// frontend/src/services/userFinancialAnalysisService.js

import {
  obtenerPeriodoMesActual,
  obtenerReporteFinanciero,
} from './financialReportsService';

import { calcularMetricasFinancieras } from './financialMetricsService';

const UMBRALES_ANALISIS = {
  gastosAltos: 80,
  gastosModerados: 60,
  ahorroBajo: 10,
  ahorroBueno: 20,
  deudasAltas: 30,
  deudasModeradas: 15,
};

const redondear = (valor, decimales = 2) => {
  const numero = Number(valor) || 0;
  const factor = 10 ** decimales;

  return Math.round((numero + Number.EPSILON) * factor) / factor;
};

const formatearCOP = (valor) => {
  const numero = Number(valor) || 0;

  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(numero);
};

const crearHallazgo = ({
  id,
  titulo,
  descripcion,
  nivel = 'informativo',
  categoria = 'general',
  valor = null,
}) => {
  return {
    id,
    titulo,
    descripcion,
    nivel,
    categoria,
    valor,
  };
};

const obtenerNivelRiesgoGeneral = ({
  flujoNeto,
  porcentajeGastos,
  porcentajeAhorro,
  porcentajeDeudas,
  totalMovimientos,
}) => {
  if (totalMovimientos === 0) {
    return {
      nivel: 'Sin datos',
      estado: 'neutral',
      descripcion: 'No hay movimientos suficientes para analizar el comportamiento financiero.',
    };
  }

  let puntajeRiesgo = 0;

  if (flujoNeto < 0) puntajeRiesgo += 3;
  if (porcentajeGastos > UMBRALES_ANALISIS.gastosAltos) puntajeRiesgo += 2;
  if (porcentajeAhorro < UMBRALES_ANALISIS.ahorroBajo) puntajeRiesgo += 2;
  if (porcentajeDeudas > UMBRALES_ANALISIS.deudasAltas) puntajeRiesgo += 2;

  if (puntajeRiesgo >= 6) {
    return {
      nivel: 'Alto riesgo',
      estado: 'riesgo',
      descripcion: 'El comportamiento financiero presenta varias señales que requieren atención.',
    };
  }

  if (puntajeRiesgo >= 3) {
    return {
      nivel: 'Riesgo moderado',
      estado: 'advertencia',
      descripcion: 'El comportamiento financiero es manejable, pero existen puntos importantes por mejorar.',
    };
  }

  return {
    nivel: 'Estable',
    estado: 'positivo',
    descripcion: 'El comportamiento financiero del período se mantiene en condiciones favorables.',
  };
};

const analizarGastos = ({ metricas }) => {
  const hallazgos = [];

  const porcentajeGastos =
    metricas.indicadores.porcentajeGastosSobreIngresos;

  const totalGastos = metricas.resumenGeneral.totalGastos;

  if (totalGastos === 0) {
    hallazgos.push(
      crearHallazgo({
        id: 'sin-gastos',
        titulo: 'Sin gastos registrados',
        descripcion: 'No se registraron gastos en el período analizado.',
        nivel: 'informativo',
        categoria: 'gastos',
        valor: totalGastos,
      })
    );

    return hallazgos;
  }

  if (porcentajeGastos > UMBRALES_ANALISIS.gastosAltos) {
    hallazgos.push(
      crearHallazgo({
        id: 'gastos-altos',
        titulo: 'Gastos elevados',
        descripcion: `Los gastos representan el ${porcentajeGastos}% de los ingresos del período.`,
        nivel: 'riesgo',
        categoria: 'gastos',
        valor: porcentajeGastos,
      })
    );
  } else if (porcentajeGastos > UMBRALES_ANALISIS.gastosModerados) {
    hallazgos.push(
      crearHallazgo({
        id: 'gastos-moderados',
        titulo: 'Gastos moderados',
        descripcion: `Los gastos representan el ${porcentajeGastos}% de los ingresos del período.`,
        nivel: 'advertencia',
        categoria: 'gastos',
        valor: porcentajeGastos,
      })
    );
  } else {
    hallazgos.push(
      crearHallazgo({
        id: 'gastos-controlados',
        titulo: 'Gastos controlados',
        descripcion: `Los gastos representan el ${porcentajeGastos}% de los ingresos del período.`,
        nivel: 'positivo',
        categoria: 'gastos',
        valor: porcentajeGastos,
      })
    );
  }

  return hallazgos;
};

const analizarAhorro = ({ metricas }) => {
  const hallazgos = [];

  const porcentajeAhorro =
    metricas.indicadores.porcentajeAhorroSobreIngresos;

  const totalAhorros = metricas.resumenGeneral.totalAhorros;

  if (totalAhorros === 0) {
    hallazgos.push(
      crearHallazgo({
        id: 'sin-ahorro',
        titulo: 'Sin ahorro registrado',
        descripcion: 'No se registraron movimientos de ahorro en el período analizado.',
        nivel: 'advertencia',
        categoria: 'ahorro',
        valor: totalAhorros,
      })
    );

    return hallazgos;
  }

  if (porcentajeAhorro >= UMBRALES_ANALISIS.ahorroBueno) {
    hallazgos.push(
      crearHallazgo({
        id: 'ahorro-saludable',
        titulo: 'Ahorro saludable',
        descripcion: `El ahorro representa el ${porcentajeAhorro}% de los ingresos del período.`,
        nivel: 'positivo',
        categoria: 'ahorro',
        valor: porcentajeAhorro,
      })
    );
  } else if (porcentajeAhorro >= UMBRALES_ANALISIS.ahorroBajo) {
    hallazgos.push(
      crearHallazgo({
        id: 'ahorro-moderado',
        titulo: 'Ahorro moderado',
        descripcion: `El ahorro representa el ${porcentajeAhorro}% de los ingresos del período.`,
        nivel: 'informativo',
        categoria: 'ahorro',
        valor: porcentajeAhorro,
      })
    );
  } else {
    hallazgos.push(
      crearHallazgo({
        id: 'ahorro-bajo',
        titulo: 'Ahorro bajo',
        descripcion: `El ahorro representa solo el ${porcentajeAhorro}% de los ingresos del período.`,
        nivel: 'advertencia',
        categoria: 'ahorro',
        valor: porcentajeAhorro,
      })
    );
  }

  return hallazgos;
};

const analizarDeudas = ({ metricas }) => {
  const hallazgos = [];

  const porcentajeDeudas =
    metricas.indicadores.porcentajeDeudasSobreIngresos;

  const totalDeudas = metricas.resumenGeneral.totalDeudas;

  if (totalDeudas === 0) {
    hallazgos.push(
      crearHallazgo({
        id: 'sin-deudas',
        titulo: 'Sin deudas registradas',
        descripcion: 'No se registraron movimientos asociados a deudas en el período.',
        nivel: 'positivo',
        categoria: 'deudas',
        valor: totalDeudas,
      })
    );

    return hallazgos;
  }

  if (porcentajeDeudas > UMBRALES_ANALISIS.deudasAltas) {
    hallazgos.push(
      crearHallazgo({
        id: 'deudas-altas',
        titulo: 'Nivel de deudas alto',
        descripcion: `Las deudas representan el ${porcentajeDeudas}% de los ingresos del período.`,
        nivel: 'riesgo',
        categoria: 'deudas',
        valor: porcentajeDeudas,
      })
    );
  } else if (porcentajeDeudas > UMBRALES_ANALISIS.deudasModeradas) {
    hallazgos.push(
      crearHallazgo({
        id: 'deudas-moderadas',
        titulo: 'Nivel de deudas moderado',
        descripcion: `Las deudas representan el ${porcentajeDeudas}% de los ingresos del período.`,
        nivel: 'advertencia',
        categoria: 'deudas',
        valor: porcentajeDeudas,
      })
    );
  } else {
    hallazgos.push(
      crearHallazgo({
        id: 'deudas-controladas',
        titulo: 'Deudas controladas',
        descripcion: `Las deudas representan el ${porcentajeDeudas}% de los ingresos del período.`,
        nivel: 'positivo',
        categoria: 'deudas',
        valor: porcentajeDeudas,
      })
    );
  }

  return hallazgos;
};

const analizarFlujoNeto = ({ metricas }) => {
  const flujoNeto = metricas.resumenGeneral.flujoNeto;

  if (flujoNeto < 0) {
    return [
      crearHallazgo({
        id: 'flujo-neto-negativo',
        titulo: 'Flujo neto negativo',
        descripcion: `El flujo neto del período es ${formatearCOP(
          flujoNeto
        )}. Esto indica que los egresos superan los ingresos.`,
        nivel: 'riesgo',
        categoria: 'flujo',
        valor: flujoNeto,
      }),
    ];
  }

  if (flujoNeto === 0) {
    return [
      crearHallazgo({
        id: 'flujo-neto-neutral',
        titulo: 'Flujo neto equilibrado',
        descripcion: 'Los ingresos y egresos del período están equilibrados.',
        nivel: 'informativo',
        categoria: 'flujo',
        valor: flujoNeto,
      }),
    ];
  }

  return [
    crearHallazgo({
      id: 'flujo-neto-positivo',
      titulo: 'Flujo neto positivo',
      descripcion: `El flujo neto del período es ${formatearCOP(
        flujoNeto
      )}. Esto indica que los ingresos superan los egresos.`,
      nivel: 'positivo',
      categoria: 'flujo',
      valor: flujoNeto,
    }),
  ];
};

const analizarCategoriasDeGasto = ({ metricas }) => {
  const categoriaMayorGasto = metricas.categorias.categoriaMayorGasto;

  if (!categoriaMayorGasto) {
    return {
      categoriaPrincipal: null,
      descripcion: 'No hay categorías de gasto suficientes para analizar.',
      gastosPorCategoria: [],
    };
  }

  return {
    categoriaPrincipal: {
      categoria: categoriaMayorGasto.categoria,
      total: redondear(categoriaMayorGasto.total),
      porcentajeSobreGastos: categoriaMayorGasto.porcentajeSobreGastos,
      cantidad: categoriaMayorGasto.cantidad,
    },
    descripcion: `La categoría con mayor gasto es ${
      categoriaMayorGasto.categoria
    }, con un total de ${formatearCOP(
      categoriaMayorGasto.total
    )}, equivalente al ${categoriaMayorGasto.porcentajeSobreGastos}% de los gastos.`,
    gastosPorCategoria: metricas.categorias.gastosPorCategoria,
  };
};

const analizarFrecuenciaMovimientos = ({ movimientos, diasPeriodo }) => {
  const totalMovimientos = movimientos.length;
  const promedioMovimientosDiarios = redondear(
    totalMovimientos / Math.max(diasPeriodo, 1)
  );

  return {
    totalMovimientos,
    promedioMovimientosDiarios,
    descripcion:
      totalMovimientos > 0
        ? `El usuario registró en promedio ${promedioMovimientosDiarios} movimientos por día.`
        : 'No se registraron movimientos en el período analizado.',
  };
};

const detectarPrioridades = ({ hallazgos }) => {
  const prioridades = [];

  if (hallazgos.some((hallazgo) => hallazgo.id === 'gastos-altos')) {
    prioridades.push('control_gastos');
  }

  if (
    hallazgos.some(
      (hallazgo) =>
        hallazgo.id === 'sin-ahorro' || hallazgo.id === 'ahorro-bajo'
    )
  ) {
    prioridades.push('fortalecer_ahorro');
  }

  if (hallazgos.some((hallazgo) => hallazgo.id === 'deudas-altas')) {
    prioridades.push('control_deudas');
  }

  if (hallazgos.some((hallazgo) => hallazgo.id === 'flujo-neto-negativo')) {
    prioridades.push('mejorar_flujo_neto');
  }

  return [...new Set(prioridades)];
};

export const analizarInformacionFinanciera = ({
  movimientos = [],
  fechaInicio = null,
  fechaFin = null,
} = {}) => {
  const metricas = calcularMetricasFinancieras({
    movimientos,
    fechaInicio,
    fechaFin,
  });

  const {
    totalMovimientos,
    totalIngresos,
    totalGastos,
    totalAhorros,
    totalDeudas,
    flujoNeto,
  } = metricas.resumenGeneral;

  const porcentajeGastos =
    metricas.indicadores.porcentajeGastosSobreIngresos;

  const porcentajeAhorro =
    metricas.indicadores.porcentajeAhorroSobreIngresos;

  const porcentajeDeudas =
    metricas.indicadores.porcentajeDeudasSobreIngresos;

  const hallazgos = [
    ...analizarGastos({ metricas }),
    ...analizarAhorro({ metricas }),
    ...analizarDeudas({ metricas }),
    ...analizarFlujoNeto({ metricas }),
  ];

  const perfilFinanciero = obtenerNivelRiesgoGeneral({
    flujoNeto,
    porcentajeGastos,
    porcentajeAhorro,
    porcentajeDeudas,
    totalMovimientos,
  });

  const analisisCategorias = analizarCategoriasDeGasto({
    metricas,
  });

  const frecuenciaMovimientos = analizarFrecuenciaMovimientos({
    movimientos,
    diasPeriodo: metricas.periodo.diasPeriodo,
  });

  const prioridadesDetectadas = detectarPrioridades({
    hallazgos,
  });

  return {
    periodo: {
      fechaInicio,
      fechaFin,
      diasPeriodo: metricas.periodo.diasPeriodo,
    },
    resumenAnalizado: {
      totalMovimientos,
      totalIngresos,
      totalGastos,
      totalAhorros,
      totalDeudas,
      flujoNeto,
      porcentajeGastosSobreIngresos: porcentajeGastos,
      porcentajeAhorroSobreIngresos: porcentajeAhorro,
      porcentajeDeudasSobreIngresos: porcentajeDeudas,
    },
    perfilFinanciero,
    hallazgos,
    analisisCategorias,
    frecuenciaMovimientos,
    prioridadesDetectadas,
    metricasBase: metricas,
    actualizadoEn: new Date().toISOString(),
  };
};

export const obtenerAnalisisFinancieroUsuario = async (
  periodo = obtenerPeriodoMesActual()
) => {
  const reporte = await obtenerReporteFinanciero(periodo);

  const analisis = analizarInformacionFinanciera({
    movimientos: reporte.movimientos,
    fechaInicio: periodo.fechaInicio,
    fechaFin: periodo.fechaFin,
  });

  return {
    ...analisis,
    reporteBase: reporte,
  };
};