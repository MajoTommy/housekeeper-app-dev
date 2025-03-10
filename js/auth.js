// Initialize Alpine.js auth component when Alpine is loaded
document.addEventListener('alpine:init', () => {
    Alpine.data('authComponent', () => ({
        user: null,
        loading: true,
        userProfile: null,
        
        init() {
            // Check authentication state when component initializes
            this.checkAuthState();
        },
        
        checkAuthState() {
            this.loading = true;
            
            firebase.auth().onAuthStateChanged(async (user) => {
                this.user = user;
                
                if (user) {
                    // If user is authenticated, load their profile
                    try {
                        if (typeof firestoreService !== 'undefined') {
                            this.userProfile = await firestoreService.getUserProfile(user.uid);
                        }
                    } catch (error) {
                        console.error('Error loading user profile:', error);
                    }
                    
                    // Redirect if on login page
                    if (window.location.pathname.includes('login.html') || 
                        window.location.pathname.includes('signup.html')) {
                        window.location.href = 'index.html';
                    }
                }
                
                this.loading = false;
            });
        },
        
        login(email, password) {
            this.loading = true;
            
            return firebase.auth().signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    // Signed in successfully
                    window.location.href = 'index.html';
                })
                .finally(() => {
                    this.loading = false;
                });
        },
        
        logout() {
            return firebase.auth().signOut()
                .then(() => {
                    // Clear user data
                    this.user = null;
                    this.userProfile = null;
                    
                    // Redirect to login page
                    window.location.href = 'login.html';
                })
                .catch((error) => {
                    console.error('Logout error:', error);
                });
        },
        
        // Helper method to check if user is authenticated
        isAuthenticated() {
            return !!this.user;
        },
        
        // Helper method to redirect if not authenticated
        requireAuth() {
            if (!this.loading && !this.user) {
                window.location.href = 'login.html';
            }
        },
        
        // Helper method to get user display name or email
        getUserDisplayName() {
            if (this.userProfile && this.userProfile.name) {
                return this.userProfile.name;
            }
            
            return this.user ? this.user.email : 'Guest';
        }
    }));
});

// Maintain backward compatibility with existing code
document.addEventListener('DOMContentLoaded', function() {
    // Logout functionality for non-Alpine pages
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