/**
 * Auth Router
 * Handles role-based routing for the Housekeeping App
 */
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Auth Router initialized');
    
    // Check if user is logged in
    firebase.auth().onAuthStateChanged(async function(user) {
        console.log('Auth state changed, user:', user ? user.uid : 'not logged in');
        
        // --- Refined Check ---
        const currentHref = window.location.href;
        console.log('[Auth Router Check] Current href:', currentHref);
        // Check for both /signup and /signup.html endings
        if (currentHref.endsWith('/signup') || currentHref.endsWith('/signup/') || currentHref.endsWith('/signup.html') || currentHref.endsWith('/signup.html/')) {
            console.log('Auth Router: On signup page (href endsWith /signup or /signup.html), ignoring auth state change.');
            return; 
        }
        // --- End of refined check ---
        
        if (user) {
            // User is logged in, get their profile to check role
            console.log('Fetching user profile for routing...');
            try {
                const userProfile = await firestoreService.getUserProfile(user.uid);
                console.log('User profile retrieved:', userProfile);
                
                const userRole = userProfile?.role || 'housekeeper';
                console.log('User role for routing:', userRole);
                
                // Get current path and determine if it's a relative or absolute path
                const currentPath = window.location.pathname;
                console.log('Current path:', currentPath);
                
                // Base URL - determine if we're at root or in a subdirectory
                let baseUrl = '';
                if (currentPath.includes('/public/')) {
                    baseUrl = currentPath.split('/public/')[0] + '/public/';
                } else {
                    baseUrl = '/';  // Default to root
                }
                console.log('Base URL for redirects:', baseUrl);
                
                // Check if on the landing page or login page
                if (currentPath.endsWith('/index.html') || 
                    currentPath.endsWith('/login.html') || 
                    currentPath === '/' || 
                    currentPath.endsWith('/') ||
                    currentPath.includes('/signup.html')) {
                    
                    console.log('On landing/login/signup page, redirecting based on role');
                    
                    // Redirect based on role using CLEAN URLs
                    if (userRole === 'housekeeper') {
                        window.location.href = baseUrl + 'housekeeper/schedule'; // Use clean URL
                    } else {
                        window.location.href = baseUrl + 'homeowner/dashboard'; // Use clean URL
                    }
                    return;
                }
                
                // Check if user is in the wrong section
                const inHousekeeperSection = currentPath.includes('/housekeeper/');
                const inHomeownerSection = currentPath.includes('/homeowner/');
                
                if (userRole === 'housekeeper' && inHomeownerSection) {
                    console.log('Housekeeper in homeowner section, redirecting');
                    window.location.href = baseUrl + 'housekeeper/schedule'; // Use clean URL
                    return;
                } else if (userRole === 'homeowner' && inHousekeeperSection) {
                    console.log('Homeowner in housekeeper section, redirecting');
                    window.location.href = baseUrl + 'homeowner/dashboard'; // Use clean URL
                    return;
                }
            } catch (error) {
                console.error('Error in auth router profile check:', error);
            }
        } else {
            // User is not logged in
            const currentPath = window.location.pathname;
            const currentUrl = window.location.href; // Get the full URL
            console.log('No user logged in, current path:', currentPath);
            
            // --- ADDED CHECK for Stripe Redirect --- 
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has('subscription_success') || urlParams.has('subscription_cancelled')) {
                console.log('Auth Router: Detected Stripe redirect parameter. Allowing page to load for handling.');
                return; // Do not redirect, let the specific page script handle it
            }
            // --- END ADDED CHECK --- 
            
            // --- SIMPLIFIED LOGIC for Logged Out Users ---
            // If trying to access protected pages when not logged in, redirect to login.
            if (currentPath.includes('/housekeeper/') || currentPath.includes('/homeowner/')) {
                console.log('Not logged in and trying to access protected page:', currentPath, 'Redirecting to login (index.html).');
                // Determine baseUrl again in case it wasn't set (although it should be)
                let baseUrl = window.location.origin + (currentPath.includes('/public/') ? currentPath.split('/public/')[0] + '/public/' : '/');
                if (!baseUrl.endsWith('/')) baseUrl += '/'; // Ensure trailing slash for consistency

                window.location.href = baseUrl + 'index.html'; 
                return; // Stop execution
            }
            
            // Otherwise, if logged out, allow access to the current page 
            // (e.g., /, /index.html, /signup.html, /forgot-password.html, /dev-tools.html)
            console.log('Not logged in, allowing access to public page:', currentPath);
            // --- END SIMPLIFIED LOGIC ---
        }
    });
}); 