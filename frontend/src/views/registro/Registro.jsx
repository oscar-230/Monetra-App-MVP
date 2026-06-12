import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '../../components/layout/BottomNav';
import { createMovement } from '../../services/movementApi';
import './Registro.css';

const CATEGORIAS = [
  { id: 'comida', label: 'Comida', emoji: '🍔' },
  { id: 'transporte', label: 'Transporte', emoji: '🚌' },
  { id: 'diversion', label: 'Diversión', emoji: '🎬' },
  { id: 'salud', label: 'Salud', emoji: '❤️' },
  { id: 'compras', label: 'Compras', emoji: '🛍️' },
  { id: 'otros', label: 'Otros', emoji: '📦' },
];

export const Registro = () => {
  const navigate = useNavigate();

  const [monto, setMonto] = useState('');
  const [categoria, setCategoria] = useState('comida');
  const [nota, setNota] = useState('');
  const [adjuntarFoto, setAdjuntarFoto] = useState(false);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleMonto = (e) => {
    const valor = e.target.value.replace(/[^0-9.]/g, '');

    if ((valor.match(/\./g) || []).length > 1) {
      return;
    }

    setMonto(valor);

    if (error) {
      setError('');
    }
  };

  const validarFormulario = () => {
    const numero = parseFloat(monto);

    if (!monto || isNaN(numero)) {
      return 'Debes ingresar un monto válido.';
    }

    if (numero <= 0) {
      return 'El monto debe ser mayor que cero.';
    }

    if (!categoria) {
      return 'Debes seleccionar una categoría.';
    }

    return null;
  };

  const handleGuardar = async () => {
    const validationError = validarFormulario();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      await createMovement({
        tipo: 'gasto',
        monto: Number(monto),
        categoria,
        fecha: new Date().toISOString().split('T')[0],
        descripcion: nota,
        moneda: 'COP',
        origen: 'manual',
      });

      setSuccess('Movimiento registrado correctamente.');

      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rg-wrapper">
      <header className="rg-header">
        <button
          className="rg-back"
          onClick={() => navigate('/dashboard')}
        >
          ← Monetra
        </button>
        <button className="rg-icon-btn">
          🔔
        </button>
      </header>
      <main className="rg-main">
        <div className="rg-title-block">
          <h1 className="rg-title">Nuevo gasto</h1>
          <p className="rg-subtitle">
            Registra tus gastos rápidamente para mantener tu salud financiera.
          </p>
        </div>
        <div className="rg-columns">
          <div className="rg-col">
            <div className="rg-amount-card">
              <p className="rg-amount-label">
                Monto del gasto
              </p>
              <div className="rg-amount-row">
                <span className="rg-dollar">$</span>
                <input
                  className="rg-amount-input"
                  type="text"
                  value={monto}
                  onChange={handleMonto}
                  placeholder="0"
                />
              </div>
              {error && (
                <p className="rg-error">
                  {error}
                </p>
              )}
              {success && (
                <p
                  style={{
                    color: '#1a7a50',
                    fontSize: '0.85rem'
                  }}
                >
                  {success}
                </p>
              )}
              <button
                type="button"
                className="rg-scan-btn"
              >
                OCR próximamente
              </button>
            </div>
            <div className="rg-section">
              <div className="rg-section-row">
                <span className="rg-section-label">
                  Categoría
                </span>
              </div>
              <div className="rg-cat-grid">
                {CATEGORIAS.map((cat) => (
                  <button
                    key={cat.id}
                    className={
                      categoria === cat.id
                        ? 'rg-cat rg-cat--active'
                        : 'rg-cat'
                    }
                    onClick={() => setCategoria(cat.id)}
                  >
                    <span className="rg-cat-emoji">
                      {cat.emoji}
                    </span>

                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="rg-col">
            <div className="rg-right-card">
              <div className="rg-section">
                <span className="rg-section-label">
                  Nota (Opcional)
                </span>
                <input
                  className="rg-note-input"
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  placeholder="Descripción del gasto"
                />
              </div>
              <div className="rg-toggle-row">
                <span className="rg-toggle-label">
                  Adjuntar foto
                </span>
                <button
                  className={
                    adjuntarFoto
                      ? 'rg-toggle rg-toggle--on'
                      : 'rg-toggle'
                  }
                  onClick={() =>
                    setAdjuntarFoto(!adjuntarFoto)
                  }
                />
              </div>
              <button
                onClick={handleGuardar}
                disabled={loading}
                className="rg-save-btn"
              >
                {loading
                  ? 'Guardando...'
                  : 'Guardar gasto'}
              </button>
            </div>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
};