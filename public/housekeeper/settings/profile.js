// public/housekeeper/settings/profile.js

// --- Firebase Services (Assuming global availability from firebase-config.js) ---
// REMOVED: const firestoreService = window.firestoreService;

// --- State --- (Moved outside, but might need better state management later)
let currentProfileData = null;
let currentTimezone = null;

// --- Core Logic Functions (Exported for testing) ---

/**
 * Populates the timezone dropdown.
 * @param {HTMLSelectElement | null} timezoneSelect - The select element.
 */
export function populateTimezoneOptions(timezoneSelect) {
    if (!timezoneSelect) {
        console.warn("populateTimezoneOptions: timezoneSelect element not found.");
        return;
    }
    const northAmericanTimezones = [
        "America/New_York", "America/Chicago", "America/Denver", "America/Phoenix",
        "America/Los_Angeles", "America/Vancouver", "America/Edmonton", "America/Winnipeg",
        "America/Toronto", "America/Halifax", "America/St_Johns", "America/Anchorage",
        "Pacific/Honolulu"
    ];
    timezoneSelect.innerHTML = '<option value="">Select Time Zone</option>';
    northAmericanTimezones.forEach(tz => {
        const option = document.createElement('option');
        option.value = tz;
        const displayName = tz.split('/').pop().replace(/_/g, ' ');
        const region = tz.split('/')[0];
        option.textContent = `${displayName} (${region === 'Pacific' || region === 'Atlantic' ? region : 'America'})`;
        timezoneSelect.appendChild(option);
    });
    console.log("Timezone options populated.");
}

/**
 * Fetches housekeeper profile AND settings, updates the UI.
 * @param {object} elements - Object containing references to DOM elements.
 * @param {object | null} auth - The Firebase Auth service instance.
 * @param {object | null} firestoreService - The Firestore service instance.
 */
