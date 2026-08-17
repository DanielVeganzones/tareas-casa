import DemandTaskPicker from '../components/DemandTaskPicker'
import TaskForm from '../components/TaskForm'
import TaskSection from '../components/TaskSection'

function TasksView({
  tasks,
  demandTasks,
  showTaskForm,
  onOpenTaskForm,
  onCloseTaskForm,
  onCreateTask,
  onComplete,
  onMarkPending,
  onDeleteTask,
  completingTaskId,
  pendingTaskId,
  deletingTaskId,
  savingTask,
  taskDetailsById,
  onTaskDetailsChange,
  currentUserId,
}) {
  return (
    <div className="page-stack">
      <section className="content-card">
        <div className="section-heading">
          <div>
            <h2>Todas las tareas</h2>
            <p>La lista completa compartida por la casa.</p>
          </div>

          {!showTaskForm && (
            <button type="button" onClick={onOpenTaskForm}>
              Nueva tarea
            </button>
          )}
        </div>

        {showTaskForm ? (
          <TaskForm
            onSubmit={onCreateTask}
            onCancel={onCloseTaskForm}
            saving={savingTask}
          />
        ) : null}
      </section>

      <TaskSection
        title="Pendientes"
        description="Incluye las tareas recurrentes y puntuales pendientes."
        emptyText="Todavia no hay tareas pendientes."
        tasks={tasks}
        onComplete={onComplete}
        onDelete={onDeleteTask}
        completingTaskId={completingTaskId}
        deletingTaskId={deletingTaskId}
        taskDetailsById={taskDetailsById}
        onTaskDetailsChange={onTaskDetailsChange}
        currentUserId={currentUserId}
      />

      <DemandTaskPicker
        tasks={demandTasks}
        onComplete={onComplete}
        onMarkPending={onMarkPending}
        onDelete={onDeleteTask}
        completingTaskId={completingTaskId}
        pendingTaskId={pendingTaskId}
        deletingTaskId={deletingTaskId}
        title="Tareas a demanda"
        description="Márcalas como hechas o crea una pendiente para hoy."
      />
    </div>
  )
}

export default TasksView
