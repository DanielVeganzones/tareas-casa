import { useEffect, useMemo, useState } from 'react'
import './App.css'
import AppHeader from './components/AppHeader'
import BottomNav from './components/BottomNav'
import CompletionContextCard from './components/CompletionContextCard'
import LoginView from './components/LoginView'
import NotificationSettings from './components/NotificationSettings'
import { supabase } from './lib/supabase'
import {
  notifyCompletedTask,
  notifyPendingDemandTask,
} from './lib/notifications'
import {
  calculateNextDueDate,
  getTaskAvailability,
  getTodayDateKey,
  isOneOffTask,
  isScheduledOneOffTask,
  toDateKey,
} from './lib/task-utils'
import CalendarView from './views/CalendarView'
import HistoryView from './views/HistoryView'
import TasksView from './views/TasksView'
import TodayView from './views/TodayView'

const TAB_META = {
  today: {
    title: 'Hoy',
    subtitle: 'Lo urgente y lo que ya puedes adelantar.',
  },
  calendar: {
    title: 'Calendario',
    subtitle: 'Una vista mensual sencilla de próximas fechas.',
  },
  tasks: {
    title: 'Tareas',
    subtitle: 'Todas las tareas compartidas y creación de nuevas.',
  },
  history: {
    title: 'Historial',
    subtitle: 'Quién hizo qué y cuándo.',
  },
}

function getMemberName(member) {
  if (!member) {
    return null
  }

  return (
    member.username ??
    member.display_name ??
    member.full_name ??
    member.name ??
    member.nickname ??
    member.email ??
    null
  )
}

function shortUserId(userId) {
  if (!userId) {
    return 'Usuario desconocido'
  }

  return `Usuario ${userId.slice(0, 8)}`
}

