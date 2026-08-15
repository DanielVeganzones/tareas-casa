import { useEffect, useMemo, useState } from 'react'
import {
  buildCalendarDays,
  formatDate,
  formatMonthLabel,
  frequencyText,
  getTaskStatusLabel,
  getTodayDateKey,
  shiftMonth,
} from '../lib/task-utils'

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function getDefaultSelectedDateKey(days, monthDate) {
  const todayKey = getTodayDateKey()
  const monthPrefix = `${monthDate.getFullYear()}-${String(
    monthDate.getMonth() + 1,
  ).padStart(2, '0')}`

  if (todayKey.startsWith(monthPrefix)) {
    return todayKey
  }

  const firstCurrentMonthDay = days.find((day) => day.isCurrentMonth)
  return firstCurrentMonthDay?.dateKey ?? days[0]?.dateKey ?? null
}

function CalendarView({ tasks }) {
  const [monthDate, setMonthDate] = useState(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1, 12)
  })
  const [selectedDateKey, setSelectedDateKey] = useState(null)

  const days = buildCalendarDays(monthDate, tasks)
  const selectedDay = useMemo(
    () => days.find((day) => day.dateKey === selectedDateKey) ?? null,
    [days, selectedDateKey],
  )

  useEffect(() => {
    const visible = days.some((day) => day.dateKey === selectedDateKey)

    if (!selectedDateKey || !visible) {
      setSelectedDateKey(getDefaultSelectedDateKey(days, monthDate))
    }
  }, [days, monthDate, selectedDateKey])

  function handleSelectDay(day) {
    if (!day.isCurrentMonth) {
      setMonthDate(
        new Date(
          Number(day.dateKey.slice(0, 4)),
          Number(day.dateKey.slice(5, 7)) - 1,
          1,
          12,
        ),
      )
    }

    setSelectedDateKey(day.dateKey)
  }

  return (
    <div className="page-stack">
      <section className="content-card">
        <div className="section-heading">
          <div>
            <h2>Calendario</h2>
            <p>Vista mensual limpia. Toca un día para ver el detalle.</p>
          </div>
        </div>

        <div className="calendar-toolbar">
          <button
            type="button"
            className="secondary-button"
            onClick={() => setMonthDate((current) => shiftMonth(current, -1))}
          >
            Anterior
          </button>

          <strong className="calendar-toolbar__label">
            {formatMonthLabel(monthDate)}
          </strong>

          <button
            type="button"
            className="secondary-button"
            onClick={() => setMonthDate((current) => shiftMonth(current, 1))}
          >
            Siguiente
          </button>
        </div>

        <div className="calendar-grid calendar-grid--head" aria-hidden="true">
          {WEEKDAYS.map((weekday) => (
            <span key={weekday} className="calendar-grid__weekday">
              {weekday}
            </span>
          ))}
        </div>

        <div className="calendar-grid">
          {days.map((day) => (
            <button
              type="button"
              key={day.dateKey}
              className={[
                'calendar-day',
                !day.isCurrentMonth ? 'calendar-day--muted' : '',
                day.dateKey === selectedDateKey
                  ? 'calendar-day--selected'
                  : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => handleSelectDay(day)}
            >
              <div className="calendar-day__header">
                <span
                  className={
                    day.isToday
                      ? 'calendar-day__number is-today'
                      : 'calendar-day__number'
                  }
                >
                  {day.dayNumber}
                </span>

                {day.tasks.length > 0 ? (
                  <span className="calendar-day__count">{day.tasks.length}</span>
                ) : null}
              </div>

              <div className="calendar-day__content">
                {day.tasks.length > 0 ? (
                  <>
                    <div className="calendar-day__dots" aria-hidden="true">
                      {day.tasks.slice(0, 3).map((task) => (
                        <span key={task.id} className="calendar-day__dot" />
                      ))}
                    </div>
                    <p className="calendar-day__summary">
                      {day.tasks.length === 1
                        ? '1 tarea'
                        : `${day.tasks.length} tareas`}
                    </p>
                  </>
                ) : day.isCurrentMonth ? (
                  <p className="calendar-day__summary">Sin tareas</p>
                ) : null}
              </div>
            </button>
          ))}
        </div>

        <section className="calendar-detail">
          <div className="section-heading">
            <div>
              <h2>
                {selectedDay
                  ? formatDate(selectedDay.dateKey, {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })
                  : 'Selecciona un día'}
              </h2>
              <p>
                {selectedDay?.tasks.length
                  ? 'Detalle de las tareas previstas para ese día.'
                  : 'Ese día no tiene tareas previstas.'}
              </p>
            </div>

            {selectedDay ? (
              <span className="counter-chip">{selectedDay.tasks.length}</span>
            ) : null}
          </div>

          {selectedDay?.tasks.length ? (
            <div className="calendar-detail__list">
              {selectedDay.tasks.map((task) => (
                <article className="calendar-detail__item" key={task.id}>
                  <div>
                    <strong>{task.name}</strong>
                    <p>{frequencyText(task)}</p>
                  </div>

                  <span className="history-item__badge">
                    {getTaskStatusLabel(task)}
                  </span>
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-state">No hay nada previsto para esta fecha.</p>
          )}
        </section>
      </section>
    </div>
  )
}

export default CalendarView
