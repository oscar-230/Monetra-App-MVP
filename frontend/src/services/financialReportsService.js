// frontend/src/services/financialReportsService.js

import { calcularMetricasFinancieras } from './financialMetricsService';

import {
  collection,
  getDocs,
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
    throw new Error('No hay un usuario autenticado para consultar reportes.');
  }

  return usuario;
};

const convertirFechaInicio = (fechaInicio) => {
  const fecha = new Date(`${fechaInicio}T00:00:00`);

  if (Number.isNaN(fecha.getTime())) {
    return null;
  }

  return fecha;
};

const convertirFechaFin = (fechaFin) => {
  const fecha = new Date(`${fechaFin}T23:59:59`);

  if (Number.isNaN(fecha.getTime())) {
    return null;
  }

  return fecha;
};

const validarPeriodo = ({ fechaInicio, fechaFin }) => {
  if (!fechaInicio || !fechaFin) {
    throw new Error('Debes indicar una fecha de inicio y una fecha de fin.');
  }

  const inicio = convertirFechaInicio(fechaInicio);
  const fin = convertirFechaFin(fechaFin);

  if (!inicio || !fin) {
    throw new Error('El período seleccionado no es válido.');
  }

  if (inicio > fin) {
    throw new Error('La fecha de inicio no puede ser mayor que la fecha de fin.');
  }

  return {
    inicio,
    fin,
  };
};

export const obtenerPeriodoMesActual = () => {
  const hoy = new Date();

  const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);

  const formatear = (fecha) => {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

  return {
    fechaInicio: formatear(inicio),
    fechaFin: formatear(fin),
  };
};

