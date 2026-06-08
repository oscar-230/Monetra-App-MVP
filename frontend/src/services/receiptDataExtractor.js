// frontend/src/services/receiptDataExtractor.js

const PALABRAS_CLAVE_TOTAL = [
  'total a pagar',
  'valor total',
  'total compra',
  'total',
  'importe total',
  'monto total',
  'pago total',
  'valor pagado',
];

const PALABRAS_IGNORAR_DESCRIPCION = [
  'nit',
  'factura',
  'total',
  'fecha',
  'iva',
  'subtotal',
  'cambio',
  'efectivo',
  'tarjeta',
  'resolucion',
  'autorizacion',
  'cajero',
];

const CATEGORIAS_POR_PALABRA = [
  {
    categoria: 'Alimentación',
    palabras: ['restaurante', 'comida', 'almuerzo', 'cafe', 'panaderia', 'mercado', 'supermercado'],
  },
  {
    categoria: 'Transporte',
    palabras: ['taxi', 'uber', 'didi', 'gasolina', 'combustible', 'parqueadero', 'peaje'],
  },
  {
    categoria: 'Salud',
    palabras: ['farmacia', 'drogueria', 'medicamento', 'clinica', 'salud'],
  },
  {
    categoria: 'Educación',
    palabras: ['universidad', 'colegio', 'libro', 'curso', 'papeleria'],
  },
  {
    categoria: 'Ocio',
    palabras: ['cine', 'bar', 'juego', 'entretenimiento', 'discoteca'],
  },
];

export const limpiarTextoOCR = (texto) => {
  return String(texto || '')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
};

