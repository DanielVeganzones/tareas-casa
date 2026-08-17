import { useEffect, useState } from 'react'
import {
  arePushNotificationsSupported,
  hasPushNotificationsSubscription,
  isPushNotificationSetupAvailable,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
} from '../lib/notifications'

function NotificationSettings({ session, householdId }) {
  const [status, setStatus] = useState(() => {
    if (!arePushNotificationsSupported()) {
      return 'unsupported'
    }

    return Notification.permission === 'denied' ? 'denied' : 'idle'
  })
  const [message, setMessage] = useState('')

  useEffect(() => {
    let isCurrent = true

    if (!isPushNotificationSetupAvailable() || !arePushNotificationsSupported()) {
      return undefined
    }

    hasPushNotificationsSubscription()
      .then((hasSubscription) => {
        if (isCurrent) {
          setStatus(hasSubscription ? 'enabled' : 'idle')
        }
      })
      .catch(() => {
        if (isCurrent) {
          setStatus('idle')
        }
      })

    return () => {
      isCurrent = false
    }
  }, [])

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

  async function handleDisable() {
    if (!session?.access_token || !householdId) {
      return
    }

    setStatus('saving')
    setMessage('')

    try {
      await unsubscribeFromPushNotifications({
        accessToken: session.access_token,
        householdId,
      })
      setStatus('idle')
      setMessage('Avisos desactivados en este dispositivo.')
    } catch (error) {
      setStatus('enabled')
      setMessage(error.message)
    }
  }

  if (!isPushNotificationSetupAvailable() || status === 'unsupported') {
    return null
  }

  return (
    <div className="notification-settings">
      <button
        type="button"
        className={`notification-bell ${
          status === 'enabled' ? 'is-enabled' : ''
        }`}
        onClick={status === 'enabled' ? handleDisable : handleEnable}
        disabled={status === 'saving' || status === 'denied'}
        aria-label={
          status === 'enabled'
            ? 'Desactivar avisos'
            : status === 'denied'
              ? 'Los avisos están bloqueados en el navegador'
              : 'Activar avisos'
        }
        aria-pressed={status === 'enabled'}
        title={
          status === 'enabled'
            ? 'Avisos activados: toca para desactivarlos'
            : status === 'denied'
              ? 'Avisos bloqueados en el navegador'
              : 'Activar avisos'
        }
      >
        <span aria-hidden="true">{status === 'enabled' ? '🔔' : '🔕'}</span>
      </button>

      {message ? (
        <span className="notification-settings__message" role="status">
          {message}
        </span>
      ) : null}
    </div>
  )
}

export default NotificationSettings
