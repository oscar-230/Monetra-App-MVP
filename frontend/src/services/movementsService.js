// frontend/src/services/movementsService.js

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';

import { auth, db } from '../firebase/config';

export const TIPOS_MOVIMIENTO = ['ingreso', 'gasto', 'ahorro', 'deuda'];

const obtenerUsuarioAutenticado = () => {
  const usuario = auth.currentUser;

  if (!usuario) {
    throw new Error('No hay un usuario autenticado.');
  }

  return usuario;
};

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
  tipo,
  monto,
  categoria,
  fecha,
  descripcion = '',
}) => {
  const usuario = obtenerUsuarioAutenticado();

  validarMovimiento({
    tipo,
    monto,
    categoria,
    fecha,
  });

  const movimiento = {
    uid: usuario.uid,
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

  const referencia = collection(
    db,
    'users',
    usuario.uid,
    'movements'
  );

  const documento = await addDoc(referencia, movimiento);

  return {
    id: documento.id,
    ...movimiento,
  };
};

export const obtenerMovimientosUsuario = async () => {
  const usuario = obtenerUsuarioAutenticado();

  const referencia = collection(
    db,
    'users',
    usuario.uid,
    'movements'
  );

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

export const actualizarMovimiento = async ({
  movimientoId,
  tipo,
  monto,
  categoria,
  fecha,
  descripcion = '',
}) => {
  const usuario = obtenerUsuarioAutenticado();

  if (!movimientoId) {
    throw new Error('No se recibió el ID del movimiento a actualizar.');
  }

  validarMovimiento({
    tipo,
    monto,
    categoria,
    fecha,
  });

  const referencia = doc(
    db,
    'users',
    usuario.uid,
    'movements',
    movimientoId
  );

  const documentoActual = await getDoc(referencia);

  if (!documentoActual.exists()) {
    throw new Error('El movimiento no existe o no pertenece al usuario autenticado.');
  }

  const datosActualizados = {
    tipo,
    monto: Number(monto),
    categoria: categoria.trim(),
    fecha: Timestamp.fromDate(convertirFecha(fecha)),
    descripcion: descripcion.trim(),
    actualizadoEn: serverTimestamp(),
  };

  await updateDoc(referencia, datosActualizados);

  const documentoActualizado = await getDoc(referencia);

  return {
    id: documentoActualizado.id,
    ...documentoActualizado.data(),
  };
};

export const eliminarMovimiento = async ({
  movimientoId,
  confirmarEliminacion = false,
}) => {
  const usuario = obtenerUsuarioAutenticado();

  if (!movimientoId) {
    throw new Error('No se recibió el ID del movimiento a eliminar.');
  }

  if (!confirmarEliminacion) {
    throw new Error('Debes confirmar la eliminación del movimiento.');
  }

  const referencia = doc(
    db,
    'users',
    usuario.uid,
    'movements',
    movimientoId
  );

  const documentoActual = await getDoc(referencia);

  if (!documentoActual.exists()) {
    throw new Error('El movimiento no existe o no pertenece al usuario autenticado.');
  }

  await deleteDoc(referencia);

  return {
    id: movimientoId,
    eliminado: true,
    mensaje: 'Movimiento eliminado correctamente.',
  };
};