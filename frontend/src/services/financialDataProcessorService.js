// frontend/src/services/financialDataProcessorService.js

import { obtenerPeriodoMesActual } from './financialReportsService';

import { obtenerAnalisisFinancieroUsuario } from './userFinancialAnalysisService';

const TIPOS_MOVIMIENTO = ['ingreso', 'gasto', 'ahorro', 'deuda'];

const redondear = (valor, decimales = 2) => {
  const numero = Number(valor) || 0;
  const factor = 10 ** decimales;

  return Math.round((numero + Number.EPSILON) * factor) / factor;
};

const limpiarTexto = (valor, limite = 120) => {
  const texto = String(valor || '').trim();

  if (texto.length <= limite) {
    return texto;
  }

  return `${texto.slice(0, limite)}...`;
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

const normalizarMovimientoParaIA = (movimiento) => {
  const tipo = movimiento?.tipo;
  const monto = Number(movimiento?.monto) || 0;

  if (!TIPOS_MOVIMIENTO.includes(tipo) || monto <= 0) {
    return null;
  }

  return {
    id: movimiento.id || null,
    tipo,
    monto: redondear(monto),
    categoria: limpiarTexto(movimiento.categoria || 'Sin categoría', 60),
    fecha: formatearFechaISO(movimiento.fecha),
    descripcion: limpiarTexto(movimiento.descripcion || '', 100),
    origen: movimiento.origen || 'manual',
  };
};

const crearResumenInicialPorTipo = () => ({
  ingreso: {
    cantidad: 0,
    total: 0,
    promedio: 0,
  },
  gasto: {
    cantidad: 0,
    total: 0,
    promedio: 0,
  },
  ahorro: {
    cantidad: 0,
    total: 0,
    promedio: 0,
  },
  deuda: {
    cantidad: 0,
    total: 0,
    promedio: 0,
  },
});

const resumirMovimientosPorTipo = (movimientos) => {
  const resumen = crearResumenInicialPorTipo();

  movimientos.forEach((movimiento) => {
    resumen[movimiento.tipo].cantidad += 1;
    resumen[movimiento.tipo].total += movimiento.monto;
  });

  Object.keys(resumen).forEach((tipo) => {
    const item = resumen[tipo];

    item.total = redondear(item.total);
    item.promedio = item.cantidad
      ? redondear(item.total / item.cantidad)
      : 0;
  });

  return resumen;
};

const resumirGastosPorCategoria = (movimientos) => {
  const gastos = movimientos.filter(
    (movimiento) => movimiento.tipo === 'gasto'
  );

  const totalGastos = gastos.reduce(
    (total, movimiento) => total + movimiento.monto,
    0
  );

  const resumen = {};

  gastos.forEach((movimiento) => {
    const categoria = movimiento.categoria || 'Sin categoría';

    if (!resumen[categoria]) {
      resumen[categoria] = {
        categoria,
        cantidad: 0,
        total: 0,
        porcentajeSobreGastos: 0,
      };
    }

    resumen[categoria].cantidad += 1;
    resumen[categoria].total += movimiento.monto;
  });

  return Object.values(resumen)
    .map((categoria) => ({
      ...categoria,
      total: redondear(categoria.total),
      porcentajeSobreGastos: totalGastos
        ? redondear((categoria.total / totalGastos) * 100)
        : 0,
    }))
    .sort((a, b) => b.total - a.total);
};

const obtenerMovimientosRecientes = (movimientos, limite = 10) => {
  return [...movimientos]
    .sort((a, b) => {
      const fechaA = convertirFecha(a.fecha)?.getTime() || 0;
      const fechaB = convertirFecha(b.fecha)?.getTime() || 0;

      return fechaB - fechaA;
    })
    .slice(0, limite);
};

const obtenerMovimientosMayorValor = (movimientos, limite = 10) => {
  return [...movimientos]
    .sort((a, b) => b.monto - a.monto)
    .slice(0, limite);
};

const procesarHallazgos = (hallazgos = []) => {
  return hallazgos.map((hallazgo, index) => ({
    id: hallazgo.id || `hallazgo-${index + 1}`,
    titulo: limpiarTexto(hallazgo.titulo, 80),
    descripcion: limpiarTexto(hallazgo.descripcion, 180),
    nivel: hallazgo.nivel || 'informativo',
    categoria: hallazgo.categoria || 'general',
    valor: hallazgo.valor ?? null,
    requiereAtencion:
      hallazgo.nivel === 'riesgo' || hallazgo.nivel === 'advertencia',
  }));
};

const detectarPatronesBase = ({
  resumenAnalizado,
  perfilFinanciero,
  hallazgosProcesados,
  gastosPorCategoria,
}) => {
  const patrones = [];

  if (perfilFinanciero?.nivel) {
    patrones.push({
      id: 'perfil-financiero',
      titulo: `Perfil financiero: ${perfilFinanciero.nivel}`,
      descripcion: perfilFinanciero.descripcion || '',
      categoria: 'general',
      nivel: perfilFinanciero.estado || 'informativo',
    });
  }

  hallazgosProcesados.forEach((hallazgo) => {
    patrones.push({
      id: `patron-${hallazgo.id}`,
      titulo: hallazgo.titulo,
      descripcion: hallazgo.descripcion,
      categoria: hallazgo.categoria,
      nivel: hallazgo.nivel,
    });
  });

  const categoriaPrincipal = gastosPorCategoria[0];

  if (categoriaPrincipal) {
    patrones.push({
      id: 'categoria-principal-gasto',
      titulo: 'Categoría con mayor gasto',
      descripcion: `${categoriaPrincipal.categoria} concentra el ${categoriaPrincipal.porcentajeSobreGastos}% de los gastos.`,
      categoria: 'gastos',
      nivel: 'informativo',
    });
  }

  if (resumenAnalizado?.totalMovimientos === 0) {
    patrones.push({
      id: 'sin-movimientos',
      titulo: 'Sin movimientos registrados',
      descripcion:
        'No hay movimientos suficientes para generar un análisis financiero detallado.',
      categoria: 'general',
      nivel: 'advertencia',
    });
  }

  return patrones;
};

const evaluarCalidadDatos = ({ resumenAnalizado, movimientosProcesados }) => {
  const advertencias = [];

  if (!resumenAnalizado?.totalMovimientos) {
    advertencias.push(
      'No hay movimientos registrados en el período seleccionado.'
    );
  }

  if (resumenAnalizado?.totalMovimientos > 0 && movimientosProcesados.length === 0) {
    advertencias.push(
      'Los movimientos registrados no pudieron ser procesados correctamente.'
    );
  }

  if (resumenAnalizado?.totalIngresos === 0) {
    advertencias.push(
      'No hay ingresos registrados, por lo que algunos porcentajes pueden ser limitados.'
    );
  }

  if (resumenAnalizado?.totalGastos === 0) {
    advertencias.push(
      'No hay gastos registrados para identificar patrones de consumo.'
    );
  }

  return {
    datosSuficientes:
      Number(resumenAnalizado?.totalMovimientos || 0) > 0 &&
      movimientosProcesados.length > 0,
    totalAdvertencias: advertencias.length,
    advertencias,
  };
};

export const procesarAnalisisFinancieroParaIA = ({
  analisisFinanciero,
  limiteMovimientos = 25,
} = {}) => {
  if (!analisisFinanciero) {
    throw new Error(
      'No se recibió el análisis financiero base para procesar.'
    );
  }

  const reporteBase = analisisFinanciero.reporteBase || {};
  const movimientosOriginales = reporteBase.movimientos || [];

  const movimientosProcesados = movimientosOriginales
    .map(normalizarMovimientoParaIA)
    .filter(Boolean);

  const movimientosLimitados = movimientosProcesados.slice(0, limiteMovimientos);

  const resumenPorTipo = resumirMovimientosPorTipo(movimientosProcesados);
  const gastosPorCategoria = resumirGastosPorCategoria(movimientosProcesados);

  const resumenAnalizado = analisisFinanciero.resumenAnalizado || {};
  const perfilFinanciero = analisisFinanciero.perfilFinanciero || {};
  const hallazgosProcesados = procesarHallazgos(
    analisisFinanciero.hallazgos || []
  );

  const patronesBase = detectarPatronesBase({
    resumenAnalizado,
    perfilFinanciero,
    hallazgosProcesados,
    gastosPorCategoria,
  });

  const calidadDatos = evaluarCalidadDatos({
    resumenAnalizado,
    movimientosProcesados,
  });

  const contextoIA = {
    version: '1.0',
    objetivo:
      'Procesar información financiera del usuario para generar análisis claros sobre hábitos de consumo.',
    periodo: analisisFinanciero.periodo || null,
    perfilFinanciero,
    calidadDatos,
    resumenFinanciero: {
      totalMovimientos: resumenAnalizado.totalMovimientos || 0,
      totalIngresos: redondear(resumenAnalizado.totalIngresos),
      totalGastos: redondear(resumenAnalizado.totalGastos),
      totalAhorros: redondear(resumenAnalizado.totalAhorros),
      totalDeudas: redondear(resumenAnalizado.totalDeudas),
      flujoNeto: redondear(resumenAnalizado.flujoNeto),
      porcentajeGastosSobreIngresos: redondear(
        resumenAnalizado.porcentajeGastosSobreIngresos
      ),
      porcentajeAhorroSobreIngresos: redondear(
        resumenAnalizado.porcentajeAhorroSobreIngresos
      ),
      porcentajeDeudasSobreIngresos: redondear(
        resumenAnalizado.porcentajeDeudasSobreIngresos
      ),
    },
    resumenMovimientos: {
      porTipo: resumenPorTipo,
      gastosPorCategoria,
      movimientosRecientes: obtenerMovimientosRecientes(
        movimientosProcesados,
        10
      ),
      movimientosMayorValor: obtenerMovimientosMayorValor(
        movimientosProcesados,
        10
      ),
      muestraParaIA: movimientosLimitados,
      totalMovimientosProcesados: movimientosProcesados.length,
      totalMovimientosEnviados: movimientosLimitados.length,
    },
    patronesBase,
    hallazgos: hallazgosProcesados,
    prioridadesDetectadas:
      analisisFinanciero.prioridadesDetectadas || [],
    instruccionesUso: [
      'Usar únicamente los datos entregados.',
      'No inventar ingresos, gastos, deudas ni ahorros.',
      'Explicar los patrones en lenguaje claro.',
      'Evitar recomendaciones de productos financieros específicos.',
      'Enfocar el análisis en hábitos de consumo, ahorro y control financiero.',
    ],
  };

  return {
    exito: true,
    mensaje: 'Información financiera procesada correctamente.',
    contextoIA,
    analisisOriginal: analisisFinanciero,
    movimientosProcesados,
    generadoEn: new Date().toISOString(),
  };
};

export const procesarInformacionFinancieraUsuario = async (
  periodo = obtenerPeriodoMesActual()
) => {
  const analisisFinanciero = await obtenerAnalisisFinancieroUsuario(periodo);

  return procesarAnalisisFinancieroParaIA({
    analisisFinanciero,
  });
};