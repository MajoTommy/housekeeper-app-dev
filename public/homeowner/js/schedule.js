document.addEventListener('DOMContentLoaded', () => {
    console.log('Homeowner schedule script loaded.');

    // --- Global Variables & State ---
    let currentUser = null;
    let linkedHousekeeperId = null;
    let housekeeperSettings = null;
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

    // --- Utility Functions ---
    function showLoading(show) {
        if (show) {
            loadingIndicator.classList.remove('hidden');
            scheduleContainer.classList.add('hidden');
            errorMessageDiv.classList.add('hidden');
        } else {
            loadingIndicator.classList.add('hidden');
            scheduleContainer.classList.remove('hidden');
        }
    }
    
    function showError(message) {
        console.error('Schedule Error:', message);
        errorMessageDiv.textContent = `Error: ${message}`;
        errorMessageDiv.classList.remove('hidden');
        showLoading(false);
        scheduleContainer.classList.add('hidden'); // Also hide schedule on error
    }
    
     // Basic Date Formatting (Add more robust library like date-fns or moment later if needed)
    function formatDate(date) {
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
    
     function getWeekStartDate(date) {
         const d = new Date(date);
         const day = d.getDay(); // 0 = Sunday, 1 = Monday, ...
         const diff = d.getDate() - day;
         return new Date(d.setDate(diff));
     }

    function updateWeekDisplay() {
        if (!currentWeekStartDate) return;
        const endDate = new Date(currentWeekStartDate);
        endDate.setDate(currentWeekStartDate.getDate() + 6);
        weekDisplay.textContent = `${formatDate(currentWeekStartDate)} - ${formatDate(endDate)}`;

        // Disable prev button if week starts before today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        prevWeekBtn.disabled = currentWeekStartDate <= today;
    }

    // --- Data Fetching ---
    async function fetchInitialData() {
        showLoading(true);
        if (!currentUser || !currentUser.uid) {
            showError('User not authenticated.');
            return false;
        }

        try {
            // 1. Get Homeowner Profile to find linked housekeeper
            const homeownerProfile = await firestoreService.getHomeownerProfile(currentUser.uid);
            if (!homeownerProfile || !homeownerProfile.linkedHousekeeperId) {
                showError('You are not linked to a housekeeper. Please link via your dashboard.');
                 // Redirect or show linking instructions?
                // window.location.href = '/homeowner/dashboard.html';
                return false;
            }
            linkedHousekeeperId = homeownerProfile.linkedHousekeeperId;
            console.log('Linked housekeeper ID:', linkedHousekeeperId);

            // 2. Get Housekeeper Settings (includes timezone) - Pass current user ID as requester
            housekeeperSettings = await firestoreService.getUserSettings(linkedHousekeeperId, currentUser.uid);
            if (!housekeeperSettings) { // Check if null (could happen if no settings AND not owner)
                showError('Could not load housekeeper settings. Housekeeper may need to configure their profile.');
                return false;
            }
            housekeeperTimezone = housekeeperSettings.timezone || 'UTC'; // Use saved timezone or default to UTC
            console.log('Housekeeper Settings:', housekeeperSettings);
            console.log('Housekeeper Timezone:', housekeeperTimezone);

             // 3. Initialize week view
             currentWeekStartDate = getWeekStartDate(new Date());
             updateWeekDisplay();

            // 4. Load schedule for the current week
            await loadAndRenderScheduleForWeek(currentWeekStartDate);

            return true;

        } catch (error) {
            showError(`Failed to load initial data: ${error.message}`);
            console.error(error);
            return false;
        }
    }

    async function loadAndRenderScheduleForWeek(startDate) {
        showLoading(true);
        if (!linkedHousekeeperId || !housekeeperSettings) {
            showError('Missing housekeeper ID or settings.');
            return;
        }

        try {
             // Define the week range for querying bookings
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 7); // Get start of the day *after* the last day
             // endDate.setMilliseconds(endDate.getMilliseconds() - 1); // End of the 6th day

            // Fetch ALL housekeeper bookings for this week range
            // We need all bookings to correctly identify conflicts, not just the homeowner's
            const bookings = await firestoreService.getBookingsForHousekeeperInRange(linkedHousekeeperId, startDate, endDate);
            console.log(`Fetched ${bookings.length} bookings for week starting ${formatDate(startDate)}:`, bookings);
            
            // TODO: Calculate available slots based on settings, timezone, and bookings
            // This will be the complex part involving timezone conversions and slot generation
            const scheduleData = generateScheduleData(startDate, housekeeperSettings, bookings, housekeeperTimezone);
            console.log('Generated schedule data:', scheduleData);

            // Render the schedule
            renderSchedule(scheduleData);
            showLoading(false);

        } catch (error) {
            showError(`Failed to load schedule for week starting ${formatDate(startDate)}: ${error.message}`);
            console.error(error);
        }
    }

    // --- Schedule Generation (Placeholder - Complex Logic Needed) ---
    function generateScheduleData(weekStartDate, settings, bookings, timezone) {
        const schedule = {};
        // Initialize schedule structure for all 7 days
        for (let i = 0; i < 7; i++) {
            const currentDate = new Date(weekStartDate);
            currentDate.setDate(weekStartDate.getDate() + i);
            const dayOfWeek = dayNames[currentDate.getDay()];
            const dayKey = dayOfWeek.toLowerCase();

            schedule[dayKey] = {
                date: new Date(currentDate),
                dayName: dayOfWeek,
                isWorking: false, // Default to not working
                slots: []
            };
        }

        // Process settings and bookings to populate slots
        // ---> THIS IS WHERE THE COMPLEX LOGIC WILL GO <---
        console.warn("generateScheduleData is using placeholder logic.");

        // Example: Populate based on settings (dummy implementation)
         Object.keys(settings.workingDays || {}).forEach(dayKey => {
             if (schedule[dayKey] && settings.workingDays[dayKey]?.isWorking) {
                 schedule[dayKey].isWorking = true;
                 // Add dummy slots for working days
                 schedule[dayKey].slots.push({ startTime: '09:00', endTime: '11:00', status: 'available' });
                 schedule[dayKey].slots.push({ startTime: '13:00', endTime: '15:00', status: 'available' });
             }
         });

         // Example: Mark some slots as booked (dummy implementation)
         if (schedule.monday && schedule.monday.slots.length > 0) {
            schedule.monday.slots[0].status = 'booked';
         }
         if (schedule.wednesday && schedule.wednesday.slots.length > 1) {
            schedule.wednesday.slots[1].status = 'booked';
         }


        // TODO: Implement actual slot calculation using settings, bookings, and timezone
        // - Iterate through each day in schedule
        // - If settings say it's a working day:
        //   - Get working hours (startTime) and jobDurations from settings[dayKey]
        //   - Convert startTime (e.g., '08:00') from housekeeper's timezone to a Date object in UTC or local.
        //   - Iterate through jobDurations to generate potential slot start/end times.
        //   - Account for breaks (breakDurations).
        //   - For each potential slot, check against the `bookings` array (compare start/end times, remembering timezones).
        //   - Mark slots as 'available', 'booked', or 'unavailable' (e.g., during breaks).
        // - Convert final slot times (startTime, endTime strings) for display, potentially to the homeowner's local time? Or keep in housekeeper's time? (Decide on display format).
        return schedule;
    }

    // --- Rendering ---\
    function renderSchedule(scheduleData) {
        scheduleContainer.innerHTML = ''; // Clear previous week

        dayNames.forEach(dayName => {
            const dayKey = dayName.toLowerCase();
            const dayData = scheduleData[dayKey];
            
            if (!dayData) {
                console.warn(`No schedule data found for ${dayKey}`);
                return; // Skip if data for day is missing
            }

            const dayColumn = document.createElement('div');
            dayColumn.className = 'day-column border rounded p-2 bg-gray-50 min-h-[100px]'; // Added min-height

            const dateObj = dayData.date;
             // Format date clearly
             const dateString = dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' });

            dayColumn.innerHTML = `<h3 class="font-semibold text-center mb-2 text-sm text-gray-700">${dateString}</h3>`;

            const slotsContainer = document.createElement('div');
            slotsContainer.className = 'slots-container space-y-1'; // Added spacing

             // Indicate if it's a non-working day clearly
             if (!dayData.isWorking) {
                 slotsContainer.innerHTML = '<p class="text-xs text-center text-gray-400 italic mt-4">Not Working</p>';
             } else if (dayData.slots.length === 0) {
                slotsContainer.innerHTML = '<p class="text-xs text-center text-gray-500 italic mt-4">No available slots</p>';
            } else {
                dayData.slots.forEach(slot => {
                    const slotDiv = document.createElement('div');
                    // Add data attributes for potential booking
                    slotDiv.dataset.startTime = slot.startTime;
                    slotDiv.dataset.endTime = slot.endTime;
                    slotDiv.dataset.date = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD
                    
                    slotDiv.className = `slot ${slot.status || 'unavailable'} text-xs p-1 text-center`; // Default unavailable, smaller padding
                    
                     // Display time range
                     // TODO: Decide on time format (12hr/24hr) and timezone representation
                    slotDiv.textContent = `${slot.startTime} - ${slot.endTime}`;
                    
                    if (slot.status === 'available') {
                        slotDiv.classList.add('bg-blue-50', 'text-blue-700', 'border-blue-200', 'hover:bg-blue-100', 'cursor-pointer');
                        slotDiv.title = 'Click to select this slot';
                        slotDiv.addEventListener('click', handleSlotClick);
                    } else if (slot.status === 'booked') {
                         slotDiv.classList.add('bg-gray-100', 'text-gray-400', 'border-gray-200', 'cursor-not-allowed');
                         slotDiv.title = 'This slot is already booked';
                     } else { // unavailable (breaks, outside hours etc.)
                         slotDiv.classList.add('bg-red-50', 'text-gray-400', 'border-red-100', 'cursor-not-allowed');
                         slotDiv.title = 'Unavailable';
                         slotDiv.style.borderStyle = 'dashed';
                     }
                    
                    slotsContainer.appendChild(slotDiv);
                });
            }
            
            dayColumn.appendChild(slotsContainer);
            scheduleContainer.appendChild(dayColumn);
        });
    }

    // --- Event Handlers ---
    function handleSlotClick(event) {
        const slotDiv = event.currentTarget;
        const date = slotDiv.dataset.date;
        const startTime = slotDiv.dataset.startTime;
        const endTime = slotDiv.dataset.endTime;

        console.log(`Selected slot: Date: ${date}, Start: ${startTime}, End: ${endTime}`);
        
        // TODO: Implement booking initiation logic
        // - Show a confirmation modal?
        // - Redirect to a booking confirmation page?
        // - Need homeowner details (userId), housekeeperId, date, startTime, endTime
        alert(`You selected: ${date} from ${startTime} to ${endTime}.\nBooking functionality not yet implemented.`);
    }
    
     // --- Event Listeners Setup ---\
     function setupEventListeners() {
         prevWeekBtn.addEventListener('click', () => {
             if (!currentWeekStartDate || prevWeekBtn.disabled) return;
             currentWeekStartDate.setDate(currentWeekStartDate.getDate() - 7);
             updateWeekDisplay();
             loadAndRenderScheduleForWeek(currentWeekStartDate);
         });

         nextWeekBtn.addEventListener('click', () => {
             if (!currentWeekStartDate) return;
             currentWeekStartDate.setDate(currentWeekStartDate.getDate() + 7);
             updateWeekDisplay();
             loadAndRenderScheduleForWeek(currentWeekStartDate);
         });
         
         // Event listeners for slots are added dynamically in renderSchedule
     }

    // --- Initialization ---\
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            console.log('Homeowner authenticated:', currentUser.uid);
            setupEventListeners(); // Setup static buttons first
            await fetchInitialData(); // Fetch data and render initial schedule
        } else {
            console.log('Homeowner not authenticated. Redirecting...');
            currentUser = null;
            linkedHousekeeperId = null;
            housekeeperSettings = null;
            // Redirect to login or dashboard if not logged in
             window.location.href = '/homeowner/login.html?redirect=schedule.html'; // Example redirect
        }
    });
}); 