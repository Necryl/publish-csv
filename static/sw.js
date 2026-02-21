/// <reference lib="webworker" />

self.addEventListener('push', (event) => {
	if (!event.data) return;

	let notification;
	try {
		notification = event.data.json();
	} catch {
		notification = {
			title: 'Notification',
			body: event.data.text()
		};
	}

	event.waitUntil(
		self.registration.showNotification(notification.title, {
			body: notification.body,
			badge: '/favicon.svg',
			data: notification.data || {}
		})
	);
});

self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	const urlToOpen = event.notification.data?.url || '/';
	event.waitUntil(
		clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
			for (let i = 0; i < clientList.length; i++) {
				const client = clientList[i];
				if (client.url === urlToOpen && 'focus' in client) {
					return client.focus();
				}
			}
			if (clients.openWindow) {
				return clients.openWindow(urlToOpen);
			}
		})
	);
});
