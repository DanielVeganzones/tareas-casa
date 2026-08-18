self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}

  const options = {
    body: data.body ?? '',
    tag: data.tag,
    data: data.data,
    requireInteraction: false,
  }

  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Tareas del hogar', options),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(
      (clients) => {
        const existingClient = clients.find((client) =>
          client.url.startsWith(self.location.origin),
        )

        return existingClient?.focus() ?? self.clients.openWindow('/')
      },
    ),
  )
})
