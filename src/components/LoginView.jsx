import { useState } from 'react'
import { supabase } from '../lib/supabase'

function LoginView() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function resolveEmail(identifierValue) {
    const normalizedValue = identifierValue.trim().toLowerCase()

    if (normalizedValue.includes('@')) {
      return normalizedValue
    }

    const { data, error } = await supabase.rpc(
      'get_login_email_by_username',
      {
        p_username: normalizedValue,
      },
    )

    if (error) {
      throw new Error(
        'Para entrar con nombre de usuario, ejecuta antes el SQL de migracion.',
      )
    }

    if (!data) {
      throw new Error('No existe ese nombre de usuario.')
    }

    return data
  }

  async function login(event) {
    event.preventDefault()
    setSubmitting(true)
    setMessage('')

    try {
      const email = await resolveEmail(identifier)
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setMessage(error.message)
      }
    } catch (error) {
      setMessage(error.message)
    }

    setSubmitting(false)
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="eyebrow">Casa</p>
        <h1>Tareas del hogar</h1>
        <p className="auth-card__copy">
          Todo es compartido: cualquiera puede ver, crear y completar
          tareas.
        </p>

        <form className="task-form" onSubmit={login}>
          <label>
            Usuario
            <input
              type="text"
              placeholder="tu-usuario"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              required
            />
          </label>

          <label>
            Contraseña
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          <button type="submit" disabled={submitting}>
            {submitting ? 'Entrando...' : 'Entrar'}
          </button>

          {message && <p className="feedback feedback--error">{message}</p>}
        </form>
      </section>
    </main>
  )
}

export default LoginView
