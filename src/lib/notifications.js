import { supabase } from './supabase'

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

async function removeLocalPushSubscription() {
  const subscription = await getPushSubscription()

  if (subscription) {
    await subscription.unsubscribe().catch(() => undefined)
  }
}

export async function hasPushNotificationsSubscription({ householdId, userId } = {}) {
  if (!arePushNotificationsSupported() || !isPushNotificationSetupAvailable()) {
    return false
  }

  const subscription = await getPushSubscription()

  if (!subscription) {
    return false
  }

  if (!householdId || !userId) {
    return true
  }

  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('endpoint')
    .eq('household_id', householdId)
    .eq('user_id', userId)
    .eq('endpoint', subscription.endpoint)
    .maybeSingle()

  if (error || !data) {
    await removeLocalPushSubscription()
    return false
  }

  return true
}

export async function subscribeToPushNotifications({
  householdId,
  userId,
}) {
  if (!arePushNotificationsSupported()) {
    throw new Error('Este navegador no admite notificaciones push.')
  }

  if (!userId) {
    throw new Error('No se pudo identificar tu usuario.')
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
    const jsonSubscription = subscription.toJSON()
    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        household_id: householdId,
        user_id: userId,
        endpoint: jsonSubscription.endpoint,
        p256dh: jsonSubscription.keys.p256dh,
        auth: jsonSubscription.keys.auth,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' },
    )

    if (error) {
      throw new Error(error.message)
    }
  } catch (error) {
    await subscription.unsubscribe().catch(() => undefined)
    throw new Error(`No se pudo guardar la suscripción: ${error.message}`, {
      cause: error,
    })
  }
}

export async function unsubscribeFromPushNotifications({
  householdId,
  userId,
}) {
  if (!isPushNotificationSetupAvailable()) {
    return
  }

  const subscription = await getPushSubscription()

  if (!subscription) {
    return
  }

  if (userId && householdId) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('household_id', householdId)
      .eq('user_id', userId)
      .eq('endpoint', subscription.endpoint)
  }

  await subscription.unsubscribe().catch(() => undefined)
}

export async function notifyPendingDemandTask({
  accessToken,
  householdId,
  taskName,
}) {
  if (!isPushNotificationSetupAvailable()) {
    return
  }

  const subscription = await getPushSubscription()

  await sendNotificationsApiRequest('/notifications/pending', accessToken, {
    householdId,
    taskName,
    excludedEndpoint: subscription?.endpoint,
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

  const subscription = await getPushSubscription()

  await sendNotificationsApiRequest('/notifications/completed', accessToken, {
    householdId,
    taskName,
    excludedEndpoint: subscription?.endpoint,
  })
}