const normalizarTexto = (texto) => {
  return limpiarTextoOCR(texto)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

const convertirMontoANumero = (valor) => {
  if (!valor) return null;

  let numeroLimpio = String(valor)
    .replace(/COP/gi, '')
    .replace(/\$/g, '')
    .replace(/\s/g, '')
    .replace(/[^\d.,]/g, '');

  if (!numeroLimpio) return null;

  const tienePunto = numeroLimpio.includes('.');
  const tieneComa = numeroLimpio.includes(',');

  if (tienePunto && tieneComa) {
    const ultimoPunto = numeroLimpio.lastIndexOf('.');
    const ultimaComa = numeroLimpio.lastIndexOf(',');

    if (ultimoPunto > ultimaComa) {
      numeroLimpio = numeroLimpio.replace(/,/g, '');
    } else {
      numeroLimpio = numeroLimpio.replace(/\./g, '').replace(',', '.');
    }
  } else if (tieneComa) {
    const partes = numeroLimpio.split(',');

    if (partes.length === 2 && partes[1].length <= 2) {
      numeroLimpio = numeroLimpio.replace(',', '.');
    } else {
      numeroLimpio = numeroLimpio.replace(/,/g, '');
    }
  } else if (tienePunto) {
    const partes = numeroLimpio.split('.');

    if (partes.length > 2 || partes[1]?.length === 3) {
      numeroLimpio = numeroLimpio.replace(/\./g, '');
    }
  }

  const monto = Number(numeroLimpio);

  return Number.isFinite(monto) && monto > 0 ? monto : null;
};

const extraerMonto = (texto) => {
  const lineas = texto
    .split('\n')
    .map((linea) => linea.trim())
    .filter(Boolean);

  for (const linea of lineas) {
    const lineaNormalizada = normalizarTexto(linea);

    const contieneTotal = PALABRAS_CLAVE_TOTAL.some((palabra) =>
      lineaNormalizada.includes(palabra)
    );

    if (!contieneTotal) continue;

    const posiblesMontos = linea.match(/(?:COP|\$)?\s*\d[\d.,]*/gi) || [];

    const montos = posiblesMontos
      .map(convertirMontoANumero)
      .filter((monto) => monto !== null && monto >= 100);

    if (montos.length > 0) {
      return Math.max(...montos);
    }
  }

  const todosLosMontos = texto.match(/(?:COP|\$)?\s*\d[\d.,]{2,}/gi) || [];

  const montosEncontrados = todosLosMontos
    .map(convertirMontoANumero)
    .filter((monto) => monto !== null && monto >= 100);

  if (montosEncontrados.length === 0) {
    return null;
  }

  return Math.max(...montosEncontrados);
};

const formatearFechaISO = (year, month, day) => {
  const fecha = new Date(Number(year), Number(month) - 1, Number(day));

  if (Number.isNaN(fecha.getTime())) {
    return null;
  }

  const yyyy = fecha.getFullYear();
  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  const dd = String(fecha.getDate()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd}`;
};

const extraerFecha = (texto) => {
  const patronesFecha = [
    /(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/,
    /(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/,
  ];

  for (const patron of patronesFecha) {
    const coincidencia = texto.match(patron);

    if (!coincidencia) continue;

    if (coincidencia[1].length === 4) {
      return formatearFechaISO(
        coincidencia[1],
        coincidencia[2],
        coincidencia[3]
      );
    }

    const year =
      coincidencia[3].length === 2
        ? `20${coincidencia[3]}`
        : coincidencia[3];

    return formatearFechaISO(year, coincidencia[2], coincidencia[1]);
  }

  return null;
};

const extraerComercio = (texto) => {
  const lineas = texto
    .split('\n')
    .map((linea) => linea.trim())
    .filter(Boolean);

  const primeraLineaValida = lineas.find((linea) => {
    const lineaNormalizada = normalizarTexto(linea);

    return (
      linea.length >= 3 &&
      !lineaNormalizada.includes('factura') &&
      !lineaNormalizada.includes('nit') &&
      !lineaNormalizada.includes('fecha') &&
      !lineaNormalizada.includes('total') &&
      !/^\d+$/.test(linea)
    );
  });

  return primeraLineaValida || null;
};

const extraerDescripcion = (texto, comercio) => {
  const lineas = texto
    .split('\n')
    .map((linea) => linea.trim())
    .filter(Boolean);

  const lineaDescripcion = lineas.find((linea) => {
    const lineaNormalizada = normalizarTexto(linea);

    const debeIgnorarse = PALABRAS_IGNORAR_DESCRIPCION.some((palabra) =>
      lineaNormalizada.includes(palabra)
    );

    return (
      linea.length >= 3 &&
      !debeIgnorarse &&
      linea !== comercio &&
      !/^\d+$/.test(linea)
    );
  });

  if (lineaDescripcion) {
    return lineaDescripcion;
  }

  if (comercio) {
    return `Compra en ${comercio}`;
  }

  return 'Gasto registrado por OCR';
};

const sugerirCategoria = (texto) => {
  const textoNormalizado = normalizarTexto(texto);

  const categoriaEncontrada = CATEGORIAS_POR_PALABRA.find(({ palabras }) =>
    palabras.some((palabra) => textoNormalizado.includes(palabra))
  );

  return categoriaEncontrada?.categoria || 'Sin categoría';
};

const generarAdvertencias = ({ monto, fecha, descripcion }) => {
  const advertencias = [];

  if (!monto) {
    advertencias.push('No se pudo identificar el monto automáticamente.');
  }

  if (!fecha) {
    advertencias.push('No se pudo identificar la fecha automáticamente.');
  }

  if (!descripcion) {
    advertencias.push('No se pudo identificar una descripción clara.');
  }

  return advertencias;
};

export const extraerDatosRelevantesFactura = (textoOCR) => {
  const texto = limpiarTextoOCR(textoOCR);

  if (!texto || texto.length < 8) {
    throw new Error('No fue posible extraer texto útil del comprobante.');
  }

  const monto = extraerMonto(texto);
  const fecha = extraerFecha(texto);
  const comercio = extraerComercio(texto);
  const descripcion = extraerDescripcion(texto, comercio);
  const categoria = sugerirCategoria(texto);

  return {
    tipo: 'gasto',
    monto,
    fecha,
    descripcion,
    comercio,
    categoria,
    origen: 'ocr',
    textoOriginal: texto,
    requiereRevision: true,
    camposDetectados: {
      monto: Boolean(monto),
      fecha: Boolean(fecha),
      descripcion: Boolean(descripcion),
      comercio: Boolean(comercio),
    },
    advertencias: generarAdvertencias({
      monto,
      fecha,
      descripcion,
    }),
  };
};