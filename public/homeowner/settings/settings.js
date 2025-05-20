// UI Elements
const loadingStateDiv = document.getElementById('loading-state');
const contentLoadedDiv = document.getElementById('content-loaded');
const propertySettingsForm = document.getElementById('property-settings-form');
const sqFootageInput = document.getElementById('square-footage');
const numBedroomsInput = document.getElementById('num-bedrooms');
const numBathroomsInput = document.getElementById('num-bathrooms');
const homeTypeSelect = document.getElementById('home-type');
const savePropertySettingsBtn = document.getElementById('save-property-settings-btn');
const propertyStatusMessage = document.getElementById('property-status-message');
const logoutBtn = document.getElementById('logout-btn');

let currentUser = null;

/**
 * Loads homeowner profile data and populates the form.
 */
async function loadProfileData() {
    if (!currentUser) {
        console.error('User not authenticated for loading profile data.');
        propertyStatusMessage.textContent = 'You must be logged in to view settings.';
        propertyStatusMessage.className = 'text-red-500';
        loadingStateDiv.classList.add('hidden');
        contentLoadedDiv.classList.remove('hidden'); // Show content to display error
        return;
    }

    try {
        loadingStateDiv.classList.remove('hidden');
        contentLoadedDiv.classList.add('hidden');

        const profile = await window.firestoreService.getHomeownerProfile(currentUser.uid);

        if (profile) {
            sqFootageInput.value = profile.squareFootage || '';
            numBedroomsInput.value = profile.numBedrooms || '';
            numBathroomsInput.value = profile.numBathrooms || '';
            homeTypeSelect.value = profile.homeType || '';
        } else {
            console.log('No homeowner profile found for user:', currentUser.uid);
            // Initialize form with empty values if no profile exists
            sqFootageInput.value = '';
            numBedroomsInput.value = '';
            numBathroomsInput.value = '';
            homeTypeSelect.value = '';
        }
    } catch (error) {
        console.error('Error loading homeowner profile:', error);
        propertyStatusMessage.textContent = 'Error loading your property details. Please try again.';
        propertyStatusMessage.className = 'mt-4 text-sm text-red-500';
    } finally {
        loadingStateDiv.classList.add('hidden');
        contentLoadedDiv.classList.remove('hidden');
    }
}

/**
 * Handles saving the property settings.
 * @param {Event} event The form submission event.
 */
async function handleSavePropertySettings(event) {
    event.preventDefault();
    if (!currentUser) {
        propertyStatusMessage.textContent = 'You must be logged in to save settings.';
        propertyStatusMessage.className = 'mt-4 text-sm text-red-500';
        return;
    }

    savePropertySettingsBtn.disabled = true;
    savePropertySettingsBtn.textContent = 'Saving...';
    propertyStatusMessage.textContent = ''; // Clear previous messages

    const settingsUpdate = {
        squareFootage: parseInt(sqFootageInput.value, 10) || null,
        numBedrooms: parseInt(numBedroomsInput.value, 10) || null,
        numBathrooms: parseFloat(numBathroomsInput.value) || null,
        homeType: homeTypeSelect.value || null,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };

    try {
        await window.firestoreService.updateHomeownerProfile(currentUser.uid, settingsUpdate);
        propertyStatusMessage.textContent = 'Property details saved successfully!';
        propertyStatusMessage.className = 'mt-4 text-sm text-green-600';
        console.log('Homeowner profile updated successfully.');
    } catch (error) {
        console.error('Error updating homeowner profile:', error);
        propertyStatusMessage.textContent = 'Error saving details. Please try again.';
        propertyStatusMessage.className = 'mt-4 text-sm text-red-500';
    } finally {
        savePropertySettingsBtn.disabled = false;
        savePropertySettingsBtn.textContent = 'Save Property Details';
    }
}

/**
 * Initializes the settings page: handles auth and loads data.
 */
function initSettingsPage() {
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            console.log('Homeowner authenticated for settings:', currentUser.uid);
            await loadProfileData();
            propertySettingsForm.addEventListener('submit', handleSavePropertySettings);
            
            logoutBtn.addEventListener('click', async () => {
                try {
                    await firebase.auth().signOut();
                    console.log('User logged out.');
                    window.location.href = '/'; // Redirect to login/home page
                } catch (error) {
                    console.error('Error logging out:', error);
                    propertyStatusMessage.textContent = 'Error logging out. Please try again.';
                    propertyStatusMessage.className = 'mt-4 text-sm text-red-500';
                }
            });

        } else {
            console.log('User not authenticated. Redirecting to login from settings.');
            currentUser = null;
            // Redirect to login (or a more specific landing page if applicable)
            window.location.href = '/'; 
        }
    });
}

// Initialize the page when the script loads
initSettingsPage(); 