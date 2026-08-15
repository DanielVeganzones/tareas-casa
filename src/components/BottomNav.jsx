const NAV_ITEMS = [
  { id: 'today', label: 'Hoy' },
  { id: 'calendar', label: 'Calendario' },
  { id: 'tasks', label: 'Tareas' },
  { id: 'history', label: 'Historial' },
]

function BottomNav({ activeTab, onChange }) {
  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={
            item.id === activeTab
              ? 'bottom-nav__item is-active'
              : 'bottom-nav__item'
          }
          onClick={() => onChange(item.id)}
        >
          <span className="bottom-nav__dot" aria-hidden="true" />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  )
}

export default BottomNav
