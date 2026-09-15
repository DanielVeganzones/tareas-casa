import { useState } from 'react'
import { formatDateTime, getTodayDateKey } from '../lib/task-utils'

function getTaskName(completion, tasksById) {
  return tasksById.get(completion.task_id)?.name ?? 'Tarea sin nombre'
}

function getDateInputValue(dateString) {
  const date = dateString ? new Date(dateString) : new Date()

  if (Number.isNaN(date.getTime())) {
    return getTodayDateKey()
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

function HistoryView({
  history,
  tasksById,
  resolveMemberLabel,
  taskDetailsById,
  canUndoCompletion,
  onUndoCompletion,
  undoingCompletionId,
  onUpdateCompletionDate,
  updatingCompletionId,
}) {
  const [editingCompletionId, setEditingCompletionId] = useState(null)
  const [editedDate, setEditedDate] = useState('')

  function startEditing(completion) {
    setEditingCompletionId(completion.id)
    setEditedDate(getDateInputValue(completion.completed_at))
  }

  async function saveCompletionDate(completion) {
    const saved = await onUpdateCompletionDate(completion, editedDate)

    if (saved) {
      setEditingCompletionId(null)
      setEditedDate('')
    }
  }

  return (
    <section className="content-card">
      <div className="section-heading">
        <div>
          <h2>Historial</h2>
          <p>Últimas tareas completadas en la casa.</p>
        </div>
        <span className="counter-chip">{history.length}</span>
      </div>

      {history.length === 0 ? (
        <p className="empty-state">Todavía no hay completados.</p>
      ) : (
        <div className="history-list">
          {history.map((completion) => {
            const taskDetails = taskDetailsById.get(completion.task_id)
            const note = taskDetails?.notes[0]
            const checklistItems = taskDetails?.checklistItems ?? []
            const isEditing = editingCompletionId === completion.id
            const isUpdating = updatingCompletionId === completion.id

            return (
              <article className="history-item" key={completion.id}>
                <div className="history-item__content">
                  <strong>{getTaskName(completion, tasksById)}</strong>

                  {isEditing ? (
                    <form
                      className="history-item__date-form"
                      onSubmit={(event) => {
                        event.preventDefault()
                        saveCompletionDate(completion)
                      }}
                    >
                      <label>
                        Fecha de realización
                        <input
                          type="date"
                          value={editedDate}
                          max={getTodayDateKey()}
                          onChange={(event) => setEditedDate(event.target.value)}
                          disabled={isUpdating}
                          required
                        />
                      </label>
                      <div className="history-item__date-actions">
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => setEditingCompletionId(null)}
                          disabled={isUpdating}
                        >
                          Cancelar
                        </button>
                        <button type="submit" disabled={isUpdating || !editedDate}>
                          {isUpdating ? 'Guardando...' : 'Guardar'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <p>
                      {completion.completed_at
                        ? formatDateTime(completion.completed_at)
                        : 'Sin fecha registrada'}
                    </p>
                  )}

                  {note || checklistItems.length > 0 ? (
                    <div className="history-item__details">
                      {note ? (
                        <section>
                          <h3>Notas</h3>
                          <p>{note.body}</p>
                        </section>
                      ) : null}

                      {checklistItems.length > 0 ? (
                        <section>
                          <h3>Checklist</h3>
                          <ul>
                            {checklistItems.map((item) => (
                              <li
                                className={
                                  item.is_checked
                                    ? 'is-checked'
                                    : undefined
                                }
                                key={item.id}
                              >
                                <span aria-hidden="true">
                                  {item.is_checked ? '✓' : '○'}
                                </span>
                                {item.label}
                              </li>
                            ))}
                          </ul>
                        </section>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="history-item__actions">
                  <button
                    type="button"
                    className="secondary-button history-item__edit"
                    onClick={() => startEditing(completion)}
                    disabled={isUpdating}
                    aria-label={`Editar fecha de ${getTaskName(completion, tasksById)}`}
                    title="Editar fecha"
                  >
                    <EditIcon />
                  </button>

                  <span className="history-item__user">
                    {resolveMemberLabel(completion.completed_by)}
                  </span>

                  {completion.reverted_at ? (
                    <span className="history-item__badge">Deshecho</span>
                  ) : null}

                  {canUndoCompletion(completion) ? (
                    <button
                      type="button"
                      className="secondary-button history-item__undo"
                      onClick={() => onUndoCompletion(completion)}
                      disabled={undoingCompletionId === completion.id}
                    >
                      {undoingCompletionId === completion.id
                        ? 'Deshaciendo...'
                        : 'Deshacer'}
                    </button>
                  ) : null}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default HistoryView
