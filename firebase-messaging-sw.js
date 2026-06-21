/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Import Firebase compat libraries into the SW environment
importScripts('https://www.gstatic.com/firebasejs/9.24.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.24.0/firebase-messaging-compat.js');

// Standard Firebase SDK configuration placeholder settings.
const firebaseConfig = {
  apiKey: "AIzaSyDummyKey_MasjideQubaDhuleFCMWebPush",
  authDomain: "masjid-e-quba-dhule.firebaseapp.com",
  databaseURL: "https://masjid-e-quba-dhule-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "masjid-e-quba-dhule",
  storageBucket: "masjid-e-quba-dhule.appspot.com",
  messagingSenderId: "18168817019",
  appId: "1:18168817019:web:dummyappid08123614"
};

// Initialize the Firebase app in the Service Worker context.
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging
const messaging = firebase.messaging();

/**
 * Validates operational window restrictions inside the background worker thread.
 * Checks if the current local time falls outside the provided daily bounded window.
 */
function isOutsideTimeBounds(validFrom, validTill) {
  if (!validFrom && !validTill) return false;
  try {
    const now = new Date();
    const currentMin = now.getHours() * 60 + now.getMinutes();

    let fromMin = 0;
    if (validFrom) {
      const parts = validFrom.split(':').map(Number);
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        fromMin = parts[0] * 60 + parts[1];
      }
    }

    let tillMin = 24 * 60;
    if (validTill) {
      const parts = validTill.split(':').map(Number);
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        tillMin = parts[0] * 60 + parts[1];
      }
    }

    if (fromMin > tillMin) {
      // Midnight wrap-around boundary check
      return currentMin < fromMin && currentMin > tillMin;
    } else {
      // Daytime standard boundary check
      return currentMin < fromMin || currentMin > tillMin;
    }
  } catch (err) {
    console.error('[firebase-messaging-sw.js] Error checking bounds:', err);
    return false;
  }
}

/**
 * Handle incoming background message packets.
 * Structural interception to force system-level drop-down alert on top notification panel tray.
 */
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background packet intercepted:', payload);

  // Parse temporal limits parameters from payload
  const validFrom = payload.data?.valid_from || payload.data?.validFrom;
  const validTill = payload.data?.valid_till || payload.data?.validTill;

  // Evaluate scheduling constraints if present in the packet payload
  if (isOutsideTimeBounds(validFrom, validTill)) {
    console.warn('[firebase-messaging-sw.js] Dropping background notification: system operating outside daily restrictions window', {
      validFrom,
      validTill
    });
    // Abort and silently drop the execution context
    return Promise.resolve();
  }

  // Parse structured data payload or notification payload
  const title = payload.notification?.title || payload.data?.title || "Masjid E Quba Hub Alert";
  const body = payload.notification?.body || payload.data?.body || payload.data?.content || "Tap to view latest announcements.";
  
  // Conditionally process graphic elements / imagery support
  const imageUrl = payload.notification?.image || payload.data?.image || payload.data?.imageUrl || payload.data?.image_url;
  
  // Build native display options
  const notificationOptions = {
    body: body,
    icon: '/logo.png', // Brand icon
    badge: '/favicon.ico', // Monochromatic status indicator badge
    image: imageUrl || undefined, // Rich graphics support
    requireInteraction: true, // Forces persistent drop-down until user acts
    tag: payload.data?.id || 'masjid_e_quba_announcement_broadcast', // Collapses duplicate alerts
    data: {
      url: payload.data?.click_action || payload.data?.url || '/',
      id: payload.data?.id
    },
    // High premium urgency structures for mobile / android tray priority mapping
    vibrate: [200, 100, 200],
    actions: [
      {
        action: 'open',
        title: 'Open App ✅'
      },
      {
        action: 'close',
        title: 'Dismiss'
      }
    ],
    // Under custom options specify metadata mappings
    metadata: {
      timestamp: Date.now(),
      urgency: 'high'
    }
  };

  return self.registration.showNotification(title, notificationOptions);
});

// Implement focus navigation to app upon clicking alert
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Look for existing tab and focus
        for (const client of clientList) {
          if (client.url && 'focus' in client) {
            return client.focus();
          }
        }
        // If no tab is open, launch a new window
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});
