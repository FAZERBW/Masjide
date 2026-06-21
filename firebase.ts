/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, off } from 'firebase/database';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { Announcement } from '../types';

// Native Firebase SDK initialization configuration with standard credentials.
// Fully customizable via standard environment placeholders.
const firebaseConfig = {
  apiKey: "AIzaSyDummyKey_MasjideQubaDhuleFCMWebPush",
  authDomain: "masjid-e-quba-dhule.firebaseapp.com",
  databaseURL: "https://masjid-e-quba-dhule-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "masjid-e-quba-dhule",
  storageBucket: "masjid-e-quba-dhule.appspot.com",
  messagingSenderId: "18168817019",
  appId: "1:18168817019:web:dummyappid08123614"
};

// VAPID Public Key for Web Push Handshake
// Replace with actual VAPID key in production
const VAPID_KEY = "BIH7vNqA4SOf9-R6QxK93B-v9v0aX8Zq9f4l-3vOmS0O2_8u9s3pT8V9x2Z9M-R_8D7V8";

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Get Firebase Realtime Database
export const rtdb = getDatabase(app);

// Get Firebase Cloud Messaging (Safely wrap inside browser check as SSR doesn't have window)
export let messaging: Messaging | null = null;
try {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    messaging = getMessaging(app);
  }
} catch (e) {
  console.warn("Firebase Messaging could not be initialized in this browser context:", e);
}

/**
 * Sanitizes or hashes the FCM registration token to make it a valid Realtime Database key.
 * RTDB forbids characters like '.', '$', '#', '[', ']', and '/'
 */
export function hashTokenKey(token: string): string {
  try {
    // Elegant base64 encoding to guarantee path safety inside RTDB
    return btoa(token)
      .slice(-150) // Keep the unique ending segment
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/\./g, '_');
  } catch (e) {
    // Safe fallback sanitization
    return token.replace(/[\.\$\#\[\]\/]/g, '_');
  }
}

/**
 * Registers/synchronizes the retrieved FCM token to `/subscribed_users/[hashed_key]`
 */
export async function syncTokenToDatabase(token: string): Promise<void> {
  const hashedKey = hashTokenKey(token);
  const userRef = ref(rtdb, `subscribed_users/${hashedKey}`);

  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
  const platform = /Mobi|Android/i.test(userAgent) ? 'Android Mobile' : 'Web Desktop';

  await set(userRef, {
    token: token,
    platform: platform,
    timestamp: Date.now(),
    syncDate: new Date().toISOString()
  });

  console.log(`[FCM Sync] Token registered successfully under key: ${hashedKey}`);
}

/**
 * Initiates FCM Token Retrieval after permissions are validated.
 */
export async function setupFCMTokenHandshake(): Promise<string | null> {
  if (!messaging) {
    console.warn("[FCM Spec] Messaging is not active in this client.");
    return null;
  }

  try {
    // Retrieve the active token from browser service worker
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY
    });

    if (token) {
      await syncTokenToDatabase(token);
      return token;
    } else {
      console.warn("[FCM Spec] No registration token received from Messaging Service.");
      return null;
    }
  } catch (err) {
    console.error("[FCM Error] Handshake failed or is restricted inside iframes:", err);
    return null;
  }
}

/**
 * Subscribes to real-time additions, updates and removals on /announcements/list/ reference node.
 */
export function subscribeToAnnouncements(onUpdate: (announcements: Announcement[]) => void): () => void {
  const announcementsRef = ref(rtdb, 'announcements/list');

  const unsubscribe = onValue(announcementsRef, (snapshot) => {
    const list: Announcement[] = [];
    const data = snapshot.val();

    if (data) {
      Object.entries(data).forEach(([key, val]: any) => {
        list.push({
          id: val.id || key,
          title: val.title || 'Announcement',
          content: val.content || '',
          timestamp: val.timestamp || Date.now(),
          type: (val.type || 'info') as 'info' | 'alert' | 'event' | 'warning' | 'reminder' | 'update',
          schedule_time: val.schedule_time,
          valid_from: val.valid_from,
          valid_till: val.valid_till,
          imageUrl: val.imageUrl || val.image_url,
          image: val.image || val.image_url
        });
      });
    }

    // Order chronological (latest first)
    const sortedList = list.sort((a, b) => b.timestamp - a.timestamp);
    onUpdate(sortedList);
  }, (error) => {
    console.error("[RTDB Sync] Announcements fetch error:", error);
  });

  return () => {
    off(announcementsRef, 'value', unsubscribe);
  };
}

/**
 * Setup a foreground push receiver callback
 */
export function setupForegroundMessageListener(onMessageReceived: (payload: any) => void): () => void {
  if (!messaging) return () => {};

  return onMessage(messaging, (payload) => {
    console.log("[FCM Foreground] Received payload:", payload);
    onMessageReceived(payload);
  });
}
