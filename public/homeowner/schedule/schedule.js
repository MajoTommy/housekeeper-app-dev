import * as dateUtils from '/common/js/date-utils.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log('Homeowner schedule script loaded.');

    // --- Global Variables & State ---
    let currentUser = null;
    let linkedHousekeeperId = null;
    let housekeeperSettings = null; // Keep settings to get timezone
    let housekeeperName = 'Housekeeper'; // Default Name
    let housekeeperTimezone = 'UTC'; // Default, will be overwritten
    let currentWeekStartDate = null;
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // --- UI Element References ---
    const loadingIndicator = document.getElementById('loading-indicator');
    const scheduleContainer = document.getElementById('schedule-container');
    const weekDisplay = document.getElementById('week-display');
    const prevWeekBtn = document.getElementById('prev-week-btn');
    const nextWeekBtn = document.getElementById('next-week-btn');
    const errorMessageDiv = document.getElementById('error-message');
    const errorTextSpan = document.getElementById('error-text'); // Make sure this ID exists in HTML
    const housekeeperTimezoneInfo = document.getElementById('housekeeper-timezone-info'); // Make sure this exists
    const pageTitle = document.getElementById('page-title'); // Added reference for title

    // UPDATED: Drawer Modal UI Element References
    const bookingDrawer = document.getElementById('bookingConfirmationDrawer');
    const bookingDrawerBackdrop = document.getElementById('bookingDrawerBackdrop');
    const drawerSlotDetails = document.getElementById('drawerSlotDetails');
    const bookingDrawerStatus = document.getElementById('bookingDrawerStatus');
    const confirmBookingDrawerBtn = document.getElementById('confirmBookingDrawerBtn');
    const cancelBookingDrawerBtn = document.getElementById('cancelBookingDrawerBtn');
    const closeBookingDrawerBtn = document.getElementById('closeBookingDrawerBtn');
    
    // Toast Notification Element
    const bookingToast = document.getElementById('bookingToast');
    
    // Cancellation Modal Elements (Added missing ones)
    const cancelModal = document.getElementById('cancelModal');
    const closeCancelModalTopBtn = document.getElementById('closeCancelModalTopBtn');
    const closeCancelModalBtn = document.getElementById('closeCancelModalBtn');
    const confirmCancellationBtn = document.getElementById('confirmCancellationBtn');
    const cancelBookingDetails = document.getElementById('cancelBookingDetails');
    const cancelReasonInput = document.getElementById('cancelReason');
    
    // State for managing the currently selected slot in the modal
    let currentlySelectedSlot = null;
    let currentBookingIdToCancel = null; // Ensure defined before functions using it

    // --- Firebase Services ---
    const auth = firebase.auth();
    const functions = firebase.functions(); // Initialize Functions
    const firestoreService = window.firestoreService; // Assuming loaded via script tag

    // --- MOVED Cancellation Modal Functions --- //
    // Define these early, after variable/element declarations
    function openCancelModal(bookingId, slotElement) {
        console.log("Attempting to open cancel modal for:", bookingId); 
        if (typeof currentBookingIdToCancel === 'undefined') { // Debug check
            console.error("`currentBookingIdToCancel` is not defined in this scope!");
            return; 
        }
        currentBookingIdToCancel = bookingId; 
        const timeText = slotElement.querySelector('p:first-child')?.textContent || 'Unknown time';
        const dateHeader = slotElement.closest('.bg-white.rounded-lg.shadow')?.querySelector('h3')?.textContent || 'Unknown date';
        const datePart = dateHeader.split(',').slice(1).join(',').trim();

        cancelBookingDetails.innerHTML = `
            <p><strong>Date:</strong> ${datePart || 'Unknown'}</p>
            <p><strong>Time:</strong> ${timeText}</p>
        `;
        cancelReasonInput.value = '';
        if (cancelModal) { // Null check
           cancelModal.classList.remove('translate-y-full');
        } else {
            console.error("Cancel modal element not found!");
        }
    }

    function closeCancelModal() {
        if (cancelModal) { // Null check
           cancelModal.classList.add('translate-y-full');
        } else {
            console.error("Cancel modal element not found!");
        }
        currentBookingIdToCancel = null; 
    }

    async function handleConfirmCancellation() {
        const bookingId = currentBookingIdToCancel; // Grab ID before potentially closing modal
        if (!bookingId) {
            console.error("No booking ID set for cancellation.");
            showToast("Error: Could not determine which booking to cancel.", true);
            return;
        }

        // --- NEW: Get the linked housekeeper ID ---
        if (!linkedHousekeeperId) {
            console.error("Housekeeper ID not available for cancellation call.");
            showToast("Error: Cannot identify housekeeper for cancellation.", true);
            // Keep button enabled, but don't proceed
            confirmCancellationBtn.textContent = 'Confirm Cancellation'; 
            return;
        }
        const housekeeperId = linkedHousekeeperId;
        // --- END NEW ---

        const reason = cancelReasonInput.value.trim();
        // Pass housekeeperId along with bookingId and reason
        console.log(`Attempting to call cancelBooking for booking ${bookingId} (housekeeper: ${housekeeperId}) with reason: '${reason}'`);

        // Disable button, show loading state
        confirmCancellationBtn.disabled = true;
        confirmCancellationBtn.textContent = 'Cancelling...'; 
        
        try {
            // **NEW: Force token refresh before calling function**
            const currentUser = firebase.auth().currentUser;
            if (!currentUser) {
                // This shouldn't happen if the check at the start worked, but defensively check
                throw new Error("User became unauthenticated before function call.");
            }
            console.log("Forcing token refresh before calling cancelBooking...");
            await currentUser.getIdToken(true); // Pass true to force refresh
            console.log("Token refreshed.");
            // **END NEW**

            // Use the globally initialized functions instance
            if (!window.firebaseFunctions) {
                throw new Error("Firebase Functions service not initialized globally.");
            }
            const functionsInstance = window.firebaseFunctions;
            const cancelBookingFunction = functionsInstance.httpsCallable('cancelBooking');
            
            // Call the function - PASS housekeeperId
            const result = await cancelBookingFunction({ 
                bookingId,
                housekeeperId, // Pass the housekeeper ID
                reason 
            });

            if (result.data.success) {
                console.log('Cloud Function call successful:', result.data.message);
                showToast("Booking cancelled successfully.", false); // Show success
                closeCancelModal();
                // Refresh the schedule to reflect the change
                await loadScheduleFromCloudFunction(currentWeekStartDate);
            } else {
                // Handle cases where the function runs but indicates failure (shouldn't happen with current setup)
                console.error('Cloud Function indicated failure:', result.data.message);
                showToast(result.data.message || "Failed to cancel booking.", true);
            }

        } catch (error) {
            console.error("Error during cancelBooking call or token refresh:", error);
            const message = error.message || "An unknown error occurred during cancellation.";
            showToast(`Cancellation Error: ${message}`, true);
        } finally {
            // Always re-enable button and reset text, regardless of success/error
            if (confirmCancellationBtn) { // Check if button still exists (modal might close fast)
               confirmCancellationBtn.disabled = false;
               confirmCancellationBtn.textContent = 'Confirm Cancellation';
            }
        }
    }
    
    // MOVED Event Handler for Cancel Request
    function handleCancelRequestClick(bookingId, slotElement) {
        console.log("handleCancelRequestClick called for:", bookingId);
        if (!bookingId) {
            console.error('Booking ID missing for cancel request.');
            showToast('Error: Cannot initiate cancellation.', true);
            return;
        }
        if (!slotElement) {
            console.error('Slot element missing for cancel request.');
            showToast('Error: Cannot display details.', true);
            return;
        }
        // Ensure openCancelModal is defined before calling
        if (typeof openCancelModal === 'function') { 
            openCancelModal(bookingId, slotElement);
        } else {
            console.error("`openCancelModal` is not defined or not a function!");
        }
    }
    // --- END MOVED Functions ---

    // --- Utility Functions ---
    function showLoading(show) {
        if (show) {
            loadingIndicator.classList.remove('hidden');
            scheduleContainer.classList.add('hidden');
            if (errorMessageDiv) errorMessageDiv.classList.add('hidden');
        } else {
            loadingIndicator.classList.add('hidden');
            scheduleContainer.classList.remove('hidden');
        }
    }
    
    function showError(message) {
        console.error('Schedule Error:', message);
        if (errorMessageDiv && errorTextSpan) {
            errorTextSpan.textContent = message;
            errorMessageDiv.classList.remove('hidden');
            showLoading(false);
            scheduleContainer.classList.add('hidden'); // Also hide schedule on error
        } else {
             alert("Error: " + message); // Fallback
        }
    }
    
    function updateWeekDisplay() {
        if (!currentWeekStartDate) return;
        const endDate = dateUtils.addDays(currentWeekStartDate, 6);
        // Use the new display formatter, providing the housekeeper's timezone
        weekDisplay.textContent = `${dateUtils.formatDateForDisplay(currentWeekStartDate, housekeeperTimezone)} - ${dateUtils.formatDateForDisplay(endDate, housekeeperTimezone)}`;

        // Optional: Disable prev button if week starts before today (or some limit)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // prevWeekBtn.disabled = currentWeekStartDate <= today; // Might allow viewing past weeks?
    }

    // NEW: Utility to format duration in minutes to "X hr Y min"
    function formatDuration(totalMinutes) {
        if (totalMinutes === null || totalMinutes === undefined || totalMinutes <= 0) {
            return '';
        }
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        let result = '';
        if (hours > 0) {
            result += `${hours} hr`;
        }
        if (minutes > 0) {
            if (result.length > 0) result += ' ';
            result += `${minutes} min`;
        }
        return result;
    }

    // --- Data Fetching ---
    async function fetchInitialData() {
        showLoading(true);
        if (!currentUser || !currentUser.uid) {
            showError('User not authenticated.');
             // Redirect to login maybe?
             // window.location.href = '/login.html'; // Adjust path as needed
            return false;
        }

        if (!firestoreService) {
             showError('Data service not available. Please refresh.');
             return false;
        }

        try {
            // 1. Get Homeowner Profile to find linked housekeeper
            // Use getHomeownerProfile which contains the linked ID
            const homeownerProfile = await firestoreService.getHomeownerProfile(currentUser.uid);
            
            // More robust check for linkedHousekeeperId
            const housekeeperId = homeownerProfile?.linkedHousekeeperId; // Optional chaining
            if (typeof housekeeperId !== 'string' || housekeeperId.trim() === '') {
                console.error('Profile fetched, but linkedHousekeeperId is missing or empty:', homeownerProfile);
                showError('You are not linked to a housekeeper. Please link via your dashboard.');
                return false;
            }
            
            linkedHousekeeperId = housekeeperId; // Assign the validated ID
            console.log('Linked housekeeper ID:', linkedHousekeeperId);

            // 2. Get Housekeeper Settings (mainly for timezone display)
            //    AND Housekeeper Profile (for name)
            try {
                // Fetch settings and profile concurrently
                const [settings, profile] = await Promise.all([
                    firestoreService.getUserSettings(linkedHousekeeperId),
                    firestoreService.getHousekeeperProfile(linkedHousekeeperId) // Fetch profile for name
                ]);

                housekeeperSettings = settings; // Assign to global state
                
                // Process Settings (Timezone)
                if (!housekeeperSettings) {
                    console.warn('Could not load housekeeper settings. Using default timezone.')
                    housekeeperTimezone = 'UTC'; 
                    if(housekeeperTimezoneInfo) housekeeperTimezoneInfo.textContent = `Timezone info unavailable`;
                } else {
                    housekeeperTimezone = housekeeperSettings.timezone || 'UTC';
                    console.log('Housekeeper Timezone:', housekeeperTimezone);
                    if(housekeeperTimezoneInfo) housekeeperTimezoneInfo.textContent = `Times shown in: ${housekeeperTimezone.replace(/_/g, ' ')}`;
                }
                
                // Process Profile (Name for Title)
                if (profile && profile.firstName) {
                     // Prefer first name, could use companyName as fallback
                    housekeeperName = profile.firstName; 
                } else if (profile && profile.companyName) {
                    housekeeperName = profile.companyName;
                } // Else stays default 'Housekeeper'
                
                if (pageTitle) {
                    pageTitle.textContent = `${housekeeperName}'s Schedule`;
                }

            } catch (fetchError) {
                console.error("Error fetching housekeeper settings or profile:", fetchError);
                showError("Could not load housekeeper details. Please try again.");
                return false; // Stop initialization if critical data fails
            }
            
             // 3. Initialize week view - Use utility function
             currentWeekStartDate = dateUtils.getStartOfWeek(new Date());
             updateWeekDisplay(); // Update display now that timezone is known

            // 4. Load schedule for the current week using the Cloud Function
            await loadScheduleFromCloudFunction(currentWeekStartDate);

            return true;

        } catch (error) {
            showError(`Failed to load initial data: ${error.message}`);
            console.error(error);
            return false;
        }
    }

    // Renamed function to reflect source
    async function loadScheduleFromCloudFunction(startDate) {
        showLoading(true);
        if (!linkedHousekeeperId) {
            showError('Missing housekeeper ID.');
            return;
        }

        const endDate = dateUtils.addDays(startDate, 6); // Use utility function
        console.log(`Calling getAvailableSlots for ${linkedHousekeeperId} from ${startDate.toISOString()} to ${endDate.toISOString()}`);

        try {
            // Call the Cloud Function
            const getAvailableSlots = functions.httpsCallable('getAvailableSlots');
            const result = await getAvailableSlots({
                housekeeperId: linkedHousekeeperId,
                startDateString: startDate.toISOString(), // ISO string is good
                endDateString: endDate.toISOString(),   // ISO string is good
            });

            console.log('Cloud Function result:', result.data);

            if (result.data && result.data.schedule) {
                 // Render the schedule using data from Cloud Function
                renderSchedule(result.data.schedule, startDate);
            } else if (result.data && result.data.message) {
                // Handle specific messages from the function, e.g., settings not found
                 showError(result.data.message);
                 if (scheduleContainer) scheduleContainer.innerHTML = ''; // Clear schedule area
            } else {
                 throw new Error('Invalid schedule data received from function.');
            }
        } catch (error) {
            console.error('Error calling getAvailableSlots function:', error);
            let friendlyMessage = error.message || 'Please try again.';
            if (error.code === 'functions/not-found') {
                 friendlyMessage = 'Could not connect to the schedule service. Function not deployed?';
            } else if (error.code === 'functions/internal') {
                 friendlyMessage = 'An internal error occurred while fetching the schedule.';
            }
            showError(`Failed to load schedule: ${friendlyMessage}`);
            if (scheduleContainer) scheduleContainer.innerHTML = ''; // Clear schedule area on error
        } finally {
            showLoading(false);
             // Ensure week display is updated even if there was an error
             updateWeekDisplay(); // updateWeekDisplay uses the new util function now
        }
    }

    // --- REWRITTEN renderSchedule function (v3) ---
    function renderSchedule(scheduleData, weekStartDate) {
        console.log("Rendering schedule (v3 - Element Creation) for week starting:", weekStartDate);
        if (!scheduleContainer) {
            console.error("Schedule container element not found!");
            return;
        }
    
        // Clear previous content VERY explicitly
        while (scheduleContainer.firstChild) {
            scheduleContainer.removeChild(scheduleContainer.firstChild);
        }
        console.log("Cleared scheduleContainer children.");
    
        // Get today's date (at the start of the day) for comparison
        const today = new Date();
        today.setHours(0, 0, 0, 0);
    
        // Get the 7 dates for the current week
        const weekDates = dateUtils.getWeekDates(weekStartDate);
    
        // Loop through each day of the week
        weekDates.forEach((date, dayIndex) => {
            // --- Date Setup ---
            const dateString = dateUtils.formatDate(date, 'YYYY-MM-DD');
            const dayData = scheduleData[dateString];
            console.log(`[Day ${dayIndex}] Processing ${dateString}`);
            const currentDateOnly = new Date(date); // Clone date for comparison
            currentDateOnly.setHours(0, 0, 0, 0);
            const isPastDay = currentDateOnly.getTime() < today.getTime();

            // --- Create Day Column Div ---
            const dayColumn = document.createElement('div');
            // Base styling, remove padding initially as it might be hidden
            dayColumn.className = 'bg-white rounded-lg shadow flex flex-col'; 

            if (isPastDay) {
                // --- Hide Past Days ---
                dayColumn.classList.add('hidden'); 
            } else {
                // --- Setup Visible Days (Today and Future) ---
                dayColumn.classList.add('p-4'); // Add padding back for visible days

                // --- Create and Append Header ---
                const dayHeader = document.createElement('h3');
                const fullFormattedDate = dateUtils.formatDateForDisplay(date, housekeeperTimezone, {
                    weekday: 'long', month: 'short', day: 'numeric', year: 'numeric'
                });
                dayHeader.textContent = fullFormattedDate;
                dayHeader.className = 'text-lg font-semibold mb-3 text-gray-700 flex-shrink-0';
                dayColumn.appendChild(dayHeader);
        
                // --- Create Slots Container ---
                const slotsContainer = document.createElement('div');
                slotsContainer.className = 'flex-grow space-y-2';
        
                // --- Populate Slots Container (Only for non-past days) ---
                if (!dayData || dayData.status === 'not_working') {
                    const statusP = document.createElement('p');
                    statusP.className = 'text-sm text-gray-500';
                    statusP.textContent = dayData?.message || 'Not scheduled to work';
                    slotsContainer.appendChild(statusP);
                } else if (dayData.status === 'fully_booked') {
                    const statusP = document.createElement('p');
                    statusP.className = 'text-sm text-gray-500 italic';
                    statusP.textContent = dayData.message || 'Fully booked';
                    slotsContainer.appendChild(statusP);
                } else if (dayData.status === 'available' && dayData.slots && dayData.slots.length > 0) {
                     // Process the available slots directly (they are already filtered by the CF)
                    // --- NEW: Process ALL slots returned by the CF ---
                    dayData.slots.forEach(slotData => {
                        // Create the main container div for the slot block
                        const slotDiv = document.createElement('div');
                        slotDiv.className = 'p-4 rounded-lg slot'; // Base padding and rounding, ADDED 'slot' class

                        // --- Check Slot Status --- 
                        if (slotData.status === 'available') {
                            // --- Render Available Slot (Bookable) ---
                            slotDiv.classList.add('bg-blue-50', 'flex', 'items-center', 'justify-between'); // Styling for bookable slots
                            
                            // Div for text content (time range and duration)
                            const textDiv = document.createElement('div');
                            const timeRangeP = document.createElement('p');
                            timeRangeP.className = 'text-sm font-semibold text-blue-800';
                            
                            // --- UPDATED: Format UTC Millis for Display --- 
                            const startMillis = slotData.startTimestampMillis;
                            const endMillis = slotData.endTimestampMillis;
                            let displayStartTime = 'N/A';
                            let displayEndTime = 'N/A';

                            // Assuming dateUtils.formatMillisForDisplay exists and works correctly
                            if (startMillis && typeof dateUtils.formatMillisForDisplay === 'function') {
                                displayStartTime = dateUtils.formatMillisForDisplay(startMillis, housekeeperTimezone, { hour: 'numeric', minute: '2-digit', hour12: true });
                            } else {
                                console.warn("Could not format start time from millis:", startMillis, " dateUtils exists?", typeof dateUtils.formatMillisForDisplay === 'function');
                            }
                            if (endMillis && typeof dateUtils.formatMillisForDisplay === 'function') {
                                displayEndTime = dateUtils.formatMillisForDisplay(endMillis, housekeeperTimezone, { hour: 'numeric', minute: '2-digit', hour12: true });
                            } else {
                                console.warn("Could not format end time from millis:", endMillis, " dateUtils exists?", typeof dateUtils.formatMillisForDisplay === 'function');
                            }
                            // --- END UPDATED --- 
                            
                            timeRangeP.textContent = `${displayStartTime} - ${displayEndTime}`;
                            textDiv.appendChild(timeRangeP);

                            const durationMinutes = slotData.durationMinutes;
                            if (durationMinutes) {
                                const durationP = document.createElement('p');
                                durationP.className = 'text-xs text-blue-600';
                                durationP.textContent = formatDuration(durationMinutes);
                                textDiv.appendChild(durationP);
                            }
                            slotDiv.appendChild(textDiv);
                            
                            // --- UPDATED: Use Millis for Button Dataset --- 
                            let slotStartMillisForButton = null;
                            if (startMillis) {
                                slotStartMillisForButton = startMillis; // Use the UTC millis directly
                            } else {
                                console.error("Missing startTimestampMillis for button dataset", slotData);
                            }
                            // --- END UPDATED ---
                            
                            // Create the Book button
                            const bookButton = document.createElement('button');
                            bookButton.innerHTML = 'Book <i class="fas fa-chevron-right fa-xs ml-1"></i>'; 
                            bookButton.className = 'inline-flex items-center px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-full shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors'; 
                            
                            // --- UPDATED: Set dataset from millis and durationMinutes --- 
                            if (slotStartMillisForButton !== null && durationMinutes) {
                                 bookButton.dataset.datetime = slotStartMillisForButton.toString(); // Store UTC millis as string
                                 bookButton.dataset.duration = durationMinutes;
                                 bookButton.dataset.housekeeperId = linkedHousekeeperId;
                                 bookButton.onclick = handleSlotClick;
                            } else {
                                 bookButton.disabled = true;
                                 bookButton.innerHTML = 'Error';
                                 bookButton.title = "Could not determine exact booking time.";
                                 console.error("Disabling button, failed to get millis or duration for slot", slotData);
                            }
                            slotDiv.appendChild(bookButton);

                        } else {
                            // --- Render Unavailable/Booked/Pending Slot (Non-interactive) ---
                            // Apply flex layout CONSISTENTLY for all non-available slots
                            slotDiv.classList.add(
                                'bg-gray-100', 
                                'flex',           // Use flexbox
                                'items-center',   // Vertically align items in the center
                                'justify-between' // Space out content (text block vs button)
                            ); 

                            // Main info container (time, status)
                            const infoDiv = document.createElement('div');

                            const timeRangeP = document.createElement('p');
                            timeRangeP.className = 'text-sm font-medium text-gray-500';
                            // --- UPDATED: Format UTC Millis for Display --- 
                            const startMillis = slotData.startTimestampMillis;
                            const endMillis = slotData.endTimestampMillis;
                            let displayStartTime = 'N/A';
                            let displayEndTime = 'N/A';

                            // Assuming dateUtils.formatMillisForDisplay exists and works correctly
                            if (startMillis && typeof dateUtils.formatMillisForDisplay === 'function') {
                                displayStartTime = dateUtils.formatMillisForDisplay(startMillis, housekeeperTimezone, { hour: 'numeric', minute: '2-digit', hour12: true });
                            } else {
                                console.warn("Could not format start time from millis (booked slot):", startMillis, " dateUtils exists?", typeof dateUtils.formatMillisForDisplay === 'function');
                            }
                            if (endMillis && typeof dateUtils.formatMillisForDisplay === 'function') {
                                displayEndTime = dateUtils.formatMillisForDisplay(endMillis, housekeeperTimezone, { hour: 'numeric', minute: '2-digit', hour12: true });
                            } else {
                                console.warn("Could not format end time from millis (booked slot):", endMillis, " dateUtils exists?", typeof dateUtils.formatMillisForDisplay === 'function');
                            }
                             // --- END UPDATED --- 
                            timeRangeP.textContent = `${displayStartTime} - ${displayEndTime}`;
                            infoDiv.appendChild(timeRangeP);

                            const statusP = document.createElement('p');
                            statusP.className = 'text-xs text-gray-400 capitalize'; // Show status text
                            let statusText = slotData.status;
                            if (statusText === 'booked' || statusText === 'pending') statusText = 'Booked/Pending';
                            if (statusText === 'confirmed') statusText = 'Confirmed'; // Explicitly show Confirmed
                            if (statusText === 'unavailable' || slotData.type === 'break') statusText = 'Unavailable';
                            statusP.textContent = statusText;
                            infoDiv.appendChild(statusP);
                            
                            slotDiv.appendChild(infoDiv);

                            // Add Cancel Button for confirmed/booked/pending slots (NEW)
                            if (slotData.status === 'confirmed' || slotData.status === 'booked' || slotData.status === 'pending') { // ADDED 'pending'
                                // slotDiv.classList.add('flex', 'items-center', 'justify-between'); // REMOVED - Apply flex layout above unconditionally
                                const cancelButton = document.createElement('button');
                                cancelButton.textContent = 'Cancel';
                                // Simple styling for cancel button
                                cancelButton.className = 'ml-4 px-2 py-1 text-xs font-medium text-red-600 bg-red-100 rounded hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-500';
                                cancelButton.dataset.bookingId = slotData.bookingId;
                                cancelButton.dataset.action = 'request_cancel'; // Specific action type
                                // REMOVE direct event listener - rely on delegation
                                // cancelButton.addEventListener('click', handleCancelRequestClick); 
                                slotDiv.appendChild(cancelButton);
                            }
                        }
                        
                        slotsContainer.appendChild(slotDiv); // Add the styled slot to the day's container
                    });
                } else {
                    // Handle cases like 'available' but no slots, or other unexpected dayData statuses
                    const statusP = document.createElement('p');
                    statusP.className = 'text-sm text-gray-500 italic';
                    statusP.textContent = dayData?.message || 'No available slots today.';
                    slotsContainer.appendChild(statusP);
                }
                // Append the populated slots container to the visible day column
                dayColumn.appendChild(slotsContainer); 
            } // End else (is not a past day)
    
            // Always append the column (it will be hidden via class if it's a past day)
            scheduleContainer.appendChild(dayColumn);
        });
        console.log("Finished rendering schedule.");
    }
    // --- End REWRITTEN renderSchedule ---
    
    // UPDATED: Handler for clicking the 'Book' button - Shows Drawer
    function handleSlotClick(event) {
        const button = event.currentTarget;
        // Store details in the global state for the modal
        // --- UPDATED: Read UTC millis and duration --- 
        const startTimestampMillisString = button.dataset.datetime;
        const durationString = button.dataset.duration;
        const housekeeperId = button.dataset.housekeeperId;
        
        // Validate and parse
        const startTimestampMillis = parseInt(startTimestampMillisString, 10);
        const duration = parseInt(durationString, 10);

        if (isNaN(startTimestampMillis) || isNaN(duration) || !housekeeperId) {
            console.error("Invalid datetime, duration, or housekeeperId data on button:", button.dataset);
            showToast("Error retrieving slot details.", true);
            return;
        }
        
        currentlySelectedSlot = {
            startTimestampMillis: startTimestampMillis,
            duration: duration,
            housekeeperId: housekeeperId
        };
        // --- END UPDATED ---

        console.log('Slot selected (UTC Millis):', currentlySelectedSlot);

        // Populate and show the drawer
        if (bookingDrawer && drawerSlotDetails) {
            // --- UPDATED: Format Millis for Drawer Display --- 
            let displayDateTime = 'Invalid date';
            // Check if dateUtils and the specific function exist
            if (typeof dateUtils !== 'undefined' && typeof dateUtils.formatMillisForDisplay === 'function') {
                displayDateTime = dateUtils.formatMillisForDisplay(
                    currentlySelectedSlot.startTimestampMillis,
                    housekeeperTimezone, // Use the fetched housekeeper timezone
                    { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true } // More detailed format
                );
            } else {
                 console.error("dateUtils.formatMillisForDisplay not available for drawer!");
                 // Fallback display if formatting function isn't available
                 try {
                     displayDateTime = new Date(currentlySelectedSlot.startTimestampMillis).toLocaleString(); 
                 } catch (e) { /* Ignore fallback error */ }
            }
            const durationFormatted = formatDuration(currentlySelectedSlot.duration);
            // --- END UPDATED ---
            
            // Use innerHTML to allow simple formatting if needed
            drawerSlotDetails.innerHTML = `
                <p class="font-semibold text-gray-800">${displayDateTime}</p>
                <p class="text-sm text-gray-600">Duration: ${durationFormatted}</p>
            `;
            // Clear previous status messages
            if(bookingDrawerStatus) bookingDrawerStatus.innerHTML = ''; 
            showDrawer(true); // Use helper function to show drawer
        } else {
            console.error('Booking drawer elements not found!');
            // Fallback if modal isn't working
            alert(`Proceed to book ${currentlySelectedSlot.startTimestampMillis}? (Drawer failed)`);
        }
    }

    // UPDATED: Handler for Confirm button in drawer
    function confirmBooking() {
        if (!currentlySelectedSlot || !currentUser) {
            console.error('No slot selected or user not logged in for confirmation.');
            showDrawer(false); // Hide drawer
            return;
        }

        // Show loading state in drawer
        showDrawerLoadingState(true);

        console.log('--- Attempting Booking via Cloud Function ---');
        console.log('Homeowner:', currentUser.uid);
        console.log('Housekeeper:', currentlySelectedSlot.housekeeperId);
        // --- UPDATED: Prepare data for requestBooking --- 
        const startMillis = currentlySelectedSlot.startTimestampMillis;
        const duration = currentlySelectedSlot.duration;
        let isoDateTimeString = null;
        try {
            isoDateTimeString = new Date(startMillis).toISOString();
        } catch(e) {
             console.error("Failed to create ISO string from millis:", startMillis, e);
             showDrawerErrorState("Booking failed: Invalid date calculation.");
             showDrawerLoadingState(false); // Reset loading state on error
             return;
        }
        
        console.log('Selected Slot (ISO UTC):', isoDateTimeString);
        console.log('Duration:', duration, 'minutes');
        // --- END UPDATED ---

        // Get reference to the Cloud Function
        const requestBooking = functions.httpsCallable('requestBooking');

        // Call the function - SEND ISO STRING (as current requestBooking expects)
        requestBooking({
            housekeeperId: currentlySelectedSlot.housekeeperId,
            dateTimeString: isoDateTimeString, // Send ISO UTC string
            duration: duration, // Duration remains integer minutes
        })
        .then(result => {
            console.log('Booking request successful:', result.data);
            showDrawer(false); // Hide drawer on success
            // Replace alert with toast notification
            showToast('Booking requested successfully! The housekeeper will confirm soon.');
            // Refresh the schedule to show the slot as pending/booked
            if (currentWeekStartDate) {
                loadScheduleFromCloudFunction(currentWeekStartDate);
            } else {
                fetchInitialData(); 
            }
        })
        .catch(error => {
            console.error('Booking request failed:', error);
            // Show error message in drawer status area
            showDrawerErrorState(`Booking failed: ${error.message}`);
            // Keep the drawer open so the user sees the error
        });
    }

    // UPDATED: Handler for Cancel button in drawer or closing the drawer
    function cancelBooking() {
        console.log('Booking cancelled.');
        showDrawer(false); // Hide drawer
    }

    // NEW: Helper functions to show/hide the drawer with transitions
    function showDrawer(show) {
        if (!bookingDrawer || !bookingDrawerBackdrop) return;
        if (show) {
            bookingDrawerBackdrop.classList.remove('hidden');
            bookingDrawerBackdrop.classList.add('opacity-100');
            bookingDrawer.classList.remove('translate-y-full');
            bookingDrawer.classList.add('translate-y-0');
        } else {
            bookingDrawer.classList.remove('translate-y-0');
            bookingDrawer.classList.add('translate-y-full');
            bookingDrawerBackdrop.classList.remove('opacity-100');
            bookingDrawerBackdrop.classList.add('hidden');
            // Reset drawer state after animation (optional, depends on transition duration)
            setTimeout(() => {
                 showDrawerLoadingState(false); // Ensure loading state is turned off
                 if(bookingDrawerStatus) bookingDrawerStatus.innerHTML = ''; // Clear errors
                 currentlySelectedSlot = null; // Clear selected slot
            }, 300); // Match transition duration
        }
    }
    
    // NEW: Helpers for drawer state UI
    function showDrawerLoadingState(isLoading) {
        if (!confirmBookingDrawerBtn || !cancelBookingDrawerBtn) return;
        if (isLoading) {
            confirmBookingDrawerBtn.disabled = true;
            cancelBookingDrawerBtn.disabled = true;
            confirmBookingDrawerBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Booking...'; // Add spinner
            if (bookingDrawerStatus) bookingDrawerStatus.innerHTML = ''; // Clear previous errors
        } else {
            confirmBookingDrawerBtn.disabled = false;
            cancelBookingDrawerBtn.disabled = false;
            confirmBookingDrawerBtn.innerHTML = 'Confirm Booking'; // Restore text
        }
    }

    function showDrawerErrorState(message) {
        if (bookingDrawerStatus) { 
            bookingDrawerStatus.innerHTML = `<span class="text-red-600 font-semibold">${message}</span>`;
        }
        // Re-enable buttons so the user can retry or cancel
        showDrawerLoadingState(false);
    }

    // NEW: Helper function to show a toast notification
    let toastTimeout = null; // Keep track of existing timeout
    function showToast(message, duration = 3000) {
        if (!bookingToast) return;

        bookingToast.textContent = message;
        
        // Clear any existing timeout to prevent overlapping hides
        if (toastTimeout) {
            clearTimeout(toastTimeout);
        }

        // Make toast visible and slide in
        bookingToast.classList.remove('hidden', 'translate-x-full');

        // Set timeout to hide toast
        toastTimeout = setTimeout(() => {
            bookingToast.classList.add('translate-x-full');
            // Optionally add hidden class after transition completes
            setTimeout(() => bookingToast.classList.add('hidden'), 300); // Match transition duration
            toastTimeout = null;
        }, duration);
    }

    // --- Event Listener Setup --- 
    function setupEventListeners() {
        if (!prevWeekBtn || !nextWeekBtn) {
            console.error('Previous and next week buttons not found!');
            return;
        }

        prevWeekBtn.addEventListener('click', () => {
            if (!currentWeekStartDate) return;
            currentWeekStartDate = dateUtils.addDays(currentWeekStartDate, -7);
            updateWeekDisplay();
            loadScheduleFromCloudFunction(currentWeekStartDate);
        });

        nextWeekBtn.addEventListener('click', () => {
            if (!currentWeekStartDate) return;
            currentWeekStartDate = dateUtils.addDays(currentWeekStartDate, 7);
            updateWeekDisplay();
            loadScheduleFromCloudFunction(currentWeekStartDate);
        });

        // UPDATED: Add listeners for drawer buttons and backdrop
        if (confirmBookingDrawerBtn) {
            confirmBookingDrawerBtn.addEventListener('click', confirmBooking);
        }
        if (cancelBookingDrawerBtn) {
            cancelBookingDrawerBtn.addEventListener('click', cancelBooking);
        }
        if (closeBookingDrawerBtn) {
            closeBookingDrawerBtn.addEventListener('click', cancelBooking);
        }
        if (bookingDrawerBackdrop) {
            bookingDrawerBackdrop.addEventListener('click', cancelBooking);
        }
        // Optional: Add swipe-down gesture handling (more complex)
    }

    // --- Authentication Observer ---
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log('User is signed in:', user.uid);
            currentUser = user;
            const success = await fetchInitialData();
            if(success) {
                setupEventListeners(); // Setup week nav, booking drawer listeners
                
                // Add Cancel Modal button listeners HERE, after elements are known
                 if(closeCancelModalTopBtn && closeCancelModalBtn && confirmCancellationBtn) { 
                    closeCancelModalTopBtn.addEventListener('click', closeCancelModal);
                    closeCancelModalBtn.addEventListener('click', closeCancelModal);
                    confirmCancellationBtn.addEventListener('click', handleConfirmCancellation);
                } else {
                    console.error('One or more cancellation modal buttons not found after auth!');
                }

                // Add Schedule Container delegation HERE, after elements are known and functions defined
                if (scheduleContainer) {
                    scheduleContainer.addEventListener('click', (event) => {
                        const target = event.target;
                        const slotElement = target.closest('.slot'); 
                
                        if (target.matches('[data-action="request_cancel"]')) {
                            const bookingId = target.getAttribute('data-booking-id');
                            if (slotElement) {
                                handleCancelRequestClick(bookingId, slotElement); 
                            } else {
                                console.error("Could not find parent .slot for cancel button.");
                                showToast('Error identifying booking slot.', true);
                            }
                        } 
                        else if (target.matches('button[data-datetime]')) { 
                            handleSlotClick({ currentTarget: target }); 
                        }
                    });
                } else {
                    console.error("Schedule container not found after auth!");
                }
            }
        } else {
            console.log('User is signed out.');
            currentUser = null;
            linkedHousekeeperId = null;
            housekeeperSettings = null;
            housekeeperTimezone = 'UTC';
            housekeeperName = 'Housekeeper';
            if (pageTitle) pageTitle.textContent = 'Schedule';
            if (housekeeperTimezoneInfo) housekeeperTimezoneInfo.textContent = '';
             // Redirect to login or show login prompt
             // For now, just show error message
            showError('Please log in to view the schedule.');
            scheduleContainer.innerHTML = ''; // Clear schedule
             // Disable nav buttons if needed
            // prevWeekBtn.disabled = true;
            // nextWeekBtn.disabled = true;
        }
    });

    // Initial check in case auth state is already known
    if (auth.currentUser) {
         console.log('Auth state already known on load.');
         // The onAuthStateChanged listener will handle the rest.
    } else {
         console.log('Waiting for auth state...');
         showLoading(true); // Show loading initially until auth state is confirmed
    }

    // Optional: Redirect to login if user is somehow not authenticated
    // firebase.auth().onAuthStateChanged((user) => {
    //     if (!user) {
    //         console.log("User not authenticated, redirecting to login...");
    //         window.location.href = '/'; // Redirect to root (login page)
    //     }
    // });
}); 