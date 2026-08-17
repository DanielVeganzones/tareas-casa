const publicNotificationsConfig =
  globalThis.__TAREAS_CASA_CONFIG__ ?? {}

const notificationsApiUrl = (
  import.meta.env.VITE_NOTIFICATIONS_API_URL ??
  publicNotificationsConfig.notificationsApiUrl
)?.replace(/\/$/, '')
const vapidPublicKey =
  import.meta.env.VITE_VAPID_PUBLIC_KEY ??
  publicNotificationsConfig.vapidPublicKey

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

async function sendNotificationsApiRequest(
  path,
  accessToken,
  body,
  method = 'POST',
) {
  const response = await fetch(`${notificationsApiUrl}${path}`, {
    method,
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

async function getPushSubscription() {
  const registration = await navigator.serviceWorker.getRegistration(
    '/service-worker.js',
  )

  return registration?.pushManager.getSubscription() ?? null
}

export async function hasPushNotificationsSubscription() {
  if (!arePushNotificationsSupported() || !isPushNotificationSetupAvailable()) {
    return false
  }

  return Boolean(await getPushSubscription())
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

  await navigator.serviceWorker.register('/service-worker.js')
  const registration = await navigator.serviceWorker.ready
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      applicationServerKey: base64urlToUint8Array(vapidPublicKey),
      userVisibleOnly: true,
    }))

  try {
    await sendNotificationsApiRequest('/subscriptions', accessToken, {
      householdId,
      subscription: subscription.toJSON(),
    })
  } catch (error) {
    await subscription.unsubscribe().catch(() => undefined)
    throw error
  }
}

export async function unsubscribeFromPushNotifications({
  accessToken,
  householdId,
}) {
  if (!isPushNotificationSetupAvailable()) {
    return
  }

  const subscription = await getPushSubscription()

  if (!subscription) {
    return
  }

  await sendNotificationsApiRequest(
    '/subscriptions',
    accessToken,
    { householdId, endpoint: subscription.endpoint },
    'DELETE',
  )
  await subscription.unsubscribe()
}

export async function notifyPendingDemandTask({
  accessToken,
  householdId,
  taskName,
}) {
  if (!isPushNotificationSetupAvailable()) {
    return
  }

  await sendNotificationsApiRequest('/notifications/pending', accessToken, {
    householdId,
    taskName,
  })
}

export async function notifyCompletedTask({
  accessToken,
  householdId,
  taskName,
}) {
  if (!isPushNotificationSetupAvailable()) {
    return
  }

  await sendNotificationsApiRequest('/notifications/completed', accessToken, {
    householdId,
    taskName,
  })
}
