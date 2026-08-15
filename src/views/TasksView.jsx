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
  onDeleteTask,
  completingTaskId,
  deletingTaskId,
  savingTask,
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
        description="Incluye solo las tareas recurrentes pendientes."
        emptyText="Todavia no hay tareas recurrentes pendientes."
        tasks={tasks}
        onComplete={onComplete}
        onDelete={onDeleteTask}
        completingTaskId={completingTaskId}
        deletingTaskId={deletingTaskId}
      />

      <DemandTaskPicker
        tasks={demandTasks}
        onComplete={onComplete}
        onDelete={onDeleteTask}
        completingTaskId={completingTaskId}
        deletingTaskId={deletingTaskId}
        title="Tareas a demanda"
        description="No quedan pendientes: se registran cuando toca hacerlas."
      />
    </div>
  )
}

export default TasksView
