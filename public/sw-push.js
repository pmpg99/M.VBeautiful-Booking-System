// Push Notification Service Worker for M.VBeautiful
self.addEventListener('push', function(event) {
  if (!event.data) {
    console.log('Push event but no data');
    return;
  }

  try {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'Nova notificação',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/',
        bookingId: data.bookingId
      },
      actions: data.actions || [],
      tag: data.tag || 'mvbeautiful-notification',
      renotify: true
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'M.VBeautiful', options)
    );
  } catch (error) {
    console.error('Error processing push notification:', error);
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        // Check if there's already a window/tab open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Handle subscription change
self.addEventListener('pushsubscriptionchange', function(event) {
  console.log('Push subscription changed');
  event.waitUntil(
    self.registration.pushManager.subscribe({ userVisibleOnly: true })
      .then(function(subscription) {
        console.log('New subscription:', subscription);
        // The main app should handle re-registering this subscription
      })
  );
});
