// test/housekeeper/settings/profile.test.js
import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// --- Import functions from the module under test --- 
import { 
    loadProfileData, 
    populateTimezoneOptions, 
    openEditProfileModal, 
    closeEditProfileModal,
    handleProfileSave
} from '../../../public/housekeeper/settings/profile.js';

// --- Mock Dependencies --- 
// No jest.mock for firestore-service.js
// No import from firestore-service.js

// Mock Firebase Auth
let mockAuthUser = null; 
const mockFirebaseAuth = {
    onAuthStateChanged: jest.fn((callback) => {
      callback(mockAuthUser);
      return jest.fn(); // Unsubscribe function
    }),
    currentUser: null,
};

// Create a mock firestoreService object 
const mockFirestoreService = {
    getHousekeeperProfile: jest.fn(),
    getUserSettings: jest.fn(),
    updateHousekeeperProfileAndUser: jest.fn(),
    updateUserSettings: jest.fn(),
    // Add any other methods profile.js might call
};

describe('Profile Settings Page Logic', () => {
  
  // Helper function to setup DOM (simplified)
  function setupProfileDisplayDOM() {
      document.body.innerHTML = `
          <span id="user-initials"></span>
          <h2 id="user-display-name"></h2>
          <p id="user-email"></p>
          <span id="invite-code-display"></span>
          <button id="copy-invite-code-btn"></button>
          <select id="profile-timezone"><option value=""></option></select>
          <button id="edit-profile-btn">Edit Profile</button>
          <div id="modal-backdrop" class="hidden"></div>
          <div id="edit-profile-modal" class="hidden">
            <button id="close-edit-modal-btn"></button>
            <form id="edit-profile-form">
              <input id="edit-firstName">
              <input id="edit-lastName">
              <input id="edit-companyName">
              <input id="edit-phone">
              <div id="modal-error" class="hidden"></div>
              <span id="modal-saving-indicator" class="hidden"></span>
              <button type="button" id="cancel-edit-btn"></button>
              <button type="submit" id="save-profile-btn"></button>
            </form>
          </div>
      `;
      // Return elements needed by tests - get them directly in test/setup helpers
      return {
         userInitialsSpan: document.getElementById('user-initials'),
         userDisplayNameH2: document.getElementById('user-display-name'),
         userEmailP: document.getElementById('user-email'),
         inviteCodeDisplaySpan: document.getElementById('invite-code-display'),
         copyInviteCodeBtn: document.getElementById('copy-invite-code-btn'),
         timezoneSelect: document.getElementById('profile-timezone'),
         editProfileBtn: document.getElementById('edit-profile-btn'),
         modal: document.getElementById('edit-profile-modal'),
         backdrop: document.getElementById('modal-backdrop'),
         closeModalBtn: document.getElementById('close-edit-modal-btn'),
         cancelModalBtn: document.getElementById('cancel-edit-btn'),
         profileForm: document.getElementById('edit-profile-form'),
         saveProfileBtn: document.getElementById('save-profile-btn'),
         modalSavingIndicator: document.getElementById('modal-saving-indicator'),
         modalErrorDiv: document.getElementById('modal-error'),
         firstNameInput: document.getElementById('edit-firstName'),
         lastNameInput: document.getElementById('edit-lastName'),
         companyNameInput: document.getElementById('edit-companyName'),
         phoneInput: document.getElementById('edit-phone')
      };
  }

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';
    // Reset Mocks
    jest.clearAllMocks(); 
    // Assign global mocks 
    global.window.firebase = { auth: () => mockFirebaseAuth };
    global.window.firestoreService = mockFirestoreService; // Assign the mock object globally
    // Reset user state
    mockAuthUser = null;
    mockFirebaseAuth.currentUser = null;
    // Reset mock implementations for the mockFirestoreService object
    mockFirestoreService.getHousekeeperProfile.mockResolvedValue({});
    mockFirestoreService.getUserSettings.mockResolvedValue({});
    mockFirestoreService.updateHousekeeperProfileAndUser.mockResolvedValue(undefined);
    mockFirestoreService.updateUserSettings.mockResolvedValue(undefined);
  });

  describe('populateTimezoneOptions', () => {
      /**
       * WHAT: Tests that the timezone select dropdown is populated correctly.
       * WHY: Ensures the user is presented with the necessary timezone options.
       */
      test('should populate the select element with timezone options', () => {
        document.body.innerHTML = `<select id="profile-timezone"></select>`;
        const selectElement = document.getElementById('profile-timezone');
        populateTimezoneOptions(selectElement); // Direct call to imported function
        expect(selectElement.options.length).toBeGreaterThan(1);
      });
      /**
       * WHAT: Tests that the function handles a null select element gracefully.
       * WHY: Prevents errors if the dropdown element isn't found in the DOM.
       */
      test('should not throw error and log warning if select element is null', () => {
          const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
          populateTimezoneOptions(null);
          expect(consoleWarnSpy).toHaveBeenCalled();
          consoleWarnSpy.mockRestore();
      });
  });

  describe('loadProfileData', () => {
    // Mock data
    const mockUserProfile = { uid: 'test-user-load', email: 'auth@test.com' }; // Added email to auth mock
    const profileDataName = { firstName: 'Testy', lastName: 'Code', inviteCode: 'TESTCODE', email: 'profile@test.com' }; // Added email here
    const profileDataCompany = { firstName: '', lastName: '', companyName: 'Test Co', inviteCode: 'CMPNYCODE', email: 'company@test.com' };
    const profileDataEmail = { firstName: '', lastName: '', companyName: '', inviteCode: 'EMAILCODE', email: 'email@test.com' }; // Email in profile
    const profileDataNoNames = { inviteCode: 'NONAME', email: null }; // No names, no company, no profile email
    const profileDataWithoutCode = { firstName: 'NoCode', lastName: 'User', email: 'nocode@test.com', inviteCode: null };
    const defaultSettings = { timezone: 'America/Denver' };

    function setupLoadTest(profileData = profileDataName, settingsData = defaultSettings) {
        const elements = setupProfileDisplayDOM();
        mockFirebaseAuth.currentUser = mockUserProfile;
        mockFirestoreService.getHousekeeperProfile.mockResolvedValue(profileData);
        mockFirestoreService.getUserSettings.mockResolvedValue(settingsData);
        return elements;
    }

    /**
     * WHAT: Tests display name uses First + Last Name when available.
     * WHY: Verifies the primary display name format and initials calculation.
     */
    test('should display First + Last Name and corresponding initials', async () => {
        const elements = setupLoadTest(profileDataName);
        await loadProfileData(elements, mockFirebaseAuth, mockFirestoreService);
        expect(elements.userDisplayNameH2.textContent).toBe('Testy Code');
        expect(elements.userInitialsSpan.textContent).toBe('TC');
        expect(elements.userEmailP.textContent).toBe('profile@test.com'); // Uses profile email
    });
    
    /**
     * WHAT: Tests display name falls back to Company Name when First/Last are empty.
     * WHY: Ensures a reasonable fallback for display name and initials.
     */
    test('should display Company Name if First/Last are empty', async () => {
        const elements = setupLoadTest(profileDataCompany);
        await loadProfileData(elements, mockFirebaseAuth, mockFirestoreService);
        expect(elements.userDisplayNameH2.textContent).toBe('Test Co');
        expect(elements.userInitialsSpan.textContent).toBe('TC'); // Initials from company
         expect(elements.userEmailP.textContent).toBe('company@test.com');
    });
    
    /**
     * WHAT: Tests display name falls back to User Email when First/Last/Company are empty.
     * WHY: Ensures a final fallback for display name and initials using auth data.
     */
    test('should display User Email if First/Last/Company are empty', async () => {
        const elements = setupLoadTest(profileDataNoNames); // Profile has no names/company/email
        await loadProfileData(elements, mockFirebaseAuth, mockFirestoreService);
        expect(elements.userDisplayNameH2.textContent).toBe(mockUserProfile.email); // Falls back to auth email
        expect(elements.userInitialsSpan.textContent).toBe('AU'); // Initials from auth email
        expect(elements.userEmailP.textContent).toBe(mockUserProfile.email); // Falls back to auth email
    });
    
    /**
     * WHAT: Tests if 'N/A' is displayed when the invite code is missing or null.
     * WHY: Ensures the UI handles missing invite codes gracefully.
     */
    test('should display N/A when invite code is missing', async () => {
        const elements = setupLoadTest(profileDataWithoutCode);
        await loadProfileData(elements, mockFirebaseAuth, mockFirestoreService);
        expect(elements.inviteCodeDisplaySpan.textContent).toBe('N/A');
        expect(elements.copyInviteCodeBtn.disabled).toBe(true);
        // Check name is still correct
        expect(elements.userDisplayNameH2.textContent).toBe('NoCode User'); 
    });

    /**
     * WHAT: Tests that an error is logged and profile calls are skipped if no user is logged in.
     * WHY: Prevents unnecessary Firestore reads and handles the logged-out state correctly.
     */
    it('should show an error if user is not logged in', async () => {
        const elements = setupProfileDisplayDOM(); // No user needed here
        mockFirebaseAuth.currentUser = null;
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        await loadProfileData(elements, mockFirebaseAuth, mockFirestoreService);
        expect(consoleErrorSpy).toHaveBeenCalledWith('Cannot load data, no user logged in');
        expect(mockFirestoreService.getHousekeeperProfile).not.toHaveBeenCalled();
        consoleErrorSpy.mockRestore();
    });

    /**
     * WHAT: Tests that an error is logged if fetching the housekeeper profile data fails.
     * WHY: Ensures failures during data fetching are handled and reported.
     */
    it('should show an error if fetching profile fails', async () => {
        const elements = setupLoadTest();
        mockFirestoreService.getHousekeeperProfile.mockRejectedValue(new Error('Firestore error'));
        mockFirestoreService.getUserSettings.mockResolvedValue(defaultSettings);
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        await loadProfileData(elements, mockFirebaseAuth, mockFirestoreService);
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading profile/settings:', expect.any(Error));
        consoleErrorSpy.mockRestore();
    });

    /**
     * WHAT: Tests that an error is logged if fetching the user settings data fails.
     * WHY: Ensures failures during settings fetching are handled and reported.
     */
    it('should show an error if fetching settings fails', async () => {
        const elements = setupLoadTest();
        mockFirestoreService.getHousekeeperProfile.mockResolvedValue(profileDataName);
        mockFirestoreService.getUserSettings.mockRejectedValue(new Error('Settings fetch error'));
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        await loadProfileData(elements, mockFirebaseAuth, mockFirestoreService);
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading profile/settings:', expect.any(Error));
        consoleErrorSpy.mockRestore();
    });
  });

  describe('Edit Profile Modal Interaction', () => {
    // Mock data
    const mockUserProfile = { uid: 'test-user-modal' };
    const mockProfileData = { firstName: 'Modal', lastName: 'User' };

    async function setupModalTest() {
        const elements = setupProfileDisplayDOM();
        mockFirebaseAuth.currentUser = mockUserProfile;
        // Setup mock return values for the initial load
        mockFirestoreService.getHousekeeperProfile.mockResolvedValue(mockProfileData);
        mockFirestoreService.getUserSettings.mockResolvedValue({});
        // Load data using the imported function and mock service
        await loadProfileData(elements, mockFirebaseAuth, mockFirestoreService);

        // Attach listeners - these call imported functions from profile.js
        elements.editProfileBtn.addEventListener('click', () => openEditProfileModal(elements));
        elements.closeModalBtn.addEventListener('click', () => closeEditProfileModal(elements));
        elements.cancelModalBtn.addEventListener('click', () => closeEditProfileModal(elements));
        elements.backdrop.addEventListener('click', () => closeEditProfileModal(elements));
        
        return elements;
    }

    /**
     * WHAT: Tests if clicking the 'Edit Profile' button opens the modal and populates the form fields.
     * WHY: Verifies the primary mechanism for initiating a profile edit.
     */
    test('should open modal and populate fields when Edit Profile button is clicked', async () => {
        const elements = await setupModalTest();
        expect(elements.modal.classList.contains('hidden')).toBe(true);
        
        elements.editProfileBtn.click();
        
        // Check the result (DOM changes)
        expect(elements.modal.classList.contains('hidden')).toBe(false);
        expect(elements.firstNameInput.value).toBe(mockProfileData.firstName); 
        expect(elements.lastNameInput.value).toBe(mockProfileData.lastName);
    });

    /**
     * WHAT: Tests if clicking the modal's close button (X) closes the modal.
     * WHY: Ensures the standard close button functionality works.
     */
    test('should close modal when Close button is clicked', async () => {
        const elements = await setupModalTest();
        openEditProfileModal(elements); // Manually open using imported function
        expect(elements.modal.classList.contains('hidden')).toBe(false);
        
        elements.closeModalBtn.click();
        
        // Check the result
        expect(elements.modal.classList.contains('hidden')).toBe(true);
    });
    
    /**
     * WHAT: Tests if clicking the 'Cancel' button closes the modal.
     * WHY: Ensures the explicit cancel action works as expected.
     */
    test('should close modal when Cancel button is clicked', async () => {
        const elements = await setupModalTest();
        openEditProfileModal(elements);
        expect(elements.modal.classList.contains('hidden')).toBe(false);
        elements.cancelModalBtn.click();
        expect(elements.modal.classList.contains('hidden')).toBe(true);
    });

    /**
     * WHAT: Tests if clicking the modal backdrop (outside the modal content) closes the modal.
     * WHY: Verifies the common pattern of dismissing modals by clicking away.
     */
    test('should close modal when backdrop is clicked', async () => {
        const elements = await setupModalTest();
        openEditProfileModal(elements);
        expect(elements.modal.classList.contains('hidden')).toBe(false);
        elements.backdrop.click();
        expect(elements.modal.classList.contains('hidden')).toBe(true);
    });
  });

  // --- NEW: Tests for Saving Profile Data --- 
  describe('handleProfileSave', () => {
    const mockUserId = 'test-user-save';
    const initialProfileData = { firstName: 'Initial', lastName: 'User', phone: '111-1111' };
    const newProfileData = {
        firstName: 'Updated',
        lastName: 'Tester',
        companyName: 'Test Co',
        phone: '222-2222'
    };

    async function setupSaveTest() {
        const elements = setupProfileDisplayDOM(); // Includes form elements
        mockFirebaseAuth.currentUser = { uid: mockUserId }; // Set logged-in user
        // Simulate initial data load
        mockFirestoreService.getHousekeeperProfile.mockResolvedValue(initialProfileData);
        mockFirestoreService.getUserSettings.mockResolvedValue({}); 
        await loadProfileData(elements, mockFirebaseAuth, mockFirestoreService); // Pass mocks
        
        // Pre-fill the modal form for update tests
        openEditProfileModal(elements);
        elements.firstNameInput.value = newProfileData.firstName;
        elements.lastNameInput.value = newProfileData.lastName;
        elements.companyNameInput.value = newProfileData.companyName;
        elements.phoneInput.value = newProfileData.phone;
        
        // Mock preventDefault for the event object
        const mockEvent = { preventDefault: jest.fn() };

        return { elements, mockEvent };
    }

    /**
     * WHAT: Tests successful profile update on form submission.
     * WHY: Ensures valid data is sent to Firestore and UI feedback is correct.
     */
    test('should call updateHousekeeperProfileAndUser and close modal on successful save', async () => {
        const { elements, mockEvent } = await setupSaveTest();
        mockFirestoreService.updateHousekeeperProfileAndUser.mockResolvedValue(undefined); 

        await handleProfileSave(mockEvent, elements, mockFirebaseAuth, mockFirestoreService);

        expect(mockEvent.preventDefault).toHaveBeenCalled();
        expect(mockFirestoreService.updateHousekeeperProfileAndUser).toHaveBeenCalledWith(mockUserId, {
            firstName: newProfileData.firstName,
            lastName: newProfileData.lastName,
            companyName: newProfileData.companyName,
            phone: newProfileData.phone,
        });
        expect(elements.modal.classList.contains('hidden')).toBe(true); // Verify modal is closed by checking class
    });

    /**
     * WHAT: Tests validation for required fields (e.g., first name).
     * WHY: Ensures the form prevents saving incomplete data.
     */
    test('should show validation error and not save if first name is empty', async () => {
        const { elements, mockEvent } = await setupSaveTest();
        elements.firstNameInput.value = '';

        await handleProfileSave(mockEvent, elements, mockFirebaseAuth, mockFirestoreService);

        expect(mockEvent.preventDefault).toHaveBeenCalled();
        expect(mockFirestoreService.updateHousekeeperProfileAndUser).not.toHaveBeenCalled();
        expect(elements.modalErrorDiv.classList.contains('hidden')).toBe(false);
        expect(elements.modal.classList.contains('hidden')).toBe(false); // Modal stays open
    });
    
    // TODO: Add similar test for empty last name, phone

    /**
     * WHAT: Tests error handling when the Firestore update fails.
     * WHY: Ensures backend errors are reported to the user and modal stays open.
     */
    test('should show error in modal if Firestore update fails', async () => {
        const { elements, mockEvent } = await setupSaveTest();
        const firestoreError = new Error('Firestore failed');
        mockFirestoreService.updateHousekeeperProfileAndUser.mockRejectedValue(firestoreError); 

        await handleProfileSave(mockEvent, elements, mockFirebaseAuth, mockFirestoreService);

        expect(mockEvent.preventDefault).toHaveBeenCalled();
        expect(mockFirestoreService.updateHousekeeperProfileAndUser).toHaveBeenCalledTimes(1);
        expect(elements.modalErrorDiv.classList.contains('hidden')).toBe(false);
        expect(elements.modal.classList.contains('hidden')).toBe(false); // Modal stays open
    });
  });
}); 