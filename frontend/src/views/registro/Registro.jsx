// frontend/src/views/dashboard/Registro.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Registro.css';
import { BottomNav } from '../../components/layout/BottomNav';


const CATEGORIAS = [
  { id: 'comida',     label: 'Comida',     emoji: '🍔' },
  { id: 'transporte', label: 'Transporte', emoji: '🚌' },
  { id: 'diversion',  label: 'Diversión',  emoji: '🎬' },
  { id: 'salud',      label: 'Salud',      emoji: '❤️' },
  { id: 'compras',    label: 'Compras',    emoji: '🛍️' },
  { id: 'otros',      label: 'Otros',      emoji: '···' },
];

export const Registro = () => {
  const navigate = useNavigate();
  const [tipoMovimiento, setTipoMovimiento] = useState('gasto');
  const [monto,       setMonto]     = useState('');
  const [categoria,   setCategoria] = useState('comida');
  const [nota,        setNota]      = useState('');
  const [adjuntarFoto, setAdjuntar] = useState(false);
  const [error,       setError]     = useState('');

  const handleMonto = (e) => {
    const val = e.target.value.replace(/[^0-9.]/g, '');
    if (val.split('.').length > 2) return;
    setMonto(val);
    if (error) setError('');
  };

  const handleGuardar = () => {
    const num = parseFloat(monto);
    if (!monto || isNaN(num) || num <= 0) {
      setError('Ingresa un monto válido para continuar.');
      return;
    }
    // Aquí conectarías con Firestore
    console.log('Movimiento guardado:', { tipoMovimiento, monto: num, categoria, nota, adjuntarFoto });
    navigate('/dashboard');
  };

  return (
    <div className="rg-wrapper">
      {/* Header */}
      <header className="rg-header">
        <button className="rg-back" onClick={() => navigate('/dashboard')}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Monetra
        </button>
        <button className="rg-icon-btn" aria-label="Notificaciones">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.437L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>
      </header>

      <main className="rg-main">
        {/* Título */}
        <div className="rg-title-block">
          <h1 className="rg-title">
            Nuevo {tipoMovimiento}
          </h1>
          <p className="rg-subtitle">
            {tipoMovimiento === 'gasto'
              ? 'Registra tus gastos rápidamente para mantener tu salud financiera.'
              : 'Registra tus ingresos para llevar el control de tu dinero.'}
          </p>
        </div>

        {/* Monto */}
        <div className="rg-amount-card">
          <p className="rg-amount-label">
            Monto del {tipoMovimiento}
          </p>
          <div className="rg-amount-row">
            <span className="rg-dollar">$</span>
            <input
              className="rg-amount-input"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={monto}
              onChange={handleMonto}
              aria-label="Monto del gasto"
            />
          </div>
          
          {error && <p className="rg-error">{error}</p>}
          <button className="rg-scan-btn">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M9 3H5a2 2 0 00-2 2v4m0 6v4a2 2 0 002 2h4m6-18h4a2 2 0 012 2v4m0 6v4a2 2 0 01-2 2h-4" />
            </svg>
            Escanear factura (OCR)
          </button>
        </div>
        {/* Tipo de movimiento */}
        <div className="rg-section">
          <span className="rg-section-label">
            Tipo de movimiento
          </span>

          <select
            className="rg-type-select"
            value={tipoMovimiento}
            onChange={(e) =>
              setTipoMovimiento(e.target.value)
            }
          >
            <option value="gasto">
              💸 Gasto
            </option>

            <option value="ingreso">
              💰 Ingreso
            </option>
          </select>
        </div>

        {/* Categorías */}
        <div className="rg-section">
          <div className="rg-section-row">
            <span className="rg-section-label">Categoría</span>
            <button className="rg-link-btn">Ver todas</button>
          </div>
          <div className="rg-cat-grid">
            {CATEGORIAS.map((cat) => (
              <button
                key={cat.id}
                className={`rg-cat${categoria === cat.id ? ' rg-cat--active' : ''}`}
                onClick={() => setCategoria(cat.id)}
              >
                <span className="rg-cat-emoji" aria-hidden="true">{cat.emoji}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Nota */}
        <div className="rg-section">
          <span className="rg-section-label">Nota (opcional)</span>
          <input
            className="rg-note-input"
            type="text"
            placeholder="¿En qué gastaste esto?"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            aria-label="Nota opcional"
          />
        </div>

        {/* Adjuntar foto */}
        <div className="rg-toggle-row">
          <span className="rg-toggle-label">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Adjuntar foto
          </span>
          <button
            className={`rg-toggle${adjuntarFoto ? ' rg-toggle--on' : ''}`}
            onClick={() => setAdjuntar(!adjuntarFoto)}
            role="switch"
            aria-checked={adjuntarFoto}
            aria-label="Adjuntar foto"
          />
        </div>

        {/* Guardar */}
        <button className="rg-save-btn" onClick={handleGuardar}>
          Guardar {tipoMovimiento}
        </button>
      </main>

      <BottomNav />
    </div>
  );
};