import { describe, test, expect, beforeEach, jest, afterEach } from '@jest/globals';

// Mock Firebase Auth
let mockOnAuthStateChangedCallback = null; // Store the callback
const mockAuth = {
    // Function to capture the callback passed to onAuthStateChanged
    onAuthStateChanged: jest.fn((callback) => {
        console.log('Mock onAuthStateChanged registered');
        mockOnAuthStateChangedCallback = callback; // Capture the callback
        // Return a mock unsubscribe function, though we might not use it
        return jest.fn(); 
    }),
    currentUser: null, // Will be set in tests
};

// Mock Firestore Service
const mockGetUserProfile = jest.fn();
const mockFirestoreService = {
    getUserProfile: mockGetUserProfile,
};

// Mock window.location
let locationSpy;
let mockLocation; // Define globally for access in tests

// --- Test Setup Function ---
// Function to load and potentially execute the script logic
// We'll need to adapt this based on how auth-router.js exposes its logic
// Since it runs directly on DOMContentLoaded, we might need to simulate that.
function simulateDOMContentLoaded() {
    // Directly require/import the script. It should attach its listener.
    // IMPORTANT: Ensure jest environment is configured for ESM if needed, or adjust import
    // For now, assuming we can load it and it attaches the listener globally
    // We might need to wrap auth-router.js content in an exported function for testing
    // Or, use jest.isolateModules to re-run the script setup in each test/describe block
    
    // For now, let's assume requiring it attaches the listener
    // Note: This might execute the DOMContentLoaded listener immediately if run in Jest/JSDOM
    // We will refine this based on actual behavior.
    jest.isolateModules(() => {
        require('../../../public/common/js/auth-router.js');
    });

    // We expect the mockOnAuthStateChanged to have been called and the callback captured
    expect(mockAuth.onAuthStateChanged).toHaveBeenCalled();
    if (!mockOnAuthStateChangedCallback) {
        throw new Error("onAuthStateChanged callback was not captured by the mock.");
    }
}

