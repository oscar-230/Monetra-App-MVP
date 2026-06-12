import { useState } from 'react';
import { BottomNav } from '../../components/layout/BottomNav';
import { MovementCard } from '../../components/movimientos/MovementCard';
import { MovementOptionsModal } from '../../components/movimientos/MovementOptionsModal';
import './MovimientosView.css';

const MOCK_DATA = [
  {
    id: 1,
    categoria: 'Comida',
    descripcion: 'Hamburguesa',
    monto: 32500,
    fecha: '2026-06-11',
  },
  {
    id: 2,
    categoria: 'Entretenimiento',
    descripcion: 'Netflix Premium',
    monto: 25900,
    fecha: '2026-06-10',
  },
  {
    id: 3,
    categoria: 'Transporte',
    descripcion: 'Uber',
    monto: 18500,
    fecha: '2026-06-09',
  },
];

export const MovimientosView = () => {
  const [movimientos, setMovimientos] = useState(MOCK_DATA);

  const [selectedMovement, setSelectedMovement] =
    useState(null);

  const [successMessage, setSuccessMessage] =
    useState('');

  const handleSave = (updatedMovement) => {

    setMovimientos((prev) =>
      prev.map((m) =>
        m.id === updatedMovement.id
          ? updatedMovement
          : m
      )
    );

    setSelectedMovement(null);

    setSuccessMessage(
      '✅ Movimiento actualizado correctamente.'
    );

    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  const handleDelete = (id) => {

    setMovimientos((prev) =>
      prev.filter((m) => m.id !== id)
    );

    setSelectedMovement(null);

    setSuccessMessage(
      '🗑️ Movimiento eliminado correctamente.'
    );

    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  return (
    <div className="mv-container">

      <header className="mv-header">
        <h1>Historial de Movimientos</h1>
      </header>

      {successMessage && (
        <div className="mv-success-banner">
          {successMessage}
        </div>
      )}

      <main className="mv-main">

        {movimientos.map((movimiento) => (
          <MovementCard
            key={movimiento.id}
            movimiento={movimiento}
            onEdit={setSelectedMovement}
          />
        ))}

      </main>

      {selectedMovement && (
        <MovementOptionsModal
          movement={selectedMovement}
          onClose={() =>
            setSelectedMovement(null)
          }
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}

      <BottomNav />

    </div>
  );
};