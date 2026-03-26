importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyCsc6xD7mTAnSwPbz7iSGB9NjniFub97wY",
  authDomain: "promiand-app.firebaseapp.com",
  projectId: "promiand-app",
  storageBucket: "promiand-app.firebasestorage.app",
  messagingSenderId: "585556305161",
  appId: "1:585556305161:web:2752434736fd4a652c1fd8",
  measurementId: "G-E2SKN09Y6T"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || '약속의 땅';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/asset/logo.png',
    badge: '/asset/logo.png',
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});
