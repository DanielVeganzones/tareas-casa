const DAY_MS = 24 * 60 * 60 * 1000

export function startOfDay(date) {
  const nextDate = new Date(date)
  nextDate.setHours(0, 0, 0, 0)
  return nextDate
}

export function dateFromKey(dateKey) {
  return new Date(`${dateKey}T12:00:00`)
}

export function toDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getTodayDateKey() {
  return toDateKey(new Date())
}

export function formatDate(dateKey, options) {
  return dateFromKey(dateKey).toLocaleDateString(
    'es-ES',
    options ?? {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    },
  )
}

export function formatDateTime(dateString) {
  return new Date(dateString).toLocaleString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatMonthLabel(date) {
  return date.toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric',
  })
}

export function isRecurringTask(task) {
  return Boolean(
    task.frequency_unit &&
      task.frequency_value &&
      task.next_due_date,
  )
}

export function isDemandTask(task) {
  return Boolean(
    !task.frequency_unit &&
      !task.frequency_value &&
      !task.next_due_date,
  )
}

export function isScheduledOneOffTask(task) {
  return Boolean(
    !task.frequency_unit &&
      !task.frequency_value &&
      task.next_due_date,
  )
}

export function isOneOffTask(task) {
  return isDemandTask(task)
}

export function frequencyText(task) {
  if (!isRecurringTask(task)) {
    return 'Sin frecuencia'
  }

  const value = task.frequency_value

  const units = {
    DAY: value === 1 ? 'día' : 'días',
    WEEK: value === 1 ? 'semana' : 'semanas',
    MONTH: value === 1 ? 'mes' : 'meses',
    YEAR: value === 1 ? 'año' : 'años',
  }

  return `Cada ${value} ${units[task.frequency_unit]}`
}

export function getFrequencyInDays(task) {
  if (!isRecurringTask(task)) {
    return 0
  }

  switch (task.frequency_unit) {
    case 'DAY':
      return task.frequency_value
    case 'WEEK':
      return task.frequency_value * 7
    case 'MONTH':
      return task.frequency_value * 30
    case 'YEAR':
      return task.frequency_value * 365
    default:
      return 0
  }
}

function addTaskFrequency(date, task) {
  const nextDate = new Date(date)

  switch (task.frequency_unit) {
    case 'DAY':
      nextDate.setDate(nextDate.getDate() + task.frequency_value)
      break
    case 'WEEK':
      nextDate.setDate(nextDate.getDate() + 7 * task.frequency_value)
      break
    case 'MONTH':
      nextDate.setMonth(nextDate.getMonth() + task.frequency_value)
      break
    case 'YEAR':
      nextDate.setFullYear(nextDate.getFullYear() + task.frequency_value)
      break
    default:
      throw new Error('Unidad de frecuencia desconocida')
  }

  return nextDate
}

export function calculateNextDueDate(task, completedAt = new Date()) {
  if (!isRecurringTask(task)) {
    return null
  }

  const completionDate = startOfDay(completedAt)
  completionDate.setHours(12, 0, 0, 0)
  return toDateKey(addTaskFrequency(completionDate, task))
}

