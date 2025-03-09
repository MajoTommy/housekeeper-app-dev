// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyC4d0byRJfbPc1kndWOzuRIyJ-IAzOrh5E",
    authDomain: "housekeeper-app-dev.firebaseapp.com",
    projectId: "housekeeper-app-dev",
    storageBucket: "housekeeper-app-dev.firestorage.app",
    messagingSenderId: "757133135733",
    appId: "1:757133135733:web:3c10f10618bb185f1c8d3c",
    measurementId: "G-LP4X8HV2X0"
  };
  
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  
  // Export Firebase services
  const auth = firebase.auth();
  
  // Only initialize Firestore and Storage if they exist
  const db = firebase.firestore ? firebase.firestore() : null;
  const storage = firebase.storage ? firebase.storage() : null;