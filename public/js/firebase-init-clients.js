// Firebase initialization for clients page
document.addEventListener('DOMContentLoaded', function() {
    console.log('Firebase initialization for clients page');
    
    // Check if Firebase is already initialized
    if (firebase.apps && firebase.apps.length > 0) {
        console.log('Firebase is already initialized, skipping initialization');
        
        // Make sure Firestore is available
        if (!firebase.firestore) {
            console.error('Firestore is not available even though Firebase is initialized');
            showErrorMessage('Firestore database is not available. Please check your internet connection and try again.');
            return;
        }
        
        console.log('Firestore is available, proceeding with client initialization');
    } else {
        // Firebase is not initialized, initialize it
        try {
            if (typeof firebaseConfig !== 'undefined') {
                console.log('Initializing Firebase for clients page with config:', firebaseConfig);
                firebase.initializeApp(firebaseConfig);
                console.log('Firebase initialized successfully for clients page');
            } else {
                console.error('Firebase config is not defined');
                showErrorMessage('Firebase configuration is missing. Please check the firebase-config.js file.');
                return;
            }
        } catch (error) {
            console.error('Error initializing Firebase for clients page:', error);
            showErrorMessage('Error initializing Firebase: ' + error.message);
            return;
        }
    }
    
    // Function to show error message if needed
    function showErrorMessage(message) {
        console.error('Error:', message);
        
        // Create error container if it doesn't exist
        let errorContainer = document.getElementById('error-container');
        if (!errorContainer) {
            errorContainer = document.createElement('div');
            errorContainer.id = 'error-container';
            errorContainer.className = 'p-4 m-4 bg-red-100 border border-red-400 text-red-700 rounded';
            
            // Insert at the top of the body or after the header
            const header = document.querySelector('.sticky');
            if (header && header.nextSibling) {
                document.body.insertBefore(errorContainer, header.nextSibling);
            } else {
                document.body.prepend(errorContainer);
            }
        }
        
        // Make sure the container is visible
        errorContainer.classList.remove('hidden');
        
        errorContainer.innerHTML = `
            <div class="flex items-center">
                <svg class="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                </svg>
                <p>${message}</p>
            </div>
            <div class="mt-3">
                <button onclick="location.reload()" class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                    Reload Page
                </button>
            </div>
        `;
    }
}); 