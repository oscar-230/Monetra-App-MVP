// frontend/src/views/dashboard/DashboardView.jsx
import { useState, useRef, useEffect } from 'react';
import useAuth from '../../hooks/useAuth';
import { BottomNav } from '../../components/layout/BottomNav';
import './DashboardView.css';

const transactions = [
  {
    id: 1,
    name: 'Hamburguesa',
    time: 'Hace 2 horas',
    amount: '-$32.500',
    type: 'neg',
    iconBg: '#fef3f0',
    iconColor: '#c0392b',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M21 15a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2h14a2 2 0 012 2v6z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 11h18" />
      </svg>
    ),
  },
  {
    id: 2,
    name: 'Netflix Premium',
    time: 'Ayer',
    amount: '-$25.900',
    type: 'neg',
    iconBg: '#f3f0fe',
    iconColor: '#5c5fad',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 3,
    name: 'Transferencia Carlos',
    time: 'Hace 2 días',
    amount: '+$14.500',
    type: 'pos',
    iconBg: '#e6f5ee',
    iconColor: '#1a7a50',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
  },
];

const donutSegments = [
  { color: '#1a7a50', label: 'Comida (45%)' },
  { color: '#e0a500', label: 'Transp (25%)' },
  { color: '#5c5fad', label: 'Otros (13%)' },
  { color: '#e0e0e0', label: 'Más (17%)' },
];

export const DashboardView = () => {
  const { user, cerrarSesion } = useAuth();
  const [seccionActiva, setSeccionActiva] = useState('dashboard');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const obtenerPrimerNombre = () => {
    if (!user?.displayName) return 'Estratega';
    return user.displayName.split(' ')[0];
  };

  // Cierra el dropdown al hacer click fuera
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const renderContenido = () => {
    switch (seccionActiva) {
      case 'dashboard':
        return (
          <div className="content-section">
            {/* Greeting */}
            <div className="greeting-section">
              <h2 className="greeting-title">
                Hola, {obtenerPrimerNombre()}
              </h2>
              <p className="greeting-subtitle">
                Tu salud financiera se ve sólida hoy.
              </p>
            </div>

            {/* Balance Card — full width */}
            <div
              className="balance-card"
            >
              <div
                className="balance-card-decoration large"
              />
              <div
                className="balance-card-decoration small"
              />
              <p className="balance-label">
                Balance Total
              </p>
              <p className="balance-amount">$200.450</p>
              <div className="balance-buttons">
                <button
                  className="balance-btn"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Ingreso
                </button>
                <button
                  className="balance-btn"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                  Gasto
                </button>
              </div>
            </div>

            {/* Savings + AI row */}
            <div className="grid-2col">
              {/* Savings */}
              <div className="card">
                <div className="card-header">
                  <svg className="card-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span
                    className="card-badge"
                  >
                    Meta: Viaje
                  </span>
                </div>
                <p className="card-title">Progreso de Ahorro</p>
                <p className="card-subtitle">$1.200.500 / $3.000.000</p>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: '40%' }} />
                </div>
                <p className="progress-text">40% completado</p>
              </div>

              {/* AI Insights */}
              <div
                className="ai-card"
              >
                <p className="ai-label">
                  ✦ AI Insights
                </p>
                <p className="ai-title">
                  Gasto estimado próximo mes: $100.200
                </p>
                <p className="ai-description">
                  Basado en tus patrones de suscripciones y renta actual.
                </p>
                <button
                  className="ai-btn"
                >
                  Ver análisis detallado
                </button>
              </div>
            </div>

            {/* Chart + Activity row */}
            <div className="grid-2col">
              {/* Donut Chart */}
              <div className="card">
                <p className="card-title" style={{ marginBottom: '1rem' }}>Distribución de Gastos</p>
                <div className="chart-container">
                  <svg width="110" height="110" viewBox="0 0 110 110" className="chart-svg">
                    <circle cx="55" cy="55" r="38" fill="none" stroke="#f0f0f0" strokeWidth="16" />
                    <circle cx="55" cy="55" r="38" fill="none" stroke="#1a7a50" strokeWidth="16"
                      strokeDasharray="107 131" strokeDashoffset="0" transform="rotate(-90 55 55)" />
                    <circle cx="55" cy="55" r="38" fill="none" stroke="#e0a500" strokeWidth="16"
                      strokeDasharray="59 179" strokeDashoffset="-107" transform="rotate(-90 55 55)" />
                    <circle cx="55" cy="55" r="38" fill="none" stroke="#5c5fad" strokeWidth="16"
                      strokeDasharray="31 207" strokeDashoffset="-166" transform="rotate(-90 55 55)" />
                    <circle cx="55" cy="55" r="38" fill="none" stroke="#e0e0e0" strokeWidth="16"
                      strokeDasharray="41 197" strokeDashoffset="-197" transform="rotate(-90 55 55)" />
                    <text x="55" y="51" textAnchor="middle" fontSize="10" fill="#999" fontFamily="sans-serif">Total</text>
                    <text x="55" y="64" textAnchor="middle" fontSize="13" fontWeight="600" fill="#222" fontFamily="sans-serif">$1.2M</text>
                  </svg>
                  <div className="chart-legend">
                    {donutSegments.map(s => (
                      <div key={s.label} className="legend-item">
                        <div className="legend-dot" style={{ background: s.color }} />
                        {s.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="card">
                <div className="activity-header">
                  <p className="activity-title">Actividad Reciente</p>
                  <button className="activity-link">Ver Todo</button>
                </div>
                <div className="activity-list">
                  {transactions.map(tx => (
                    <div key={tx.id} className="activity-item">
                      <div
                        className="activity-icon"
                        style={{ background: tx.iconBg, color: tx.iconColor }}
                      >
                        {tx.icon}
                      </div>
                      <div className="activity-info">
                        <p className="activity-name">{tx.name}</p>
                        <p className="activity-time">{tx.time}</p>
                      </div>
                      <p
                        className="activity-amount"
                        style={{ color: tx.type === 'neg' ? '#c0392b' : '#1a7a50' }}
                      >
                        {tx.amount}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="dev-section">
            <p className="dev-text">Sección en desarrollo</p>
            <button
              onClick={() => setSeccionActiva('dashboard')}
              className="dev-btn"
            >
              ← Volver al inicio
            </button>
          </div>
        );
    }
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <span className="dashboard-header-title">Monetra</span>

        <div className="header-actions">
          {/* Campana */}
          <button className="header-btn">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.437L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>

          {/* Avatar + Dropdown */}
          <div className="avatar-dropdown" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="avatar-btn"
            >
              {user?.displayName?.charAt(0)?.toUpperCase() || 'A'}
            </button>

            {dropdownOpen && (
              <div className="dropdown-menu">
                {/* Info usuario */}
                <div className="dropdown-info">
                  <p className="dropdown-info-name">
                    {user?.displayName || 'Usuario'}
                  </p>
                  <p className="dropdown-info-email">{user?.email}</p>
                </div>

                {/* Opciones */}
                <div className="dropdown-options">
                  <button
                    onClick={() => { setDropdownOpen(false); setSeccionActiva('perfil'); }}
                    className="dropdown-btn"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Mi perfil
                  </button>

                  <button
                    onClick={cerrarSesion}
                    className="dropdown-btn logout"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Cerrar sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        {renderContenido()}
      </main>

      <BottomNav seccionActiva={seccionActiva} setSeccionActiva={setSeccionActiva} />
    </div>
  );
};