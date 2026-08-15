import TaskCard from './TaskCard'

function TaskSection({
  title,
  description,
  emptyText,
  tasks,
  onComplete,
  onDelete,
  completingTaskId,
  deletingTaskId,
}) {
  return (
    <section className="content-card">
      <div className="section-heading">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        <span className="counter-chip">{tasks.length}</span>
      </div>

      {tasks.length === 0 ? (
        <p className="empty-state">{emptyText}</p>
      ) : (
        <div className="stack">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onComplete={onComplete}
              onDelete={onDelete}
              pending={completingTaskId === task.id}
              deleting={deletingTaskId === task.id}
            />
          ))}
        </div>
      )}
    </section>
  )
}

export default TaskSection
