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
    
     // Basic Date Formatting (Add more robust library like date-fns or moment later if needed)
    function formatDate(date) {
        // Ensure date is a Date object
        if (!(date instanceof Date)) {
             date = new Date(date);
        }
        if (isNaN(date.getTime())) return "Invalid Date";
        // Include year in the format
        return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }
    
     function getWeekStartDate(date) {
         const d = new Date(date);
         const day = d.getDay(); // 0 = Sunday, 1 = Monday, ...
         // Adjust to get Monday as the start of the week
         const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
         return new Date(d.setDate(diff));
     }

    function updateWeekDisplay() {
        if (!currentWeekStartDate) return;
        const endDate = new Date(currentWeekStartDate);
        endDate.setDate(currentWeekStartDate.getDate() + 6);
        weekDisplay.textContent = `${formatDate(currentWeekStartDate)} - ${formatDate(endDate)}`;

        // Optional: Disable prev button if week starts before today (or some limit)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // prevWeekBtn.disabled = currentWeekStartDate <= today; // Might allow viewing past weeks?
    }

    // Time String Conversion Helpers (Needed by renderSchedule)
    // These might be duplicates if defined in firestore-service. Move to shared utils later.
    function timeStringToMinutes(timeStr) {
        if (!timeStr || typeof timeStr !== 'string') return null;
        const time = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
        if (!time) return null;
        let hours = parseInt(time[1], 10);
        const minutes = parseInt(time[2], 10);
        const period = time[3] ? time[3].toUpperCase() : null;
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        return hours * 60 + minutes;
    }

    function minutesToTimeString(totalMinutes) {
        if (totalMinutes === null || totalMinutes === undefined || totalMinutes < 0) return '';
        const hours24 = Math.floor(totalMinutes / 60) % 24;
        const minutes = totalMinutes % 60;
        const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
        const period = hours24 < 12 ? 'AM' : 'PM';
        return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
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
            
             // 3. Initialize week view
             currentWeekStartDate = getWeekStartDate(new Date());
             updateWeekDisplay();

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

        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6); // Get 6 days after start date
        console.log(`Calling getAvailableSlots for ${linkedHousekeeperId} from ${startDate.toISOString()} to ${endDate.toISOString()}`);

        try {
            // Call the Cloud Function
            const getAvailableSlots = functions.httpsCallable('getAvailableSlots');
            const result = await getAvailableSlots({
                housekeeperId: linkedHousekeeperId,
                startDateString: startDate.toISOString(),
                endDateString: endDate.toISOString(),
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
             updateWeekDisplay();
        }
    }

    // --- Schedule Rendering ---
    // Renders the schedule based on data received (likely from Cloud Function now)
    function renderSchedule(scheduleData, weekStartDate) {
        console.log('Rendering schedule:', scheduleData);
        if (!scheduleContainer) return;
        scheduleContainer.innerHTML = ''; // Clear previous schedule

        // Iterate through 7 days starting from weekStartDate (which is Monday 00:00 local)
        for (let i = 0; i < 7; i++) {
            const currentDayDate = new Date(weekStartDate);
            currentDayDate.setDate(weekStartDate.getDate() + i);
            
            // --- FIX: Use UTC date components to create the lookup key --- 
            const year = currentDayDate.getUTCFullYear();
            const month = (currentDayDate.getUTCMonth() + 1).toString().padStart(2, '0');
            const day = currentDayDate.getUTCDate().toString().padStart(2, '0');
            const dateString = `${year}-${month}-${day}`; // YYYY-MM-DD (UTC)
            // --- END FIX ---
            
            const dayOfWeekIndex = currentDayDate.getDay(); // Still use local day for display name
            
            // Get data for the specific date (using UTC date string) from the schedule object
            const dayData = scheduleData[dateString];

            const dayCard = document.createElement('div');
            dayCard.className = 'bg-white p-4 rounded-lg shadow';
             // Add date string as data attribute for potential future use
             dayCard.dataset.date = dateString; 

            const dayHeader = document.createElement('h3');
            dayHeader.className = 'text-lg font-semibold mb-3 border-b pb-2 text-gray-700';
            
            // --- FIX: Display the date using the UTC date components --- 
            // Construct a Date object interpreted as UTC for display formatting
            const displayDate = new Date(Date.UTC(year, currentDayDate.getUTCMonth(), day));
            // --- END FIX ---
            
            dayHeader.textContent = `${dayNames[dayOfWeekIndex]} (${formatDate(displayDate)})`; // Use formatDate which now includes year
            dayCard.appendChild(dayHeader);

            const slotsContainer = document.createElement('div');
            slotsContainer.className = 'space-y-2 mt-2'; // Added margin-top

            if (dayData && dayData.isWorking && dayData.slots && dayData.slots.length > 0) {
                dayData.slots.forEach(slot => {
                    const slotElement = document.createElement('div');
                    // Add data attributes for potential interaction
                    slotElement.dataset.startTime = slot.startTime;
                    slotElement.dataset.endTime = slot.endTime;
                    slotElement.dataset.status = slot.status;
                    slotElement.className = `p-3 rounded border text-sm ${getSlotStyle(slot.status)}`;
                    slotElement.textContent = `${slot.startTime} - ${slot.endTime}`; 

                    // Add visual indicator for status
                     const statusIndicator = document.createElement('span');
                     statusIndicator.className = `ml-2 text-xs font-medium px-2 py-0.5 rounded-full ${getStatusBadgeStyle(slot.status)}`;
                     statusIndicator.textContent = slot.status.charAt(0).toUpperCase() + slot.status.slice(1);
                     slotElement.appendChild(statusIndicator);

                    // Add click listener for available slots (optional)
                    if (slot.status === 'available') {
                        slotElement.addEventListener('click', handleSlotClick);
                    }
                    slotsContainer.appendChild(slotElement);
                });
            } else if (dayData && dayData.isWorking) {
                 const noSlotsText = document.createElement('p');
                 noSlotsText.className = 'text-gray-500 italic text-sm';
                 noSlotsText.textContent = 'No specific slots defined for this working day.';
                 slotsContainer.appendChild(noSlotsText);
            } else {
                const notWorkingText = document.createElement('p');
                notWorkingText.className = 'text-gray-500 italic text-sm';
                notWorkingText.textContent = 'Not scheduled to work today.';
                slotsContainer.appendChild(notWorkingText);
            }
            
            dayCard.appendChild(slotsContainer);
            scheduleContainer.appendChild(dayCard);
        }
    }
    
    // Helper for styling slots based on status
    function getSlotStyle(status) {
        switch (status) {
            case 'available':
                return 'bg-green-50 border-green-300 text-green-800 hover:bg-green-100 cursor-pointer';
            case 'booked':
                return 'bg-gray-100 border-gray-300 text-gray-500 opacity-75 cursor-not-allowed'; // Adjusted style
            case 'unavailable': // For breaks etc.
                return 'bg-orange-50 border-orange-300 text-orange-600 opacity-75 cursor-not-allowed'; // Adjusted style
            default:
                return 'bg-gray-50 border-gray-300 text-gray-600';
        }
    }
    
     // Helper for styling status badge
    function getStatusBadgeStyle(status) {
         switch (status) {
             case 'available': return 'bg-green-100 text-green-800';
             case 'booked': return 'bg-gray-200 text-gray-700';
             case 'unavailable': return 'bg-orange-100 text-orange-800';
             default: return 'bg-gray-100 text-gray-800';
         }
    }

    // --- Event Handlers ---
    function handleSlotClick(event) {
        const target = event.currentTarget;
        const status = target.dataset.status;
        if (status === 'available') {
            const startTime = target.dataset.startTime;
            const endTime = target.dataset.endTime;
            const date = target.closest('.day-card')?.dataset.date; // Assuming day card has data-date

            console.log(`Available slot clicked: Date: ${date}, Time: ${startTime} - ${endTime}`);
            // TODO: Implement booking logic - maybe open a confirmation modal?
            alert(`You selected the available slot: ${startTime} - ${endTime}.\nBooking functionality not yet implemented.`);
        }
    }

     // Setup button listeners
     function setupEventListeners() {
         if (prevWeekBtn) {
            prevWeekBtn.addEventListener('click', () => {
                if (currentWeekStartDate) {
                    const newStartDate = new Date(currentWeekStartDate);
                    newStartDate.setDate(currentWeekStartDate.getDate() - 7);
                    currentWeekStartDate = newStartDate;
                    loadScheduleFromCloudFunction(currentWeekStartDate); // Use updated function
                    updateWeekDisplay();
                }
            });
         }
         
         if (nextWeekBtn) {
             nextWeekBtn.addEventListener('click', () => {
                if (currentWeekStartDate) {
                    const newStartDate = new Date(currentWeekStartDate);
                    newStartDate.setDate(currentWeekStartDate.getDate() + 7);
                    currentWeekStartDate = newStartDate;
                    loadScheduleFromCloudFunction(currentWeekStartDate); // Use updated function
                    updateWeekDisplay();
                }
             });
         }
     }

    // --- Initialization ---
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            console.log('Auth state changed: User logged in', currentUser.uid);
            fetchInitialData();
            setupEventListeners(); 
        } else {
            currentUser = null;
            console.log('Auth state changed: User logged out');
            // Redirect to login or show a logged-out message
            showError('Please log in to view the schedule.');
            // Maybe clear the schedule container?
            if(scheduleContainer) scheduleContainer.innerHTML = '';
             // Optionally redirect:
             // window.location.href = '/login.html'; 
        }
    });

}); 