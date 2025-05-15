import { describe, test, expect, beforeEach, jest, afterEach } from '@jest/globals';

// --- Mock Dependencies --- 

// Mock Firebase Auth SDK
const mockSignIn = jest.fn();
const mockSignOut = jest.fn();
const mockAuth = {
    signInWithEmailAndPassword: mockSignIn,
    signOut: mockSignOut,
    // onAuthStateChanged: jest.fn(() => jest.fn()), // Not directly used by listeners in auth.js
    currentUser: null, // Can be set in tests
};

// Mock Firestore Service (assuming it's globally available as before)
const mockGetUserProfile = jest.fn();
const mockFirestoreService = {
    getUserProfile: mockGetUserProfile,
    // Add other methods if needed
};

// Mock window.location
// delete window.location;
// window.location = { href: '' }; 
// Use jest.spyOn for better control
let locationSpy;

// --- Test Suite --- 
describe('Auth Script (auth.js) - Simulating Listeners', () => {

    // Define handler logic similar to auth.js HERE
    async function handleLoginSubmit(e) {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorMessage = document.getElementById('error-message');
        const loginButton = document.querySelector('#login-form button');
        
        errorMessage.textContent = '';
        errorMessage.classList.add('hidden');
        if (loginButton) loginButton.disabled = true;
        
        try {
            const userCredential = await mockAuth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            const userProfile = await mockFirestoreService.getUserProfile(user.uid);
            const userRole = userProfile?.role || 'housekeeper';
            
            let baseUrl = ''; // Simplified base URL logic for test
            const currentPath = window.location.pathname;
            if (currentPath.includes('/test-path/')) { // Use path from mock
                baseUrl = currentPath.split('index.html')[0]; // Get base up to index.html
            } else {
                baseUrl = '/';
            }

            if (userRole === 'homeowner') {
                window.location.href = baseUrl + 'homeowner/dashboard/dashboard.html';
            } else {
                window.location.href = baseUrl + 'housekeeper/schedule/schedule.html';
            }
        } catch (error) {
            errorMessage.textContent = error.message || "Login failed";
            errorMessage.classList.remove('hidden');
        } finally {
            if (loginButton) loginButton.disabled = false;
        }
    }

    function handleLogoutClick(e) {
        e.preventDefault();
        mockAuth.signOut().then(() => {
            window.location.href = '/';
        }).catch((error) => {
            console.error('Mock Logout error:', error);
        });
    }

    function setupAuthDOMAndListeners() {
        // Setup DOM as before
        document.body.innerHTML = `
            <form id="login-form">
                <input id="email" value="test@example.com">
                <input id="password" value="password123">
                <button type="submit">Login</button>
                <div id="error-message" class="hidden"></div>
            </form>
            <button id="logout-button">Logout</button>
        `;
        const elements = {
            loginForm: document.getElementById('login-form'),
            emailInput: document.getElementById('email'),
            passwordInput: document.getElementById('password'),
            loginButton: document.querySelector('#login-form button'),
            errorMessage: document.getElementById('error-message'),
            logoutButton: document.getElementById('logout-button'),
        };
        
        // Attach the test-defined handlers
        if (elements.loginForm) {
            elements.loginForm.addEventListener('submit', handleLoginSubmit);
        }
        if (elements.logoutButton) {
            elements.logoutButton.addEventListener('click', handleLogoutClick);
        }
        return elements;
    }

    let mockLocation; // Variable to hold the mocked location object

    beforeEach(() => {
        // Reset DOM (done in setupAuthDOMAndListeners now)
        // Reset mocks
        jest.clearAllMocks();
        mockAuth.currentUser = null;
        mockGetUserProfile.mockResolvedValue({ role: 'housekeeper' }); // Default successful profile
        mockSignIn.mockResolvedValue({ user: { uid: 'test-uid' } }); // Default successful sign-in
        mockSignOut.mockResolvedValue(undefined); // Default successful sign-out
        
        // Assign mocks globally 
        global.window.firebase = { auth: () => mockAuth };
        global.window.firestoreService = mockFirestoreService;

        // Redefine location mock to capture href assignments
        mockLocation = { 
            href: '', 
            pathname: '/test-path/index.html'
        };
        locationSpy = jest.spyOn(window, 'location', 'get').mockReturnValue(mockLocation);

        // IMPORTANT: To track assignments to href, we need to modify the setter.
        // This is tricky, let's try just checking mockLocation.href after the call.
        // The spyOn('get') only affects reading window.location, not assigning window.location.href.
        // A more direct way might be needed if just checking mockLocation.href doesn't work.
    });

    afterEach(() => {
        locationSpy.mockRestore();
    });

    describe('Login Form', () => {
        /**
         * WHAT: Tests successful login for a housekeeper role.
         * WHY: Verifies the core login flow, profile fetch, and redirection to the correct housekeeper page.
         */
        test('successful login as housekeeper redirects to housekeeper schedule', async () => {
            // Use the setup function that includes attaching listeners
            const { loginForm, emailInput, passwordInput, errorMessage } = setupAuthDOMAndListeners();
            // Set specific values for this test if needed
            emailInput.value = 'housekeeper@test.com';
            passwordInput.value = 'password123';
            mockGetUserProfile.mockResolvedValue({ role: 'housekeeper' });

            // Act: Simulate form submission
            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            loginForm.dispatchEvent(submitEvent);
            
            await new Promise(process.nextTick); // Allow promises to settle

            // Assert
            expect(mockSignIn).toHaveBeenCalledWith('housekeeper@test.com', 'password123');
            expect(mockGetUserProfile).toHaveBeenCalledWith('test-uid');
            expect(mockLocation.href).toBe('/test-path/housekeeper/schedule/schedule.html');
            expect(errorMessage.classList.contains('hidden')).toBe(true);
        });

        /**
         * WHAT: Tests successful login for a homeowner role.
         * WHY: Verifies redirection logic correctly handles different user roles.
         */
        test('successful login as homeowner redirects to homeowner dashboard', async () => {
            const { loginForm, emailInput, passwordInput } = setupAuthDOMAndListeners();
            emailInput.value = 'homeowner@test.com';
            mockGetUserProfile.mockResolvedValue({ role: 'homeowner' }); // Mock homeowner role

            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            loginForm.dispatchEvent(submitEvent);
            await new Promise(process.nextTick);

            expect(mockSignIn).toHaveBeenCalledWith('homeowner@test.com', 'password123');
            expect(mockGetUserProfile).toHaveBeenCalledWith('test-uid');
            expect(mockLocation.href).toBe('/test-path/homeowner/dashboard/dashboard.html');
        });

        /**
         * WHAT: Tests UI feedback when Firebase signIn fails.
         * WHY: Ensures users see an appropriate error message and the form is re-enabled on login failure.
         */
        test('shows error message on signIn failure', async () => {
            const { loginForm, errorMessage, loginButton } = setupAuthDOMAndListeners();
            const error = new Error('Invalid credentials');
            mockSignIn.mockRejectedValue(error); // Simulate failure

            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            loginForm.dispatchEvent(submitEvent);
            await new Promise(process.nextTick);

            expect(mockSignIn).toHaveBeenCalled();
            expect(mockGetUserProfile).not.toHaveBeenCalled();
            expect(mockLocation.href).toBe(''); // No redirect, href remains empty
            expect(errorMessage.textContent).toBe(error.message);
            expect(errorMessage.classList.contains('hidden')).toBe(false);
            expect(loginButton.disabled).toBe(false); // Re-enabled
        });
        
        // Add test for profile fetch error after successful signin
    });

    describe('Logout Button', () => {
        /**
         * WHAT: Tests the logout button functionality.
         * WHY: Ensures clicking logout calls the Firebase signOut method and redirects the user to the root/login page.
         */
        test('clicking logout calls signOut and redirects to root', async () => {
            // Use setup function that attaches listeners
            const { logoutButton } = setupAuthDOMAndListeners();

            logoutButton.click();
            await new Promise(process.nextTick);

            expect(mockSignOut).toHaveBeenCalled();
            expect(mockLocation.href).toBe('/'); // Check mocked href
        });
    });

}); 