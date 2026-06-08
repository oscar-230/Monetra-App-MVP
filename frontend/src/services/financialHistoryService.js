// frontend/src/services/financialHistoryService.js

import {
  collection,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
} from 'firebase/firestore';

import { auth, db } from '../firebase/config';

const TIPOS_MOVIMIENTO = ['ingreso', 'gasto', 'ahorro', 'deuda'];

const obtenerUsuarioAutenticado = () => {
  const usuario = auth.currentUser;

  if (!usuario) {
    throw new Error('No hay un usuario autenticado para recopilar historial financiero.');
  }

  return usuario;
};

const redondear = (valor, decimales = 2) => {
  const numero = Number(valor) || 0;
  const factor = 10 ** decimales;

  return Math.round((numero + Number.EPSILON) * factor) / factor;
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

const formatearFechaISO = (fecha) => {
  const fechaConvertida = convertirFecha(fecha);

  if (!fechaConvertida) return null;

  const year = fechaConvertida.getFullYear();
  const month = String(fechaConvertida.getMonth() + 1).padStart(2, '0');
  const day = String(fechaConvertida.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const obtenerClaveMes = (fecha) => {
  const fechaConvertida = convertirFecha(fecha);

  if (!fechaConvertida) return 'sin-fecha';

  const year = fechaConvertida.getFullYear();
  const month = String(fechaConvertida.getMonth() + 1).padStart(2, '0');

  return `${year}-${month}`;
};

const obtenerNombreMes = (claveMes) => {
  if (!claveMes || claveMes === 'sin-fecha') return 'Sin fecha';

  const [year, month] = claveMes.split('-');

  const fecha = new Date(Number(year), Number(month) - 1, 1);

  return fecha.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
  });
};

const crearTotalesIniciales = () => ({
  ingresos: 0,
  gastos: 0,
  ahorros: 0,
  deudas: 0,
});

const obtenerClaveTotalPorTipo = (tipo) => {
  const mapa = {
    ingreso: 'ingresos',
    gasto: 'gastos',
    ahorro: 'ahorros',
    deuda: 'deudas',
  };

  return mapa[tipo] || null;
};

const validarPeriodoHistorico = ({ fechaInicio, fechaFin }) => {
  if (!fechaInicio || !fechaFin) {
    throw new Error('Debes indicar fecha de inicio y fecha de fin.');
  }

  const inicio = new Date(`${fechaInicio}T00:00:00`);
  const fin = new Date(`${fechaFin}T23:59:59`);

  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) {
    throw new Error('El período histórico no es válido.');
  }

  if (inicio > fin) {
    throw new Error('La fecha de inicio no puede ser mayor que la fecha de fin.');
  }

  return {
    inicio,
    fin,
  };
};

