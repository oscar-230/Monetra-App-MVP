// frontend/src/services/movementsService.js

import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

import { db } from '../firebase/config';

export const TIPOS_MOVIMIENTO = ['ingreso', 'gasto', 'ahorro', 'deuda'];

const convertirFecha = (fecha) => {
  if (!fecha) return null;

  const fechaConvertida = new Date(`${fecha}T12:00:00`);

  if (Number.isNaN(fechaConvertida.getTime())) {
    return null;
  }

  return fechaConvertida;
};

export const validarMovimiento = ({ tipo, monto, categoria, fecha }) => {
  const montoNumerico = Number(monto);

  if (!TIPOS_MOVIMIENTO.includes(tipo)) {
    throw new Error('El tipo de movimiento no es válido.');
  }

  if (!Number.isFinite(montoNumerico) || montoNumerico <= 0) {
    throw new Error('El monto debe ser un número mayor a cero.');
  }

  if (!categoria || categoria.trim() === '') {
    throw new Error('La categoría es obligatoria.');
  }

  if (!convertirFecha(fecha)) {
    throw new Error('La fecha no es válida.');
  }

  return true;
};

export const guardarMovimiento = async ({
  uid,
  tipo,
  monto,
  categoria,
  fecha,
  descripcion = '',
}) => {
  if (!uid) {
    throw new Error('No hay usuario autenticado.');
  }

  validarMovimiento({
    tipo,
    monto,
    categoria,
    fecha,
  });

  const movimiento = {
    uid,
    tipo,
    monto: Number(monto),
    categoria: categoria.trim(),
    fecha: Timestamp.fromDate(convertirFecha(fecha)),
    descripcion: descripcion.trim(),
    moneda: 'COP',
    origen: 'manual',
    creadoEn: serverTimestamp(),
    actualizadoEn: serverTimestamp(),
  };

  const referencia = collection(db, 'users', uid, 'movements');

  const documento = await addDoc(referencia, movimiento);

  return {
    id: documento.id,
    ...movimiento,
  };
};

export const obtenerMovimientosUsuario = async (uid) => {
  if (!uid) {
    throw new Error('No hay usuario autenticado.');
  }

  const referencia = collection(db, 'users', uid, 'movements');

  const consulta = query(
    referencia,
    orderBy('fecha', 'desc')
  );

  const resultado = await getDocs(consulta);

  return resultado.docs.map((documento) => ({
    id: documento.id,
    ...documento.data(),
  }));
};