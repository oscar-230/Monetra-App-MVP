// src/views/ahorros/SavingsView.jsx
import { useState } from 'react';
import { AppHeader } from '../../components/layout/AppHeader';
import { BottomNav } from '../../components/layout/BottomNav';
import { useSavings } from '../../hooks/useSavings'; 
import './SavingsView.css';

export const SavingsView = () => {
  const [seccionActiva, setSeccionActiva] = useState('ahorros');
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalForm, setGoalForm] = useState({ nombre: '', monto: '', fechaEstimada: '' });
  
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState(null);
  const [selectedGoalNombre, setSelectedGoalNombre] = useState('');
  const [transactionAmount, setTransactionAmount] = useState('');

  // Consumo del Hook real sincronizado mediante Fetch
  const { progresos, resumen, loading, addGoal, saveAbono } = useSavings();

  // Genera el historial dinámico mapeando los ahorros actuales
  const historialAbonos = progresos.reduce((acc, goal) => {
    if (goal.montoActual > 0) {
      acc.push({
        id: `log-${goal.id}`,
        metaNombre: goal.nombre,
        monto: goal.montoActual, 
        fecha: new Date().toLocaleDateString('es-CO'),
        tipo: 'Abono Exitoso'
      });
    }
    return acc;
  }, []);

  const handleGoalFormChange = (e) => {
    const { name, value } = e.target;
    setGoalForm(prev => ({ ...prev, [name]: value }));
  };

  const handleGoalSubmit = async (e) => {
    e.preventDefault();
    const res = await addGoal(goalForm);
    if (res?.exito) {
      setShowGoalModal(false);
      setGoalForm({ nombre: '', monto: '', fechaEstimada: '' });
    }
  };

  const handleOpenTransactionModal = (goalId, goalNombre) => {
    setSelectedGoalId(goalId);
    setSelectedGoalNombre(goalNombre);
    setTransactionAmount('');
    setShowTransactionModal(true);
  };

  const handleTransactionSubmit = async (e) => {
    e.preventDefault();
    
    const montoNumerico = parseFloat(transactionAmount);
    if (isNaN(montoNumerico) || montoNumerico <= 0) {
      alert("Por favor, ingresa un monto válido.");
      return;
    }

    const res = await saveAbono(selectedGoalId, montoNumerico);
    if (res?.exito) {
      // ACTUALIZACIÓN OPTIMISTA LOCAL:
      // Modifica el estado en caliente para que la barra se desplace inmediatamente 
      // en la UI sin esperar el delay de red o indexación de Firestore.
      if (progresos && progresos.length > 0) {
        const metaIndex = progresos.findIndex(g => g.id === selectedGoalId);
        if (metaIndex !== -1) {
          const meta = progresos[metaIndex];
          const nuevoMonto = (meta.montoActual || 0) + montoNumerico;
          const maxTarget = meta.monto_objetivo || meta.montoTarget || meta.montoObjetivo || 1;
          
          meta.montoActual = nuevoMonto;
          meta.porcentajeAvance = (nuevoMonto / maxTarget) * 100;
        }
      }

      setShowTransactionModal(false);
      setTransactionAmount('');
    } else {
      alert("Hubo un problema al registrar el abono en el servidor.");
    }
  };

  const formatCurrency = (amount) => {
    return '$' + (amount || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 });
  };

  return (
    <div className="savings-container">
      <AppHeader seccionActiva={seccionActiva} setSeccionActiva={setSeccionActiva} />

      <main className="savings-main">
        {loading && <div className="loading-bar-pulse">Sincronizando con Monetra...</div>}

        {/* Tarjeta de Ahorros Totales */}
        <div className="savings-overview-card-unified">
          <div className="savings-monthly-panel">
            <p className="savings-monthly-label">Ahorros totales acumulados</p>
            <p className="savings-monthly-amount">
              {formatCurrency(progresos.reduce((sum, g) => sum + (g.montoActual || 0), 0))}
            </p>
            <div className="savings-monthly-badge">
              Resumen de avance: {resumen ? `${resumen.promedioAvanceGeneral || 0}%` : '0%'}
            </div>
          </div>
        </div>

        {/* SECCIÓN: Objetivos de Ahorro con Slider Horizontal */}
        <section className="savings-section">
          <div className="savings-section-header">
            <h2 className="savings-section-title">Tus objetivos de ahorro ({progresos.length})</h2>
          </div>
          
          <div className="savings-goals-slider">
            {progresos.length > 0 ? (
              progresos.map((goal) => (
                <div 
                  key={goal.id} 
                  className="savings-featured-goal-card"
                  onClick={() => handleOpenTransactionModal(goal.id, goal.nombre)}
                  title="Haz clic para abonar a esta meta"
                >
                  <div className="featured-goal-header">
                    <span className="featured-goal-title">Meta: {goal.nombre}</span>
                    <span className="featured-goal-action-indicator">+ Abonar</span>
                  </div>

                  <div className="featured-goal-progress-row">
                    <div className="featured-progress-bar-wrapper">
                      <div 
                        className="featured-progress-bar-fill" 
                        style={{ width: `${Math.min(goal.porcentajeAvance || 0, 100)}%` }}
                      />
                    </div>
                    <span className="featured-progress-percentage-text">
                      {Math.round(goal.porcentajeAvance || 0)}%
                    </span>
                  </div>

                  <div className="featured-goal-footer">
                    <span className="featured-goal-amounts">
                      {formatCurrency(goal.montoActual)} / {formatCurrency(goal.monto_objetivo || goal.montoTarget || goal.montoObjetivo)}
                    </span>
                    {goal.enCamino && (
                      <span className="featured-goal-prediction">
                        {goal.enCamino.descripcion}
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="savings-featured-goal-card empty" onClick={() => setShowGoalModal(true)}>
                <p>No tienes metas activas. Haz clic en el botón de abajo para fijar tu primer objetivo financiero.</p>
              </div>
            )}
          </div>
        </section>

        {/* SECCIÓN: Historial de Ahorros */}
        <section className="savings-section">
          <div className="savings-section-header">
            <h2 className="savings-section-title">Ultimo abono</h2>
          </div>

          <div className="savings-history-list">
            {historialAbonos.length > 0 ? (
              historialAbonos.map((item) => (
                <div key={item.id} className="history-item">
                  <div className="history-icon-wrapper">💰</div>
                  <div className="history-content">
                    <h3 className="history-title">Abono a {item.metaNombre}</h3>
                    <p className="history-date">{item.fecha} • {item.tipo}</p>
                  </div>
                  <div className="history-amount-positive">
                    +{formatCurrency(item.monto)}
                  </div>
                </div>
              ))
            ) : (
              <div className="history-empty-state">
                No se registran movimientos recientes de ahorro en tu cuenta.
              </div>
            )}
          </div>
        </section>

        {/* Tarjeta Punteada de Acción */}
        <div className="create-goal-dashed-card" onClick={() => setShowGoalModal(true)}>
          <div className="create-goal-dashed-icon">+</div>
          <h3 className="create-goal-dashed-title">Crear un nuevo objetivo financiero</h3>
          <p className="create-goal-dashed-description">
            Fíjate una meta para tu próxima compra importante y deja que Monetra te ayude a organizarla.
          </p>
        </div>
      </main>

      {/* MODAL CREAR META */}
      {showGoalModal && (
        <div className="goal-modal-overlay">
          <div className="goal-modal">
            <div className="goal-modal-header">
              <h3 className="goal-modal-title">Nuevo Objetivo Financiero</h3>
              <button className="goal-modal-close" onClick={() => setShowGoalModal(false)}>✕</button>
            </div>
            <form onSubmit={handleGoalSubmit} className="goal-modal-form">
              <div className="goal-form-group">
                <label className="goal-form-label">Nombre del objetivo</label>
                <input 
                  type="text" name="nombre" value={goalForm.nombre} onChange={handleGoalFormChange}
                  placeholder="Ej. Computador, Viaje, Moto" className="goal-form-input" required 
                />
              </div>
              <div className="goal-form-group">
                <label className="goal-form-label">Monto objetivo (COP)</label>
                <input 
                  type="number" name="monto" value={goalForm.monto} onChange={handleGoalFormChange}
                  placeholder="Ej. 1800000" className="goal-form-input" required 
                />
              </div>
              <div className="goal-form-group">
                <label className="goal-form-label">Fecha estimada para cumplirlo</label>
                <input 
                  type="date" name="fechaEstimada" value={goalForm.fechaEstimada} onChange={handleGoalFormChange}
                  className="goal-form-input" required 
                />
              </div>
              <div className="goal-modal-actions">
                <button type="button" className="goal-modal-btn goal-modal-btn-cancel" onClick={() => setShowGoalModal(false)}>Cancelar</button>
                <button type="submit" className="goal-modal-btn goal-modal-btn-submit">Crear Meta</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REGISTRAR ABONO */}
      {showTransactionModal && (
        <div className="goal-modal-overlay">
          <div className="goal-modal">
            <div className="goal-modal-header">
              <h3 className="goal-modal-title">Registrar Abono a "{selectedGoalNombre}"</h3>
              <button className="goal-modal-close" onClick={() => setShowTransactionModal(false)}>✕</button>
            </div>
            <form onSubmit={handleTransactionSubmit} className="goal-modal-form">
              <div className="goal-form-group">
                <label className="goal-form-label">Monto a depositar (COP)</label>
                <input 
                  type="number" value={transactionAmount} onChange={(e) => setTransactionAmount(e.target.value)}
                  placeholder="Ej. 50000" className="goal-form-input" required 
                  autoFocus
                />
              </div>
              <div className="goal-modal-actions">
                <button type="button" className="goal-modal-btn goal-modal-btn-cancel" onClick={() => setShowTransactionModal(false)}>Cancelar</button>
                <button type="submit" className="goal-modal-btn goal-modal-btn-submit">Confirmar Abono</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};