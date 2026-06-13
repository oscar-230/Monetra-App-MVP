// frontend/src/views/registro/Registro.jsx
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './Registro.css';
import { BottomNav } from '../../components/layout/BottomNav';
import { scanInvoice } from '../../services/ocrApi';
import { createMovement } from '../../services/movementApi';

const CATEGORIAS = [
  { id: 'Alimentación', label: 'Comida',     emoji: '🍔' },
  { id: 'Transporte',   label: 'Transporte', emoji: '🚌' },
  { id: 'Ocio',         label: 'Diversión',  emoji: '🎬' },
  { id: 'Salud',        label: 'Salud',      emoji: '❤️' },
  { id: 'Compras',      label: 'Compras',    emoji: '🛍️' },
  { id: 'Otros',        label: 'Otros',      emoji: '···' },
];

// Mapea lo que devuelve el backend a nuestras categorías internas
const mapearCategoria = (categoriaOCR) => {
  if (!categoriaOCR) return 'Otros';
  // Normalizar: quitar tildes y pasar a minúsculas para comparar
  const normalizar = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const lower = normalizar(categoriaOCR);

  // Mapeo directo de los valores exactos que devuelve el backend
  if (lower === 'comida')      return 'Alimentación';
  if (lower === 'transporte')  return 'Transporte';
  if (lower === 'diversion')   return 'Ocio';
  if (lower === 'salud')       return 'Salud';
  if (lower === 'compras')     return 'Compras';

  // Fallback por palabras clave (por si el modelo responde diferente)
  if (lower.includes('comida') || lower.includes('restaurante') || lower.includes('aliment') || lower.includes('cafe')) return 'Alimentación';
  if (lower.includes('transporte') || lower.includes('taxi') || lower.includes('uber') || lower.includes('bus')) return 'Transporte';
  if (lower.includes('diversion') || lower.includes('ocio') || lower.includes('cine') || lower.includes('entretenimiento')) return 'Ocio';
  if (lower.includes('salud') || lower.includes('farmacia') || lower.includes('medico')) return 'Salud';
  if (lower.includes('compra') || lower.includes('supermercado') || lower.includes('tienda') || lower.includes('ropa')) return 'Compras';

  return 'Otros';
};

// Formatea fecha de OCR (varios formatos posibles) a YYYY-MM-DD
const normalizarFecha = (fechaStr) => {
  if (!fechaStr) return new Date().toISOString().slice(0, 10);
  // Si ya viene en formato YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) return fechaStr;
  // Intentar parsear
  try {
    const d = new Date(fechaStr);
    if (!isNaN(d)) return d.toISOString().slice(0, 10);
  } catch (_) {}
  return new Date().toISOString().slice(0, 10);
};

