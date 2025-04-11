document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    firebase.auth().onAuthStateChanged(function(user) {
        if (user && window.location.pathname.includes('login.html')) {
            // User is signed in and on login page, redirect to dashboard
            window.location.href = 'index.html';
        }
    });

    // Login form submission
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const errorMessage = document.getElementById('error-message');
            
            // Clear previous error messages
            errorMessage.textContent = '';
            errorMessage.classList.add('hidden');
            
            // Set loading state
            loginForm.querySelector('button').disabled = true;
            
            // Sign in with Firebase
            firebase.auth().signInWithEmailAndPassword(email, password)
                .then(async (userCredential) => {
                    // Get user role for proper redirection
                    const user = userCredential.user;
                    console.log('Login successful, getting user profile for redirection...');
                    
                    try {
                        const userProfile = await firestoreService.getUserProfile(user.uid);
                        const userRole = userProfile?.role || 'housekeeper';
                        
                        console.log('User logged in with role:', userRole);
                        
                        // Determine base URL for redirects
                        let baseUrl = '';
                        const currentPath = window.location.pathname;
                        if (currentPath.includes('/public/')) {
                            baseUrl = currentPath.split('/public/')[0] + '/public/';
                        } else {
                            baseUrl = '/';
                        }
                        
                        // Redirect based on role
                        if (userRole === 'homeowner') {
                            window.location.href = baseUrl + 'homeowner/dashboard/dashboard.html';
                        } else {
                            window.location.href = baseUrl + 'housekeeper/schedule/schedule.html';
                        }
                    } catch (error) {
                        console.error('Error getting user profile after login:', error);
                        // Fallback to index if profile fetch fails
                        window.location.href = baseUrl + 'index.html';
                    }
                })
                .catch((error) => {
                    // Handle errors
                    errorMessage.textContent = error.message;
                    errorMessage.classList.remove('hidden');
                    loginForm.querySelector('button').disabled = false;
                });
        });
    }

    // Logout functionality
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', function(e) {
            e.preventDefault();
            
            firebase.auth().signOut().then(() => {
                // Sign-out successful, redirect to the new index (login) page
                window.location.href = '/'; // Redirect to root, which is now the login page
            }).catch((error) => {
                // An error happened
                console.error('Logout error:', error);
            });
        });
    }
});