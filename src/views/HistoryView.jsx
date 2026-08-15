import { formatDateTime } from '../lib/task-utils'

function getTaskName(completion, tasksById) {
  return tasksById.get(completion.task_id)?.name ?? 'Tarea sin nombre'
}

function HistoryView({
  history,
  tasksById,
  resolveMemberLabel,
  canUndoCompletion,
  onUndoCompletion,
  undoingCompletionId,
}) {
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
          {history.map((completion) => (
            <article className="history-item" key={completion.id}>
              <div>
                <strong>{getTaskName(completion, tasksById)}</strong>
                <p>
                  {completion.completed_at
                    ? formatDateTime(completion.completed_at)
                    : 'Sin fecha registrada'}
                </p>
              </div>

              <div className="history-item__actions">
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
          ))}
        </div>
      )}
    </section>
  )
}

export default HistoryView
