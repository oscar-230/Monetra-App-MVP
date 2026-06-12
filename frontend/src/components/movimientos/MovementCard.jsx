export const MovementCard = ({
  movimiento,
  onEdit,
}) => {
  return (
    <div className="movement-card">

      <div className="movement-icon-wrapper">
        <div 
          className="movement-icon"
          style={{ backgroundColor: movimiento.color || '#10b981' }}
        >
          {movimiento.icono || '💰'}
        </div>
      </div>

      <div className="movement-info">
        <h3>{movimiento.descripcion}</h3>
        <p>{movimiento.categoria}</p>
      </div>

      <div className="movement-actions">
        <div className="movement-amount-section">
          <span className="movement-amount">
            -$
            {movimiento.monto.toLocaleString('es-CO')}
          </span>
          <span className="movement-time">
            {movimiento.hora || ''}
          </span>
        </div>

        <button
          className="movement-edit-btn"
          onClick={() => onEdit(movimiento)}
        >
          ✏️
        </button>

      </div>

    </div>
  );
};