import { auth } from '../firebase/config';

const API_URL = 'http://localhost:8000/api/movements';

async function getAuthHeaders() {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('Usuario no autenticado');
  }

  const token = await currentUser.getIdToken();

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export async function createMovement(data) {
  const headers = await getAuthHeaders();

  const response = await fetch(API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.detail || 'No fue posible registrar el movimiento'
    );
  }

  return result;
}

export async function getMovements() {
  const headers = await getAuthHeaders();

  const response = await fetch(API_URL, {
    method: 'GET',
    headers,
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.detail || 'No fue posible obtener movimientos'
    );
  }

  return result.movimientos;
}

export async function getMovement(id) {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_URL}/${id}`, {
    method: 'GET',
    headers,
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.detail || 'No fue posible obtener el movimiento'
    );
  }

  return result;
}

export async function updateMovement(id, data) {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_URL}/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.detail || 'No fue posible actualizar el movimiento'
    );
  }

  return result;
}

export async function deleteMovement(id) {
  const headers = await getAuthHeaders();

  const response = await fetch(
    `${API_URL}/${id}?confirmar=true`,
    {
      method: 'DELETE',
      headers,
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.detail || 'No fue posible eliminar el movimiento'
    );
  }

  return result;
}