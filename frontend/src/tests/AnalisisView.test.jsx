import { describe, test, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from './helpers';
import { AnalisisView } from '../views/analisis/AnalisisView';


// Reemplaza el vi.mock anterior por este en src/tests/AnalisisView.test.jsx
vi.mock('chart.js', () => {
  // Creamos una función mock que servirá como el constructor (new Chart)
  const MockChart = vi.fn(() => ({
    destroy: vi.fn(),
    update: vi.fn(),
  }));

  // Le añadimos la propiedad estática register a esa misma función
  MockChart.register = vi.fn();

  return {
    Chart: MockChart,
    registerables: [],
  };
});

describe('Pruebas en <AnalisisView />', () => {
  test('debe renderizar las tarjetas informativas y la distribución de gastos', () => {
    renderWithProviders(<AnalisisView />);

    // Verificar que existen secciones clave de la vista
    expect(screen.getByText('Distribución de Gastos')).toBeInTheDocument();
    expect(screen.getByText('Necesidades 55%')).toBeInTheDocument();
    expect(screen.getByText('Deseos 30%')).toBeInTheDocument();
    expect(screen.getByText('Inversión 15%')).toBeInTheDocument();
  });

  test('debe mostrar las categorías de gastos estáticas correctamente', () => {
    renderWithProviders(<AnalisisView />);

    expect(screen.getByText('Comida y Restaurantes')).toBeInTheDocument();
    expect(screen.getByText('$300.440')).toBeInTheDocument();
    expect(screen.getByText('Transporte')).toBeInTheDocument();
    expect(screen.getByText('$230.000')).toBeInTheDocument();
  });

  test('debe cambiar la pestaña de rango temporal al hacer clic', async () => {
    renderWithProviders(<AnalisisView />);

    // 1. Cambia 'Semanal' por 'Trimestral' para que coincida con tu componente
    const trimestralTab = screen.getByText('Trimestral');
    const mensualTab = screen.getByText('Mensual');

    // El botón "Mensual" debería empezar activo por defecto
    expect(mensualTab).toHaveClass('active');
    expect(trimestralTab).not.toHaveClass('active');

    // 2. Hacer clic en la pestaña Trimestral
    await fireEvent.click(trimestralTab);

    // 3. Verificar que se hayan intercambiado las clases activas
    expect(trimestralTab).toHaveClass('active');
    expect(mensualTab).not.toHaveClass('active');
  });
});