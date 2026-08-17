import { useState } from 'react'
import {
  arePushNotificationsSupported,
  isPushNotificationSetupAvailable,
  subscribeToPushNotifications,
} from '../lib/notifications'

function NotificationSettings({ session, householdId }) {
  const [status, setStatus] = useState(() => {
    if (!arePushNotificationsSupported()) {
      return 'unsupported'
    }

    return Notification.permission === 'denied' ? 'denied' : 'idle'
  })
  const [message, setMessage] = useState('')

  async function handleEnable() {
    if (!session?.access_token || !householdId) {
      return
    }

    setStatus('saving')
    setMessage('')

    try {
      await subscribeToPushNotifications({
        accessToken: session.access_token,
        householdId,
      })
      setStatus('enabled')
      setMessage('Avisos activados en este dispositivo.')
    } catch (error) {
      setStatus(Notification.permission === 'denied' ? 'denied' : 'idle')
      setMessage(error.message)
    }
  }

  if (!isPushNotificationSetupAvailable() || status === 'unsupported') {
    return null
  }

  return (
    <section className="notification-settings">
      <div>
        <strong>Recordatorios</strong>
        <p>Hoy a las 09:00 y mañana a las 22:00.</p>
      </div>

      {status === 'enabled' ? (
        <span className="notification-settings__status">Activados</span>
      ) : (
        <button
          type="button"
          className="secondary-button"
          onClick={handleEnable}
          disabled={status === 'saving' || status === 'denied'}
        >
          {status === 'saving'
            ? 'Activando...'
            : status === 'denied'
              ? 'Bloqueados'
              : 'Activar avisos'}
        </button>
      )}

      {message ? <p className="notification-settings__message">{message}</p> : null}
    </section>
  )
}

export default NotificationSettings