export function getTaskAvailability(task, referenceDate = new Date()) {
  if (isDemandTask(task)) {
    return {
      availableFrom: null,
      canComplete: true,
      daysUntilDue: null,
      dueDate: null,
      isAvailableEarly: false,
      isDueToday: false,
      isOneOff: true,
      isOverdue: false,
      maxAdvanceDays: null,
      status: 'oneoff',
    }
  }

  const today = startOfDay(referenceDate)
  const dueDate = startOfDay(dateFromKey(task.next_due_date))

  if (isScheduledOneOffTask(task)) {
    const isOverdue = dueDate < today
    const isDueToday = dueDate.getTime() === today.getTime()

    return {
      availableFrom: task.next_due_date,
      canComplete: today >= dueDate,
      daysUntilDue: Math.ceil((dueDate - today) / DAY_MS),
      dueDate,
      isAvailableEarly: false,
      isDueToday,
      isOneOff: false,
      isOverdue,
      maxAdvanceDays: null,
      status: isOverdue ? 'overdue' : isDueToday ? 'today' : 'locked',
    }
  }

  const frequencyDays = getFrequencyInDays(task)
  const maxAdvanceDays = Math.max(1, Math.ceil(frequencyDays / 3))

  const availableFromDate = new Date(dueDate)
  availableFromDate.setDate(availableFromDate.getDate() - maxAdvanceDays)

  const daysUntilDue = Math.ceil((dueDate - today) / DAY_MS)
  const isOverdue = dueDate < today
  const isDueToday = dueDate.getTime() === today.getTime()
  const canComplete = today >= availableFromDate
  const isAvailableEarly =
    canComplete && !isOverdue && !isDueToday

  let status = 'locked'

  if (isOverdue) {
    status = 'overdue'
  } else if (isDueToday) {
    status = 'today'
  } else if (isAvailableEarly) {
    status = 'available'
  }

  return {
    availableFrom: toDateKey(availableFromDate),
    canComplete,
    daysUntilDue,
    dueDate,
    isAvailableEarly,
    isDueToday,
    isOneOff: false,
    isOverdue,
    maxAdvanceDays,
    status,
  }
}

export function getTodayTaskSections(tasks, referenceDate = new Date()) {
  const sections = {
    overdue: [],
    today: [],
    available: [],
  }

  tasks.forEach((task) => {
    const availability = getTaskAvailability(task, referenceDate)

    if (availability.isOneOff) {
      return
    }

    if (availability.isOverdue) {
      sections.overdue.push(task)
      return
    }

    if (availability.isDueToday) {
      sections.today.push(task)
      return
    }

    if (availability.isAvailableEarly) {
      sections.available.push(task)
    }
  })

  return sections
}

export function shiftMonth(date, delta) {
  const nextDate = new Date(date)
  nextDate.setMonth(nextDate.getMonth() + delta)
  return nextDate
}

export function buildCalendarDays(monthDate, tasks) {
  const visibleMonth = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth(),
    1,
    12,
    0,
    0,
    0,
  )
  const monthKeyPrefix = `${visibleMonth.getFullYear()}-${String(
    visibleMonth.getMonth() + 1,
  ).padStart(2, '0')}`
  const todayKey = getTodayDateKey()
  const tasksByDay = new Map()

  tasks.forEach((task) => {
    if (!task.next_due_date) {
      return
    }

    if (!task.next_due_date.startsWith(monthKeyPrefix)) {
      return
    }

    const currentTasks = tasksByDay.get(task.next_due_date) ?? []
    currentTasks.push(task)
    tasksByDay.set(task.next_due_date, currentTasks)
  })

  const firstWeekday = (visibleMonth.getDay() + 6) % 7
  const gridStart = new Date(visibleMonth)
  gridStart.setDate(gridStart.getDate() - firstWeekday)

  return Array.from({ length: 42 }, (_, index) => {
    const cellDate = new Date(gridStart)
    cellDate.setDate(gridStart.getDate() + index)

    const dateKey = toDateKey(cellDate)

    return {
      dateKey,
      dayNumber: cellDate.getDate(),
      isCurrentMonth: cellDate.getMonth() === visibleMonth.getMonth(),
      isToday: dateKey === todayKey,
      tasks: tasksByDay.get(dateKey) ?? [],
    }
  })
}

export function getTaskStatusLabel(task) {
  const availability = getTaskAvailability(task)

  switch (availability.status) {
    case 'oneoff':
      return 'A demanda'
    case 'overdue':
      return 'Vencida'
    case 'today':
      return 'Hoy'
    case 'available':
      return 'En margen'
    default:
      return 'Pendiente'
  }
}