export const obtenerPeriodoHistorico = (meses = 6) => {
  const cantidadMeses = Number(meses) || 6;

  const hoy = new Date();

  const fechaInicio = new Date(
    hoy.getFullYear(),
    hoy.getMonth() - cantidadMeses + 1,
    1
  );

  const fechaFin = new Date(
    hoy.getFullYear(),
    hoy.getMonth() + 1,
    0
  );

  const formatear = (fecha) => {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

  return {
    fechaInicio: formatear(fechaInicio),
    fechaFin: formatear(fechaFin),
    meses: cantidadMeses,
  };
};

const normalizarMovimientoHistorico = (documento) => {
  const datos = documento.data();

  const fechaMovimiento = convertirFecha(datos.fecha);
  const tipo = datos.tipo || 'gasto';
  const monto = Number(datos.monto) || 0;

  if (!TIPOS_MOVIMIENTO.includes(tipo) || monto <= 0) {
    return null;
  }

  return {
    id: documento.id,
    uid: datos.uid || '',
    tipo,
    monto: redondear(monto),
    categoria: datos.categoria || 'Sin categoría',
    fecha: formatearFechaISO(fechaMovimiento),
    mes: obtenerClaveMes(fechaMovimiento),
    descripcion: datos.descripcion || '',
    moneda: datos.moneda || 'COP',
    origen: datos.origen || 'manual',
  };
};

const construirConsultaHistorial = ({
  uid,
  fechaInicio,
  fechaFin,
  limiteMovimientos = 500,
}) => {
  const { inicio, fin } = validarPeriodoHistorico({
    fechaInicio,
    fechaFin,
  });

  const movimientosRef = collection(
    db,
    'users',
    uid,
    'movements'
  );

  return query(
    movimientosRef,
    where('fecha', '>=', Timestamp.fromDate(inicio)),
    where('fecha', '<=', Timestamp.fromDate(fin)),
    orderBy('fecha', 'asc'),
    limit(limiteMovimientos)
  );
};

const calcularResumenGeneral = (movimientos) => {
  const totales = crearTotalesIniciales();

  movimientos.forEach((movimiento) => {
    const claveTotal = obtenerClaveTotalPorTipo(movimiento.tipo);

    if (claveTotal) {
      totales[claveTotal] += movimiento.monto;
    }
  });

  const totalEgresos = totales.gastos + totales.ahorros + totales.deudas;
  const balanceOperativo = totales.ingresos - totales.gastos;
  const flujoNeto = totales.ingresos - totalEgresos;

  return {
    totalMovimientos: movimientos.length,
    totalIngresos: redondear(totales.ingresos),
    totalGastos: redondear(totales.gastos),
    totalAhorros: redondear(totales.ahorros),
    totalDeudas: redondear(totales.deudas),
    totalEgresos: redondear(totalEgresos),
    balanceOperativo: redondear(balanceOperativo),
    flujoNeto: redondear(flujoNeto),
  };
};

const agruparPorMes = (movimientos) => {
  const resumen = {};

  movimientos.forEach((movimiento) => {
    const mes = movimiento.mes || 'sin-fecha';

    if (!resumen[mes]) {
      resumen[mes] = {
        mes,
        nombreMes: obtenerNombreMes(mes),
        totalMovimientos: 0,
        ingresos: 0,
        gastos: 0,
        ahorros: 0,
        deudas: 0,
        balanceOperativo: 0,
        flujoNeto: 0,
        categoriasGasto: {},
      };
    }

    const item = resumen[mes];

    item.totalMovimientos += 1;

    const claveTotal = obtenerClaveTotalPorTipo(movimiento.tipo);

    if (claveTotal) {
      item[claveTotal] += movimiento.monto;
    }

    if (movimiento.tipo === 'gasto') {
      const categoria = movimiento.categoria || 'Sin categoría';

      if (!item.categoriasGasto[categoria]) {
        item.categoriasGasto[categoria] = 0;
      }

      item.categoriasGasto[categoria] += movimiento.monto;
    }
  });

  return Object.values(resumen)
    .map((item) => {
      const totalEgresos = item.gastos + item.ahorros + item.deudas;

      return {
        ...item,
        ingresos: redondear(item.ingresos),
        gastos: redondear(item.gastos),
        ahorros: redondear(item.ahorros),
        deudas: redondear(item.deudas),
        balanceOperativo: redondear(item.ingresos - item.gastos),
        flujoNeto: redondear(item.ingresos - totalEgresos),
        categoriasGasto: Object.entries(item.categoriasGasto)
          .map(([categoria, total]) => ({
            categoria,
            total: redondear(total),
          }))
          .sort((a, b) => b.total - a.total),
      };
    })
    .sort((a, b) => a.mes.localeCompare(b.mes));
};

const calcularPromediosMensuales = (historialMensual) => {
  const mesesConDatos = historialMensual.length || 1;

  const acumulado = historialMensual.reduce(
    (total, mes) => ({
      ingresos: total.ingresos + mes.ingresos,
      gastos: total.gastos + mes.gastos,
      ahorros: total.ahorros + mes.ahorros,
      deudas: total.deudas + mes.deudas,
      flujoNeto: total.flujoNeto + mes.flujoNeto,
    }),
    {
      ingresos: 0,
      gastos: 0,
      ahorros: 0,
      deudas: 0,
      flujoNeto: 0,
    }
  );

  return {
    ingresoPromedioMensual: redondear(acumulado.ingresos / mesesConDatos),
    gastoPromedioMensual: redondear(acumulado.gastos / mesesConDatos),
    ahorroPromedioMensual: redondear(acumulado.ahorros / mesesConDatos),
    deudaPromedioMensual: redondear(acumulado.deudas / mesesConDatos),
    flujoNetoPromedioMensual: redondear(acumulado.flujoNeto / mesesConDatos),
  };
};

const calcularTendenciaGastos = (historialMensual) => {
  if (historialMensual.length < 2) {
    return {
      tendencia: 'insuficiente',
      variacionPorcentual: 0,
      descripcion: 'No hay suficientes meses para calcular tendencia de gastos.',
    };
  }

  const primerMes = historialMensual[0];
  const ultimoMes = historialMensual[historialMensual.length - 1];

  if (!primerMes.gastos || primerMes.gastos <= 0) {
    return {
      tendencia: 'insuficiente',
      variacionPorcentual: 0,
      descripcion: 'El primer mes no tiene gastos suficientes para comparar.',
    };
  }

  const variacionPorcentual = redondear(
    ((ultimoMes.gastos - primerMes.gastos) / primerMes.gastos) * 100
  );

  if (variacionPorcentual > 10) {
    return {
      tendencia: 'aumento',
      variacionPorcentual,
      descripcion: `Los gastos aumentaron aproximadamente ${variacionPorcentual}% frente al inicio del período.`,
    };
  }

  if (variacionPorcentual < -10) {
    return {
      tendencia: 'disminucion',
      variacionPorcentual,
      descripcion: `Los gastos disminuyeron aproximadamente ${Math.abs(
        variacionPorcentual
      )}% frente al inicio del período.`,
    };
  }

  return {
    tendencia: 'estable',
    variacionPorcentual,
    descripcion: 'Los gastos se mantienen relativamente estables en el período.',
  };
};

const obtenerCategoriasFrecuentes = (historialMensual) => {
  const acumulado = {};

  historialMensual.forEach((mes) => {
    mes.categoriasGasto.forEach((categoria) => {
      if (!acumulado[categoria.categoria]) {
        acumulado[categoria.categoria] = {
          categoria: categoria.categoria,
          total: 0,
          apariciones: 0,
        };
      }

      acumulado[categoria.categoria].total += categoria.total;
      acumulado[categoria.categoria].apariciones += 1;
    });
  });

  return Object.values(acumulado)
    .map((categoria) => ({
      ...categoria,
      total: redondear(categoria.total),
    }))
    .sort((a, b) => b.total - a.total);
};

export const recopilarHistorialFinanciero = async ({
  fechaInicio,
  fechaFin,
  meses = 6,
  limiteMovimientos = 500,
} = {}) => {
  const usuario = obtenerUsuarioAutenticado();

  const periodo = fechaInicio && fechaFin
    ? { fechaInicio, fechaFin, meses: null }
    : obtenerPeriodoHistorico(meses);

  const consulta = construirConsultaHistorial({
    uid: usuario.uid,
    fechaInicio: periodo.fechaInicio,
    fechaFin: periodo.fechaFin,
    limiteMovimientos,
  });

  const resultado = await getDocs(consulta);

  const movimientos = resultado.docs
    .map(normalizarMovimientoHistorico)
    .filter(Boolean);

  const historialMensual = agruparPorMes(movimientos);
  const resumenGeneral = calcularResumenGeneral(movimientos);
  const promediosMensuales = calcularPromediosMensuales(historialMensual);
  const tendenciaGastos = calcularTendenciaGastos(historialMensual);
  const categoriasFrecuentes = obtenerCategoriasFrecuentes(historialMensual);

  return {
    uid: usuario.uid,
    periodo,
    resumenGeneral,
    promediosMensuales,
    tendenciaGastos,
    categoriasFrecuentes,
    historialMensual,
    movimientos,
    totalMesesConDatos: historialMensual.length,
    totalMovimientosRecopilados: movimientos.length,
    listoParaPrediccion: movimientos.length > 0 && historialMensual.length >= 1,
    advertencias:
      movimientos.length === 0
        ? ['No hay historial financiero suficiente para generar predicciones.']
        : [],
    actualizadoEn: new Date().toISOString(),
  };
};

export const escucharHistorialFinanciero = ({
  fechaInicio,
  fechaFin,
  meses = 6,
  limiteMovimientos = 500,
  onHistorial,
  onError,
}) => {
  const usuario = obtenerUsuarioAutenticado();

  const periodo = fechaInicio && fechaFin
    ? { fechaInicio, fechaFin, meses: null }
    : obtenerPeriodoHistorico(meses);

  const consulta = construirConsultaHistorial({
    uid: usuario.uid,
    fechaInicio: periodo.fechaInicio,
    fechaFin: periodo.fechaFin,
    limiteMovimientos,
  });

  const cancelarEscucha = onSnapshot(
    consulta,
    (resultado) => {
      const movimientos = resultado.docs
        .map(normalizarMovimientoHistorico)
        .filter(Boolean);

      const historialMensual = agruparPorMes(movimientos);
      const resumenGeneral = calcularResumenGeneral(movimientos);
      const promediosMensuales = calcularPromediosMensuales(historialMensual);
      const tendenciaGastos = calcularTendenciaGastos(historialMensual);
      const categoriasFrecuentes = obtenerCategoriasFrecuentes(historialMensual);

      const historial = {
        uid: usuario.uid,
        periodo,
        resumenGeneral,
        promediosMensuales,
        tendenciaGastos,
        categoriasFrecuentes,
        historialMensual,
        movimientos,
        totalMesesConDatos: historialMensual.length,
        totalMovimientosRecopilados: movimientos.length,
        listoParaPrediccion:
          movimientos.length > 0 && historialMensual.length >= 1,
        advertencias:
          movimientos.length === 0
            ? ['No hay historial financiero suficiente para generar predicciones.']
            : [],
        actualizadoEn: new Date().toISOString(),
      };

      if (typeof onHistorial === 'function') {
        onHistorial(historial);
      }
    },
    (error) => {
      if (typeof onError === 'function') {
        onError(error);
      } else {
        console.error('Error al recopilar historial financiero:', error);
      }
    }
  );

  return cancelarEscucha;
};