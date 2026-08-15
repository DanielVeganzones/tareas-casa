import {
  formatDate,
  frequencyText,
  getTaskAvailability,
  isOneOffTask,
} from '../lib/task-utils'

function getStatusText(availability) {
  if (availability.isOneOff) {
    return 'A demanda'
  }

  if (availability.isOverdue) {
    return 'Vencida'
  }

  if (availability.isDueToday) {
    return 'Toca hoy'
  }

  if (availability.isAvailableEarly) {
    return 'Ya se puede adelantar'
  }

  return 'Bloqueada'
}

function getAvailabilityText(availability) {
  if (availability.isOneOff) {
    return 'Pendiente hasta que alguien la complete'
  }

  if (availability.isOverdue) {
    return `Pendiente desde ${formatDate(availability.availableFrom)}`
  }

  if (availability.isDueToday) {
    return 'Se puede completar hoy'
  }

  if (availability.isAvailableEarly) {
    return `Dentro del margen de ${availability.maxAdvanceDays} días`
  }

  return `Se habilita el ${formatDate(availability.availableFrom)}`
}

function TaskCard({ task, onComplete, pending }) {
  const availability = getTaskAvailability(task)
  const disabled = pending || !availability.canComplete

  return (
    <article className="task-card">
      <div className="task-card__content">
        <div className="task-card__header">
          <strong>{task.name}</strong>
          <span className={`pill pill--${availability.status}`}>
            {getStatusText(availability)}
          </span>
        </div>

        <p>{frequencyText(task)}</p>
        {isOneOffTask(task) ? (
          <p>Tarea a demanda sin fecha programada</p>
        ) : (
          <p>Próxima fecha: {formatDate(task.next_due_date)}</p>
        )}
        <p>{getAvailabilityText(availability)}</p>
      </div>

      <button
        type="button"
        className="complete-button"
        onClick={() => onComplete(task)}
        disabled={disabled}
      >
        {pending ? '...' : 'Hecha'}
      </button>
    </article>
  )
}

export default TaskCard
