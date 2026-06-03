// frontend/src/views/dashboard/DashboardView.jsx
import { useState } from 'react';
import { Navbar } from '../../components/layout/Navbar';
import useAuth from '../../hooks/useAuth';

export const DashboardView = () => {
  const { user } = useAuth();
  // Estado local para capturar qué pestaña se presiona en el Navbar
  const [seccionActiva, setSeccionActiva] = useState('dashboard');

  const obtenerPrimerNombre = () => {
    if (!user?.displayName) return 'Estratega';
    return user.displayName.split(' ')[0];
  };

  // Función para renderizar dinámicamente el contenido central
  const renderContenido = () => {
    switch (seccionActiva) {
      case 'dashboard':
        return (
          <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-b from-[#111827] to-[#0d1117] p-8 shadow-xl animate-in fade-in duration-200">
            <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-emerald-500/10 blur-3xl"></div>
            <div className="relative z-10 max-w-xl">
              <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/20 mb-4">
                MVP Activo
              </span>
              <h3 className="text-xl font-bold text-slate-200">Bienvenido a Monetra</h3>
              <p className="mt-3 text-sm text-slate-400 leading-relaxed">
                Estamos preparando tu entorno analítico. Tu dinero disponible, el consolidado de gastos indexados por OCR y las recomendaciones predictivas de Gemini 2.5 Flash aparecerán en este panel muy pronto.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <div className="flex items-center gap-2 rounded-xl bg-slate-800/60 border border-slate-800 px-4 py-2 text-xs font-medium text-slate-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Autenticación Lista
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-slate-800/60 border border-slate-800 px-4 py-2 text-xs font-medium text-slate-300">
                  <span className="h-2 w-2 rounded-full bg-cyan-400"></span>
                  Firestore Vinculado
                </div>
              </div>
            </div>
          </div>
        );

      default:
        // Render genérico elegante para las secciones en desarrollo
        const nombresSecciones = {
          ocr: 'Módulo de Mis Gastos (OCR con Inteligencia Artificial)',
          ahorros: 'Sistema de Proyección de Metas de Ahorro',
          ia: 'Consultoría Predictiva y Recomendaciones con Gemini 2.5 Flash'
        };
        
        return (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-[#111827]/30 p-12 text-center shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-400 mb-4">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-200">{nombresSecciones[seccionActiva]}</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
              Esta sección se encuentra actualmente en fase de maquetación y diseño de arquitectura limpia. Pronto se conectará con el backend de FastAPI.
            </p>
            <button 
              onClick={() => setSeccionActiva('dashboard')}
              className="mt-6 cursor-pointer rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-emerald-400 hover:bg-slate-700 transition-colors"
            >
              ← Volver al Dashboard Principal
            </button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 font-sans">
      {/* Pasamos los estados al Navbar para que sea interactivo */}
      <Navbar seccionActiva={seccionActiva} setSeccionActiva={setSeccionActiva} />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-3xl font-extrabold tracking-tight text-white">
            ¡Hola, <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">{obtenerPrimerNombre()}</span>!
          </h2>
          <p className="mt-1 text-sm text-slate-400">Este es el estado actual de tus finanzas para este periodo.</p>
        </div>

        {/* Renderizado dinámico según el click */}
        {renderContenido()}
      </main>
    </div>
  );
};