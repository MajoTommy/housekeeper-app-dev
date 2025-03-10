document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            // User is signed in, redirect to dashboard
            window.location.href = 'index.html';
        }
    });

    // Signup form submission
    const signupForm = document.getElementById('signup-form');
    const errorMessage = document.getElementById('error-message');
    
    signupForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        // Clear previous error messages
        errorMessage.textContent = '';
        errorMessage.classList.add('hidden');
        
        // Validate passwords match
        if (password !== confirmPassword) {
            errorMessage.textContent = 'Passwords do not match';
            errorMessage.classList.remove('hidden');
            return;
        }
        
        // Disable button during signup
        signupForm.querySelector('button').disabled = true;
        
        // Create user with Firebase
        firebase.auth().createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Create user profile in Firestore
                const user = userCredential.user;
                return firestoreService.createUserProfile(user.uid, {
                    email: user.email,
                    name: '',
                    phone: '',
                    hourly_rate: 0,
                    service_area: '',
                    working_hours: {}
                });
            })
            .then(() => {
                // Signed up and profile created successfully
                window.location.href = 'index.html';
            })
            .catch((error) => {
                // Handle errors
                errorMessage.textContent = error.message;
                errorMessage.classList.remove('hidden');
                signupForm.querySelector('button').disabled = false;
            });
    });
}); 