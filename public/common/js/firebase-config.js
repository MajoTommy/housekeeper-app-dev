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
    
    // --- Connect to Emulators if running locally ---
    /* // Intentionally commented out to use LIVE Firebase backend
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
        console.log("Detected local environment, connecting emulators...");
        
        // Connect Functions Emulator (Using NEW port 5002)
        if (functions) {
            console.log("Connecting Functions SDK to emulator on port 5002");
            functions.useEmulator("localhost", 5002);
        } else {
            console.warn("Functions service not available for emulator connection.");
        }
        
        // Connect Auth Emulator (Using NEW port 9100)
        if (auth) {
            console.log("Connecting Auth SDK to emulator on port 9100");
            auth.useEmulator('http://localhost:9100'); // UPDATED PORT
        } else {
             console.warn("Auth service not available for emulator connection.");
        }

        // Connect Firestore Emulator (Using NEW port 8081)
        if (db) {
            console.log("Connecting Firestore SDK to emulator on port 8081");
            db.useEmulator('localhost', 8081); // UPDATED PORT
        } else {
             console.warn("Firestore service not available for emulator connection.");
        }
        // Add Storage emulator connection here if needed
    }
    */
    // --- End Emulator Connection ---

    if (db) console.log("Firestore initialized");
    if (storage) console.log("Storage initialized");
    if (functions) { // Ensure functions is still exposed globally AFTER potential emulator connection
        console.log("Functions initialized (emulator connection attempted if local)");
        window.firebaseFunctions = functions; 
    }
  } catch (error) {
    console.error("Error initializing Firebase:", error);
    alert("There was an error initializing the app. Please check the console for details.");
  }