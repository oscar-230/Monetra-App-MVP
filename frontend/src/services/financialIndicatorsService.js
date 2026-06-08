// frontend/src/services/financialIndicatorsService.js

import { calcularMetricasFinancieras } from './financialMetricsService';

const formatearCOP = (valor) => {
  const numero = Number(valor) || 0;

  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(numero);
};

const formatearPorcentaje = (valor) => {
  const numero = Number(valor) || 0;

  return `${numero.toFixed(2)}%`;
};

const redondear = (valor, decimales = 2) => {
  const numero = Number(valor) || 0;
  const factor = 10 ** decimales;

  return Math.round((numero + Number.EPSILON) * factor) / factor;
};

const obtenerEstadoFlujo = (flujoNeto) => {
  if (flujoNeto > 0) return 'positivo';
  if (flujoNeto === 0) return 'neutral';

  return 'riesgo';
};

const obtenerEstadoGastos = (porcentajeGastos) => {
  if (porcentajeGastos > 80) return 'riesgo';
  if (porcentajeGastos > 60) return 'advertencia';

  return 'positivo';
};

const obtenerEstadoAhorro = (porcentajeAhorro) => {
  if (porcentajeAhorro >= 20) return 'positivo';
  if (porcentajeAhorro >= 10) return 'neutral';

  return 'advertencia';
};

const obtenerEstadoDeudas = (porcentajeDeudas) => {
  if (porcentajeDeudas > 30) return 'riesgo';
  if (porcentajeDeudas > 15) return 'advertencia';

  return 'positivo';
};

const crearIndicador = ({
  id,
  titulo,
  valor,
  valorNumerico,
  tipo,
  estado,
  descripcion,
  prioridad = 'media',
}) => {
  return {
    id,
    titulo,
    valor,
    valorNumerico,
    tipo,
    estado,
    descripcion,
    prioridad,
  };
};

const calcularParticipacion = (valor, total) => {
  if (!total || total <= 0) return 0;

  return redondear((valor / total) * 100);
};

