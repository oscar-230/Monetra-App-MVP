// src/test/Registro.test.jsx

import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { Registro } from '../views/registro/Registro';
import { renderWithProviders } from './helpers';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const real = await importOriginal();
  return { ...real, useNavigate: () => mockNavigate };
});

vi.mock('../services/movementApi', () => ({
  createMovement: vi.fn().mockResolvedValue({}),
}));

const renderRegistro = () =>
  renderWithProviders(<Registro />);

// ─────────────────────────────────────────────────────────────────────────
describe('Registro — renderizado', () => {
  it('muestra el título "Nuevo gasto"', () => {
    renderRegistro();
    expect(screen.getByText('Nuevo gasto')).toBeInTheDocument();
  });

  it('muestra el campo de monto con placeholder "0.00"', () => {
    renderRegistro();
    expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
  });

  it('muestra las 6 categorías de gasto por defecto', () => {
    renderRegistro();
    expect(screen.getByText('Comida')).toBeInTheDocument();
    expect(screen.getByText('Transporte')).toBeInTheDocument();
    expect(screen.getByText('Diversión')).toBeInTheDocument();
    expect(screen.getByText('Salud')).toBeInTheDocument();
    expect(screen.getByText('Compras')).toBeInTheDocument();
    expect(screen.getAllByText('Otros').length).toBeGreaterThan(0);
  });

  it('muestra el botón "Guardar gasto"', () => {
    renderRegistro();
    expect(
      screen.getByRole('button', { name: /guardar gasto/i })
    ).toBeInTheDocument();
  });

  it('muestra los botones de tipo de movimiento', () => {
    renderRegistro();
    const botonesGasto = screen.getAllByRole('button', { name: /gasto/i });
    const toggleGasto = botonesGasto.find((button) =>
      button.className.includes('rg-type-btn')
    );
    expect(toggleGasto).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ingreso/i })).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('Registro — validación del monto', () => {
  it('muestra error si se intenta guardar con monto vacío', () => {
    renderRegistro();
    fireEvent.click(screen.getByRole('button', { name: /guardar gasto/i }));
    expect(screen.getByText(/ingresa un monto válido/i)).toBeInTheDocument();
  });

  it('muestra error si el monto es cero', () => {
    renderRegistro();
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar gasto/i }));
    expect(screen.getByText(/ingresa un monto válido/i)).toBeInTheDocument();
  });

  it('muestra error si el monto es negativo', () => {
    renderRegistro();
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar gasto/i }));
    expect(screen.getByText(/ingresa un monto válido/i)).toBeInTheDocument();
  });

  it('NO permite escribir letras en el campo de monto', () => {
    renderRegistro();
    const input = screen.getByPlaceholderText('0.00');
    fireEvent.change(input, { target: { value: 'abc' } });
    expect(input.value).toBe('');
  });

  it('acepta un monto decimal válido', () => {
    renderRegistro();
    const input = screen.getByPlaceholderText('0.00');
    fireEvent.change(input, { target: { value: '32500.50' } });
    expect(input.value).toBe('32500.50');
  });

  it('no permite más de un punto decimal', () => {
    renderRegistro();
    const input = screen.getByPlaceholderText('0.00');
    fireEvent.change(input, { target: { value: '3.5' } });
    fireEvent.change(input, { target: { value: '3.2.5' } });
    expect((input.value.match(/\./g) || []).length).toBeLessThanOrEqual(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('Registro — flujo feliz', () => {
  it('navega a /movimientos con un monto válido', async () => {
    mockNavigate.mockClear();
    renderRegistro();
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '15000' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar gasto/i }));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/movimientos');
    });
  });

  it('el error desaparece al corregir el monto', async () => {
    renderRegistro();
    fireEvent.click(screen.getByRole('button', { name: /guardar gasto/i }));
    expect(screen.getByText(/ingresa un monto válido/i)).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '5000' } });
    await waitFor(() => {
      expect(screen.queryByText(/ingresa un monto válido/i)).not.toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('Registro — selección de categoría', () => {
  it('la categoría "Comida" está activa por defecto', () => {
    renderRegistro();
    expect(screen.getByRole('button', { name: /comida/i })).toHaveClass('rg-cat--active');
  });

  it('cambia la categoría activa al hacer clic en otra', () => {
    renderRegistro();
    fireEvent.click(screen.getByRole('button', { name: /transporte/i }));
    expect(screen.getByRole('button', { name: /transporte/i })).toHaveClass('rg-cat--active');
  });

  it('desactiva la categoría anterior al seleccionar una nueva', () => {
    renderRegistro();
    fireEvent.click(screen.getByRole('button', { name: /diversión/i }));
    expect(screen.getByRole('button', { name: /diversión/i })).toHaveClass('rg-cat--active');
    expect(screen.getByRole('button', { name: /comida/i })).not.toHaveClass('rg-cat--active');
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('Registro — selector de tipo de movimiento', () => {
  it('el botón "Gasto" está activo por defecto', () => {
    renderRegistro();
    const botonesGasto = screen.getAllByRole('button', { name: /gasto/i });
    const gastoBtn = botonesGasto.find((button) =>
      button.className.includes('rg-type-btn')
    );
    expect(gastoBtn.className).toContain('rg-type-btn--active');
  });

  it('cambia a ingreso al hacer clic en el botón "Ingreso"', async () => {
    renderRegistro();
    // Buscar el botón de ingreso dentro del toggle (no el de categoría)
    const botonesIngreso = screen.getAllByRole('button', { name: /ingreso/i });
    // El botón del tipo-toggle tiene clase rg-type-btn
    const toggleIngreso = botonesIngreso.find(b => b.className.includes('rg-type-btn'));
    fireEvent.click(toggleIngreso);
    await waitFor(() => {
      expect(screen.getByText('Nuevo ingreso')).toBeInTheDocument();
    });
  });

  it('muestra categorías de ingreso al seleccionar ese tipo', async () => {
    renderRegistro();
    const botonesIngreso = screen.getAllByRole('button', { name: /ingreso/i });
    const toggleIngreso = botonesIngreso.find(b => b.className.includes('rg-type-btn'));
    fireEvent.click(toggleIngreso);
    await waitFor(() => {
      expect(screen.getByText('Sueldo')).toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('Registro — navegación', () => {
  it('el botón "Monetra" regresa al dashboard', () => {
    mockNavigate.mockClear();
    renderRegistro();
    fireEvent.click(screen.getByRole('button', { name: /monetra/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });
});