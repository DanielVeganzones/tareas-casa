function AppHeader({ email, title, subtitle, onLogout, notificationControl }) {
  return (
    <header className="app-header">
      <div>
        <p className="eyebrow">Tareas compartidas</p>
        <h1>{title}</h1>
        <p className="app-header__subtitle">{subtitle}</p>
        <small>{email}</small>
      </div>

      <div className="app-header__actions">
        {notificationControl}
        <button
          type="button"
          className="secondary-button"
          onClick={onLogout}
        >
          Salir
        </button>
      </div>
    </header>
  )
}

export default AppHeader
