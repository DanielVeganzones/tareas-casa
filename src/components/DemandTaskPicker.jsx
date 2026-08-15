import { useEffect, useMemo, useState } from 'react'

function DemandTaskPicker({
  tasks,
  onComplete,
  onDelete,
  completingTaskId,
  deletingTaskId,
  title = 'Registrar tarea a demanda',
  description = 'Busca una tarea y marcala cuando la hagas.',
}) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const filteredTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    if (!normalizedQuery) {
      return tasks.slice(0, 8)
    }

    return tasks.filter((task) =>
      task.name.toLowerCase().includes(normalizedQuery),
    )
  }, [query, tasks])

  useEffect(() => {
    if (tasks.length === 0) {
      setIsOpen(false)
      setQuery('')
    }
  }, [tasks.length])

  function handleToggle() {
    setIsOpen((current) => !current)
    setQuery('')
  }

  return (
    <section className="content-card">
      <div className="section-heading">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <span className="counter-chip">{tasks.length}</span>
      </div>

      {tasks.length === 0 ? (
        <p className="empty-state">Todavia no hay tareas a demanda creadas.</p>
      ) : (
        <div className="demand-picker">
          <button
            type="button"
            className={
              isOpen
                ? 'demand-picker__toggle is-open'
                : 'demand-picker__toggle'
            }
            onClick={handleToggle}
          >
            <span>
              {isOpen
                ? 'Ocultar selector'
                : 'Marcar una tarea a demanda'}
            </span>
            <strong>{isOpen ? 'Cerrar' : 'Abrir'}</strong>
          </button>

          {isOpen ? (
            <>
              <label className="demand-picker__search">
                Buscar
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Ej: lavadora, lavavajillas..."
                />
              </label>

              {filteredTasks.length === 0 ? (
                <p className="empty-state">
                  No hay tareas a demanda que coincidan con esa busqueda.
                </p>
              ) : (
                <div className="demand-picker__list">
                  {filteredTasks.map((task) => {
                    const isCompleting = completingTaskId === task.id
                    const isDeleting = deletingTaskId === task.id

                    return (
                      <div className="demand-picker__item" key={task.id}>
                        <span>{task.name}</span>

                        <div className="demand-picker__actions">
                          {onDelete ? (
                            <button
                              type="button"
                              className="secondary-button danger-button"
                              onClick={() => onDelete(task)}
                              disabled={isCompleting || isDeleting}
                            >
                              {isDeleting ? 'Borrando...' : 'Borrar'}
                            </button>
                          ) : null}

                          <button
                            type="button"
                            className="demand-picker__complete"
                            onClick={() => onComplete(task)}
                            disabled={isCompleting || isDeleting}
                          >
                            {isCompleting ? 'Guardando...' : 'Hecha'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          ) : null}
        </div>
      )}
    </section>
  )
}

export default DemandTaskPicker
