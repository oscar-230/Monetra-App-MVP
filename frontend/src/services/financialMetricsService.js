// frontend/src/services/financialMetricsService.js

const TIPOS_MOVIMIENTO = ['ingreso', 'gasto', 'ahorro', 'deuda'];

const CLAVE_TOTAL_POR_TIPO = {
  ingreso: 'ingresos',
  gasto: 'gastos',
  ahorro: 'ahorros',
  deuda: 'deudas',
};

const redondear = (valor, decimales = 2) => {
  const numero = Number(valor) || 0;
  const factor = 10 ** decimales;

  return Math.round((numero + Number.EPSILON) * factor) / factor;
};

const calcularPorcentaje = (valor, base) => {
  if (!base || base <= 0) return 0;

  return redondear((valor / base) * 100);
};

const convertirFecha = (fecha) => {
  if (!fecha) return null;

  if (fecha instanceof Date) {
    return fecha;
  }

  if (typeof fecha.toDate === 'function') {
    return fecha.toDate();
  }

  const fechaConvertida = new Date(`${fecha}T00:00:00`);

  if (Number.isNaN(fechaConvertida.getTime())) {
    return null;
  }

  return fechaConvertida;
};

const calcularDiasPeriodo = ({ fechaInicio, fechaFin }) => {
  const inicio = convertirFecha(fechaInicio);
  const fin = convertirFecha(fechaFin);

  if (!inicio || !fin) return 1;

  const milisegundosPorDia = 1000 * 60 * 60 * 24;
  const diferencia = Math.floor((fin - inicio) / milisegundosPorDia) + 1;

  return Math.max(diferencia, 1);
};

const crearTotalesIniciales = () => ({
  ingresos: 0,
  gastos: 0,
  ahorros: 0,
  deudas: 0,
});

const crearConteoInicial = () => ({
  ingreso: 0,
  gasto: 0,
  ahorro: 0,
  deuda: 0,
});

const normalizarMovimiento = (movimiento) => {
  const tipo = movimiento?.tipo;
  const monto = Number(movimiento?.monto) || 0;

  if (!TIPOS_MOVIMIENTO.includes(tipo) || monto <= 0) {
    return null;
  }

  return {
    ...movimiento,
    tipo,
    monto,
    categoria: movimiento.categoria || 'Sin categoría',
  };
};

const calcularTotalesYConteos = (movimientos) => {
  const totales = crearTotalesIniciales();
  const conteo = crearConteoInicial();

  movimientos.forEach((movimiento) => {
    const claveTotal = CLAVE_TOTAL_POR_TIPO[movimiento.tipo];

    if (!claveTotal) return;

    totales[claveTotal] += movimiento.monto;
    conteo[movimiento.tipo] += 1;
  });

  return {
    totales,
    conteo,
  };
};

const calcularGastosPorCategoria = (movimientos) => {
  const gastosPorCategoria = {};

  movimientos
    .filter((movimiento) => movimiento.tipo === 'gasto')
    .forEach((movimiento) => {
      const categoria = movimiento.categoria || 'Sin categoría';

      if (!gastosPorCategoria[categoria]) {
        gastosPorCategoria[categoria] = {
          categoria,
          total: 0,
          cantidad: 0,
        };
      }

      gastosPorCategoria[categoria].total += movimiento.monto;
      gastosPorCategoria[categoria].cantidad += 1;
    });

  return Object.values(gastosPorCategoria).sort((a, b) => b.total - a.total);
};

const calcularCategoriaMayorGasto = (gastosPorCategoria, totalGastos) => {
  if (!gastosPorCategoria.length) {
    return null;
  }

  const categoriaMayor = gastosPorCategoria[0];

  return {
    ...categoriaMayor,
    porcentajeSobreGastos: calcularPorcentaje(categoriaMayor.total, totalGastos),
  };
};

const calcularPuntajeSaludFinanciera = ({
  totalMovimientos,
  ingresos,
  gastos,
  ahorros,
  deudas,
  flujoNeto,
}) => {
  if (totalMovimientos === 0) {
    return {
      puntaje: 0,
      nivel: 'Sin datos',
      mensaje: 'No hay movimientos suficientes para calcular la salud financiera.',
    };
  }

  if (ingresos === 0) {
    return {
      puntaje: 20,
      nivel: 'Información incompleta',
      mensaje: 'Existen movimientos, pero no hay ingresos registrados en el período.',
    };
  }

  let puntaje = 100;

  const porcentajeGastos = calcularPorcentaje(gastos, ingresos);
  const porcentajeAhorro = calcularPorcentaje(ahorros, ingresos);
  const porcentajeDeudas = calcularPorcentaje(deudas, ingresos);

  if (flujoNeto < 0) {
    puntaje -= 30;
  }

  if (porcentajeGastos > 80) {
    puntaje -= 25;
  } else if (porcentajeGastos > 60) {
    puntaje -= 10;
  }

  if (porcentajeAhorro < 10) {
    puntaje -= 20;
  } else if (porcentajeAhorro >= 20) {
    puntaje += 5;
  }

  if (porcentajeDeudas > 30) {
    puntaje -= 20;
  } else if (porcentajeDeudas > 15) {
    puntaje -= 10;
  }

  puntaje = Math.max(0, Math.min(100, Math.round(puntaje)));

  if (puntaje >= 80) {
    return {
      puntaje,
      nivel: 'Alta',
      mensaje: 'El estado financiero del período es favorable.',
    };
  }

  if (puntaje >= 60) {
    return {
      puntaje,
      nivel: 'Media',
      mensaje: 'El estado financiero del período es estable, pero puede mejorar.',
    };
  }

  if (puntaje >= 40) {
    return {
      puntaje,
      nivel: 'Baja',
      mensaje: 'El estado financiero del período requiere atención.',
    };
  }

  return {
    puntaje,
    nivel: 'Crítica',
    mensaje: 'El estado financiero del período presenta señales de riesgo.',
  };
};