// --- Test Suite ---
describe('Auth Router (auth-router.js)', () => {

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        mockOnAuthStateChangedCallback = null; // Reset captured callback
        mockAuth.currentUser = null;
        mockGetUserProfile.mockResolvedValue({ role: 'housekeeper' }); // Default profile

        // Assign mocks globally BEFORE the script runs
        global.window.firebase = { auth: () => mockAuth };
        global.window.firestoreService = mockFirestoreService;

        // Setup window.location mock for each test
        mockLocation = {
            href: '', // Reset href
            pathname: '/index.html', // Default starting page
            search: '', // Default search params
            // Add other properties like origin if needed by the script
        };
        // Spy on the 'get' accessor for window.location
        locationSpy = jest.spyOn(window, 'location', 'get').mockReturnValue(mockLocation);
        
        // Simulate the script execution which should register the listener
        simulateDOMContentLoaded(); 
    });

    afterEach(() => {
        // Restore the original window.location implementation
        locationSpy.mockRestore();
        // Reset modules if needed, especially if using isolateModules
        jest.resetModules();
    });

    // --- Test Cases ---

    test('registers onAuthStateChanged listener on load', () => {
        // The beforeEach already calls simulateDOMContentLoaded which includes the check
        // So this test primarily confirms the setup works as expected.
        expect(mockAuth.onAuthStateChanged).toHaveBeenCalledTimes(1);
        expect(mockOnAuthStateChangedCallback).toBeInstanceOf(Function);
    });

    // More tests will go here...

    // --- Logged-Out User Scenarios ---
    describe('when user is logged out', () => {
        beforeEach(() => {
            // Ensure the initial state is logged out for these tests
            mockAuth.currentUser = null;
            // Simulate the auth state change event firing with no user
            mockOnAuthStateChangedCallback(null);
        });

        test('should redirect from protected housekeeper route to /index.html', () => {
            mockLocation.pathname = '/housekeeper/schedule.html';
            // Re-trigger the callback (or assume it runs on initial load check)
            // In our setup, beforeEach runs the script, and we call the callback.
            // We might need to re-invoke the callback if the pathname changes AFTER initial load.
            // Let's assume the initial load logic handles this for now.
            mockOnAuthStateChangedCallback(null); // Trigger again with the new pathname
            expect(mockLocation.href).toBe('/index.html');
        });

        test('should redirect from protected homeowner route to /index.html', () => {
            mockLocation.pathname = '/homeowner/dashboard.html';
            mockOnAuthStateChangedCallback(null);
            expect(mockLocation.href).toBe('/index.html');
        });

        test('should allow access to /signup.html', () => {
            mockLocation.pathname = '/signup.html';
            mockOnAuthStateChangedCallback(null);
            // No redirection expected
            expect(mockLocation.href).toBe(''); // href should not have been set
        });

        test('should allow access to /forgot-password.html', () => {
            mockLocation.pathname = '/forgot-password.html';
            mockOnAuthStateChangedCallback(null);
            // No redirection expected
            expect(mockLocation.href).toBe(''); 
        });

        test('should allow access to /index.html', () => {
            mockLocation.pathname = '/index.html';
            mockOnAuthStateChangedCallback(null);
            // No redirection expected
            expect(mockLocation.href).toBe(''); 
        });

        test('should redirect from root "/" to /index.html', () => {
            mockLocation.pathname = '/';
            mockOnAuthStateChangedCallback(null);
            expect(mockLocation.href).toBe('/index.html');
        });
    });

    // --- Logged-In User Scenarios ---
    describe('when user is logged in', () => {
        const mockUser = { uid: 'test-user-id' };

        beforeEach(() => {
            // Set the user for these tests
            mockAuth.currentUser = mockUser;
            // The callback will be triggered in each test after setting up the profile mock
        });

        describe('as Housekeeper', () => {
            beforeEach(() => {
                mockGetUserProfile.mockResolvedValue({ role: 'housekeeper' });
            });

            test('should redirect from / to /housekeeper/schedule.html', async () => {
                mockLocation.pathname = '/';
                await mockOnAuthStateChangedCallback(mockUser); // Trigger auth check
                expect(mockGetUserProfile).toHaveBeenCalledWith('test-user-id');
                expect(mockLocation.href).toBe('/housekeeper/schedule.html');
            });
            
            test('should redirect from /index.html to /housekeeper/schedule.html', async () => {
                mockLocation.pathname = '/index.html';
                await mockOnAuthStateChangedCallback(mockUser);
                expect(mockGetUserProfile).toHaveBeenCalledWith('test-user-id');
                expect(mockLocation.href).toBe('/housekeeper/schedule.html');
            });

            test('should redirect from /signup.html to /housekeeper/schedule.html', async () => {
                mockLocation.pathname = '/signup.html';
                await mockOnAuthStateChangedCallback(mockUser);
                expect(mockGetUserProfile).toHaveBeenCalledWith('test-user-id');
                expect(mockLocation.href).toBe('/housekeeper/schedule.html');
            });

            test('should allow access to housekeeper routes', async () => {
                mockLocation.pathname = '/housekeeper/settings/profile.html';
                await mockOnAuthStateChangedCallback(mockUser);
                expect(mockGetUserProfile).toHaveBeenCalledWith('test-user-id');
                expect(mockLocation.href).toBe(''); // No redirection
            });

            test('should redirect from homeowner routes to /housekeeper/schedule.html', async () => {
                mockLocation.pathname = '/homeowner/dashboard.html';
                await mockOnAuthStateChangedCallback(mockUser);
                expect(mockGetUserProfile).toHaveBeenCalledWith('test-user-id');
                expect(mockLocation.href).toBe('/housekeeper/schedule.html');
            });
        });

        describe('as Homeowner', () => {
            beforeEach(() => {
                mockGetUserProfile.mockResolvedValue({ role: 'homeowner' });
            });

            test('should redirect from / to /homeowner/dashboard.html', async () => {
                mockLocation.pathname = '/';
                await mockOnAuthStateChangedCallback(mockUser);
                expect(mockGetUserProfile).toHaveBeenCalledWith('test-user-id');
                expect(mockLocation.href).toBe('/homeowner/dashboard.html');
            });

            test('should redirect from /index.html to /homeowner/dashboard.html', async () => {
                mockLocation.pathname = '/index.html';
                await mockOnAuthStateChangedCallback(mockUser);
                expect(mockGetUserProfile).toHaveBeenCalledWith('test-user-id');
                expect(mockLocation.href).toBe('/homeowner/dashboard.html');
            });

            test('should redirect from /signup.html to /homeowner/dashboard.html', async () => {
                mockLocation.pathname = '/signup.html';
                await mockOnAuthStateChangedCallback(mockUser);
                expect(mockGetUserProfile).toHaveBeenCalledWith('test-user-id');
                expect(mockLocation.href).toBe('/homeowner/dashboard.html');
            });

            test('should allow access to homeowner routes', async () => {
                mockLocation.pathname = '/homeowner/settings.html';
                await mockOnAuthStateChangedCallback(mockUser);
                expect(mockGetUserProfile).toHaveBeenCalledWith('test-user-id');
                expect(mockLocation.href).toBe(''); // No redirection
            });

            test('should redirect from housekeeper routes to /homeowner/dashboard.html', async () => {
                mockLocation.pathname = '/housekeeper/schedule.html';
                await mockOnAuthStateChangedCallback(mockUser);
                expect(mockGetUserProfile).toHaveBeenCalledWith('test-user-id');
                expect(mockLocation.href).toBe('/homeowner/dashboard.html');
            });
        });

        describe('with Unknown Role', () => {
             beforeEach(() => {
                // Simulate profile exists but has no role or an unexpected role
                mockGetUserProfile.mockResolvedValue({ role: 'some-new-unexpected-role' }); 
            });

            test('should redirect from protected route to /index.html', async () => {
                mockLocation.pathname = '/housekeeper/schedule.html';
                await mockOnAuthStateChangedCallback(mockUser);
                expect(mockGetUserProfile).toHaveBeenCalledWith('test-user-id');
                expect(mockLocation.href).toBe('/index.html'); 
            });

             test('should redirect from / to /index.html', async () => {
                mockLocation.pathname = '/';
                await mockOnAuthStateChangedCallback(mockUser);
                expect(mockGetUserProfile).toHaveBeenCalledWith('test-user-id');
                expect(mockLocation.href).toBe('/index.html');
            });
        });
        
        describe('when profile fetch fails', () => {
            beforeEach(() => {
                mockGetUserProfile.mockRejectedValue(new Error('Firestore unavailable'));
            });

            test('should redirect from protected route to /index.html', async () => {
                mockLocation.pathname = '/housekeeper/schedule.html';
                await mockOnAuthStateChangedCallback(mockUser); 
                expect(mockGetUserProfile).toHaveBeenCalledWith('test-user-id');
                // Wait for the promise rejection to be handled if necessary
                // await new Promise(process.nextTick); // Or jest.runAllTicks(); if needed
                expect(mockLocation.href).toBe('/index.html');
            });

             test('should redirect from / to /index.html', async () => {
                mockLocation.pathname = '/';
                await mockOnAuthStateChangedCallback(mockUser);
                expect(mockGetUserProfile).toHaveBeenCalledWith('test-user-id');
                // await new Promise(process.nextTick); // Or jest.runAllTicks(); if needed
                expect(mockLocation.href).toBe('/index.html');
            });
        });
    });

}); 