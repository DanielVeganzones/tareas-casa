self.addEventListener('push', (event) => {
  if (!event.data) {
    return
  }

  const data = event.data.json()

  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Tareas del hogar', {
      body: data.body ?? '',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: data.tag,
      data: data.data,
    }),
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
