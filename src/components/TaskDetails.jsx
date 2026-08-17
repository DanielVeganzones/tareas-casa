import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatDateTime } from '../lib/task-utils'

function TaskDetails({
  task,
  notes,
  checklistItems,
  onChange,
  currentUserId,
}) {
  const [activePanel, setActivePanel] = useState(null)
  const [noteBody, setNoteBody] = useState('')
  const [editingNoteId, setEditingNoteId] = useState(null)
  const [editingNoteBody, setEditingNoteBody] = useState('')
  const [checklistLabel, setChecklistLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const checkedCount = checklistItems.filter((item) => item.is_checked).length

  function togglePanel(panel) {
    setActivePanel((current) => (current === panel ? null : panel))
    setErrorMessage('')
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

  function addNote(event) {
    event.preventDefault()
    const body = noteBody.trim()

    if (!body) {
      return
    }

    runChange(async () => {
      const { error } = await supabase.from('task_notes').insert({
        task_id: task.id,
        body,
      })

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

  function startEditingNote(note) {
    setEditingNoteId(note.id)
    setEditingNoteBody(note.body)
    setErrorMessage('')
  }

  function cancelEditingNote() {
    setEditingNoteId(null)
    setEditingNoteBody('')
  }

  function saveNote(event, note) {
    event.preventDefault()
    const body = editingNoteBody.trim()

    if (!body) {
      return
    }

    runChange(async () => {
      const { error } = await supabase
        .from('task_notes')
        .update({ body, updated_at: new Date().toISOString() })
        .eq('id', note.id)

      if (error) {
        throw error
      }

      cancelEditingNote()
    })
  }

  function deleteNote(note) {
    const confirmed = window.confirm('¿Quieres borrar esta nota?')

    if (!confirmed) {
      return
    }

    runChange(async () => {
      const { error } = await supabase.from('task_notes').delete().eq('id', note.id)

      if (error) {
        throw error
      }

      if (editingNoteId === note.id) {
        cancelEditingNote()
      }
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
          Notas{notes.length > 0 ? ` (${notes.length})` : ''}
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
        <div className="task-details__panel">
          {notes.length === 0 ? (
            <p className="empty-state">Todavía no hay notas.</p>
          ) : (
            <div className="task-details__notes">
              {notes.map((note) => (
                <article className="task-details__note" key={note.id}>
                  {editingNoteId === note.id && note.created_by === currentUserId ? (
                    <form onSubmit={(event) => saveNote(event, note)}>
                      <textarea
                        value={editingNoteBody}
                        onChange={(event) => setEditingNoteBody(event.target.value)}
                        rows="3"
                        disabled={saving}
                      />
                      <div className="task-details__note-actions">
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={cancelEditingNote}
                          disabled={saving}
                        >
                          Cancelar
                        </button>
                        <button type="submit" disabled={saving || !editingNoteBody.trim()}>
                          Guardar
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <p>{note.body}</p>
                      <div className="task-details__note-footer">
                        <small>{formatDateTime(note.created_at)}</small>
                        {note.created_by === currentUserId ? (
                          <div className="task-details__note-actions">
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() => startEditingNote(note)}
                              disabled={saving}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="secondary-button danger-button"
                              onClick={() => deleteNote(note)}
                              disabled={saving}
                            >
                              Borrar
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </>
                  )}
                </article>
              ))}
            </div>
          )}

          <form className="task-details__form" onSubmit={addNote}>
            <label>
              Añadir nota
              <textarea
                value={noteBody}
                onChange={(event) => setNoteBody(event.target.value)}
                placeholder="Ej: usar el producto que queda en el armario"
                rows="3"
                disabled={saving}
              />
            </label>
            <button type="submit" disabled={saving || !noteBody.trim()}>
              Añadir nota
            </button>
          </form>
        </div>
      ) : null}

      {activePanel === 'checklist' ? (
        <div className="task-details__panel">
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

          <form className="task-details__form task-details__form--inline" onSubmit={addChecklistItem}>
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
        </div>
      ) : null}

      {errorMessage ? <p className="task-details__error">{errorMessage}</p> : null}
    </div>
  )
}

export default TaskDetails
