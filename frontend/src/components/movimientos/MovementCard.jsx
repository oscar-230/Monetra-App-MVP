export const MovementCard = ({
  movimiento,
  onEdit,
}) => {
  return (
    <div className="movement-card">

      <div className="movement-info">
        <h3>{movimiento.descripcion}</h3>

        <p>
          {movimiento.categoria}
          {' • '}
          {movimiento.fecha}
        </p>
      </div>

      <div className="movement-actions">

        <span className="movement-amount">
          -$
          {movimiento.monto.toLocaleString('es-CO')}
        </span>

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