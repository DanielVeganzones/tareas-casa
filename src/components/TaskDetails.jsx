import { useState } from 'react'
import { supabase } from '../lib/supabase'

function TaskDetails({ task, notes, checklistItems, onChange }) {
  const [activePanel, setActivePanel] = useState(null)
  const [noteBody, setNoteBody] = useState('')
  const [checklistLabel, setChecklistLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const note = notes[0] ?? null
  const checkedCount = checklistItems.filter((item) => item.is_checked).length

  function togglePanel(panel) {
    setActivePanel((current) => (current === panel ? null : panel))
    setErrorMessage('')

    if (panel === 'notes') {
      setNoteBody(note?.body ?? '')
    }
  }

  async function runChange(operation) {
    setSaving(true)
    setErrorMessage('')

    try {
      await operation()
      await onChange()
    } catch (error) {
      setErrorMessage(error.message ?? 'No se pudo guardar el cambio.')
    } finally {
      setSaving(false)
    }
  }

  function saveNote(event) {
    event.preventDefault()
    const body = noteBody.trim()

    if (!body) {
      return
    }

    runChange(async () => {
      const { error } = await supabase.from('task_notes').upsert(
        {
          task_id: task.id,
          body,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'task_id' },
      )

      if (error) {
        throw error
      }
    })
  }

  function deleteNote() {
    if (!note || !window.confirm('¿Quieres borrar las notas de esta tarea?')) {
      return
    }

    runChange(async () => {
      const { error } = await supabase.from('task_notes').delete().eq('id', note.id)

      if (error) {
        throw error
      }

      setNoteBody('')
    })
  }

  function addChecklistItem(event) {
    event.preventDefault()
    const label = checklistLabel.trim()

    if (!label) {
      return
    }

    const nextSortOrder =
      Math.max(0, ...checklistItems.map((item) => item.sort_order)) + 10

    runChange(async () => {
      const { error } = await supabase.from('task_checklist_items').insert({
        task_id: task.id,
        label,
        sort_order: nextSortOrder,
      })

      if (error) {
        throw error
      }

      setChecklistLabel('')
    })
  }

  function toggleChecklistItem(item) {
    runChange(async () => {
      const { error } = await supabase
        .from('task_checklist_items')
        .update({
          is_checked: !item.is_checked,
          checked_at: item.is_checked ? null : new Date().toISOString(),
          checked_by: null,
        })
        .eq('id', item.id)

      if (error) {
        throw error
      }
    })
  }

  function deleteChecklistItem(item) {
    runChange(async () => {
      const { error } = await supabase
        .from('task_checklist_items')
        .delete()
        .eq('id', item.id)

      if (error) {
        throw error
      }
    })
  }

  return (
    <div className="task-details">
      <div className="task-details__toggles">
        <button
          type="button"
          className={
            activePanel === 'notes'
              ? 'secondary-button task-details__toggle is-active'
              : 'secondary-button task-details__toggle'
          }
          onClick={() => togglePanel('notes')}
        >
          Notas{note ? ' ·' : ''}
        </button>
        <button
          type="button"
          className={
            activePanel === 'checklist'
              ? 'secondary-button task-details__toggle is-active'
              : 'secondary-button task-details__toggle'
          }
          onClick={() => togglePanel('checklist')}
        >
          Checklist
          {checklistItems.length > 0
            ? ` (${checkedCount}/${checklistItems.length})`
            : ''}
        </button>
      </div>

      {activePanel === 'notes' ? (
        <form className="task-details__panel task-details__form" onSubmit={saveNote}>
          <label>
            Notas de la tarea
            <textarea
              value={noteBody}
              onChange={(event) => setNoteBody(event.target.value)}
              placeholder="Ej: usar el producto que queda en el armario"
              rows="4"
              disabled={saving}
            />
          </label>
          <div className="task-details__note-actions">
            {note ? (
              <button
                type="button"
                className="secondary-button danger-button"
                onClick={deleteNote}
                disabled={saving}
              >
                Borrar notas
              </button>
            ) : null}
            <button type="submit" disabled={saving || !noteBody.trim()}>
              Guardar notas
            </button>
          </div>
        </form>
      ) : null}

      {activePanel === 'checklist' ? (
        <div
          className="task-checklist-modal"
          role="dialog"
          aria-modal="true"
          aria-label={`Checklist de ${task.name}`}
        >
          <section className="task-checklist-modal__content">
            <header className="task-checklist-modal__header">
              <div>
                <p className="eyebrow">Checklist</p>
                <h2>{task.name}</h2>
              </div>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setActivePanel(null)}
              >
                ← Volver
              </button>
            </header>

            <div className="task-checklist-modal__list">
              {checklistItems.length === 0 ? (
                <p className="empty-state">Todavía no hay elementos en la lista.</p>
              ) : (
                <ul className="task-details__checklist">
                  {checklistItems.map((item) => (
                    <li key={item.id}>
                      <label className="task-details__check-item">
                        <input
                          type="checkbox"
                          checked={item.is_checked}
                          onChange={() => toggleChecklistItem(item)}
                          disabled={saving}
                        />
                        <span>{item.label}</span>
                      </label>
                      <button
                        type="button"
                        className="secondary-button danger-button task-details__delete"
                        onClick={() => deleteChecklistItem(item)}
                        disabled={saving}
                      >
                        Quitar
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <form
              className="task-details__form task-details__form--inline task-checklist-modal__form"
              onSubmit={addChecklistItem}
            >
              <label>
                Añadir a la lista
                <input
                  type="text"
                  value={checklistLabel}
                  onChange={(event) => setChecklistLabel(event.target.value)}
                  placeholder="Ej: arroz"
                  disabled={saving}
                />
              </label>
              <button type="submit" disabled={saving || !checklistLabel.trim()}>
                Añadir
              </button>
            </form>
          </section>
        </div>
      ) : null}

      {errorMessage ? <p className="task-details__error">{errorMessage}</p> : null}
    </div>
  )
}

export default TaskDetails