export const Registro = () => {
  const navigate    = useNavigate();
  const fileInputRef = useRef(null);

  // ── Campos del formulario ──────────────────────────────────────────
  const [monto,        setMonto]      = useState('');
  const [categoria,    setCategoria]  = useState('Alimentación');
  const [nota,         setNota]       = useState('');
  const [adjuntarFoto, setAdjuntar]   = useState(false);
  const [fecha,        setFecha]      = useState(new Date().toISOString().slice(0, 10));

  // ── Estado OCR / UI ────────────────────────────────────────────────
  const [ocrData,     setOcrData]    = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [loadingOCR,  setLoadingOCR] = useState(false);
  const [saving,      setSaving]     = useState(false);
  const [error,       setError]      = useState('');
  const [ocrError,    setOcrError]   = useState('');

  // ── Handlers de monto ──────────────────────────────────────────────
  const handleMonto = (e) => {
    const val = e.target.value.replace(/[^0-9.]/g, '');
    if (val.split('.').length > 2) return;
    setMonto(val);
    if (error) setError('');
  };

  // ── Escanear factura con OCR ───────────────────────────────────────
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Resetear input para permitir re-selección del mismo archivo
    e.target.value = '';

    setOcrError('');
    setLoadingOCR(true);

    try {
      const result = await scanInvoice(file);

      if (!result.success || !result.data) {
        setOcrError(result.message || 'No se pudo extraer información del documento.');
        setLoadingOCR(false);
        return;
      }

      setOcrData(result.data);
      setShowPreview(true);
    } catch (err) {
      setOcrError(err.message || 'Error al procesar la imagen.');
    } finally {
      setLoadingOCR(false);
    }
  };

  // ── Aceptar datos del OCR y pre-llenar formulario ──────────────────
  const handleAcceptOCR = () => {
    if (!ocrData) return;

    // Monto
    if (ocrData.monto_total && ocrData.monto_total > 0) {
      setMonto(String(ocrData.monto_total));
    }

    // Categoría — usar el campo categoria que devuelve el backend directamente
    const catFuente = ocrData.categoria || ocrData.descripcion;
    setCategoria(mapearCategoria(catFuente));

    // Fecha
    if (ocrData.fecha) {
      setFecha(normalizarFecha(ocrData.fecha));
    }

    // Nota: nombre del proveedor
    if (ocrData.proveedor) {
      setNota(ocrData.proveedor);
    }

    setShowPreview(false);
  };

  // ── Cerrar modal OCR sin aceptar ───────────────────────────────────
  const handleClosePreview = () => {
    setShowPreview(false);
    setOcrData(null);
  };

  // ── Guardar gasto en backend → Firestore ───────────────────────────
  const handleGuardar = async () => {
    const num = parseFloat(monto);
    if (!monto || isNaN(num) || num <= 0) {
      setError('Ingresa un monto válido para continuar.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await createMovement({
        tipo:        'gasto',           // siempre gasto → aparece negativo en UI
        monto:       num,
        categoria:   categoria,
        fecha:       fecha,
        descripcion: nota || categoria,
        moneda:      'COP',
        origen:      'ocr',
      });

      navigate('/movimientos');
    } catch (err) {
      setError(err.message || 'No fue posible guardar el gasto. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────
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
          <h1 className="rg-title">Nuevo gasto</h1>
          <p className="rg-subtitle">
            Registra tus gastos rápidamente para mantener tu salud financiera.
          </p>
        </div>

        {/* ── Monto ─────────────────────────────────────────────────── */}
        <div className="rg-amount-card">
          <p className="rg-amount-label">Monto del gasto</p>
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

          {/* Fecha */}
          <div style={{ width: '100%', marginTop: '0.25rem' }}>
            <p className="rg-amount-label" style={{ marginBottom: '0.25rem' }}>Fecha</p>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="rg-note-input"
              style={{ fontSize: '0.9rem' }}
            />
          </div>

          {/* Botón escanear */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
          <button
            className="rg-scan-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={loadingOCR}
          >
            {loadingOCR ? (
              <>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0114.6-3.6M20 15a9 9 0 01-14.6 3.6" />
                </svg>
                Procesando...
              </>
            ) : (
              <>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M9 3H5a2 2 0 00-2 2v4m0 6v4a2 2 0 002 2h4m6-18h4a2 2 0 012 2v4m0 6v4a2 2 0 01-2 2h-4" />
                </svg>
                Escanear factura (OCR)
              </>
            )}
          </button>

          {ocrError && (
            <p className="rg-error" style={{ textAlign: 'center' }}>{ocrError}</p>
          )}
        </div>

        {/* ── Categorías ──────────────────────────────────────────── */}
        <div className="rg-section">
          <div className="rg-section-row">
            <span className="rg-section-label">Categoría</span>
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

        {/* ── Nota (proveedor precargado por OCR) ─────────────────── */}
        <div className="rg-section">
          <span className="rg-section-label">Nota (opcional)</span>
          <input
            className="rg-note-input"
            type="text"
            placeholder="¿En qué gastaste esto? (ej: Carulla)"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            aria-label="Nota opcional"
          />
        </div>

        {/* ── Toggle foto ──────────────────────────────────────────── */}
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

        {/* ── Guardar ─────────────────────────────────────────────── */}
        <button
          className="rg-save-btn"
          onClick={handleGuardar}
          disabled={saving}
        >
          {saving ? 'Guardando...' : 'Guardar gasto'}
        </button>

      </main>

      {/* ── Modal preview OCR ────────────────────────────────────────── */}
      {showPreview && ocrData && (
        <div className="ocr-overlay" onClick={handleClosePreview}>
          <div className="ocr-modal" onClick={(e) => e.stopPropagation()}>

            {/* Cabecera */}
            <div className="ocr-modal-header">
              <div className="ocr-scanning-indicator">
                <div className="ocr-scan-dot" />
                <span>Extrayendo datos...</span>
              </div>
              <button className="ocr-close-btn" onClick={handleClosePreview}>×</button>
            </div>

            {/* Cuerpo de datos */}
            <div className="ocr-modal-body">

              <div className="ocr-field-row">
                <div className="ocr-field">
                  <span className="ocr-field-label">COMERCIO</span>
                  <span className="ocr-field-value">{ocrData.proveedor || '—'}</span>
                </div>
                <div className="ocr-field">
                  <span className="ocr-field-label">FECHA</span>
                  <span className="ocr-field-value">
                    {ocrData.fecha ? normalizarFecha(ocrData.fecha).split('-').reverse().join('/') : '—'}
                  </span>
                </div>
              </div>

              <div className="ocr-field-row">
                <div className="ocr-field">
                  <span className="ocr-field-label">CATEGORÍA</span>
                  <span className="ocr-field-value ocr-category-pill">
                    {CATEGORIAS.find(c => c.id === mapearCategoria(ocrData.categoria || ocrData.descripcion))?.emoji || '···'}{' '}
                    {CATEGORIAS.find(c => c.id === mapearCategoria(ocrData.categoria || ocrData.descripcion))?.label || 'Otros'}
                  </span>
                </div>
                <div className="ocr-field">
                  <span className="ocr-field-label">TOTAL</span>
                  <span className="ocr-field-value ocr-amount">
                    {ocrData.monto_total
                      ? Number(ocrData.monto_total).toLocaleString('es-CO')
                      : '—'}
                  </span>
                </div>
              </div>

              {ocrData.notas && (
                <div className="ocr-field" style={{ marginTop: '0.5rem' }}>
                  <span className="ocr-field-label">NOTAS OCR</span>
                  <span className="ocr-field-value" style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                    {ocrData.notas}
                  </span>
                </div>
              )}

              {/* Confianza */}
              <div className="ocr-confidence">
                <span className={`ocr-confidence-badge ocr-confidence-${ocrData.confianza || 'baja'}`}>
                  Confianza: {ocrData.confianza || 'baja'}
                </span>
              </div>
            </div>

            {/* Acción */}
            <button className="ocr-accept-btn" onClick={handleAcceptOCR}>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Aceptar gasto
            </button>

          </div>
        </div>
      )}

      <BottomNav />

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        /* ── OCR Modal ── */
        .ocr-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.45);
          display: flex;
          align-items: flex-end;
          justify-content: center;
          z-index: 200;
          padding: 1rem;
        }

        .ocr-modal {
          background: white;
          border-radius: 20px 20px 16px 16px;
          width: 100%;
          max-width: 420px;
          overflow: hidden;
          animation: slideUp .25s ease;
        }

        @keyframes slideUp {
          from { transform: translateY(30px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }

        .ocr-modal-header {
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          padding: 0.875rem 1rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .ocr-scanning-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
        }

        .ocr-scan-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #22c55e;
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }

        .ocr-close-btn {
          background: none;
          border: none;
          font-size: 1.5rem;
          color: #9ca3af;
          cursor: pointer;
          line-height: 1;
          padding: 0 4px;
        }

        .ocr-modal-body {
          padding: 1.25rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .ocr-field-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .ocr-field {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .ocr-field-label {
          font-size: 0.7rem;
          font-weight: 600;
          color: #9ca3af;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .ocr-field-value {
          font-size: 1rem;
          font-weight: 600;
          color: #111827;
        }

        .ocr-category-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: #f3f4f6;
          border-radius: 20px;
          padding: 3px 10px;
          font-size: 0.8rem;
          font-weight: 500;
          color: #374151;
          width: fit-content;
        }

        .ocr-amount {
          color: #1a7a50;
          font-size: 1.5rem;
        }

        .ocr-confidence {
          display: flex;
          justify-content: flex-end;
          margin-top: 0.25rem;
        }

        .ocr-confidence-badge {
          font-size: 0.7rem;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: 20px;
          text-transform: capitalize;
        }

        .ocr-confidence-alta  { background: #dcfce7; color: #166534; }
        .ocr-confidence-media { background: #fef9c3; color: #854d0e; }
        .ocr-confidence-baja  { background: #fee2e2; color: #991b1b; }

        .ocr-accept-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 1rem;
          background: #1a7a50;
          color: white;
          font-size: 1rem;
          font-weight: 700;
          border: none;
          cursor: pointer;
          transition: opacity 0.2s;
          letter-spacing: 0.01em;
        }

        .ocr-accept-btn:hover { opacity: 0.9; }
        .ocr-accept-btn:active { opacity: 0.8; }
      `}</style>
    </div>
  );
};