import { useState } from 'react';
import { AppHeader } from '../../components/layout/AppHeader';
import { BottomNav } from '../../components/layout/BottomNav';
import './SavingsView.css';

export const SavingsView = () => {
  const [seccionActiva, setSeccionActiva] = useState('ahorros');
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalForm, setGoalForm] = useState({
    nombre: '',
    monto: '',
    fechaEstimada: ''
  });

  const challenges = [
    {
      id: 1,
      title: 'Semana sin café',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      ),
      status: 'En progreso',
      statusColor: 'green',
      description: 'Deja de comprar café comercial por 7 días. Ahorro estimado: $75.000',
    },
    {
      id: 2,
      title: 'Ahorro hormiga',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      status: 'Empieza mañana',
      statusColor: 'gray',
      description: 'Redondea cada compra al siguiente peso y ahorra la diferencia durante un mes.',
      hasButton: true,
    },
    {
      id: 3,
      title: 'Insignia de Mejor Ahorrador',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ),
      isBadge: true,
      description: '¡Estás entre el 5% de los mejores ahorradores de esta semana!',
      points: '+500 pts',
    },
  ];

  const recommendations = [
    {
      id: 1,
      title: 'Suscripciones sin uso',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      description: 'Notamos que no has usado Netflix en 3 meses.',
      savings: 'Ahorro $50.000',
    },
    {
      id: 2,
      title: 'Ahorro en transporte',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      description: 'Usar transporte alternativo dos veces por semana podría disminuir tus gastos mensuales.',
      savings: 'Ahorro $22.000',
    },
    {
      id: 3,
      title: 'Análisis de gastos en restaurantes',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      description: 'Reemplazar dos comidas en restaurante por comidas preparadas en casa puede generar un ahorro significativo.',
      savings: 'Ahorro $80.000',
    },
  ];

  const handleGoalFormChange = (e) => {
    const { name, value } = e.target;
    setGoalForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleGoalSubmit = (e) => {
    e.preventDefault();
    console.log('Nueva meta de ahorro:', goalForm);
    // Here you would typically send the data to your backend
    setShowGoalModal(false);
    setGoalForm({ nombre: '', monto: '', fechaEstimada: '' });
  };

  const handleGoalCancel = () => {
    setShowGoalModal(false);
    setGoalForm({ nombre: '', monto: '', fechaEstimada: '' });
  };

  return (
    <div className="savings-container">
      <AppHeader seccionActiva={seccionActiva} setSeccionActiva={setSeccionActiva} />

      <main className="savings-main">
        {/* Savings Overview Card */}
        <div className="savings-overview-card">
          <div className="savings-overview-content">
            <p className="savings-overview-label">Ahorros este mes</p>
            <p className="savings-overview-amount">$200.000</p>
            <p className="savings-overview-comparison">12% más que el mes pasado</p>
          </div>
          <div className="savings-goal-progress">
            <p className="savings-goal-label">Meta: Computador</p>
            <p className="savings-goal-amount">$900.000 / $1.800.000</p>
            <div className="savings-progress-bar">
              <div className="savings-progress-fill" style={{ width: '75%' }} />
            </div>
            <p className="savings-progress-text">75% completado</p>
          </div>
        </div>

        {/* Active Challenges Section */}
        <div className="savings-section">
          <div className="savings-section-header">
            <h3 className="savings-section-title">Retos activos</h3>
            <button className="savings-section-link">Ver todo →</button>
          </div>
          <div className="challenges-list">
            {challenges.map((challenge) => (
              <div key={challenge.id} className="challenge-card">
                <div className="challenge-icon-wrapper">
                  {challenge.icon}
                </div>
                <div className="challenge-content">
                  <div className="challenge-header">
                    <h4 className="challenge-title">{challenge.title}</h4>
                    {challenge.status && (
                      <span className={`challenge-status ${challenge.statusColor}`}>
                        {challenge.status}
                      </span>
                    )}
                  </div>
                  <p className="challenge-description">{challenge.description}</p>
                  {challenge.hasButton && (
                    <button className="challenge-join-btn">Unirme al reto</button>
                  )}
                  {challenge.isBadge && (
                    <div className="challenge-badge-points">
                      <span>{challenge.points}</span>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Personal Recommendations Section */}
        <div className="savings-section">
          <h3 className="savings-section-title">Recomendaciones personales</h3>
          <div className="recommendations-list">
            {recommendations.map((rec) => (
              <div key={rec.id} className="recommendation-item">
                <div className="recommendation-icon-wrapper">
                  {rec.icon}
                </div>
                <div className="recommendation-content">
                  <h4 className="recommendation-title">{rec.title}</h4>
                  <p className="recommendation-description">{rec.description}</p>
                </div>
                <div className="recommendation-savings">
                  <span className="recommendation-savings-amount">{rec.savings}</span>
                  <button className="recommendation-menu-btn">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Create New Goal Card */}
        <div className="create-goal-card" onClick={() => setShowGoalModal(true)}>
          <div className="create-goal-icon">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div className="create-goal-content">
            <h4 className="create-goal-title">Crear un nuevo objetivo financiero</h4>
            <p className="create-goal-description">
              Fíjate una meta para tu próxima compra importante y deja que Monetra te ayude a alcanzarla más rápido.
            </p>
          </div>
        </div>
      </main>

      {/* Goal Modal */}
      {showGoalModal && (
        <div className="goal-modal-overlay">
          <div className="goal-modal">
            <div className="goal-modal-header">
              <h3 className="goal-modal-title">Crear nueva meta de ahorro</h3>
              <button
                className="goal-modal-close"
                onClick={handleGoalCancel}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleGoalSubmit} className="goal-modal-form">
              <div className="goal-form-group">
                <label className="goal-form-label">Nombre de la meta</label>
                <input
                  type="text"
                  name="nombre"
                  value={goalForm.nombre}
                  onChange={handleGoalFormChange}
                  placeholder="Ej: Viaje a la playa"
                  className="goal-form-input"
                  required
                />
              </div>
              <div className="goal-form-group">
                <label className="goal-form-label">Monto objetivo</label>
                <input
                  type="number"
                  name="monto"
                  value={goalForm.monto}
                  onChange={handleGoalFormChange}
                  placeholder="Ej: 500000"
                  className="goal-form-input"
                  required
                />
              </div>
              <div className="goal-form-group">
                <label className="goal-form-label">Fecha estimada</label>
                <input
                  type="date"
                  name="fechaEstimada"
                  value={goalForm.fechaEstimada}
                  onChange={handleGoalFormChange}
                  className="goal-form-input"
                  required
                />
              </div>
              <div className="goal-modal-actions">
                <button
                  type="button"
                  onClick={handleGoalCancel}
                  className="goal-modal-btn goal-modal-btn-cancel"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="goal-modal-btn goal-modal-btn-submit"
                >
                  Crear meta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};
