// ---------- Push notifications via Firebase Cloud Messaging ----------
// This file does nothing until you:
//   1. Create a free Firebase project (console.firebase.google.com)
//   2. Add a Web App inside it, copy the config object it gives you
//   3. Enable Cloud Messaging, generate a "Web Push certificate" (VAPID key)
//   4. Paste both below, replacing the placeholders
//   5. Uncomment the <script> tags for this file and the Firebase SDKs in each HTML page's <head>
//
// Until then, this file is safe to leave in place — it simply won't activate.

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAbXBgFYSxpJ7Rg9AwapH2UQ4nBpuWuTmk",
  authDomain: "abebuy-179ec.firebaseapp.com",
  projectId: "abebuy-179ec",
  storageBucket: "abebuy-179ec.firebasestorage.app",
  messagingSenderId: "739115474396",
  appId: "1:739115474396:web:42bc0bbbd9437fc7fe0319"
};
const FIREBASE_VAPID_KEY = "BLy50ToHSzkj-461GT4EgiE8V8eB9a1elTAo50SAuCelvxgKH_kFIwTXJUa5Y4XPyos3JsQcMoz3ZCfuGa6gcL8";

function initPush(){
  if (FIREBASE_VAPID_KEY === "REPLACE_ME") {
    console.info('Push notifications: VAPID key not configured yet.');
    return;
  }
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return;

  firebase.initializeApp(FIREBASE_CONFIG);
  const messaging = firebase.messaging();

  const btn = document.getElementById('enable-push-btn');
  if (btn) {
    btn.style.display = 'inline-flex';
    btn.addEventListener('click', () => {
      Notification.requestPermission().then((permission) => {
        if (permission !== 'granted') return;
        messaging.getToken({ vapidKey: FIREBASE_VAPID_KEY }).then((token) => {
          // Send this token to your backend / Firestore so you can target this device later.
          console.log('FCM token:', token);
          btn.textContent = 'Notifications activées ✓';
          btn.disabled = true;
        }).catch((err) => console.warn('FCM token error:', err));
      });
    });
  }

  // Foreground messages (app open in a tab)
  messaging.onMessage((payload) => {
    if (Notification.permission === 'granted') {
      new Notification(payload.notification?.title || 'Adebuy', {
        body: payload.notification?.body || '',
        icon: 'assets/icon-192.png'
      });
    }
  });
}

document.addEventListener('DOMContentLoaded', initPush);
