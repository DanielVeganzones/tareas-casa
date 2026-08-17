const notificationsApiUrl = import.meta.env.VITE_NOTIFICATIONS_API_URL?.replace(
  /\/$/,
  '',
)
const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY

function base64urlToUint8Array(base64url) {
  const padded = base64url + '='.repeat((4 - (base64url.length % 4)) % 4)
  const binary = atob(padded.replace(/-/g, '+').replace(/_/g, '/'))
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}

export function arePushNotificationsSupported() {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'PushManager' in window &&
    'serviceWorker' in navigator
  )
}

export function isPushNotificationSetupAvailable() {
  return Boolean(notificationsApiUrl && vapidPublicKey)
}

async function postToNotificationsApi(path, accessToken, body) {
  const response = await fetch(`${notificationsApiUrl}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new Error(payload?.error ?? 'No se pudo configurar la notificación.')
  }
}

export async function subscribeToPushNotifications({
  accessToken,
  householdId,
}) {
  if (!arePushNotificationsSupported()) {
    throw new Error('Este navegador no admite notificaciones push.')
  }

  if (!isPushNotificationSetupAvailable()) {
    throw new Error('Las notificaciones todavía no están configuradas.')
  }

  const permission = await Notification.requestPermission()

  if (permission !== 'granted') {
    throw new Error('No has permitido las notificaciones en este dispositivo.')
  }

  const registration = await navigator.serviceWorker.register('/service-worker.js')
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      applicationServerKey: base64urlToUint8Array(vapidPublicKey),
      userVisibleOnly: true,
    }))

  await postToNotificationsApi('/subscriptions', accessToken, {
    householdId,
    subscription: subscription.toJSON(),
  })
}

export async function notifyPendingDemandTask({
  accessToken,
  householdId,
  taskName,
}) {
  if (!isPushNotificationSetupAvailable()) {
    return
  }

  await postToNotificationsApi('/notifications/pending', accessToken, {
    householdId,
    taskName,
  })
}
