import { formatMillisForDisplay } from '../../common/js/date-utils.js';

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

    // --- Global variable for housekeeper timezone ---
    let housekeeperTimezone = 'UTC'; // Default to UTC
    // --- End global --- 

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
        // 1. Populate Housekeeper Info (and get timezone)
        await populateHousekeeperInfo(housekeeperId); // Make sure this completes
        
        // 2. Populate Next Cleaning (now has access to housekeeperTimezone)
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
        const inviteCodeEl = document.getElementById('housekeeperInviteCode'); // Get reference to the new element
        try {
            // Fetch housekeeper profile by ID
            const housekeeperProfile = await firestoreService.getHousekeeperProfile(housekeeperId);
            if (housekeeperProfile) {
                // --- STORE TIMEZONE --- 
                housekeeperTimezone = housekeeperProfile.timezone || 'UTC'; 
                console.log("Housekeeper timezone set to:", housekeeperTimezone);
                // --- END STORE TIMEZONE ---

                if (nameEl) {
                    nameEl.textContent = `${housekeeperProfile.firstName || ''} ${housekeeperProfile.lastName || ''}`.trim() || 'Housekeeper Name Unavailable';
                }
                if (companyEl) {
                    companyEl.textContent = housekeeperProfile.companyName || '';
                }
                if (inviteCodeEl) { // Display the invite code
                    inviteCodeEl.textContent = housekeeperProfile.inviteCode ? `(${housekeeperProfile.inviteCode})` : '(No Invite Code)';
                }
            } else {
                 if (nameEl) nameEl.textContent = 'Housekeeper details not found.';
                 if (inviteCodeEl) inviteCodeEl.textContent = ''; // Clear invite code if profile not found
                 if (companyEl) companyEl.textContent = '';
            }
        } catch (error) {
            console.error('Error fetching housekeeper profile:', error);
            if (nameEl) nameEl.textContent = 'Error loading details.';
            if (inviteCodeEl) inviteCodeEl.textContent = ''; // Clear on error
            if (companyEl) companyEl.textContent = '';
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
        const addressEl = document.getElementById('nextCleaningAddress'); 

        if (!dateTimeEl || !serviceEl || !addressEl) {
            console.error('Missing elements for next cleaning display.');
            return;
        }

        dateTimeEl.textContent = 'Loading...';
        serviceEl.textContent = 'Loading service details...';

        try {
            // Fetch up to 5 upcoming bookings to find the first valid one
            const upcomingBookings = await firestoreService.getUpcomingHomeownerBookings(userId, housekeeperId, 5); 
            console.log(`Fetched ${upcomingBookings.length} potential upcoming bookings.`);

            // Find the first booking with the required millisecond timestamp
            const nextBooking = upcomingBookings.find(booking => 
                booking && typeof booking.startTimestampMillis === 'number'
            );
            
            if (nextBooking) {
                console.log('Found valid next booking to display:', nextBooking);
                // Ensure startTimestampMillis exists and is a number (redundant check, but safe)
                if (nextBooking.startTimestampMillis) { // Check truthiness which covers number > 0
                    // Use imported function directly
                    const formattedDateTime = formatMillisForDisplay(
                        nextBooking.startTimestampMillis, 
                        housekeeperTimezone, 
                        { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }
                    );
                    dateTimeEl.textContent = formattedDateTime;
                    dateTimeEl.classList.remove('text-gray-500');
                    dateTimeEl.classList.add('text-blue-600');
                } else { // Should not happen based on the find() above, but good fallback
                     console.warn('Valid next booking found, but startTimestampMillis is invalid?', nextBooking.startTimestampMillis);
                     dateTimeEl.textContent = 'Time not available';
                     dateTimeEl.classList.add('text-gray-500');
                     dateTimeEl.classList.remove('text-blue-600');
                }

                serviceEl.textContent = nextBooking.serviceType || 'Standard Cleaning'; 
            } else {
                console.log('No valid upcoming bookings found with required data among the fetched ones.');
                dateTimeEl.textContent = 'No upcoming cleanings';
                dateTimeEl.classList.add('text-gray-500');
                dateTimeEl.classList.remove('text-blue-600');
                serviceEl.textContent = '';
                // addressEl.textContent = ''; // Address should still show homeowner's address
            }
        } catch (error) {
            console.error('Error loading next cleaning:', error);
            if (dateTimeEl) dateTimeEl.textContent = 'Error loading';
            if (serviceEl) serviceEl.textContent = 'Could not load details';
        }
    };
    
    // NEW Function to populate recent history
    const populateRecentHistory = async (userId, housekeeperId) => {
        console.log(`Fetching recent history for user ${userId} with housekeeper ${housekeeperId}`);
        const historyListEl = document.getElementById('recentHistoryList');
        if (!historyListEl) return;
        
        historyListEl.innerHTML = '<p class="text-gray-500">Loading history...</p>'; // Loading state
        
        try {
            // Calculate date 12 months ago
            const twelveMonthsAgoDate = new Date();
            twelveMonthsAgoDate.setFullYear(twelveMonthsAgoDate.getFullYear() - 1);
            console.log("Fetching history since:", twelveMonthsAgoDate.toISOString());

            // Fetch completed bookings from the last 12 months
            const pastBookings = await firestoreService.getPastHomeownerBookings(
                userId, 
                housekeeperId, 
                50, // Increase limit slightly to ensure we get enough completed ones if needed
                twelveMonthsAgoDate // Pass the start date for the filter
            );
            
            // *** ADD DEBUG LOGGING ***
            console.log("Raw pastBookings received from service:", JSON.stringify(pastBookings, null, 2));
            // *** END DEBUG LOGGING ***

            if (pastBookings && pastBookings.length > 0) {
                historyListEl.innerHTML = ''; // Clear loading state
                // Filter again client-side just in case status filter wasn't perfect or data changed
                const completedBookings = pastBookings.filter(b => b.status === 'completed');
                
                // *** ADD DEBUG LOGGING ***
                console.log(`Client-side filter result (completedBookings count): ${completedBookings.length}`);
                 if (completedBookings.length === 0 && pastBookings.length > 0) {
                     console.warn("Client-side status filter removed bookings that should have been completed. Check status field case/value.");
                 }
                // *** END DEBUG LOGGING ***

                if (completedBookings.length > 0) {
                     completedBookings.forEach(booking => {
                         const item = createHistoryListItem(booking);
                         historyListEl.appendChild(item);
                     });
                } else {
                     historyListEl.innerHTML = '<p class="text-gray-500">No completed cleanings found in the last 12 months.</p>';
                }
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
        div.className = 'bg-white p-3 rounded-lg shadow flex justify-between items-center cursor-pointer hover:bg-gray-50'; 
        div.dataset.bookingId = booking.id; // Store ID for click handler
        
        let dateString = 'Invalid Date';
        if (booking.startTimestampMillis && typeof booking.startTimestampMillis === 'number') {
             try {
                // Use formatMillisForDisplay with appropriate options for history
                dateString = formatMillisForDisplay(
                    booking.startTimestampMillis,
                    housekeeperTimezone, // Use the globally stored housekeeper timezone
                    { month: 'long', day: 'numeric', year: 'numeric' } // e.g., July 10, 2024
                );
             } catch (e) {
                console.error('Error formatting history date:', e);
             }
        } else {
             console.warn('Missing or invalid startTimestampMillis for history item:', booking);
        }

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
            openReceiptModal(booking); // Pass the full booking object
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

    // NEW: Receipt Modal Elements
    const receiptModal = document.getElementById('receiptModal');
    const receiptModalBackdrop = document.getElementById('receiptModalBackdrop');
    const closeReceiptModalButton = document.getElementById('closeReceiptModal');
    const dismissReceiptModalButton = document.getElementById('dismissReceiptModal');
    const receiptDateEl = document.getElementById('receiptDate');
    const receiptTimeEl = document.getElementById('receiptTime');
    const receiptServiceTypeEl = document.getElementById('receiptServiceType');
    const receiptDurationEl = document.getElementById('receiptDuration');
    const receiptNotesEl = document.getElementById('receiptNotes');

    // NEW: Receipt Modal Functions
    const openReceiptModal = (booking) => {
        console.log('Opening receipt modal for booking:', booking);
        if (!receiptModal || !receiptModalBackdrop || !booking || !booking.startTimestampMillis) {
            console.error('Cannot open receipt modal, elements or data missing.');
            return;
        }

        // Populate Modal
        receiptDateEl.textContent = formatMillisForDisplay(booking.startTimestampMillis, housekeeperTimezone, { month: 'long', day: 'numeric', year: 'numeric' });
        receiptTimeEl.textContent = formatMillisForDisplay(booking.startTimestampMillis, housekeeperTimezone, { hour: 'numeric', minute: '2-digit', hour12: true });
        receiptServiceTypeEl.textContent = booking.serviceType || 'Standard Cleaning';
        receiptNotesEl.textContent = booking.notes || 'N/A';

        // Calculate and format duration
        if (booking.endTimestampMillis && typeof booking.endTimestampMillis === 'number') {
            const durationMillis = booking.endTimestampMillis - booking.startTimestampMillis;
            const durationMinutes = Math.round(durationMillis / (60 * 1000));
            const hours = Math.floor(durationMinutes / 60);
            const minutes = durationMinutes % 60;
            receiptDurationEl.textContent = `${hours > 0 ? hours + ' hr ' : ''}${minutes > 0 ? minutes + ' min' : ''}`.trim() || 'N/A';
        } else {
            receiptDurationEl.textContent = 'N/A';
        }

        // Show Modal
        receiptModalBackdrop.classList.remove('hidden');
        receiptModalBackdrop.classList.add('opacity-100');
        receiptModal.classList.remove('hidden'); // Ensure it's not hidden before transform
        receiptModal.classList.remove('translate-y-full');
    };

    const closeReceiptModal = () => {
        console.log('Closing receipt modal...');
        if (!receiptModal || !receiptModalBackdrop) return;

        receiptModalBackdrop.classList.remove('opacity-100');
        receiptModal.classList.add('translate-y-full');
        
        setTimeout(() => {
            receiptModalBackdrop.classList.add('hidden');
            // receiptModal.classList.add('hidden'); // Don't hide, just translate
        }, 300); 
    };
    
    // Add Event Listeners for Receipt Modal Close Buttons
    closeReceiptModalButton?.addEventListener('click', closeReceiptModal);
    dismissReceiptModalButton?.addEventListener('click', closeReceiptModal);
    receiptModalBackdrop?.addEventListener('click', closeReceiptModal);

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
        logoutButton?.addEventListener('click', () => {
            console.log("Logout button clicked.");
            firebase.auth().signOut().then(() => {
                console.log("User signed out successfully.");
                window.location.href = '/'; // Redirect to root (login page)
            }).catch((error) => {
                console.error("Logout Error:", error);
            });
        });
        
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
                    console.log("User unlinked successfully, signing out and redirecting...");
                    await firebase.auth().signOut();
                    window.location.href = '/'; // Redirect to root (login page) after sign out
                } catch (error) {
                    console.error("Error during unlinking or signout:", error);
                }
            }
        });
        // --- END ADDED ---

        console.log('Adding event listeners for linked view...');
    };
    
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