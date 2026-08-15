import { useState } from 'react'
import { getTodayDateKey } from '../lib/task-utils'

const DEFAULT_FORM = {
  name: '',
  taskKind: 'recurring',
  frequencyValue: '1',
  frequencyUnit: 'WEEK',
  firstDate: getTodayDateKey(),
}

function TaskForm({ onSubmit, onCancel, saving }) {
  const [formValues, setFormValues] = useState(DEFAULT_FORM)

  function updateField(field, value) {
    setFormValues((current) => ({
      ...current,
      [field]: value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const created = await onSubmit({
      ...formValues,
      frequencyValue: Number(formValues.frequencyValue),
    })

    if (created) {
      setFormValues(DEFAULT_FORM)
    }
  }

  const isRecurring = formValues.taskKind === 'recurring'

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <div className="section-heading">
        <div>
          <h2>Nueva tarea</h2>
          <p>Todo el hogar ve la misma lista.</p>
        </div>
      </div>

      <label>
        Nombre
        <input
          value={formValues.name}
          onChange={(event) => updateField('name', event.target.value)}
          placeholder="Ej: Limpiar baño"
          required
        />
      </label>

      <label>
        Tipo
        <div
          className="task-kind-toggle"
          role="radiogroup"
          aria-label="Tipo de tarea"
        >
          <button
            type="button"
            className={
              isRecurring
                ? 'task-kind-toggle__option is-active'
                : 'task-kind-toggle__option'
            }
            onClick={() => updateField('taskKind', 'recurring')}
          >
            Recurrente
          </button>

          <button
            type="button"
            className={
              !isRecurring
                ? 'task-kind-toggle__option is-active'
                : 'task-kind-toggle__option'
            }
            onClick={() => updateField('taskKind', 'oneoff')}
          >
            A demanda
          </button>
        </div>
      </label>

      {isRecurring ? (
        <>
          <label>
            Frecuencia
            <div className="frequency-grid">
              <input
                type="number"
                min="1"
                value={formValues.frequencyValue}
                onChange={(event) =>
                  updateField('frequencyValue', event.target.value)
                }
                required
              />

              <select
                value={formValues.frequencyUnit}
                onChange={(event) =>
                  updateField('frequencyUnit', event.target.value)
                }
              >
                <option value="DAY">días</option>
                <option value="WEEK">semanas</option>
                <option value="MONTH">meses</option>
                <option value="YEAR">años</option>
              </select>
            </div>
          </label>

          <label>
            Primera fecha prevista
            <input
              type="date"
              value={formValues.firstDate}
              onChange={(event) => updateField('firstDate', event.target.value)}
              required
            />
          </label>
        </>
      ) : (
        <p className="task-form__hint">
          Las tareas a demanda no tienen calendario ni frecuencia. Se
          quedan pendientes hasta que alguien las marque como hechas.
        </p>
      )}

      <div className="button-row">
        <button type="submit" disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar'}
        </button>

        <button
          type="button"
          className="secondary-button"
          onClick={onCancel}
          disabled={saving}
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}

export default TaskForm
