/* Fóir owns delivery; this origin-owned worker only displays browser pushes. */
self.addEventListener('push', event => {
  let payload
  try { payload = event.data?.json() ?? {} } catch { payload = { body: event.data?.text() } }
  event.waitUntil(self.registration.showNotification(payload.title || 'Tilly', {
    body: payload.body, image: payload.image, tag: payload.category,
    data: { deepLink: payload.deepLink },
  }))
})
self.addEventListener('notificationclick', event => {
  event.notification.close()
  let destination = new URL('/feed', self.location.origin)
  try {
    const link = new URL(event.notification.data?.deepLink || '/feed', self.location.origin)
    if (link.origin === self.location.origin) destination = link
    else if (link.protocol === 'tilly:') {
      if (link.hostname === 'capture') destination.pathname = '/catch'
      else if (link.hostname === 'account') destination.pathname = '/account'
      else if (link.hostname === 'cat' && /^[a-z0-9]{10,40}$/.test(link.pathname.slice(1))) destination.pathname = `/cats/${link.pathname.slice(1)}`
    }
  } catch { /* Keep the same-origin feed fallback. */ }
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async windows => {
    const existing = windows.find(window => window.url === destination.href)
    if (existing) return existing.focus()
    return clients.openWindow(destination.href)
  }))
})
