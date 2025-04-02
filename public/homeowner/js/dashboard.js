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
        if (!user) {
            console.log('No user logged in, auth-router should handle redirect.');
            return;
        }
        const userId = user.uid;
        console.log('Loading dashboard data for user:', userId);

        try {
            // Fetch the specific homeowner profile
            const homeownerProfile = await firestoreService.getHomeownerProfile(userId);
            console.log('Homeowner profile fetched:', homeownerProfile);

            // Check for the linked housekeeper ID 
            const linkedHousekeeperId = homeownerProfile?.linkedHousekeeperId; // Assuming this field name exists in homeowner_profiles

            if (linkedHousekeeperId) {
                console.log('User is linked to housekeeper:', linkedHousekeeperId);
                linkedView.classList.remove('hidden');
                notLinkedView.classList.add('hidden');

                // Load upcoming bookings (placeholder for now)
                loadUpcomingBookings(userId, linkedHousekeeperId);

            } else {
                console.log('User is not linked to a housekeeper.');
                notLinkedView.classList.remove('hidden');
                linkedView.classList.add('hidden');
                // Hide loading placeholder if not linked
                bookingsLoadingPlaceholder?.classList.add('hidden'); 
            }

        } catch (error) {
            console.error('Error loading dashboard data:', error);
            // Optionally show an error message to the user
            // For now, likely default to the 'not linked' view or a generic error state
            notLinkedView.classList.remove('hidden');
            linkedView.classList.add('hidden');
            bookingsLoadingPlaceholder?.classList.add('hidden');
        }
    };

    // Function to load and display upcoming bookings (placeholder)
    const loadUpcomingBookings = async (userId, housekeeperId) => {
        console.log(`Fetching upcoming bookings for user ${userId} with housekeeper ${housekeeperId}`);
        upcomingBookingsList.innerHTML = ''; // Clear previous entries
        noUpcomingBookings.classList.add('hidden');
        bookingsLoadingPlaceholder?.classList.remove('hidden');

        try {
            // Call the new service function
            const bookings = await firestoreService.getUpcomingHomeownerBookings(userId, housekeeperId, 3);
            // const bookings = []; // Remove simulation

            if (bookings && bookings.length > 0) {
                // Render booking cards 
                bookings.forEach(booking => {
                    const card = createBookingCard(booking);
                    upcomingBookingsList.appendChild(card);
                });
            } else {
                noUpcomingBookings.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Error loading upcoming bookings:', error);
            noUpcomingBookings.textContent = 'Error loading bookings.';
            noUpcomingBookings.classList.remove('hidden');
        } finally {
            bookingsLoadingPlaceholder?.classList.add('hidden');
        }
    };

    // Helper function to create a booking card element
    function createBookingCard(booking) {
        const div = document.createElement('div');
        div.className = 'bg-white p-4 rounded-lg shadow flex justify-between items-center';

        // Format date and time (requires helper or library for robust formatting)
        // Basic example:
        const bookingDate = new Date(booking.date + 'T' + booking.start_time); // Combine date and time
        const dateString = bookingDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
        const timeString = bookingDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

        // Inner HTML for the card
        div.innerHTML = `
            <div>
                <p class="font-medium text-gray-900">${dateString} - ${timeString}</p>
                <!-- TODO: Fetch/Display Property Name if available -->
                <p class="text-sm text-gray-600">Status: ${booking.status}</p> 
            </div>
            <button data-booking-id="${booking.id}" class="view-details-btn text-primary hover:text-primary-dark text-sm">View Details</button>
        `;

        // Add event listener for the details button (optional, could navigate to bookings page)
        div.querySelector('.view-details-btn')?.addEventListener('click', (e) => {
            const bookingId = e.target.dataset.bookingId;
            console.log('View details for booking:', bookingId);
            // Example navigation: window.location.href = `bookings/bookings.html?id=${bookingId}`;
            alert('Navigate to booking details - TBD');
        });

        return div;
    }

    // Listen for auth state changes to load data when user logs in
    firebase.auth().onAuthStateChanged((user) => {
        loadDashboardData(user);
    });

}); 