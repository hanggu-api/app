importScripts("https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js");
importScripts("https://www.gstatic.com/firebasejs/8.10.0/firebase-messaging.js");

firebase.initializeApp({
  apiKey: "AIzaSyBtd21-6nzNuTAS5r-J033FT43Dg-hWgHw",
  authDomain: "service-f352b.firebaseapp.com",
  projectId: "service-f352b",
  storageBucket: "service-f352b.firebasestorage.app",
  messagingSenderId: "583722156328",
  appId: "1:583722156328:web:e1008a3b7cf90b76ea501d"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icons/Icon-192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