const construirConsultaMovimientosPorPeriodo = ({
  uid,
  fechaInicio,
  fechaFin,
}) => {
  const { inicio, fin } = validarPeriodo({
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
    orderBy('fecha', 'desc')
  );
};

const convertirFechaMovimiento = (fecha) => {
  if (!fecha) return null;

  if (typeof fecha.toDate === 'function') {
    return fecha.toDate();
  }

  if (fecha instanceof Date) {
    return fecha;
  }

  const fechaConvertida = new Date(fecha);

  if (Number.isNaN(fechaConvertida.getTime())) {
    return null;
  }

  return fechaConvertida;
};

const formatearFechaISO = (fecha) => {
  if (!fecha) return null;

  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, '0');
  const day = String(fecha.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const normalizarMovimiento = (documento) => {
  const datos = documento.data();

  const fechaMovimiento = convertirFechaMovimiento(datos.fecha);

  return {
    id: documento.id,
    uid: datos.uid || '',
    tipo: datos.tipo || 'gasto',
    monto: Number(datos.monto) || 0,
    categoria: datos.categoria || 'Sin categoría',
    fecha: formatearFechaISO(fechaMovimiento),
    fechaDate: fechaMovimiento,
    descripcion: datos.descripcion || '',
    moneda: datos.moneda || 'COP',
    origen: datos.origen || 'manual',
  };
};

const crearTotalesIniciales = () => ({
  ingresos: 0,
  gastos: 0,
  ahorros: 0,
  deudas: 0,
});

const obtenerClaveTotal = (tipo) => {
  const mapa = {
    ingreso: 'ingresos',
    gasto: 'gastos',
    ahorro: 'ahorros',
    deuda: 'deudas',
  };

  return mapa[tipo] || null;
};

const calcularPorTipo = (movimientos) => {
  const resumen = {
    ingreso: {
      cantidad: 0,
      total: 0,
    },
    gasto: {
      cantidad: 0,
      total: 0,
    },
    ahorro: {
      cantidad: 0,
      total: 0,
    },
    deuda: {
      cantidad: 0,
      total: 0,
    },
  };

  movimientos.forEach((movimiento) => {
    if (!TIPOS_MOVIMIENTO.includes(movimiento.tipo)) return;

    resumen[movimiento.tipo].cantidad += 1;
    resumen[movimiento.tipo].total += movimiento.monto;
  });

  return resumen;
};

const calcularPorCategoria = (movimientos) => {
  const resumen = {};

  movimientos.forEach((movimiento) => {
    const categoria = movimiento.categoria || 'Sin categoría';

    if (!resumen[categoria]) {
      resumen[categoria] = {
        categoria,
        cantidad: 0,
        total: 0,
        tipos: {},
      };
    }

    resumen[categoria].cantidad += 1;
    resumen[categoria].total += movimiento.monto;

    if (!resumen[categoria].tipos[movimiento.tipo]) {
      resumen[categoria].tipos[movimiento.tipo] = 0;
    }

    resumen[categoria].tipos[movimiento.tipo] += movimiento.monto;
  });

  return Object.values(resumen).sort((a, b) => b.total - a.total);
};

const calcularPorDia = (movimientos) => {
  const resumen = {};

  movimientos.forEach((movimiento) => {
    const fecha = movimiento.fecha || 'Sin fecha';

    if (!resumen[fecha]) {
      resumen[fecha] = {
        fecha,
        ingresos: 0,
        gastos: 0,
        ahorros: 0,
        deudas: 0,
        totalMovimientos: 0,
      };
    }

    const claveTotal = obtenerClaveTotal(movimiento.tipo);

    if (claveTotal) {
      resumen[fecha][claveTotal] += movimiento.monto;
    }

    resumen[fecha].totalMovimientos += 1;
  });

  return Object.values(resumen).sort((a, b) =>
    a.fecha.localeCompare(b.fecha)
  );
};

export const generarReporteFinanciero = ({
  movimientos,
  fechaInicio,
  fechaFin,
}) => {
  const totales = crearTotalesIniciales();

  movimientos.forEach((movimiento) => {
    const claveTotal = obtenerClaveTotal(movimiento.tipo);

    if (claveTotal) {
      totales[claveTotal] += movimiento.monto;
    }
  });

  const balanceOperativo = totales.ingresos - totales.gastos;

  const flujoNeto =
    totales.ingresos -
    totales.gastos -
    totales.ahorros -
    totales.deudas;

  const metricas = calcularMetricasFinancieras({
    movimientos,
    fechaInicio,
    fechaFin,
  });

  return {
    periodo: {
      fechaInicio,
      fechaFin,
    },
    totalMovimientos: movimientos.length,
    totales: {
      ...totales,
      balanceOperativo,
      flujoNeto,
    },
    metricas,
    porTipo: calcularPorTipo(movimientos),
    porCategoria: calcularPorCategoria(movimientos),
    porDia: calcularPorDia(movimientos),
    movimientos,
    actualizadoEn: new Date().toISOString(),
  };
};

export const obtenerReporteFinanciero = async ({
  fechaInicio,
  fechaFin,
} = obtenerPeriodoMesActual()) => {
  const usuario = obtenerUsuarioAutenticado();

  const consulta = construirConsultaMovimientosPorPeriodo({
    uid: usuario.uid,
    fechaInicio,
    fechaFin,
  });

  const resultado = await getDocs(consulta);

  const movimientos = resultado.docs.map(normalizarMovimiento);

  return generarReporteFinanciero({
    movimientos,
    fechaInicio,
    fechaFin,
  });
};

export const escucharReporteFinanciero = ({
  fechaInicio,
  fechaFin,
  onReporte,
  onError,
}) => {
  const usuario = obtenerUsuarioAutenticado();

  const consulta = construirConsultaMovimientosPorPeriodo({
    uid: usuario.uid,
    fechaInicio,
    fechaFin,
  });

  const cancelarEscucha = onSnapshot(
    consulta,
    (resultado) => {
      const movimientos = resultado.docs.map(normalizarMovimiento);

      const reporte = generarReporteFinanciero({
        movimientos,
        fechaInicio,
        fechaFin,
      });

      if (typeof onReporte === 'function') {
        onReporte(reporte);
      }
    },
    (error) => {
      if (typeof onError === 'function') {
        onError(error);
      } else {
        console.error('Error al escuchar el reporte financiero:', error);
      }
    }
  );

  return cancelarEscucha;
};