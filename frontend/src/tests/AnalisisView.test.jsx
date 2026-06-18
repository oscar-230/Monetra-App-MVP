import { describe, test, expect, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "./helpers";
import { AnalisisView } from "../views/analisis/AnalisisView";

vi.mock("chart.js", () => {
  const MockChart = vi.fn(() => ({
    destroy: vi.fn(),
    update: vi.fn(),
  }));
  MockChart.register = vi.fn();
  return {
    Chart: MockChart,
    registerables: [],
  };
});

describe("Pruebas en <AnalisisView />", () => {
  test("debe renderizar las secciones clave de la vista", () => {
    renderWithProviders(<AnalisisView />);

    expect(screen.getByText("Análisis Financiero")).toBeInTheDocument();
    expect(screen.getByText("Distribución de Gastos")).toBeInTheDocument();
    expect(screen.getByText("Tendencias de Gastos")).toBeInTheDocument();
    expect(screen.getByText("Meta de Ahorro")).toBeInTheDocument();
  });

  test("debe renderizar el toggle con las opciones Semanal y Mensual", () => {
    renderWithProviders(<AnalisisView />);

    expect(screen.getByText("Semanal")).toBeInTheDocument();
    expect(screen.getByText("Mensual")).toBeInTheDocument();
  });

  test("debe cambiar la pestaña de rango temporal al hacer clic", async () => {
    renderWithProviders(<AnalisisView />);

    const semanalTab = screen.getByText("Semanal");
    const mensualTab = screen.getByText("Mensual");

    // "Mensual" empieza activo por defecto
    expect(mensualTab).toHaveClass("active");
    expect(semanalTab).not.toHaveClass("active");

    // Clic en "Semanal"
    await fireEvent.click(semanalTab);

    expect(semanalTab).toHaveClass("active");
    expect(mensualTab).not.toHaveClass("active");
  });
});
