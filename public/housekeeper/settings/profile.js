// public/housekeeper/settings/profile.js

// --- Firebase Services (Assuming global availability from firebase-config.js) ---
// REMOVED: const firestoreService = window.firestoreService;

// --- State --- (Moved outside, but might need better state management later)
let currentProfileData = null;
let currentTimezone = null;
let currentUserData = null; // <<< NEW: To store the /users/{uid} document data

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
    const { 
        userInitialsSpan, userDisplayNameH2, userEmailP, 
        inviteCodeDisplaySpan, copyInviteCodeBtn, timezoneSelect,
        referralsEnabledToggle, referralStatusMessage,
        targetHourlyRateInput, baseLocationZipCodeInput // <<< NEW AI Prefs DOM elements
    } = elements;
    console.log('Loading profile and settings data...');
    const user = auth ? auth.currentUser : null;
    if (!user) {
        console.error('Cannot load data, no user logged in');
        if (userDisplayNameH2) userDisplayNameH2.textContent = 'Error loading profile';
        if (userEmailP) userEmailP.textContent = 'Please log in again.';
        if (inviteCodeDisplaySpan) inviteCodeDisplaySpan.textContent = 'Error';
        // --- NEW: Handle referral UI on error ---
        if (referralsEnabledToggle) referralsEnabledToggle.disabled = true;
        if (referralStatusMessage) referralStatusMessage.textContent = 'Could not load settings.';
        // --- END NEW ---
        return;
    }

    if (!firestoreService) {
         console.error('Firestore service is not available.');
         if (userDisplayNameH2) userDisplayNameH2.textContent = 'Error loading profile (DB)';
        // --- NEW: Handle referral UI on error ---
        if (referralsEnabledToggle) referralsEnabledToggle.disabled = true;
        if (referralStatusMessage) referralStatusMessage.textContent = 'Database service unavailable.';
        // --- END NEW ---
         return;
    }

    try {
        // Fetch housekeeper_profile, user_settings, and the main user document
        const [profile, settings, userDataDoc] = await Promise.all([
            firestoreService.getHousekeeperProfile(user.uid),
            firestoreService.getUserSettings(user.uid),
            firestoreService.getUserProfile(user.uid) // <<< FETCH MAIN USER DOC (already gets /users/{uid})
        ]);
        console.log('Profile data fetched (from housekeeper_profiles):', profile);
        console.log('Settings data fetched (from /users/uid/settings/app):', settings);
        console.log('User core data fetched (from /users/uid):', userDataDoc); // <<< LOG USER DATA

        currentProfileData = profile; 
        currentUserData = userDataDoc; // <<< STORE USER DATA

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

        // --- NEW: Apply Referral Setting ---
        if (userDataDoc && referralsEnabledToggle && referralStatusMessage) {
            const referralsEnabled = userDataDoc.referralsEnabled || false; // Default to false if undefined
            referralsEnabledToggle.checked = referralsEnabled;
            referralsEnabledToggle.disabled = false;
            referralStatusMessage.textContent = referralsEnabled ? 'Referrals are currently enabled.' : 'Referrals are currently disabled.';
        } else {
            if (referralsEnabledToggle) referralsEnabledToggle.disabled = true;
            if (referralStatusMessage) referralStatusMessage.textContent = 'Could not load referral setting.';
        }
        // --- END NEW ---

        // --- NEW: Apply AI Quoting Preferences ---
        if (userDataDoc && targetHourlyRateInput && baseLocationZipCodeInput) {
            targetHourlyRateInput.value = userDataDoc.targetHourlyRate || '';
            baseLocationZipCodeInput.value = userDataDoc.baseLocation?.zipCode || '';
            console.log('Applied AI Quoting Preferences from user data:', {
                targetHourlyRate: userDataDoc.targetHourlyRate,
                zipCode: userDataDoc.baseLocation?.zipCode
            });
        } else {
            if (targetHourlyRateInput) targetHourlyRateInput.value = '';
            if (baseLocationZipCodeInput) baseLocationZipCodeInput.value = '';
            console.warn('Could not load AI Quoting Preferences or elements not found.');
        }
        // --- END NEW ---

    } catch (error) {
        console.error('Error loading profile/settings/user data:', error);
        currentProfileData = null;
        currentTimezone = null;
        if (userDisplayNameH2) userDisplayNameH2.textContent = 'Error loading profile';
        if (userEmailP) userEmailP.textContent = 'Could not load data.';
        if (inviteCodeDisplaySpan) inviteCodeDisplaySpan.textContent = 'Error';
        if (copyInviteCodeBtn) copyInviteCodeBtn.disabled = true;
        if (timezoneSelect) timezoneSelect.value = '';
        // --- NEW: Handle referral UI on major error ---
        if (referralsEnabledToggle) referralsEnabledToggle.disabled = true;
        if (referralStatusMessage) referralStatusMessage.textContent = 'Error loading settings.';
        // --- END NEW ---
        // --- NEW: Handle AI Prefs UI on major error ---
        if (targetHourlyRateInput) targetHourlyRateInput.value = '';
        if (baseLocationZipCodeInput) baseLocationZipCodeInput.value = '';
        // --- END NEW ---
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
         referralsEnabledToggle: document.getElementById('referrals-enabled-toggle'),
         referralStatusMessage: document.getElementById('referral-status-message'),
         targetHourlyRateInput: document.getElementById('profile-targetHourlyRate'),
         baseLocationZipCodeInput: document.getElementById('profile-baseLocationZipCode'),
         saveAiPrefsBtn: document.getElementById('save-ai-prefs-button'),
         aiPrefsSavingIndicator: document.getElementById('ai-prefs-saving-indicator'),
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
            console.log('User authenticated, initializing profile page features for:', user.uid);
            // Pass the auth instance and firestoreService to loadProfileData
            loadProfileData(elements, authInstance, firestoreInstance);

            // Edit Profile Modal listeners (if elements exist)
            if (elements.editProfileBtn && elements.modal && elements.backdrop && elements.closeModalBtn && elements.cancelModalBtn && elements.profileForm) {
                elements.editProfileBtn.addEventListener('click', () => openEditProfileModal(elements));
                elements.closeModalBtn.addEventListener('click', () => closeEditProfileModal(elements));
                elements.cancelModalBtn.addEventListener('click', () => closeEditProfileModal(elements));
                elements.profileForm.addEventListener('submit', (event) => handleProfileSave(event, elements, authInstance, firestoreInstance));
                // Backdrop click to close modal
                elements.backdrop.addEventListener('click', (event) => {
                    if (event.target === elements.backdrop) { // Ensure click is on backdrop itself
                        closeEditProfileModal(elements);
                    }
                });
            } else {
                console.warn("One or more edit profile modal elements not found. Edit functionality may be affected.");
            }

            // Copy Invite Code button
            if (elements.copyInviteCodeBtn) {
                elements.copyInviteCodeBtn.addEventListener('click', () => {
                    const code = elements.inviteCodeDisplaySpan ? elements.inviteCodeDisplaySpan.textContent : '';
                    if (code && code !== 'LOADING...' && code !== 'N/A') {
                        navigator.clipboard.writeText(code).then(() => {
                            showToast('Invite code copied!');
                        }).catch(err => {
                            console.error('Failed to copy invite code:', err);
                            showToast('Failed to copy code', 'error');
                        });
                    }
                });
            }

            // Timezone Save Button
            if (elements.saveTimezoneButton) {
                elements.saveTimezoneButton.addEventListener('click', () => {
                    handleTimezoneSave(elements, authInstance, firestoreInstance);
                });
            }

            // Referrals Enabled Toggle
            if (elements.referralsEnabledToggle) {
                elements.referralsEnabledToggle.addEventListener('change', (event) => {
                    handleReferralToggle(event, elements, authInstance, firestoreInstance);
                });
            }

            // Logout Button
            if (elements.logoutButton) {
                elements.logoutButton.addEventListener('click', () => {
                    console.log('Logout initiated from profile page.');
                    if (window.authService && typeof window.authService.logout === 'function') {
                        window.authService.logout();
                    } else if (firebase && firebase.auth) { // Fallback for direct SDK usage
                        firebase.auth().signOut().then(() => {
                            window.location.href = '/'; // Redirect to root (login)
                        }).catch(err => console.error('Logout error:', err));
                    } else {
                        console.error('Auth service not available for logout.');
                        alert('Logout function not available.');
                    }
                });
            }

            // --- NEW: Attach listener for Save AI Preferences button ---
            if (elements.saveAiPrefsBtn) {
                elements.saveAiPrefsBtn.addEventListener('click', () => {
                    // Pass the uiElements object directly, handleAiPrefsSave can destructure it
                    handleAiPrefsSave(elements, authInstance, firestoreInstance); 
                });
                console.log("Event listener for 'Save AI Preferences' button attached.");
            } else {
                console.warn("'Save AI Preferences' button (save-ai-prefs-button) not found during init.");
            }
            // --- END NEW ---

            // Initial data load - MOVED TO BE CALLED EARLIER, right after user check
            // loadProfileData(elements, authInstance, firestoreInstance);

        } else {
            console.log("User not authenticated. Auth Router should handle redirection.");
            // UI should ideally show a loading state or a message if auth takes time,
            // or be hidden until auth completes and redirects.
        }
    });
}

