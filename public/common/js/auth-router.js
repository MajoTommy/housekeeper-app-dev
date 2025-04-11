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
                    
                    console.log('On landing/login page, redirecting based on role');
                    
                    // Redirect based on role
                    if (userRole === 'housekeeper') {
                        window.location.href = baseUrl + 'housekeeper/schedule/schedule.html';
                    } else {
                        window.location.href = baseUrl + 'homeowner/dashboard/dashboard.html';
                    }
                    return;
                }
                
                // Check if user is in the wrong section
                const inHousekeeperSection = currentPath.includes('/housekeeper/');
                const inHomeownerSection = currentPath.includes('/homeowner/');
                
                if (userRole === 'housekeeper' && inHomeownerSection) {
                    console.log('Housekeeper in homeowner section, redirecting');
                    window.location.href = baseUrl + 'housekeeper/schedule/schedule.html';
                    return;
                } else if (userRole === 'homeowner' && inHousekeeperSection) {
                    console.log('Homeowner in housekeeper section, redirecting');
                    window.location.href = baseUrl + 'homeowner/dashboard/dashboard.html';
                    return;
                }
            } catch (error) {
                console.error('Error in auth router profile check:', error);
            }
        } else {
            // User is not logged in
            const currentPath = window.location.pathname;
            console.log('No user logged in, current path:', currentPath);
            
            // Base URL for redirects
            let baseUrl = '';
            if (currentPath.includes('/public/')) {
                baseUrl = currentPath.split('/public/')[0] + '/public/';
            } else {
                baseUrl = '/';  // Default to root
            }

            // --- NEW: Redirect from index/root to login if not logged in ---
            if (currentPath.endsWith('/index.html') || currentPath === '/' || currentPath.endsWith('/')) {
                // Allow exceptions for specific files accessible when logged out
                const allowedRootFiles = ['/index.html', '/signup.html', '/forgot-password.html', '/404.html']; // ADDED /index.html, REMOVED /login.html
                let onAllowedPage = false;
                for (const allowedFile of allowedRootFiles) {
                    // Handle root path explicitly or ensure endsWith check works
                    if (currentPath === '/' && allowedFile === '/index.html') {
                         onAllowedPage = true; // Allow root if index is the target
                         break;
                    } 
                    if (currentPath.endsWith(allowedFile)) {
                        onAllowedPage = true;
                        break;
                    }
                }
                // Only redirect from root/index if not already on an allowed page
                if (!onAllowedPage) {
                     console.log('Not logged in and on index/root page, redirecting to login (index.html).');
                     window.location.href = baseUrl + 'index.html'; 
                     return; // Stop further checks
                }
            }
            // --- END NEW ---
            
            // If trying to access protected pages, redirect to login (Existing logic)
            if (currentPath.includes('/housekeeper/') || 
                currentPath.includes('/homeowner/')) {
                
                console.log('Not logged in and on protected page, redirecting to login (index.html).');
                window.location.href = baseUrl + 'index.html'; // Ensure this points to index.html too
                return;
            }
            // Otherwise, do nothing (allow access to public pages like signup, forgot-password)
            console.log('Not logged in, but on an allowed public page.');
        }
    });
}); 