export async function loadProfileData(elements, auth, firestoreService) {
    const { userInitialsSpan, userDisplayNameH2, userEmailP, inviteCodeDisplaySpan, copyInviteCodeBtn, timezoneSelect } = elements;
    console.log('Loading profile and settings data...');
    const user = auth ? auth.currentUser : null;
    if (!user) {
        console.error('Cannot load data, no user logged in');
        if (userDisplayNameH2) userDisplayNameH2.textContent = 'Error loading profile';
        if (userEmailP) userEmailP.textContent = 'Please log in again.';
        if (inviteCodeDisplaySpan) inviteCodeDisplaySpan.textContent = 'Error';
        return;
    }

    // Ensure firestoreService is available
    if (!firestoreService) {
         console.error('Firestore service is not available.');
         if (userDisplayNameH2) userDisplayNameH2.textContent = 'Error loading profile (DB)';
         return;
    }

    try {
        const [profile, settings] = await Promise.all([
            firestoreService.getHousekeeperProfile(user.uid),
            firestoreService.getUserSettings(user.uid)
        ]);
        console.log('Profile data fetched (from housekeeper_profiles):', profile);
        console.log('Settings data fetched:', settings);

        currentProfileData = profile; // Update global state (consider refactoring state management)

        // Process Profile Data
        if (profile) {
            // --- Refined Display Logic --- 
            // Prioritize firstName & lastName from the profile doc for display name
            const firstName = profile.firstName || '';
            const lastName = profile.lastName || '';
            let calculatedDisplayName = `${firstName} ${lastName}`.trim();
            
            // Use company name as fallback if first/last are empty? Or profile.name? Or user email?
            // Let's prioritize First + Last, then Company Name from profile, then user email
            if (!calculatedDisplayName && profile.companyName) {
                 calculatedDisplayName = profile.companyName.trim();
            } 
            if (!calculatedDisplayName) {
                calculatedDisplayName = user.email; // Fallback to user email if name fields are blank
            }
            
            // Get email preferably from profile, fallback to auth user
            const email = profile.email || user.email; 
            // --- End Refined Display Logic --- 

            if (userDisplayNameH2) userDisplayNameH2.textContent = calculatedDisplayName || 'Name not set';
            if (userEmailP) userEmailP.textContent = email || 'Email not set';

            // Display Initials (based on refined names)
            let initials = '--';
            if (firstName && lastName) {
                initials = `${firstName[0]}${lastName[0]}`.toUpperCase();
            } else if (calculatedDisplayName && calculatedDisplayName.includes(' ')) {
                const names = calculatedDisplayName.split(' ');
                initials = `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
            } else if (calculatedDisplayName) {
                initials = calculatedDisplayName.substring(0, 2).toUpperCase();
            } 
            if (userInitialsSpan) userInitialsSpan.textContent = initials;

            // Display Invite Code
            if (profile.inviteCode) {
                if (inviteCodeDisplaySpan) {
                    inviteCodeDisplaySpan.textContent = profile.inviteCode;
                    inviteCodeDisplaySpan.classList.remove('text-gray-500', 'text-lg'); // Ensure correct style
                    inviteCodeDisplaySpan.classList.add('text-primary');
                }
                if (copyInviteCodeBtn) {
                    copyInviteCodeBtn.disabled = false;
                    // Ensure listener is attached (might need to move listener attachment)
                }
            } else {
                if (inviteCodeDisplaySpan) {
                    inviteCodeDisplaySpan.textContent = 'N/A';
                    inviteCodeDisplaySpan.classList.remove('text-primary');
                    inviteCodeDisplaySpan.classList.add('text-gray-500', 'text-lg');
                }
                if (copyInviteCodeBtn) copyInviteCodeBtn.disabled = true;
            }
        } else {
            console.warn('No profile data found for user.');
             if (userDisplayNameH2) userDisplayNameH2.textContent = user.email || 'Profile not found';
            if (userEmailP) userEmailP.textContent = '';
            if (userInitialsSpan) userInitialsSpan.textContent = (user.email || '--').substring(0,2).toUpperCase();
            if (inviteCodeDisplaySpan) inviteCodeDisplaySpan.textContent = 'N/A';
            if (copyInviteCodeBtn) copyInviteCodeBtn.disabled = true;
        }

        // Apply Timezone Setting
        currentTimezone = settings?.timezone; // Update global state
        if (timezoneSelect) {
            timezoneSelect.value = currentTimezone || '';
            console.log(`Applied timezone '${currentTimezone || ''}' to dropdown.`);
        } else {
             console.warn("loadProfileData: timezoneSelect element not found when trying to apply setting.");
        }

    } catch (error) {
        console.error('Error loading profile/settings:', error);
        currentProfileData = null;
        currentTimezone = null;
        if (userDisplayNameH2) userDisplayNameH2.textContent = 'Error loading profile';
        if (userEmailP) userEmailP.textContent = 'Could not load data.';
        if (inviteCodeDisplaySpan) inviteCodeDisplaySpan.textContent = 'Error';
        if (copyInviteCodeBtn) copyInviteCodeBtn.disabled = true;
        if (timezoneSelect) timezoneSelect.value = '';
    }
}

/**
 * Opens the edit profile modal and populates it with current data.
 * @param {object} elements - UI elements including modal and form inputs.
 */
export function openEditProfileModal(elements) {
    const { modal, backdrop, firstNameInput, lastNameInput, companyNameInput, phoneInput, modalErrorDiv } = elements;
    if (!modal || !backdrop || !firstNameInput || !lastNameInput) {
        console.error("openEditProfileModal: Required modal elements not found.");
        return;
    }

    if (currentProfileData) {
        firstNameInput.value = currentProfileData.firstName || '';
        lastNameInput.value = currentProfileData.lastName || '';
        if (companyNameInput) companyNameInput.value = currentProfileData.companyName || ''; // Optional element
        if (phoneInput) phoneInput.value = currentProfileData.phone || ''; // Optional element
    } else {
        console.warn("openEditProfileModal: No current profile data to populate modal.");
        // Optionally clear fields or show a message
        firstNameInput.value = '';
        lastNameInput.value = '';
        if (companyNameInput) companyNameInput.value = '';
        if (phoneInput) phoneInput.value = '';
    }
    
    // Clear previous errors
    if (modalErrorDiv) {
        modalErrorDiv.textContent = '';
        modalErrorDiv.classList.add('hidden');
    }

    // Show backdrop and modal
    backdrop.classList.remove('hidden');
    modal.classList.remove('hidden');
    // Add class to slide modal into view
    modal.classList.remove('translate-y-full');
    modal.classList.add('translate-y-0');

    console.log("Edit profile modal opened and positioned.");
}

/**
 * Closes the edit profile modal.
 * @param {object} elements - UI elements including modal and backdrop.
 */
export function closeEditProfileModal(elements) {
    const { modal, backdrop, modalSavingIndicator } = elements;
    if (!modal || !backdrop) {
        console.error("closeEditProfileModal: Modal elements not found.");
        return;
    }
    
    // Hide backdrop and modal
    backdrop.classList.add('hidden');
    // Add class to slide modal out of view before hiding
    modal.classList.remove('translate-y-0');
    modal.classList.add('translate-y-full');

    // Optional: Delay adding 'hidden' to allow transition to finish
    // setTimeout(() => {
    //     modal.classList.add('hidden'); 
    // }, 300); // Match transition duration
    modal.classList.add('hidden'); // Hide immediately for now

    // Hide saving indicator if it was visible
    if (modalSavingIndicator) {
        modalSavingIndicator.classList.add('hidden');
    }
    console.log("Edit profile modal closed and positioned.");
}

/**
 * Handles the submission of the edit profile form.
 * Validates input, calls Firestore update, handles UI feedback.
 * @param {Event} event - The form submission event.
 * @param {object} elements - UI elements.
 * @param {object | null} auth - Firebase Auth service instance.
 * @param {object | null} firestoreService - Firestore service instance.
 */
export async function handleProfileSave(event, elements, auth, firestoreService) {
    event.preventDefault(); // Prevent default form submission
    console.log("handleProfileSave called");

    const { 
        firstNameInput, lastNameInput, companyNameInput, phoneInput, 
        saveProfileBtn, modalSavingIndicator, modalErrorDiv, 
    } = elements;

    const user = auth ? auth.currentUser : null;

    // Basic checks
    if (!user) {
        console.error("Save Profile Error: No user logged in.");
        if (modalErrorDiv) modalErrorDiv.textContent = "Error: You are not logged in.";
        if (modalErrorDiv) modalErrorDiv.classList.remove('hidden');
        return;
    }
    if (!firestoreService) {
        console.error("Save Profile Error: Firestore service not available.");
        if (modalErrorDiv) modalErrorDiv.textContent = "Error: Database service unavailable.";
        if (modalErrorDiv) modalErrorDiv.classList.remove('hidden');
        return;
    }

    // Get form data
    const firstName = firstNameInput.value.trim();
    const lastName = lastNameInput.value.trim();
    const companyName = companyNameInput ? companyNameInput.value.trim() : ''; // Optional
    const phone = phoneInput.value.trim();

    // --- Validation --- 
    let errorMessage = '';
    if (!firstName) errorMessage = "First Name is required.";
    else if (!lastName) errorMessage = "Last Name is required.";
    else if (!phone) errorMessage = "Phone number is required.";
    // Add more specific phone validation if needed

    if (errorMessage) {
        console.warn("Save Profile Validation Error:", errorMessage);
        if (modalErrorDiv) modalErrorDiv.textContent = errorMessage;
        if (modalErrorDiv) modalErrorDiv.classList.remove('hidden');
        return; // Stop execution if validation fails
    }

    // Clear previous errors and show saving state
    if (modalErrorDiv) modalErrorDiv.classList.add('hidden');
    if (modalSavingIndicator) modalSavingIndicator.classList.remove('hidden');
    if (modalSavingIndicator) modalSavingIndicator.textContent = 'Saving...';
    if (saveProfileBtn) saveProfileBtn.disabled = true;

    // Prepare data payload
    const profileData = {
        firstName,
        lastName,
        phone,
        companyName: companyName || null, // Store null if empty, consistent with read logic
        // Ensure other fields needed by firestoreService.updateHousekeeperProfileAndUser are included
    };

    try {
        console.log("Attempting to update profile with data:", profileData);
        await firestoreService.updateHousekeeperProfileAndUser(user.uid, profileData);
        console.log("Profile update successful.");
        
        // Close modal on success
        closeEditProfileModal(elements); 
        
        // Optionally, refresh profile data displayed on the page
        await loadProfileData(elements, auth, firestoreService); // Re-load data

    } catch (error) {
        console.error("Error saving profile:", error);
        if (modalErrorDiv) modalErrorDiv.textContent = "Error saving profile. Please try again.";
        if (modalErrorDiv) modalErrorDiv.classList.remove('hidden');
    } finally {
        // Hide saving indicator and re-enable button regardless of success/failure
        if (modalSavingIndicator) modalSavingIndicator.classList.add('hidden');
        if (modalSavingIndicator) modalSavingIndicator.textContent = '';
        if (saveProfileBtn) saveProfileBtn.disabled = false;
    }
}

// Other functions (saveTimezoneSetting, modal handlers, etc.) would be moved here too and exported

// --- Initialization Function --- 
function initProfilePage() {
    console.log('Profile settings script initializing...');
    
    // Get Auth service instance
    const authInstance = window.firebase?.auth();
    if (!authInstance) {
        console.error("Firebase Auth service not available during init.");
        // Handle error state appropriately in the UI
        return;
    }
    
    // Get Firestore service instance
    const firestoreInstance = window.firestoreService;
    if (!firestoreInstance) {
        console.error("Firestore service not available during init.");
        return;
    }
    
    // --- Get All UI Element References --- 
    const elements = {
         userInitialsSpan: document.getElementById('user-initials'),
         userDisplayNameH2: document.getElementById('user-display-name'),
         userEmailP: document.getElementById('user-email'),
         inviteCodeDisplaySpan: document.getElementById('invite-code-display'),
         copyInviteCodeBtn: document.getElementById('copy-invite-code-btn'),
         logoutButton: document.getElementById('logout-button'),
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
         phoneInput: document.getElementById('edit-phone'),
         timezoneSelect: document.getElementById('profile-timezone'),
         saveTimezoneButton: document.getElementById('save-timezone-button'),
         timezoneSavingIndicator: document.getElementById('timezone-saving-indicator'),
    };

    // --- Initial Setup --- 
    populateTimezoneOptions(elements.timezoneSelect);

    // --- Event Listeners --- 
    if (elements.copyInviteCodeBtn) {
        // Need to ensure this listener is added AFTER loadProfileData enables the button
        // Or add it here and rely on the disabled state.
        elements.copyInviteCodeBtn.addEventListener('click', () => { 
            // handleCopyInviteCode(elements.inviteCodeDisplaySpan, elements.copyInviteCodeBtn);
             console.log("Copy button clicked - need to implement handler");
        }); 
    }

    // Add modal listeners (These would call imported/refactored modal functions)
    // if (elements.editProfileBtn) { elements.editProfileBtn.addEventListener('click', openEditProfileModal); }
    // ... other listeners ...

    if (elements.saveTimezoneButton) {
        elements.saveTimezoneButton.addEventListener('click', () => {
            // saveTimezoneSetting(elements.timezoneSelect, elements.timezoneSavingIndicator, elements.saveTimezoneButton);
            console.log("Save timezone clicked - need to implement handler");
        });
    } else {
        console.error('Save Timezone button (#save-timezone-button) not found!');
    }

    // --- NEW: Modal Listeners ---
    if (elements.editProfileBtn && elements.modal && elements.backdrop && elements.firstNameInput && elements.lastNameInput) { 
        elements.editProfileBtn.addEventListener('click', () => openEditProfileModal(elements));
    } else {
        console.warn('Could not attach listener to Edit Profile button - some elements missing.');
    }

    if (elements.closeModalBtn && elements.modal && elements.backdrop) {
        elements.closeModalBtn.addEventListener('click', () => closeEditProfileModal(elements));
    } else {
        console.warn('Could not attach listener to Modal Close button - some elements missing.');
    }

    if (elements.cancelModalBtn && elements.modal && elements.backdrop) {
        elements.cancelModalBtn.addEventListener('click', () => closeEditProfileModal(elements));
    } else {
        console.warn('Could not attach listener to Modal Cancel button - some elements missing.');
    }

    if (elements.backdrop && elements.modal) {
        elements.backdrop.addEventListener('click', () => closeEditProfileModal(elements));
    } else {
        console.warn('Could not attach listener to Modal Backdrop - some elements missing.');
    }
    
    // --- Attach listener for profile form submission ---
    if (elements.profileForm) {
        elements.profileForm.addEventListener('submit', (event) => {
            // Pass dependencies to the handler
            handleProfileSave(event, elements, authInstance, firestoreInstance);
        });
    } else {
       console.warn('Profile form (#edit-profile-form) not found, cannot attach save listener.');
    }

    // Authentication listener
    authInstance.onAuthStateChanged(async (user) => {
        if (user) {
            console.log('User logged in, loading data...');
            await loadProfileData(elements, authInstance, firestoreInstance);
        } else {
            console.log('User logged out, clearing profile fields.');
            if (elements.userDisplayNameH2) elements.userDisplayNameH2.textContent = 'Logged Out';
            if (elements.userEmailP) elements.userEmailP.textContent = '';
            if (elements.userInitialsSpan) elements.userInitialsSpan.textContent = '--';
            if (elements.inviteCodeDisplaySpan) elements.inviteCodeDisplaySpan.textContent = 'N/A';
            // Disable buttons, remove listeners if needed
        }
    });
}

// --- DOMContentLoaded Listener (Minimal) --- 
document.addEventListener('DOMContentLoaded', initProfilePage); 