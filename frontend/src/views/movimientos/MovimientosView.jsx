import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '../../components/layout/AppHeader';
import { BottomNav } from '../../components/layout/BottomNav';
import { MovementCard } from '../../components/movimientos/MovementCard';
import { MovementOptionsModal } from '../../components/movimientos/MovementOptionsModal';
import './MovimientosView.css';

const MOCK_DATA = [
  {
    id: 1,
    categoria: 'Alimentación',
    descripcion: 'Supermercado',
    monto: 45000,
    fecha: '2026-06-12',
    hora: '10:30 AM',
    icono: '🛒',
    color: '#10b981',
  },
  {
    id: 2,
    categoria: 'Ocio',
    descripcion: 'Starbucks',
    monto: 18500,
    fecha: '2026-06-12',
    hora: '08:15 AM',
    icono: '☕',
    color: '#8b5cf6',
  },
  {
    id: 3,
    categoria: 'Transporte',
    descripcion: 'Uber',
    monto: 12500,
    fecha: '2026-06-11',
    hora: '06:45 PM',
    icono: '🚗',
    color: '#3b82f6',
  },
  {
    id: 4,
    categoria: 'Alimentación',
    descripcion: 'Restaurante',
    monto: 32000,
    fecha: '2026-06-11',
    hora: '01:20 PM',
    icono: '🍽️',
    color: '#f59e0b',
  },
  {
    id: 5,
    categoria: 'Entretenimiento',
    descripcion: 'Cine',
    monto: 28000,
    fecha: '2026-06-10',
    hora: '08:00 PM',
    icono: '🎬',
    color: '#ec4899',
  },
];

export const MovimientosView = () => {
  const [movimientos, setMovimientos] = useState(MOCK_DATA);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState(null);
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [seccionActiva, setSeccionActiva] = useState('movimientos');
  const [selectedMovement, setSelectedMovement] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Traído del segundo archivo para permitir la navegación al registro
  const navigate = useNavigate();

  const handleSave = (updatedMovement) => {
    setMovimientos((prev) =>
      prev.map((m) =>
        m.id === updatedMovement.id ? updatedMovement : m
      )
    );
    setSelectedMovement(null);
    setSuccessMessage('✅ Movimiento actualizado correctamente.');
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  const handleDelete = (id) => {
    setMovimientos((prev) => prev.filter((m) => m.id !== id));
    setSelectedMovement(null);
    setSuccessMessage('🗑️ Movimiento eliminado correctamente.');
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  const groupedMovements = useMemo(() => {
    let filtered = movimientos;

    if (searchTerm) {
      filtered = filtered.filter(m =>
        m.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.categoria.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterType === 'fecha') {
      filtered = [...filtered].sort((a, b) => {
        const dateA = new Date(a.fecha);
        const dateB = new Date(b.fecha);
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      });
    } else if (filterType === 'monto') {
      filtered = [...filtered].sort((a, b) => {
        return sortOrder === 'desc' ? b.monto - a.monto : a.monto - b.monto;
      });
    } else if (filterType === 'categoria' && selectedCategory) {
      filtered = filtered.filter(m => m.categoria === selectedCategory);
    }

    const groups = {};
    filtered.forEach(m => {
      if (!groups[m.fecha]) {
        groups[m.fecha] = [];
      }
      groups[m.fecha].push(m);
    });

    return groups;
  }, [movimientos, searchTerm, filterType, sortOrder, selectedCategory]);

  const uniqueCategories = [...new Set(movimientos.map(m => m.categoria))];

  const handleFilterClick = (type) => {
    if (filterType === type) {
      if (type === 'fecha' || type === 'monto') {
        setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
      } else if (type === 'categoria') {
        setFilterType(null);
        setSelectedCategory(null);
      }
    } else {
      setFilterType(type);
      setSortOrder('desc');
      if (type !== 'categoria') {
        setSelectedCategory(null);
      }
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoy';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ayer';
    } else {
      return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
    }
  };

  return (
    <div className="mv-container">
      <AppHeader seccionActiva={seccionActiva} setSeccionActiva={setSeccionActiva} />

      {successMessage && (
        <div className="mv-success-banner">
          {successMessage}
        </div>
      )}

      <div className="mv-search-section">
        <div className="mv-search-bar">
          <input
            type="text"
            placeholder="Buscar movimientos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mv-search-input"
          />
        </div>

        <div className="mv-filters">
          <button
            className={`mv-filter-btn ${filterType === 'fecha' ? 'active' : ''}`}
            onClick={() => handleFilterClick('fecha')}
          >
            Fecha {filterType === 'fecha' && (sortOrder === 'desc' ? '↓' : '↑')}
          </button>
          <button
            className={`mv-filter-btn ${filterType === 'categoria' ? 'active' : ''}`}
            onClick={() => handleFilterClick('categoria')}
          >
            Categoría
          </button>
          <button
            className={`mv-filter-btn ${filterType === 'monto' ? 'active' : ''}`}
            onClick={() => handleFilterClick('monto')}
          >
            Monto {filterType === 'monto' && (sortOrder === 'desc' ? '↓' : '↑')}
          </button>
        </div>

        {filterType === 'categoria' && (
          <div className="mv-category-dropdown">
            <select
              value={selectedCategory || ''}
              onChange={(e) => setSelectedCategory(e.target.value || null)}
              className="mv-category-select"
            >
              <option value="">Todas las categorías</option>
              {uniqueCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <main className="mv-main">
        {Object.entries(groupedMovements).map(([date, movements]) => (
          <div key={date} className="mv-date-group">
            <div className="mv-date-header">
              {formatDate(date)}
            </div>
            {movements.map((movimiento) => (
              <MovementCard
                key={movimiento.id}
                movimiento={movimiento}
                onEdit={setSelectedMovement}
              />
            ))}
          </div>
        ))}
      </main>

      {selectedMovement && (
        <MovementOptionsModal
          movement={selectedMovement}
          onClose={() => setSelectedMovement(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}

      {/* Botón flotante para registrar nuevo movimiento traído del segundo archivo */}
      <button
        className="mv-fab"
        onClick={() => navigate('/registro')}
        aria-label="Nuevo movimiento"
      >
        +
      </button>

      <BottomNav />
    </div>
  );
};