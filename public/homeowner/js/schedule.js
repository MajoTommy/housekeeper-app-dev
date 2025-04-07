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

    // --- Firebase Services ---
    const auth = firebase.auth();
    const functions = firebase.functions(); // Initialize Functions
    const firestoreService = window.firestoreService; // Assuming loaded via script tag

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
    
        // Get the 7 dates for the current week
        const weekDates = dateUtils.getWeekDates(weekStartDate);
    
        // Loop through each day of the week
        weekDates.forEach((date, dayIndex) => {
            const dateString = dateUtils.formatDate(date, 'YYYY-MM-DD');
            const dayData = scheduleData[dateString];
            console.log(`[Day ${dayIndex}] Processing ${dateString}`);
    
            // --- Create Day Column Div ---
            const dayColumn = document.createElement('div');
            dayColumn.className = 'bg-white p-4 rounded-lg shadow flex flex-col'; // Added flex-col
    
            // --- Create and Append Header ---
            const dayHeader = document.createElement('h3');
            const fullFormattedDate = dateUtils.formatDateForDisplay(date, housekeeperTimezone, {
                weekday: 'long', month: 'short', day: 'numeric', year: 'numeric'
            });
            dayHeader.textContent = fullFormattedDate;
            dayHeader.className = 'text-lg font-semibold mb-3 text-gray-700 flex-shrink-0'; // Added flex-shrink-0
            dayColumn.appendChild(dayHeader);
    
            // --- Create Slots Container ---
            const slotsContainer = document.createElement('div');
            // Use flex-grow to allow it to take space, space-y for spacing between slots
            slotsContainer.className = 'flex-grow space-y-2';
    
            // --- Populate Slots Container ---
            if (!dayData || dayData.status === 'not_working') {
                const statusP = document.createElement('p');
                statusP.className = 'text-sm text-gray-500';
                statusP.textContent = dayData?.message || 'Not scheduled to work';
                slotsContainer.appendChild(statusP);
            } else if (dayData.status === 'fully_booked') {
                 const statusP = document.createElement('p');
                 statusP.className = 'text-sm text-red-600 font-medium';
                 statusP.textContent = dayData.message || 'Fully Booked';
                 slotsContainer.appendChild(statusP);
            } else if (dayData.status === 'available' && dayData.slots && dayData.slots.length > 0) {
                dayData.slots.forEach((slot, slotIndex) => {
                    const startTimeStr = slot.startTime; // Use the pre-formatted string
                    if (startTimeStr && startTimeStr !== "Invalid Time") { // Check if valid
                        // Using simple div again first
                        const slotDiv = document.createElement('div');
                        // Display start and end time if available
                        slotDiv.textContent = slot.endTime ? `${startTimeStr} - ${slot.endTime}` : startTimeStr;
                        // Add some basic styling for visibility
                        slotDiv.className = 'p-2 bg-green-100 text-green-800 rounded text-sm';
                        try {
                            slotsContainer.appendChild(slotDiv);
                        } catch (e) {
                             console.error(`      [Slot ${slotIndex}] Error appending div: ${startTimeStr}`, e);
                        }
                    } else {
                         console.warn(`    [Slot ${slotIndex}] Skipping slot with invalid/missing startTime:`, slot);
                    }
                });
            } else {
                // Fallback
                 const statusP = document.createElement('p');
                 statusP.className = 'text-sm text-gray-400';
                 statusP.textContent = 'No available slots found.';
                 slotsContainer.appendChild(statusP);
            }
    
            // --- Append Slots Container to Day Column ---
            dayColumn.appendChild(slotsContainer);
    
            // --- Append Day Column to Main Schedule Container ---
            try {
                scheduleContainer.appendChild(dayColumn);
            } catch(e) {
                console.error(`[Day ${dayIndex}] Error appending dayColumn for ${dateString}`, e);
            }
    
        }); // End weekDates.forEach
    
        // Make container visible
        scheduleContainer.classList.remove('hidden');
    }
    // --- End REWRITTEN renderSchedule ---
    
    // Click handler (currently not used as slots are disabled)
    function handleSlotClick(event) {
        const target = event.target;
        if (target.tagName === 'BUTTON' && target.dataset.date && target.dataset.startTime) {
            // Placeholder for future booking functionality
            alert(`Booking slot on ${target.dataset.date} starting at ${dateUtils.minutesToTimeString(parseInt(target.dataset.startTime))}`);
        }
    }

     // Setup Button Event Listeners
     function setupEventListeners() {
         prevWeekBtn.addEventListener('click', () => {
             if (!currentWeekStartDate) return;
             currentWeekStartDate = dateUtils.addDays(currentWeekStartDate, -7); // Use utility
             updateWeekDisplay();
             loadScheduleFromCloudFunction(currentWeekStartDate);
         });

         nextWeekBtn.addEventListener('click', () => {
             if (!currentWeekStartDate) return;
             currentWeekStartDate = dateUtils.addDays(currentWeekStartDate, 7); // Use utility
             updateWeekDisplay();
             loadScheduleFromCloudFunction(currentWeekStartDate);
         });
     }

    // --- Authentication Observer ---
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log('User is signed in:', user.uid);
            currentUser = user;
            const success = await fetchInitialData();
            if(success) {
                setupEventListeners(); // Only setup after successful load
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

}); 