const generarAlertasFinancieras = ({
  totalMovimientos,
  ingresos,
  gastos,
  ahorros,
  deudas,
  flujoNeto,
}) => {
  const alertas = [];

  if (totalMovimientos === 0) {
    alertas.push('No hay movimientos registrados en el período seleccionado.');
    return alertas;
  }

  if (ingresos === 0 && gastos > 0) {
    alertas.push('Hay gastos registrados, pero no hay ingresos en el período.');
  }

  if (flujoNeto < 0) {
    alertas.push('El flujo neto es negativo: los egresos superan los ingresos.');
  }

  if (ingresos > 0) {
    const porcentajeGastos = calcularPorcentaje(gastos, ingresos);
    const porcentajeAhorro = calcularPorcentaje(ahorros, ingresos);
    const porcentajeDeudas = calcularPorcentaje(deudas, ingresos);

    if (porcentajeGastos > 80) {
      alertas.push('Los gastos representan más del 80% de los ingresos.');
    }

    if (porcentajeAhorro < 10) {
      alertas.push('El ahorro registrado es menor al 10% de los ingresos.');
    }

    if (porcentajeDeudas > 30) {
      alertas.push('Las deudas representan más del 30% de los ingresos.');
    }
  }

  return alertas;
};

export const calcularMetricasFinancieras = ({
  movimientos = [],
  fechaInicio = null,
  fechaFin = null,
} = {}) => {
  const movimientosValidos = movimientos
    .map(normalizarMovimiento)
    .filter(Boolean);

  const { totales, conteo } = calcularTotalesYConteos(movimientosValidos);

  const totalMovimientos = movimientosValidos.length;
  const totalEgresos = totales.gastos + totales.ahorros + totales.deudas;

  const balanceOperativo = totales.ingresos - totales.gastos;
  const flujoNeto = totales.ingresos - totalEgresos;

  const diasPeriodo = calcularDiasPeriodo({
    fechaInicio,
    fechaFin,
  });

  const gastosPorCategoria = calcularGastosPorCategoria(movimientosValidos);
  const categoriaMayorGasto = calcularCategoriaMayorGasto(
    gastosPorCategoria,
    totales.gastos
  );

  const indicadores = {
    porcentajeGastosSobreIngresos: calcularPorcentaje(
      totales.gastos,
      totales.ingresos
    ),
    porcentajeAhorroSobreIngresos: calcularPorcentaje(
      totales.ahorros,
      totales.ingresos
    ),
    porcentajeDeudasSobreIngresos: calcularPorcentaje(
      totales.deudas,
      totales.ingresos
    ),
    gastoPromedioDiario: redondear(totales.gastos / diasPeriodo),
    ingresoPromedioDiario: redondear(totales.ingresos / diasPeriodo),
    ahorroPromedioDiario: redondear(totales.ahorros / diasPeriodo),
    gastoPromedioPorMovimiento: conteo.gasto
      ? redondear(totales.gastos / conteo.gasto)
      : 0,
    ingresoPromedioPorMovimiento: conteo.ingreso
      ? redondear(totales.ingresos / conteo.ingreso)
      : 0,
  };

  const saludFinanciera = calcularPuntajeSaludFinanciera({
    totalMovimientos,
    ingresos: totales.ingresos,
    gastos: totales.gastos,
    ahorros: totales.ahorros,
    deudas: totales.deudas,
    flujoNeto,
  });

  const alertas = generarAlertasFinancieras({
    totalMovimientos,
    ingresos: totales.ingresos,
    gastos: totales.gastos,
    ahorros: totales.ahorros,
    deudas: totales.deudas,
    flujoNeto,
  });

  return {
    periodo: {
      fechaInicio,
      fechaFin,
      diasPeriodo,
    },
    resumenGeneral: {
      totalMovimientos,
      totalIngresos: redondear(totales.ingresos),
      totalGastos: redondear(totales.gastos),
      totalAhorros: redondear(totales.ahorros),
      totalDeudas: redondear(totales.deudas),
      totalEgresos: redondear(totalEgresos),
      balanceOperativo: redondear(balanceOperativo),
      flujoNeto: redondear(flujoNeto),
    },
    conteoMovimientos: conteo,
    indicadores,
    categorias: {
      gastosPorCategoria,
      categoriaMayorGasto,
    },
    saludFinanciera,
    alertas,
    actualizadoEn: new Date().toISOString(),
  };
};