export const calcularIndicadoresFinancieros = ({
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
    totalIngresos,
    totalGastos,
    totalAhorros,
    totalDeudas,
    totalEgresos,
    balanceOperativo,
    flujoNeto,
    totalMovimientos,
  } = metricas.resumenGeneral;

  const {
    porcentajeGastosSobreIngresos,
    porcentajeAhorroSobreIngresos,
    porcentajeDeudasSobreIngresos,
    gastoPromedioDiario,
    ingresoPromedioDiario,
    ahorroPromedioDiario,
    gastoPromedioPorMovimiento,
  } = metricas.indicadores;

  const categoriaMayorGasto = metricas.categorias.categoriaMayorGasto;

  const indicadoresPrincipales = [
    crearIndicador({
      id: 'total-ingresos',
      titulo: 'Ingresos',
      valor: formatearCOP(totalIngresos),
      valorNumerico: totalIngresos,
      tipo: 'moneda',
      estado: totalIngresos > 0 ? 'positivo' : 'neutral',
      descripcion: 'Total de ingresos registrados en el período seleccionado.',
      prioridad: 'alta',
    }),
    crearIndicador({
      id: 'total-gastos',
      titulo: 'Gastos',
      valor: formatearCOP(totalGastos),
      valorNumerico: totalGastos,
      tipo: 'moneda',
      estado: obtenerEstadoGastos(porcentajeGastosSobreIngresos),
      descripcion: 'Total de gastos registrados en el período seleccionado.',
      prioridad: 'alta',
    }),
    crearIndicador({
      id: 'total-ahorros',
      titulo: 'Ahorros',
      valor: formatearCOP(totalAhorros),
      valorNumerico: totalAhorros,
      tipo: 'moneda',
      estado: obtenerEstadoAhorro(porcentajeAhorroSobreIngresos),
      descripcion: 'Total destinado al ahorro durante el período.',
      prioridad: 'alta',
    }),
    crearIndicador({
      id: 'total-deudas',
      titulo: 'Deudas',
      valor: formatearCOP(totalDeudas),
      valorNumerico: totalDeudas,
      tipo: 'moneda',
      estado: obtenerEstadoDeudas(porcentajeDeudasSobreIngresos),
      descripcion: 'Total relacionado con pagos o registros de deudas.',
      prioridad: 'alta',
    }),
  ];

  const indicadoresBalance = [
    crearIndicador({
      id: 'balance-operativo',
      titulo: 'Balance operativo',
      valor: formatearCOP(balanceOperativo),
      valorNumerico: balanceOperativo,
      tipo: 'moneda',
      estado: balanceOperativo >= 0 ? 'positivo' : 'riesgo',
      descripcion: 'Diferencia entre ingresos y gastos del período.',
      prioridad: 'alta',
    }),
    crearIndicador({
      id: 'flujo-neto',
      titulo: 'Flujo neto',
      valor: formatearCOP(flujoNeto),
      valorNumerico: flujoNeto,
      tipo: 'moneda',
      estado: obtenerEstadoFlujo(flujoNeto),
      descripcion: 'Resultado después de restar gastos, ahorros y deudas a los ingresos.',
      prioridad: 'alta',
    }),
    crearIndicador({
      id: 'total-egresos',
      titulo: 'Egresos totales',
      valor: formatearCOP(totalEgresos),
      valorNumerico: totalEgresos,
      tipo: 'moneda',
      estado: totalEgresos <= totalIngresos ? 'positivo' : 'riesgo',
      descripcion: 'Suma de gastos, ahorros y deudas del período.',
      prioridad: 'media',
    }),
  ];

  const indicadoresPorcentuales = [
    crearIndicador({
      id: 'porcentaje-gastos',
      titulo: 'Gastos sobre ingresos',
      valor: formatearPorcentaje(porcentajeGastosSobreIngresos),
      valorNumerico: porcentajeGastosSobreIngresos,
      tipo: 'porcentaje',
      estado: obtenerEstadoGastos(porcentajeGastosSobreIngresos),
      descripcion: 'Porcentaje de los ingresos que se destinó a gastos.',
      prioridad: 'alta',
    }),
    crearIndicador({
      id: 'porcentaje-ahorro',
      titulo: 'Ahorro sobre ingresos',
      valor: formatearPorcentaje(porcentajeAhorroSobreIngresos),
      valorNumerico: porcentajeAhorroSobreIngresos,
      tipo: 'porcentaje',
      estado: obtenerEstadoAhorro(porcentajeAhorroSobreIngresos),
      descripcion: 'Porcentaje de los ingresos que se destinó al ahorro.',
      prioridad: 'alta',
    }),
    crearIndicador({
      id: 'porcentaje-deudas',
      titulo: 'Deudas sobre ingresos',
      valor: formatearPorcentaje(porcentajeDeudasSobreIngresos),
      valorNumerico: porcentajeDeudasSobreIngresos,
      tipo: 'porcentaje',
      estado: obtenerEstadoDeudas(porcentajeDeudasSobreIngresos),
      descripcion: 'Porcentaje de los ingresos relacionado con deudas.',
      prioridad: 'alta',
    }),
  ];

  const indicadoresPromedio = [
    crearIndicador({
      id: 'gasto-promedio-diario',
      titulo: 'Gasto promedio diario',
      valor: formatearCOP(gastoPromedioDiario),
      valorNumerico: gastoPromedioDiario,
      tipo: 'moneda',
      estado: 'neutral',
      descripcion: 'Promedio diario de gastos en el período seleccionado.',
      prioridad: 'media',
    }),
    crearIndicador({
      id: 'ingreso-promedio-diario',
      titulo: 'Ingreso promedio diario',
      valor: formatearCOP(ingresoPromedioDiario),
      valorNumerico: ingresoPromedioDiario,
      tipo: 'moneda',
      estado: 'neutral',
      descripcion: 'Promedio diario de ingresos en el período seleccionado.',
      prioridad: 'media',
    }),
    crearIndicador({
      id: 'ahorro-promedio-diario',
      titulo: 'Ahorro promedio diario',
      valor: formatearCOP(ahorroPromedioDiario),
      valorNumerico: ahorroPromedioDiario,
      tipo: 'moneda',
      estado: 'neutral',
      descripcion: 'Promedio diario destinado al ahorro.',
      prioridad: 'media',
    }),
    crearIndicador({
      id: 'gasto-promedio-movimiento',
      titulo: 'Gasto promedio por movimiento',
      valor: formatearCOP(gastoPromedioPorMovimiento),
      valorNumerico: gastoPromedioPorMovimiento,
      tipo: 'moneda',
      estado: 'neutral',
      descripcion: 'Valor promedio de cada movimiento registrado como gasto.',
      prioridad: 'media',
    }),
  ];

  const indicadorCategoriaMayorGasto = categoriaMayorGasto
    ? crearIndicador({
        id: 'categoria-mayor-gasto',
        titulo: 'Categoría con mayor gasto',
        valor: categoriaMayorGasto.categoria,
        valorNumerico: categoriaMayorGasto.total,
        tipo: 'texto',
        estado: 'neutral',
        descripcion: `${categoriaMayorGasto.categoria} concentra ${formatearCOP(
          categoriaMayorGasto.total
        )}, equivalente al ${formatearPorcentaje(
          categoriaMayorGasto.porcentajeSobreGastos
        )} de los gastos.`,
        prioridad: 'alta',
      })
    : crearIndicador({
        id: 'categoria-mayor-gasto',
        titulo: 'Categoría con mayor gasto',
        valor: 'Sin datos',
        valorNumerico: 0,
        tipo: 'texto',
        estado: 'neutral',
        descripcion: 'No hay gastos suficientes para identificar una categoría principal.',
        prioridad: 'media',
      });

  const distribucionPorTipo = {
    ingresos: {
      total: totalIngresos,
      porcentaje: calcularParticipacion(totalIngresos, totalIngresos + totalEgresos),
    },
    gastos: {
      total: totalGastos,
      porcentaje: calcularParticipacion(totalGastos, totalIngresos + totalEgresos),
    },
    ahorros: {
      total: totalAhorros,
      porcentaje: calcularParticipacion(totalAhorros, totalIngresos + totalEgresos),
    },
    deudas: {
      total: totalDeudas,
      porcentaje: calcularParticipacion(totalDeudas, totalIngresos + totalEgresos),
    },
  };

  return {
    periodo: metricas.periodo,
    totalMovimientos,
    indicadoresPrincipales,
    indicadoresBalance,
    indicadoresPorcentuales,
    indicadoresPromedio,
    indicadorCategoriaMayorGasto,
    distribucionPorTipo,
    saludFinanciera: metricas.saludFinanciera,
    alertas: metricas.alertas,
    resumen: {
      ingresos: totalIngresos,
      gastos: totalGastos,
      ahorros: totalAhorros,
      deudas: totalDeudas,
      egresos: totalEgresos,
      balanceOperativo,
      flujoNeto,
    },
    actualizadoEn: new Date().toISOString(),
  };
};