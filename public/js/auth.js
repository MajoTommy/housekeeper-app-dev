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
                .then((userCredential) => {
                    // Signed in successfully
                    window.location.href = 'index.html';
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
                // Sign-out successful, redirect to login
                window.location.href = 'login.html';
            }).catch((error) => {
                // An error happened
                console.error('Logout error:', error);
            });
        });
    }
});