// Homeowner Dashboard Logic
document.addEventListener('DOMContentLoaded', () => {
    console.log('Homeowner dashboard script loaded.');

    // Get references to the different view sections
    const notLinkedView = document.getElementById('not-linked-view');
    const linkedView = document.getElementById('linked-view');
    const bookingsLoadingPlaceholder = document.getElementById('bookings-loading-placeholder');
    const upcomingBookingsList = document.getElementById('upcoming-bookings-list');
    const noUpcomingBookings = document.getElementById('no-upcoming-bookings');
    const inviteCodeForm = document.getElementById('invite-code-form');
    console.log('[DEBUG] invite-code-form element:', inviteCodeForm);
    const inviteCodeInput = document.getElementById('invite-code-input');
    const submitInviteCodeBtn = document.getElementById('submit-invite-code-btn');
    console.log('[DEBUG] submitInviteCodeBtn element:', submitInviteCodeBtn);
    const inviteErrorMessage = document.getElementById('invite-error-message');

    // Button references
    const goToSettingsBtn = document.getElementById('go-to-settings-btn');
    const bookNewCleaningBtn = document.getElementById('book-new-cleaning-btn');
    const viewAllBookingsBtn = document.getElementById('view-all-bookings-btn');
    const managePropertiesBtn = document.getElementById('manage-properties-btn');

    // Add event listeners for navigation buttons
    // goToSettingsBtn?.addEventListener('click', () => {
    //    window.location.href = 'settings/settings.html';
    // });

    bookNewCleaningBtn?.addEventListener('click', () => {
        // TODO: Determine correct navigation target for booking flow
        alert('Navigate to booking flow - TBD'); 
        // Example: window.location.href = 'bookings/new-booking.html';
    });

    viewAllBookingsBtn?.addEventListener('click', () => {
        window.location.href = 'bookings/bookings.html';
    });

    managePropertiesBtn?.addEventListener('click', () => {
        window.location.href = 'properties/properties.html';
    });

    // --- Invite Code Button Click Handler ---
    // Changed from form submit to button click
    submitInviteCodeBtn?.addEventListener('click', async (e) => {
        // No need for e.preventDefault() on button click
        console.log('Link Account button clicked.'); // Add log to confirm listener fires
        
        // --- FIX: Get input element INSIDE handler ---
        const inviteCodeInput = document.getElementById('inviteCodeInput'); 
        // --- END FIX ---
        
        if (!firebase.auth().currentUser) {
            console.error('No user logged in to link.');
            return;
        }
        const homeownerId = firebase.auth().currentUser.uid;
        // Ensure inviteCodeInput is available
        if (!inviteCodeInput) {
             console.error('Invite code input element not found.');
             return;
        }
        const inviteCode = inviteCodeInput.value.trim();

        // Basic validation
        if (!inviteCode || inviteCode.length !== 6) {
            if (inviteErrorMessage) { // Check if error element exists
                inviteErrorMessage.textContent = 'Please enter a 6-character code.';
                inviteErrorMessage.classList.remove('hidden');
            }
            return;
        }

        // Disable button, clear error
        submitInviteCodeBtn.disabled = true;
        submitInviteCodeBtn.textContent = 'Linking...'; // Indicate loading
        if (inviteErrorMessage) inviteErrorMessage.classList.add('hidden');

        try {
            const result = await firestoreService.linkHomeownerToHousekeeper(homeownerId, inviteCode);

            if (result.success) {
                console.log('Successfully linked to housekeeper:', result.housekeeperId);
                // Reload dashboard data to switch view
                await loadDashboardData(firebase.auth().currentUser);
                // Clear input after success
                inviteCodeInput.value = ''; 
            } else {
                console.error('Failed to link:', result.message);
                 if (inviteErrorMessage) { // Check if error element exists
                    inviteErrorMessage.textContent = result.message || 'Invalid code or error occurred.';
                    inviteErrorMessage.classList.remove('hidden');
                 }
            }
        } catch (error) {
            // Catch unexpected errors from the service call itself
            console.error('Unexpected error during linking:', error);
            if (inviteErrorMessage) { // Check if error element exists
                inviteErrorMessage.textContent = 'An unexpected error occurred. Please try again.';
                inviteErrorMessage.classList.remove('hidden');
            }
        } finally {
            // Re-enable button
            submitInviteCodeBtn.disabled = false;
            submitInviteCodeBtn.textContent = 'Link Account';
        }
    });

    // Function to fetch and display dashboard data
    const loadDashboardData = async (user) => {
        // Get Element References INSIDE the function to ensure DOM is ready
        const linkedView = document.getElementById('linkedView'); 
        const notLinkedView = document.getElementById('unlinkedView'); // Corrected ID from HTML
        const loadingIndicator = document.getElementById('loadingIndicator');

        // Hide loading indicator once we start loading data
        if (loadingIndicator) loadingIndicator.classList.add('hidden');

        // Check if elements exist before proceeding
        if (!linkedView || !notLinkedView) {
            console.error('Dashboard view elements (#linkedView or #unlinkedView) not found in the DOM.');
            // Maybe show a generic error message to the user?
            return; 
        }

        if (!user) {
            console.log('No user logged in, showing unlinked view by default.');
            // Default to unlinked view if no user
            notLinkedView.classList.remove('hidden');
            linkedView.classList.add('hidden');
            return;
        }
        const userId = user.uid;
        console.log('Loading dashboard data for user:', userId);

        try {
            // Fetch the specific homeowner profile
            const homeownerProfile = await firestoreService.getHomeownerProfile(userId);
            console.log('Homeowner profile fetched:', homeownerProfile);

            // Check for the linked housekeeper ID 
            const linkedHousekeeperId = homeownerProfile?.linkedHousekeeperId;

            if (linkedHousekeeperId) {
                console.log('User is linked to housekeeper:', linkedHousekeeperId);
                // Ensure elements exist before modifying classList
                if (linkedView && notLinkedView) {
                     linkedView.classList.remove('hidden');
                     notLinkedView.classList.add('hidden');
                }
                // Load data for the linked view
                loadLinkedData(userId, linkedHousekeeperId, homeownerProfile);

            } else {
                console.log('User is not linked to a housekeeper.');
                 // Ensure elements exist before modifying classList
                if (linkedView && notLinkedView) {
                    notLinkedView.classList.remove('hidden');
                    linkedView.classList.add('hidden');
                }
            }

        } catch (error) {
            console.error('Error loading dashboard data:', error);
             // Ensure elements exist before modifying classList
            if (linkedView && notLinkedView) {
                // Show the unlinked view on error
                notLinkedView.classList.remove('hidden');
                linkedView.classList.add('hidden');
            }
        }
    };

    // NEW Function to load data specific to the linked state
    const loadLinkedData = async (userId, housekeeperId, homeownerProfile) => {
        // 1. Populate Housekeeper Info
        populateHousekeeperInfo(housekeeperId);
        
        // 2. Populate Next Cleaning
        populateNextCleaning(userId, housekeeperId);
        
        // 3. Populate Recent History
        populateRecentHistory(userId, housekeeperId);
        
        // 4. Populate Homeowner Address (used in next cleaning card)
        populateHomeownerAddress(homeownerProfile);
        
        // 5. Add Event Listeners for buttons
        addEventListeners(userId); // Pass userId if needed for unlink
    }

    // NEW Function to populate housekeeper info
    const populateHousekeeperInfo = async (housekeeperId) => {
        const nameEl = document.getElementById('housekeeperName');
        const companyEl = document.getElementById('housekeeperCompany');
        try {
            // We need a service function to get housekeeper profile by ID
            const housekeeperProfile = await firestoreService.getHousekeeperProfile(housekeeperId); 
            if (housekeeperProfile && nameEl) {
                nameEl.textContent = `${housekeeperProfile.firstName || ''} ${housekeeperProfile.lastName || ''}`.trim();
                if (companyEl) {
                    companyEl.textContent = housekeeperProfile.companyName || '';
                }
            } else if (nameEl) {
                 nameEl.textContent = 'Housekeeper details not found.';
            }
        } catch (error) {
            console.error('Error fetching housekeeper profile:', error);
            if (nameEl) nameEl.textContent = 'Error loading details.';
        }
    };
    
    // NEW Function to populate homeowner address in Next Cleaning card
    const populateHomeownerAddress = (homeownerProfile) => {
        const addressEl = document.getElementById('nextCleaningAddress');
        if (addressEl && homeownerProfile) {
            // Construct address line - adjust based on available fields
            const addressParts = [
                homeownerProfile.address,
                homeownerProfile.city,
                homeownerProfile.state,
                homeownerProfile.zip
            ].filter(part => part); // Remove empty parts
            addressEl.textContent = addressParts.join(', ') || 'Address not set';
        } else if (addressEl) {
             addressEl.textContent = 'Address not available.';
        }
    };

    // REPURPOSED Function to populate the NEXT booking 
    const populateNextCleaning = async (userId, housekeeperId) => {
        console.log(`Fetching next cleaning for user ${userId} with housekeeper ${housekeeperId}`);
        const dateTimeEl = document.getElementById('nextCleaningDateTime');
        const serviceEl = document.getElementById('nextCleaningService');
        // Keep address population separate as it comes from homeowner profile
        
        if (!dateTimeEl || !serviceEl) {
            console.error('Next cleaning elements not found');
            return;
        }
        
        dateTimeEl.textContent = 'Loading...';
        serviceEl.textContent = 'Loading service details...';

        try {
            // Fetch only ONE upcoming booking
            const bookings = await firestoreService.getUpcomingHomeownerBookings(userId, housekeeperId, 1); // Add limit parameter

            if (bookings && bookings.length > 0) {
                const nextBooking = bookings[0];
                
                // Construct the date/time string - Assuming startTime might be like "08:00 AM"
                // Try combining with a space, which Date constructor might parse better.
                const bookingDateTimeString = `${nextBooking.date} ${nextBooking.startTime || '00:00'}`; 
                const bookingDate = new Date(bookingDateTimeString);

                // Check if the date object is valid
                if (isNaN(bookingDate.getTime())) { 
                    console.error('Failed to parse booking date/time:', bookingDateTimeString);
                    // Fallback or alternative parsing if needed?
                    // Maybe try ISO format *if* startTime is strictly HH:mm (24-hour)?
                    // const isoString = `${nextBooking.date}T${nextBooking.startTime}:00`;
                    // const isoDate = new Date(isoString);
                    // if (!isNaN(isoDate.getTime())) { ... } else { dateTimeEl.textContent = 'Invalid Date Format'; }
                    dateTimeEl.textContent = 'Invalid Date Format'; // Keep simple error for now
                } else {
                    // Use toLocaleString for date and time formatting
                    dateTimeEl.textContent = bookingDate.toLocaleString(undefined, { 
                        month: 'long', 
                        day: 'numeric', 
                        hour: 'numeric', 
                        minute: '2-digit', 
                        hour12: true // Use AM/PM 
                    });
                }
                
                serviceEl.textContent = nextBooking.serviceType || 'House Cleaning'; // Assuming serviceType field, add default
            } else {
                dateTimeEl.textContent = 'No upcoming cleanings';
                serviceEl.textContent = '';
            }
        } catch (error) {
            console.error('Error loading next cleaning:', error);
            dateTimeEl.textContent = 'Error loading';
            serviceEl.textContent = 'Error loading details.';
        }
    };
    
    // NEW Function to populate recent history
    const populateRecentHistory = async (userId, housekeeperId) => {
        console.log(`Fetching recent history for user ${userId} with housekeeper ${housekeeperId}`);
        const historyListEl = document.getElementById('recentHistoryList');
        if (!historyListEl) return;
        
        historyListEl.innerHTML = '<p class="text-gray-500">Loading history...</p>'; // Loading state
        
        try {
            // *** NEED NEW Service function: getPastHomeownerBookings(userId, housekeeperId, limit) ***
            const pastBookings = await firestoreService.getPastHomeownerBookings(userId, housekeeperId, 5); // Get last 5 completed
            
            if (pastBookings && pastBookings.length > 0) {
                historyListEl.innerHTML = ''; // Clear loading state
                pastBookings.forEach(booking => {
                    const item = createHistoryListItem(booking);
                    historyListEl.appendChild(item);
                });
            } else {
                 historyListEl.innerHTML = '<p class="text-gray-500">No past cleaning history found.</p>';
            }
        } catch (error) {
            console.error('Error loading recent history:', error);
            historyListEl.innerHTML = '<p class="text-red-500">Error loading history.</p>';
        }
    };
    
    // NEW Helper to create history list item
    function createHistoryListItem(booking) {
        const div = document.createElement('div');
        // Add cursor-pointer and hover effect if clickable
        div.className = 'bg-white p-3 rounded-lg shadow flex justify-between items-center cursor-pointer hover:bg-gray-50'; 
        div.dataset.bookingId = booking.id; // Store ID for click handler
        
        const bookingDate = new Date(booking.date + 'T00:00:00'); // Use date only for display
        const dateString = bookingDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });

        div.innerHTML = `
            <div>
                <p class="font-medium text-gray-900">${booking.serviceType || 'House Cleaning'}</p>
                <p class="text-sm text-gray-600">${dateString}</p>
            </div>
            <div class="flex items-center space-x-2">
                 <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Completed</span>
                 <svg class="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"> <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" /> </svg>
            </div>
        `;
        
        // Add click listener for receipt/details
        div.addEventListener('click', () => {
            console.log('View history/receipt for booking:', booking.id);
            alert('Show receipt modal/view - TBD');
        });
        
        return div;
    }

    // NEW: Modal Elements
    const profileEditModal = document.getElementById('profileEditModal');
    const profileEditModalBackdrop = document.getElementById('profileEditModalBackdrop');
    const profileEditForm = document.getElementById('profileEditForm');
    const closeProfileEditModalButton = document.getElementById('closeProfileEditModal');
    const cancelProfileEditButton = document.getElementById('cancelProfileEditButton');
    const saveProfileButton = document.getElementById('saveProfileButton');
    const profileEditStatus = document.getElementById('profileEditStatus');
    // Form Fields
    const profileFirstNameInput = document.getElementById('profileFirstName');
    const profileLastNameInput = document.getElementById('profileLastName');
    const profilePhoneInput = document.getElementById('profilePhone');
    const profileSpecialInstructionsInput = document.getElementById('profileSpecialInstructions');
    const profileEmailInput = document.getElementById('profileEmail'); // Get reference to new field

    // NEW: Location Modal Elements
    const locationEditModal = document.getElementById('locationEditModal');
    const locationEditModalBackdrop = document.getElementById('locationEditModalBackdrop');
    const locationEditForm = document.getElementById('locationEditForm');
    const closeLocationEditModalButton = document.getElementById('closeLocationEditModal');
    const cancelLocationEditButton = document.getElementById('cancelLocationEditButton');
    const saveLocationButton = document.getElementById('saveLocationButton');
    const locationEditStatus = document.getElementById('locationEditStatus');
    // Location Form Fields
    const locationAddressInput = document.getElementById('locationAddress');
    const locationCityInput = document.getElementById('locationCity');
    const locationStateInput = document.getElementById('locationState');
    const locationZipInput = document.getElementById('locationZip');

    // Google Places Autocomplete Instance Variable
    let autocompleteInstance = null;

    const loggedOutView = document.getElementById('loggedOutView');
    const loginRedirectButton = document.getElementById('loginRedirectButton');

    // **NEW: Loading Indicator Functions**
    function showLoading() {
        if (loadingIndicator) loadingIndicator.classList.remove('hidden');
        // Optionally hide other views while loading
        if (notLinkedView) notLinkedView.classList.add('hidden');
        if (linkedView) linkedView.classList.add('hidden');
        if (loggedOutView) loggedOutView.classList.add('hidden');
    }

    function hideLoading() {
        if (loadingIndicator) loadingIndicator.classList.add('hidden');
        // Don't show other views here, the auth listener will handle that
    }
    // **END NEW**

    // Global state
    let currentUser = null;

    // --- Modal Functions --- 

    const openProfileEditModal = async () => {
        const user = firebase.auth().currentUser;
        if (!user) {
             alert("Please log in to edit your profile.");
             return;
        }
        
        const profileFirstNameInput = document.getElementById('profileFirstName');
        const profileLastNameInput = document.getElementById('profileLastName');
        const profilePhoneInput = document.getElementById('profilePhone');
        const profileSpecialInstructionsInput = document.getElementById('profileSpecialInstructions');
        const profileEmailInput = document.getElementById('profileEmail'); // Get reference to new field
        const profileEditStatus = document.getElementById('profileEditStatus');
        const saveProfileButton = document.getElementById('saveProfileButton');

        if (!profileFirstNameInput || !profileLastNameInput || !profilePhoneInput || !profileSpecialInstructionsInput || !profileEmailInput || !profileEditStatus || !saveProfileButton) {
            console.error("One or more profile modal elements not found!");
            return;
        }

        // Clear previous status and enable button
        profileEditStatus.textContent = '';
        saveProfileButton.disabled = false;

        // --- Populate Email (Read-only) --- 
        profileEmailInput.value = user.email || 'Email not available';

        // --- Populate other fields from Firestore profile ---
        try {
            profileEditStatus.textContent = 'Loading current profile...';
            const profileData = await firestoreService.getHomeownerProfile(user.uid);
            if (profileData) {
                profileFirstNameInput.value = profileData.firstName || '';
                profileLastNameInput.value = profileData.lastName || '';
                profilePhoneInput.value = profileData.phone || '';
                profileSpecialInstructionsInput.value = profileData.specialInstructions || '';
                profileEditStatus.textContent = ''; // Clear loading message
            } else {
                 profileEditStatus.textContent = 'Could not load profile data.';
                 profileEditStatus.className = 'text-red-500';
            }
        } catch (error) {
            console.error("Error fetching profile for editing:", error);
            profileEditStatus.textContent = 'Error loading profile.';
            profileEditStatus.className = 'text-red-500';
        }
        
        // Open the modal
        if (profileEditModal && profileEditModalBackdrop) {
            profileEditModalBackdrop.classList.remove('hidden');
            profileEditModalBackdrop.classList.add('opacity-100');
            profileEditModal.classList.remove('translate-y-full');
        }
    };

    const closeProfileEditModal = () => {
        console.log('Closing profile edit modal...');
        if (!profileEditModal || !profileEditModalBackdrop) return;

        profileEditModalBackdrop.classList.remove('opacity-100');
        profileEditModal.classList.add('translate-y-full'); // Slide out
        
        // Wait for transition to finish before hiding completely
        setTimeout(() => {
            profileEditModalBackdrop.classList.add('hidden');
            profileEditModal.classList.add('hidden');
            profileEditStatus.textContent = ''; // Clear any status messages
        }, 300); // Match duration-300
    };

    // NEW: Location Modal Functions
    const openLocationEditModal = async () => {
        console.log('Opening location edit modal...');
        if (!locationEditModal || !locationEditModalBackdrop || !firebase.auth().currentUser) return;

        // 1. Populate Form with current data
        locationEditStatus.textContent = 'Loading location...';
        locationEditStatus.className = 'text-gray-500';
        saveLocationButton.disabled = true;
        try {
            const homeownerProfile = await firestoreService.getHomeownerProfile(firebase.auth().currentUser.uid);
            if (homeownerProfile) {
                locationAddressInput.value = homeownerProfile.address || '';
                locationCityInput.value = homeownerProfile.city || '';
                locationStateInput.value = homeownerProfile.state || '';
                locationZipInput.value = homeownerProfile.zip || '';
                locationEditStatus.textContent = ''; // Clear loading
                saveLocationButton.disabled = false;
            } else {
                locationEditStatus.textContent = 'Could not load location.';
                locationEditStatus.className = 'text-red-500';
            }
        } catch (error) {
            console.error("Error fetching location for edit:", error);
            locationEditStatus.textContent = 'Error loading location.';
            locationEditStatus.className = 'text-red-500';
        }

        // 2. Initialize Google Places Autocomplete if not already initialized
        // Ensure the API is loaded before initializing
        if (window.google && window.google.maps && window.google.maps.places && !autocompleteInstance) {
            console.log("Initializing Google Places Autocomplete");
            autocompleteInstance = new google.maps.places.Autocomplete(
                locationAddressInput, 
                { 
                    types: ['address'], 
                    componentRestrictions: { country: "us" }, // Optional: Restrict to US
                    fields: ["address_components"] // Request specific fields
                }
            );
            autocompleteInstance.addListener('place_changed', fillInAddress);
        } else if (!window.google || !window.google.maps || !window.google.maps.places) {
            console.warn("Google Maps Places library not ready. Autocomplete disabled.");
        }
        
        // 3. Show modal and backdrop
        locationEditModalBackdrop.classList.remove('hidden');
        locationEditModal.classList.remove('hidden');
        requestAnimationFrame(() => { 
            locationEditModalBackdrop.classList.add('opacity-100');
            locationEditModal.classList.remove('translate-y-full');
        });
    };

    const closeLocationEditModal = () => {
        console.log('Closing location edit modal...');
        if (!locationEditModal || !locationEditModalBackdrop) return;

        locationEditModalBackdrop.classList.remove('opacity-100');
        locationEditModal.classList.add('translate-y-full'); 
        
        setTimeout(() => {
            locationEditModalBackdrop.classList.add('hidden');
            locationEditModal.classList.add('hidden');
            locationEditStatus.textContent = ''; 
        }, 300); 
    };

    // NEW: Function to handle Autocomplete selection
    function fillInAddress() {
        if (!autocompleteInstance) return;
        const place = autocompleteInstance.getPlace();
        console.log('Place selected:', place);

        if (!place || !place.address_components) {
            console.warn("Autocomplete returned place without address components.");
            return;
        }

        // Clear existing fields
        locationAddressInput.value = '';
        locationCityInput.value = '';
        locationStateInput.value = '';
        locationZipInput.value = '';

        // Get each component of the address from the place details,
        // and then fill-in the corresponding field on the form.
        let streetNumber = '';
        let route = '';
        for (const component of place.address_components) {
            const componentType = component.types[0];

            switch (componentType) {
                case "street_number":
                    streetNumber = component.long_name;
                    break;
                case "route": // Street name
                    route = component.long_name;
                    break;
                case "locality": // City
                    locationCityInput.value = component.long_name;
                    break;
                case "administrative_area_level_1": // State
                    locationStateInput.value = component.short_name; // Use short name (e.g., CA)
                    break;
                case "postal_code":
                    locationZipInput.value = component.long_name;
                    break;
                // Add more cases if needed (e.g., country)
            }
        }
        // Combine street number and route
        locationAddressInput.value = `${streetNumber} ${route}`.trim();
    }


    // --- Event Listeners Setup ---
    const addEventListeners = (userId) => {
        const editProfileButton = document.getElementById('editProfileButton');
        const editLocationButton = document.getElementById('editLocationButton');
        const logoutButton = document.getElementById('logoutButton'); 
        const unlinkButton = document.getElementById('unlinkButton'); // Get unlink button

        // Profile Edit
        editProfileButton?.addEventListener('click', () => openProfileEditModal(userId));
        closeProfileEditModalButton?.addEventListener('click', closeProfileEditModal);
        cancelProfileEditButton?.addEventListener('click', closeProfileEditModal);
        profileEditModalBackdrop?.addEventListener('click', closeProfileEditModal);
        profileEditForm?.addEventListener('submit', (e) => handleProfileSave(e, userId));

        // Location Edit
        editLocationButton?.addEventListener('click', () => openLocationEditModal(userId));
        closeLocationEditModalButton?.addEventListener('click', closeLocationEditModal);
        cancelLocationEditButton?.addEventListener('click', closeLocationEditModal);
        locationEditModalBackdrop?.addEventListener('click', closeLocationEditModal);
        locationEditForm?.addEventListener('submit', (e) => handleLocationSave(e, userId));
        
        // Logout Button
        logoutButton?.addEventListener('click', handleLogout);
        
        // --- ADDED: Unlink Button Listener ---
        unlinkButton?.addEventListener('click', async () => {
            if (!userId) {
                console.error('User ID not available for unlink operation.');
                return;
            }
            if (confirm('Are you sure you want to unlink from this housekeeper? You will lose access to their schedule.')) {
                console.log('Unlink confirmed by user.');
                // Optionally show a temporary loading state on the button or view
                unlinkButton.textContent = 'Unlinking...';
                unlinkButton.disabled = true;
                
                try {
                    // Call the new service function (needs to be created)
                    await firestoreService.unlinkHomeownerFromHousekeeper(userId);
                    console.log('Unlink successful, reloading dashboard data.');
                    // Reload the dashboard to show the unlinked view
                    await loadDashboardData(firebase.auth().currentUser); 
                } catch (error) {
                    console.error('Error during unlink operation:', error);
                    alert(`Failed to unlink: ${error.message}`); // Show error to user
                    // Re-enable button on error
                    unlinkButton.textContent = 'Unlink from housekeeper';
                    unlinkButton.disabled = false;
                }
                // No need to re-enable button on success as the view will change
            }
        });
        // --- END ADDED ---

        console.log('Adding event listeners for linked view...');
    };
    
    // --- Function to Handle Logout ---
    const handleLogout = () => {
        console.log('Logout initiated...');
        firebase.auth().signOut().then(() => {
            console.log('User signed out successfully.');
            // Redirect to login page after sign-out
            window.location.href = '/login.html'; // Adjust path if needed
        }).catch((error) => {
            console.error('Sign out error:', error);
            alert('Error logging out. Please try again.'); // Simple feedback
        });
    };
    
    // --- Form Handlers & Unlink --- 
    const handleProfileUpdate = async (event) => { /* ... existing ... */ };
    const handleLocationUpdate = async (event) => { /* ... existing ... */ };
    const handleUnlink = async (userId) => { /* ... existing ... */ };
    
    // --- Initialization ---
    // Initial check to hide loading and setup listener
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) loadingIndicator.classList.add('hidden');

    firebase.auth().onAuthStateChanged(async (user) => {
        hideLoading(); // Hide loading indicator once auth state is known
        if (user) {
            console.log('User is signed in:', user.uid);

            // **NEW: Hide logged out view if user is signed in**
            if(loggedOutView) loggedOutView.classList.add('hidden');

            // Load user-specific data
            const profile = await loadDashboardData(user);

            // UI event listeners should be set up *after* data is loaded
            // and the correct view (linked/unlinked) is displayed
            addEventListeners(profile); // Corrected function name

        } else {
            currentUser = null;
            console.log('User is signed out.');
            // **Ensure correct views are hidden/shown**
            if(unlinkedView) unlinkedView.classList.add('hidden'); // Corrected variable name
            if(linkedView) linkedView.classList.add('hidden');
            
            // **REMOVED clearing of internal text elements - unnecessary when logged out**
            // if(housekeeperNameEl) housekeeperNameEl.textContent = 'Loading...';
            // if(housekeeperCompanyEl) housekeeperCompanyEl.textContent = '';
            // if(nextCleaningDateTime) nextCleaningDateTime.textContent = 'Loading...';
            // if(nextCleaningService) nextCleaningService.textContent = 'Loading service details...';
            // if(nextCleaningAddress) nextCleaningAddress.textContent = 'Loading address...';
            // if(recentHistoryList) recentHistoryList.innerHTML = '<p class="text-gray-500">Please log in.</p>';
            
            // Show the logged out view
            if(loggedOutView) loggedOutView.classList.remove('hidden');
            else console.error('#loggedOutView element not found in HTML');
        }
    });

    // **NEW: Add listener for login redirect button**
    if (loginRedirectButton) {
        loginRedirectButton.addEventListener('click', () => {
            window.location.href = '/login.html'; // Adjust path if your login page is different
        });
    } else {
        console.error('#loginRedirectButton element not found in HTML');
    }

    // Check initial auth state (can sometimes speed up initial load)
    if (!firebase.auth().currentUser) {
        console.log("Waiting for auth state...");
        showLoading();
    }

}); 