// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyC4d0byRJfbPc1kndWOzuRIyJ-IAzOrh5E",
    authDomain: "housekeeper-app-dev.firebaseapp.com",
    projectId: "housekeeper-app-dev",
    storageBucket: "housekeeper-app-dev.appspot.com",
    messagingSenderId: "757133135733",
    appId: "1:757133135733:web:3c10f10618bb185f1c8d3c",
    measurementId: "G-LP4X8HV2X0"
  };
  
  // Initialize Firebase with error handling
  try {
    console.log("Initializing Firebase...");
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully");
    
    // Export Firebase services
    const auth = firebase.auth();
    console.log("Auth service initialized");
    
    // Only initialize Firestore and Storage if they exist
    const db = firebase.firestore ? firebase.firestore() : null;
    const storage = firebase.storage ? firebase.storage() : null;
    const functions = firebase.functions ? firebase.functions() : null;
    
    if (db) console.log("Firestore initialized");
    if (storage) console.log("Storage initialized");
    if (functions) {
        console.log("Functions initialized");
        window.firebaseFunctions = functions; // Expose globally
    }
  } catch (error) {
    console.error("Error initializing Firebase:", error);
    alert("There was an error initializing the app. Please check the console for details.");
  }