import {
  formatDate,
  frequencyText,
  getTaskAvailability,
  isOneOffTask,
} from '../lib/task-utils'
import TaskDetails from './TaskDetails'

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
    return `Dentro del margen de ${availability.maxAdvanceDays} dias`
  }

  return `Se habilita el ${formatDate(availability.availableFrom)}`
}

function TaskCard({
  task,
  onComplete,
  onDelete,
  pending,
  deleting,
  notes,
  checklistItems,
  onTaskDetailsChange,
  currentUserId,
}) {
  const availability = getTaskAvailability(task)
  const disabled = pending || deleting || !availability.canComplete

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
          <p>Proxima fecha: {formatDate(task.next_due_date)}</p>
        )}
        <p>{getAvailabilityText(availability)}</p>
      </div>

      <div className="task-card__actions">
        {onDelete ? (
          <button
            type="button"
            className="secondary-button danger-button"
            onClick={() => onDelete(task)}
            disabled={pending || deleting}
          >
            {deleting ? 'Borrando...' : 'Borrar'}
          </button>
        ) : null}

        <button
          type="button"
          className="complete-button"
          onClick={() => onComplete(task)}
          disabled={disabled}
        >
          {pending ? '...' : 'Hecha'}
        </button>
      </div>

      <TaskDetails
        task={task}
        notes={notes}
        checklistItems={checklistItems}
        onChange={onTaskDetailsChange}
        currentUserId={currentUserId}
      />
    </article>
  )
}

export default TaskCard
