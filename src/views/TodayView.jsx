import DemandTaskPicker from '../components/DemandTaskPicker'
import TaskSection from '../components/TaskSection'
import { getTodayTaskSections } from '../lib/task-utils'

function TodayView({
  tasks,
  demandTasks,
  onComplete,
  onMarkPending,
  completingTaskId,
  pendingTaskId,
  taskDetailsById,
  onTaskDetailsChange,
  currentUserId,
}) {
  const sections = getTodayTaskSections(tasks)
  const totalVisible =
    sections.overdue.length +
    sections.today.length +
    sections.available.length

  return (
    <div className="page-stack">
      <section className="hero-card">
        <p className="eyebrow">Resumen de hoy</p>
        <h2>{totalVisible} tareas disponibles</h2>
        <p>
          Aquí aparecen las vencidas, las que tocan hoy y las que ya
          están disponibles dentro del margen de adelanto.
        </p>
      </section>

      <DemandTaskPicker
        tasks={demandTasks}
        onComplete={onComplete}
        onMarkPending={onMarkPending}
        completingTaskId={completingTaskId}
        pendingTaskId={pendingTaskId}
        title="Registrar tarea a demanda"
        description="Elige una tarea del día a día y márcala cuando la acabes."
      />

      <TaskSection
        title="Vencidas"
        description="Lo que ya debería estar hecho."
        emptyText="No hay tareas vencidas."
        tasks={sections.overdue}
        onComplete={onComplete}
        completingTaskId={completingTaskId}
        taskDetailsById={taskDetailsById}
        onTaskDetailsChange={onTaskDetailsChange}
        currentUserId={currentUserId}
      />

      <TaskSection
        title="Tocan hoy"
        description="Conviene sacarlas hoy mismo."
        emptyText="Hoy no vence ninguna tarea."
        tasks={sections.today}
        onComplete={onComplete}
        completingTaskId={completingTaskId}
        taskDetailsById={taskDetailsById}
        onTaskDetailsChange={onTaskDetailsChange}
        currentUserId={currentUserId}
      />

      <TaskSection
        title="Ya se pueden adelantar"
        description="Entraron en la ventana de 1/3 de la frecuencia."
        emptyText="Todavía no hay tareas adelantables."
        tasks={sections.available}
        onComplete={onComplete}
        completingTaskId={completingTaskId}
        taskDetailsById={taskDetailsById}
        onTaskDetailsChange={onTaskDetailsChange}
        currentUserId={currentUserId}
      />
    </div>
  )
}

export default TodayView