// --- DOMContentLoaded Listener (Minimal) --- 
document.addEventListener('DOMContentLoaded', initProfilePage); 

function showToast(message, type = 'info', duration = 3000) {
    // Basic toast implementation (can be improved)
    const toastContainer = document.body;
    let toast = document.getElementById('profile-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'profile-toast';
        toast.className = 'fixed top-5 right-5 p-3 rounded-md shadow-lg text-white text-sm z-50';
        toastContainer.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.backgroundColor = type === 'success' ? '#4CAF50' : (type === 'error' ? '#F44336' : '#2196F3');
    toast.style.opacity = 1;
    toast.style.transform = 'translateX(0)';

    setTimeout(() => {
        toast.style.opacity = 0;
        toast.style.transform = 'translateX(100%)';
    }, duration);
}

// Minimal toast function (can be replaced with a more robust one if available globally)
// function showToast(message, type = 'info', duration = 3000) { ... } // Already defined above or use global

// --- DOMContentLoaded Listener ---
document.addEventListener('DOMContentLoaded', initProfilePage); 

// --- NEW: Handler for saving AI Quoting Preferences ---
/**
 * Saves the AI Quoting Preferences (target hourly rate and base location zip code).
 * @param {object} elements - UI elements including inputs and saving indicator.
 * @param {object} auth - The Firebase Auth service instance.
 * @param {object} firestoreService - The Firestore service instance.
 */
export async function handleAiPrefsSave(elements, auth, firestoreService) {
    console.log('Attempting to save AI Quoting Preferences...');
    const { targetHourlyRateInput, baseLocationZipCodeInput, aiPrefsSavingIndicator, saveAiPrefsBtn } = elements;

    const user = auth ? auth.currentUser : null;
    if (!user) {
        console.error('Cannot save AI preferences, no user logged in');
        showToast('Error: You are not logged in.', 'error');
        return;
    }

    if (!firestoreService) {
        console.error('Firestore service is not available for saving AI preferences.');
        showToast('Error: Database service unavailable.', 'error');
        return;
    }

    if (!targetHourlyRateInput || !baseLocationZipCodeInput || !aiPrefsSavingIndicator || !saveAiPrefsBtn) {
        console.error('One or more AI preference UI elements are missing.');
        showToast('Error: UI elements missing, cannot save.', 'error');
        return;
    }

    const rateValue = targetHourlyRateInput.value.trim();
    const zipCodeValue = baseLocationZipCodeInput.value.trim();

    const targetHourlyRate = rateValue ? parseFloat(rateValue) : null;
    
    if (rateValue && (isNaN(targetHourlyRate) || targetHourlyRate <= 0)) {
        showToast('Please enter a valid positive number for target hourly wage.', 'error');
        targetHourlyRateInput.focus();
        return;
    }
    
    // Basic zip code validation (e.g., 5 digits or 5+4 for US, or allow alphanumeric for international flexibility)
    if (zipCodeValue && !/^[a-zA-Z0-9\s-]{3,10}$/.test(zipCodeValue)) {
        showToast('Please enter a valid Zip/Postal Code.', 'error');
        baseLocationZipCodeInput.focus();
        return;
    }

    aiPrefsSavingIndicator.textContent = 'Saving...';
    saveAiPrefsBtn.disabled = true;

    try {
        const dataToUpdate = {
            // Construct the aiPreferences map directly for clarity and to match DB structure
            aiPreferences: {
                targetHourlyRate: targetHourlyRate, // Will be null if empty, or a number
                baseLocation: {
                    zipCode: zipCodeValue || null // Store null if empty
                }
            }
            // No need to add updatedAt here, updateUserDocument will do it.
        };

        // Call the new generic function to update the /users/{uid} document
        await firestoreService.updateUserDocument(user.uid, dataToUpdate);

        // Update local state if needed (currentUserData directly stores fields from /users/{uid})
        if (currentUserData) {
            currentUserData.aiPreferences = dataToUpdate.aiPreferences; // Update the whole map
        }

        aiPrefsSavingIndicator.textContent = 'Saved!';
        showToast('AI Quoting Preferences saved successfully!', 'success');
        console.log('AI Quoting Preferences updated in Firestore.');
    } catch (error) {
        console.error('Error saving AI Quoting Preferences:', error);
        aiPrefsSavingIndicator.textContent = 'Save failed.';
        showToast(`Error saving preferences: ${error.message}`, 'error');
    } finally {
        saveAiPrefsBtn.disabled = false;
        setTimeout(() => {
            if (aiPrefsSavingIndicator.textContent === 'Saved!' || aiPrefsSavingIndicator.textContent === 'Save failed.') {
                 aiPrefsSavingIndicator.textContent = '';
            }
        }, 3000);
    }
}
// --- END NEW --- 