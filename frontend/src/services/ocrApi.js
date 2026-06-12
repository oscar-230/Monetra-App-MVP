import { auth } from '../firebase/config';

const API_URL = 'http://localhost:8000/ocr';

export async function scanInvoice(file) {
  const currentUser = auth.currentUser;

  const token = await currentUser.getIdToken();

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(
    `${API_URL}/scan-invoice`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.detail || 'Error procesando factura'
    );
  }

  return result;
}