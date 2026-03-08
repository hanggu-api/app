importScripts("https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js");
importScripts("https://www.gstatic.com/firebasejs/8.10.0/firebase-messaging.js");

firebase.initializeApp({
  apiKey: "AIzaSyAOzSbKAwfmtQCQ4FLGVEb8vkK2ljDQpxs",
  authDomain: "cardapyia-service-2025.firebaseapp.com",
  projectId: "cardapyia-service-2025",
  storageBucket: "cardapyia-service-2025.firebasestorage.app",
  messagingSenderId: "478559853980",
  appId: "1:478559853980:web:8b4091e2236a5133cc7c59"
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