function App() {
  const [session, setSession] = useState(null)
  const [householdId, setHouseholdId] = useState(null)
  const [tasks, setTasks] = useState([])
  const [history, setHistory] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [activeTab, setActiveTab] = useState('today')
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [savingTask, setSavingTask] = useState(false)
  const [completingTaskId, setCompletingTaskId] = useState(null)
  const [markingPendingTaskId, setMarkingPendingTaskId] = useState(null)
  const [deletingTaskId, setDeletingTaskId] = useState(null)
  const [undoingCompletionId, setUndoingCompletionId] = useState(null)
  const [selectedCompleterId, setSelectedCompleterId] = useState(null)

  const activeTasks = useMemo(
    () => tasks.filter((task) => task.active !== false),
    [tasks],
  )
  const recurringTasks = useMemo(
    () => activeTasks.filter((task) => !isOneOffTask(task)),
    [activeTasks],
  )
  const demandTasks = useMemo(
    () => activeTasks.filter((task) => isOneOffTask(task)),
    [activeTasks],
  )
  const tasksById = useMemo(
    () => new Map(tasks.map((task) => [task.id, task])),
    [tasks],
  )
  const membersById = useMemo(
    () => new Map(members.map((member) => [member.user_id, member])),
    [members],
  )
  const undoableCompletionIds = useMemo(() => {
    const latestActiveByTask = new Map()
    const todayKey = getTodayDateKey()

    history.forEach((completion) => {
      if (completion.reverted_at) {
        return
      }

      if (!latestActiveByTask.has(completion.task_id)) {
        latestActiveByTask.set(completion.task_id, completion)
      }
    })

    const ids = new Set()

    latestActiveByTask.forEach((completion, taskId) => {
      const task = tasksById.get(taskId)
      const completionDayKey = completion.completed_at
        ? toDateKey(new Date(completion.completed_at))
        : null

      if (
        task &&
        completion.previous_due_date &&
        completion.resulting_due_date &&
        completionDayKey === todayKey &&
        task.next_due_date === completion.resulting_due_date
      ) {
        ids.add(completion.id)
      }
    })

    return ids
  }, [history, tasksById])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) {
      setHouseholdId(null)
      setTasks([])
      setHistory([])
      setMembers([])
      setSelectedCompleterId(null)
      setLoading(false)
      return
    }

    loadInitialData(session.user.id)
  }, [session])

  useEffect(() => {
    if (!session) {
      return
    }

    if (!selectedCompleterId) {
      setSelectedCompleterId(session.user.id)
      return
    }

    if (members.length > 0) {
      const exists = members.some(
        (member) => member.user_id === selectedCompleterId,
      )

      if (!exists) {
        setSelectedCompleterId(session.user.id)
      }
    }
  }, [members, selectedCompleterId, session])

  async function loadInitialData(userId) {
    setLoading(true)
    setErrorMessage('')

    try {
      const membership = await loadMembership(userId)
      setHouseholdId(membership.household_id)

      const nextTasks = await loadTasks(membership.household_id)
      const [nextHistory, nextMembers] = await Promise.all([
        loadHistory(nextTasks.map((task) => task.id)),
        loadMembers(membership.household_id, membership),
      ])

      setTasks(nextTasks)
      setHistory(nextHistory)
      setMembers(nextMembers)
    } catch (error) {
      console.error(error)
      setErrorMessage(error.message ?? 'No se pudieron cargar los datos.')
    } finally {
      setLoading(false)
    }
  }

  async function loadMembership(userId) {
    const { data, error } = await supabase
      .from('household_members')
      .select('*')
      .eq('user_id', userId)
      .limit(1)
      .single()

    if (error) {
      throw error
    }

    return data
  }

  async function loadTasks(nextHouseholdId) {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('household_id', nextHouseholdId)
      .order('active', { ascending: false })
      .order('next_due_date', { ascending: true })

    if (error) {
      throw error
    }

    return data ?? []
  }

  async function loadHistory(taskIds) {
    if (taskIds.length === 0) {
      return []
    }

    const detailedQuery = await supabase
      .from('task_completions')
      .select(
        'id, task_id, completed_by, completed_at, previous_due_date, resulting_due_date, reverted_at, reverted_by',
      )
      .in('task_id', taskIds)
      .order('completed_at', { ascending: false })

    if (!detailedQuery.error) {
      return detailedQuery.data ?? []
    }

    const withDateQuery = await supabase
      .from('task_completions')
      .select('id, task_id, completed_by, completed_at')
      .in('task_id', taskIds)
      .order('completed_at', { ascending: false })

    if (!withDateQuery.error) {
      return withDateQuery.data ?? []
    }

    const legacyQuery = await supabase
      .from('task_completions')
      .select('id, task_id, completed_by')
      .in('task_id', taskIds)

    if (legacyQuery.error) {
      throw detailedQuery.error
    }

    return legacyQuery.data ?? []
  }

  async function loadMembers(nextHouseholdId, ownMembership) {
    const rpcResult = await supabase.rpc(
      'list_household_members_for_current_user',
    )

    if (!rpcResult.error && rpcResult.data?.length) {
      return rpcResult.data
    }

    const { data, error } = await supabase
      .from('household_members')
      .select('*')
      .eq('household_id', nextHouseholdId)

    if (error) {
      console.warn(
        'No se pudo cargar el directorio completo de miembros.',
        error,
      )
      return [ownMembership]
    }

    return data?.length ? data : [ownMembership]
  }

  async function refreshHouseholdData() {
    if (!householdId) {
      return
    }

    const nextTasks = await loadTasks(householdId)
    const nextHistory = await loadHistory(nextTasks.map((task) => task.id))

    setTasks(nextTasks)
    setHistory(nextHistory)
  }

  async function handleCreateTask(formValues) {
    if (!householdId || !formValues.name.trim()) {
      return false
    }

    setSavingTask(true)
    setErrorMessage('')

    const isRecurring = formValues.taskKind === 'recurring'

    const { error } = await supabase.from('tasks').insert({
      household_id: householdId,
      name: formValues.name.trim(),
      frequency_value: isRecurring
        ? Number(formValues.frequencyValue)
        : null,
      frequency_unit: isRecurring ? formValues.frequencyUnit : null,
      next_due_date: isRecurring ? formValues.firstDate : null,
      active: true,
    })

    if (error) {
      const requiresSchemaRelaxation =
        !isRecurring &&
        (error.message?.includes('null value') ||
          error.message?.includes('violates not-null constraint'))

      setErrorMessage(
        requiresSchemaRelaxation
          ? 'Para usar tareas a demanda, hay que permitir frecuencia y fecha nulas en la tabla tasks. Te dejo el SQL al final.'
          : error.message,
      )
      setSavingTask(false)
      return false
    }

    await refreshHouseholdData()
    setSavingTask(false)
    setShowTaskForm(false)
    return true
  }

  async function handleCompleteTask(task) {
    if (!session) {
      return
    }

    const availability = getTaskAvailability(task)

    if (!availability.canComplete) {
      setErrorMessage('Esta tarea todavía no está dentro del margen permitido.')
      return
    }

    setCompletingTaskId(task.id)
    setErrorMessage('')
    const completedAt = new Date().toISOString()
    const completedBy = selectedCompleterId ?? session.user.id
    const nextDate = calculateNextDueDate(task, new Date(completedAt))

    const detailedInsert = await supabase
      .from('task_completions')
      .insert({
        task_id: task.id,
        completed_by: completedBy,
        completed_at: completedAt,
        previous_due_date: task.next_due_date ?? null,
        resulting_due_date: nextDate,
      })

    let completionError = detailedInsert.error

    if (completionError) {
      const datedInsert = await supabase.from('task_completions').insert({
        task_id: task.id,
        completed_by: completedBy,
        completed_at: completedAt,
      })

      completionError = datedInsert.error
    }

    if (completionError) {
      const legacyInsert = await supabase.from('task_completions').insert({
        task_id: task.id,
        completed_by: completedBy,
      })

      completionError = legacyInsert.error
    }

    if (completionError) {
      setErrorMessage(completionError.message)
      setCompletingTaskId(null)
      return
    }

    if (isScheduledOneOffTask(task)) {
      const { error: archiveError } = await supabase
        .from('tasks')
        .update({ active: false })
        .eq('id', task.id)

      if (archiveError) {
        setErrorMessage(archiveError.message)
        setCompletingTaskId(null)
        return
      }
    } else if (!isOneOffTask(task)) {
      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          next_due_date: nextDate,
        })
        .eq('id', task.id)

      if (updateError) {
        setErrorMessage(updateError.message)
        setCompletingTaskId(null)
        return
      }
    }

    await refreshHouseholdData()

    notifyCompletedTask({
      accessToken: session?.access_token,
      householdId,
      taskName: task.name,
    }).catch((error) => {
      console.warn('No se pudo enviar el aviso de tarea completada.', error)
    })

    setCompletingTaskId(null)
  }

  async function handleMarkDemandTaskPending(task) {
    if (!householdId) {
      return
    }

    setMarkingPendingTaskId(task.id)
    setErrorMessage('')

    const { error } = await supabase.from('tasks').insert({
      household_id: householdId,
      name: task.name,
      frequency_value: null,
      frequency_unit: null,
      next_due_date: getTodayDateKey(),
      active: true,
    })

    if (error) {
      setErrorMessage(error.message)
      setMarkingPendingTaskId(null)
      return
    }

    await refreshHouseholdData()

    notifyPendingDemandTask({
      accessToken: session?.access_token,
      householdId,
      taskName: task.name,
    }).catch((error) => {
      console.warn('No se pudo enviar el aviso de tarea pendiente.', error)
    })

    setMarkingPendingTaskId(null)
  }

  async function handleUndoCompletion(completion) {
    setUndoingCompletionId(completion.id)
    setErrorMessage('')

    const { data, error } = await supabase.rpc('undo_task_completion', {
      p_completion_id: completion.id,
    })

    if (error) {
      setErrorMessage(
        'Para usar deshacer, ejecuta primero el SQL de migracion que te voy a dejar.',
      )
      setUndoingCompletionId(null)
      return
    }

    if (data === false) {
      setErrorMessage('No se pudo deshacer este completado.')
      setUndoingCompletionId(null)
      return
    }

    await refreshHouseholdData()
    setUndoingCompletionId(null)
  }

  async function handleDeleteTask(task) {
    const confirmed = window.confirm(
      `¿Seguro que quieres borrar "${task.name}"?`,
    )

    if (!confirmed) {
      return
    }

    setDeletingTaskId(task.id)
    setErrorMessage('')

    const { error } = await supabase
      .from('tasks')
      .update({ active: false })
      .eq('id', task.id)

    if (error) {
      setErrorMessage(error.message)
      setDeletingTaskId(null)
      return
    }

    await refreshHouseholdData()
    setDeletingTaskId(null)
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  function resolveMemberLabel(userId) {
    const memberName = getMemberName(membersById.get(userId))
    if (memberName) {
      return userId === session?.user.id ? `${memberName} (tú)` : memberName
    }

    return userId === session?.user.id ? 'Tú' : shortUserId(userId)
  }

  if (!session) {
    return <LoginView />
  }

  if (loading) {
    return (
      <main className="app-shell">
        <section className="content-card">
          <h1>Cargando...</h1>
          <p>Preparando las tareas del hogar.</p>
        </section>
      </main>
    )
  }

  const tabMeta = TAB_META[activeTab]
  const currentUserLabel =
    getMemberName(membersById.get(session.user.id)) ?? session.user.email

  return (
    <>
      <main className="app-shell">
        <AppHeader
          email={currentUserLabel}
          title={tabMeta.title}
          subtitle={tabMeta.subtitle}
          onLogout={logout}
        />

        {errorMessage && (
          <p className="feedback feedback--error">{errorMessage}</p>
        )}

        <CompletionContextCard
          members={members}
          selectedCompleterId={selectedCompleterId ?? session.user.id}
          onChange={setSelectedCompleterId}
          resolveMemberLabel={resolveMemberLabel}
        />

        <NotificationSettings session={session} householdId={householdId} />

        {activeTab === 'today' && (
          <TodayView
            tasks={recurringTasks}
            demandTasks={demandTasks}
            onComplete={handleCompleteTask}
            onMarkPending={handleMarkDemandTaskPending}
            completingTaskId={completingTaskId}
            pendingTaskId={markingPendingTaskId}
          />
        )}

        {activeTab === 'calendar' && <CalendarView tasks={recurringTasks} />}

        {activeTab === 'tasks' && (
          <TasksView
            tasks={recurringTasks}
            demandTasks={demandTasks}
            showTaskForm={showTaskForm}
            onOpenTaskForm={() => setShowTaskForm(true)}
            onCloseTaskForm={() => setShowTaskForm(false)}
            onCreateTask={handleCreateTask}
            onComplete={handleCompleteTask}
            onMarkPending={handleMarkDemandTaskPending}
            onDeleteTask={handleDeleteTask}
            completingTaskId={completingTaskId}
            pendingTaskId={markingPendingTaskId}
            deletingTaskId={deletingTaskId}
            savingTask={savingTask}
          />
        )}

        {activeTab === 'history' && (
          <HistoryView
            history={history}
            tasksById={tasksById}
            resolveMemberLabel={resolveMemberLabel}
            canUndoCompletion={(completion) =>
              undoableCompletionIds.has(completion.id)
            }
            onUndoCompletion={handleUndoCompletion}
            undoingCompletionId={undoingCompletionId}
          />
        )}
      </main>

      <BottomNav activeTab={activeTab} onChange={setActiveTab} />
    </>
  )
}

export default App
