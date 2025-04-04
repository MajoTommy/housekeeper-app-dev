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
    const inviteCodeInput = document.getElementById('invite-code-input');
    const submitInviteCodeBtn = document.getElementById('submit-invite-code-btn');
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

    // --- Invite Code Form Submission ---
    inviteCodeForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!firebase.auth().currentUser) {
            console.error('No user logged in to link.');
            return;
        }
        const homeownerId = firebase.auth().currentUser.uid;
        const inviteCode = inviteCodeInput.value.trim();

        // Basic validation
        if (!inviteCode || inviteCode.length !== 6) {
            inviteErrorMessage.textContent = 'Please enter a 6-character code.';
            inviteErrorMessage.classList.remove('hidden');
            return;
        }

        // Disable button, clear error
        submitInviteCodeBtn.disabled = true;
        submitInviteCodeBtn.textContent = 'Linking...'; // Indicate loading
        inviteErrorMessage.classList.add('hidden');

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
                inviteErrorMessage.textContent = result.message || 'Invalid code or error occurred.';
                inviteErrorMessage.classList.remove('hidden');
            }
        } catch (error) {
            // Catch unexpected errors from the service call itself
            console.error('Unexpected error during linking:', error);
            inviteErrorMessage.textContent = 'An unexpected error occurred. Please try again.';
            inviteErrorMessage.classList.remove('hidden');
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
        
        // 5. Add Event Listeners for new buttons
        addEventListeners();
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


    // --- Modal Functions --- 

    const openProfileEditModal = async () => {
        console.log('Opening profile edit modal...');
        if (!profileEditModal || !profileEditModalBackdrop || !firebase.auth().currentUser) return;

        // 1. Populate Form with current data
        profileEditStatus.textContent = 'Loading profile...';
        profileEditStatus.className = 'text-gray-500';
        saveProfileButton.disabled = true;
        try {
            const homeownerProfile = await firestoreService.getHomeownerProfile(firebase.auth().currentUser.uid);
            if (homeownerProfile) {
                profileFirstNameInput.value = homeownerProfile.firstName || '';
                profileLastNameInput.value = homeownerProfile.lastName || '';
                profilePhoneInput.value = homeownerProfile.phone || '';
                profileSpecialInstructionsInput.value = homeownerProfile.specialInstructions || '';
                profileEditStatus.textContent = ''; // Clear loading
                saveProfileButton.disabled = false;
            } else {
                profileEditStatus.textContent = 'Could not load profile.';
                profileEditStatus.className = 'text-red-500';
            }
        } catch (error) {
            console.error("Error fetching profile for edit:", error);
            profileEditStatus.textContent = 'Error loading profile.';
            profileEditStatus.className = 'text-red-500';
        }
        
        // 2. Show modal and backdrop
        profileEditModalBackdrop.classList.remove('hidden');
        profileEditModal.classList.remove('hidden'); // Make it visible first
        requestAnimationFrame(() => { // Allow reflow before starting transition
            profileEditModalBackdrop.classList.add('opacity-100');
            profileEditModal.classList.remove('translate-y-full'); // Slide in
        });
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


    // --- Event Listeners --- 
    // ... (existing populate functions) ...
    
    // Updated function to add ALL event listeners
    const addEventListeners = () => {
        // Existing Buttons
        const editProfileBtn = document.getElementById('editProfileButton');
        const editLocationBtn = document.getElementById('editLocationButton');
        const unlinkBtn = document.getElementById('unlinkButton');
        const scheduleNavBtn = document.getElementById('scheduleNavButton'); 

        // Profile Modal Buttons
        const closeProfileBtn = document.getElementById('closeProfileEditModal');
        const cancelProfileBtn = document.getElementById('cancelProfileEditButton');
        const profileForm = document.getElementById('profileEditForm');

        // Location Modal Buttons
        const closeLocationBtn = document.getElementById('closeLocationEditModal');
        const cancelLocationBtn = document.getElementById('cancelLocationEditButton');
        const locationForm = document.getElementById('locationEditForm');


        if (editProfileBtn) {
            editProfileBtn.addEventListener('click', openProfileEditModal);
        }
        if (editLocationBtn) {
            editLocationBtn.addEventListener('click', () => {
                console.log('Edit Location Details button clicked');
                // alert('Open Edit Location Modal - TBD'); // Old
                openLocationEditModal(); // NEW: Open the location modal
            });
        }
        if (unlinkBtn) {
            unlinkBtn.addEventListener('click', async () => {
                console.log('Unlink button clicked');
                if (confirm('Are you sure you want to unlink from this housekeeper?')) {
                    const userId = firebase.auth().currentUser.uid;
                    const success = await firestoreService.unlinkHomeownerFromHousekeeper(userId);
                    if (success) {
                        alert('Successfully unlinked.');
                        loadDashboardData(firebase.auth().currentUser); // Reload dashboard
                    } else {
                         alert('Failed to unlink. Please try again.');
                    }
                }
            });
        }

        // Profile Edit Modal Listeners
        if (closeProfileBtn) {
            closeProfileBtn.addEventListener('click', closeProfileEditModal);
        }
        if (cancelProfileBtn) {
            cancelProfileBtn.addEventListener('click', closeProfileEditModal);
        }
        if (profileEditModalBackdrop) {
            profileEditModalBackdrop.addEventListener('click', closeProfileEditModal);
        }
        if (profileForm) {
            profileForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                console.log('Profile edit form submitted');
                
                const userId = firebase.auth().currentUser.uid;
                if (!userId) {
                    profileEditStatus.textContent = 'Error: Not logged in.';
                    profileEditStatus.className = 'text-red-500';
                    return;
                }

                const profileData = {
                    firstName: profileFirstNameInput.value.trim(),
                    lastName: profileLastNameInput.value.trim(),
                    phone: profilePhoneInput.value.trim(),
                    specialInstructions: profileSpecialInstructionsInput.value.trim(),
                    // Ensure we add updatedAt timestamp in the service function
                };
                
                // Basic validation (can be enhanced)
                if (!profileData.firstName || !profileData.lastName) {
                    profileEditStatus.textContent = 'First and Last Name are required.';
                    profileEditStatus.className = 'text-red-500';
                    return;
                }

                profileEditStatus.textContent = 'Saving...';
                profileEditStatus.className = 'text-gray-500';
                saveProfileButton.disabled = true;

                try {
                    // *** NEED NEW Service function: updateHomeownerProfile(userId, profileData) ***
                    await firestoreService.updateHomeownerProfile(userId, profileData);
                    
                    profileEditStatus.textContent = 'Profile saved successfully!';
                    profileEditStatus.className = 'text-green-600';

                    // Optionally reload main dashboard data or just close
                    // loadDashboardData(firebase.auth().currentUser); // Could reload everything
                    // OR just update relevant displayed info if applicable

                    setTimeout(() => { 
                        closeProfileEditModal();
                    }, 1500); // Close after a short delay

                } catch (error) {
                    console.error('Error saving profile:', error);
                    profileEditStatus.textContent = 'Error saving profile. Please try again.';
                    profileEditStatus.className = 'text-red-500';
                } finally {
                    saveProfileButton.disabled = false; 
                }
            });
        }
        
        // Location Edit Modal Listeners
        if (closeLocationBtn) {
            closeLocationBtn.addEventListener('click', closeLocationEditModal);
        }
        if (cancelLocationBtn) {
            cancelLocationBtn.addEventListener('click', closeLocationEditModal);
        }
        if (locationEditModalBackdrop) {
            locationEditModalBackdrop.addEventListener('click', closeLocationEditModal);
        }
        
        if (locationForm) {
            locationForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                console.log('Location edit form submitted');
                
                const userId = firebase.auth().currentUser.uid;
                if (!userId) {
                    locationEditStatus.textContent = 'Error: Not logged in.';
                    locationEditStatus.className = 'text-red-500';
                    return;
                }

                const locationData = {
                    address: locationAddressInput.value.trim(),
                    city: locationCityInput.value.trim(),
                    state: locationStateInput.value.trim(),
                    zip: locationZipInput.value.trim(),
                    // Ensure we add updatedAt timestamp in the service function
                };
                
                // Basic validation
                if (!locationData.address || !locationData.city || !locationData.state || !locationData.zip) {
                    locationEditStatus.textContent = 'All location fields are required.';
                    locationEditStatus.className = 'text-red-500';
                    return;
                }

                locationEditStatus.textContent = 'Saving location...';
                locationEditStatus.className = 'text-gray-500';
                saveLocationButton.disabled = true;

                try {
                    // *** NEED NEW Service function: updateHomeownerLocation(userId, locationData) ***
                    await firestoreService.updateHomeownerLocation(userId, locationData);
                    
                    locationEditStatus.textContent = 'Location saved successfully!';
                    locationEditStatus.className = 'text-green-600';

                    // Reload the main dashboard address display
                    populateHomeownerAddress(locationData); 
                    // Reload main dashboard data or just close?
                    // loadDashboardData(firebase.auth().currentUser); 

                    setTimeout(() => { 
                        closeLocationEditModal();
                    }, 1500); // Close after a short delay

                } catch (error) {
                    console.error('Error saving location:', error);
                    locationEditStatus.textContent = 'Error saving location. Please try again.';
                    locationEditStatus.className = 'text-red-500';
                } finally {
                    saveLocationButton.disabled = false; 
                }
            });
        }

    };

    // --- Initialization --- 
    // Make sure this runs AFTER the DOM is loaded
    const loadingIndicatorInitial = document.getElementById('loadingIndicator');
    if (!loadingIndicatorInitial) {
         console.error("Loading indicator not found on initial load.");
    }

    // Listen for auth state changes to load data when user logs in
    firebase.auth().onAuthStateChanged((user) => {
         console.log('Auth state changed, user:', user ? user.uid : 'null');
         // Ensure loadDashboardData is called *after* DOM is confirmed ready
        if (document.readyState === 'loading') { // vielä latautuu
            document.addEventListener('DOMContentLoaded', () => loadDashboardData(user));
        } else { // DOM valmis
            loadDashboardData(user);
        }
    });

}); 