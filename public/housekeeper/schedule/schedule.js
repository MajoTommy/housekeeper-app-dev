import * as dateUtils from '/common/js/date-utils.js'; // <-- ADD THIS LINE

// Initialize the current week start date
let currentWeekStart; // Will be set after DOMContentLoaded

// Global booking data
let currentBookingData = {
    dateTime: null,
    client: null,
    frequency: null
};

// Flag to track if booking handlers are set up
let bookingHandlersInitialized = false;

// Global loading indicator functions
function showLoading(message = 'Loading...') {
    const loadingOverlay = document.getElementById('loading-overlay'); // Target existing overlay
    if (loadingOverlay) {
        // Optional: Update message if needed, though the current one is just an icon
        loadingOverlay.classList.remove('hidden');
    } else {
        console.error('#loading-overlay element not found in the HTML!');
    }
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loading-overlay'); // Target existing overlay
    if (loadingOverlay) {
        loadingOverlay.classList.add('hidden');
    } else {
        console.error('#loading-overlay element not found in the HTML!');
    }
}

// Function to check if a date is in the past (compares date part only)
function isInPast(date) {
    // Use dateUtils for robust comparison
    const todayStart = dateUtils.startOfDay(new Date());
    const compareDateStart = dateUtils.startOfDay(new Date(date));
    // console.log('Comparing dates in isInPast (using dateUtils):', compareDateStart, todayStart, compareDateStart < todayStart);
    return compareDateStart < todayStart;
}

// Function to check if a date is today (compares date part only)
function isToday(date) {
    // Use dateUtils for robust comparison
    return dateUtils.isSameDate(new Date(date), new Date());
}

// Function to update the navigation state
function updateNavigationState() {
    const prevWeekBtn = document.getElementById('prev-week');
    if (!prevWeekBtn) {
        console.error('Previous week button not found');
        return;
    }
    
    // Use dateUtils to calculate the start of the previous week
    const prevWeekStartDate = dateUtils.subtractDays(currentWeekStart, 7);

    // Check if the start of the previous week is before the start of today
    const todayStart = dateUtils.startOfDay(new Date());
    const isPast = dateUtils.startOfDay(prevWeekStartDate) < todayStart;
    
    // Disable the previous week button if the previous week is in the past
    prevWeekBtn.disabled = isPast;
    prevWeekBtn.classList.toggle('opacity-50', prevWeekBtn.disabled);
    prevWeekBtn.classList.toggle('cursor-not-allowed', prevWeekBtn.disabled);
    
    console.log('Navigation state updated, prev week button disabled:', prevWeekBtn.disabled);
}

// Function to update the week display (Monday - Sunday, with Year)
function updateWeekDisplay() {
    try {
        const weekRangeElement = document.getElementById('week-range');
        if (!weekRangeElement) {
            console.error('Week range element not found');
            return;
        }
        
        // Ensure currentWeekStart is set and is a Monday using dateUtils
        if (!currentWeekStart) {
            currentWeekStart = dateUtils.getStartOfWeek(new Date()); // Default to current week's Monday
        } else {
            currentWeekStart = dateUtils.getStartOfWeek(currentWeekStart); // Ensure it's Monday
        }

        // Get week end (Sunday) using dateUtils
        const weekEnd = dateUtils.getEndOfWeek(currentWeekStart);

        // Format the dates including year using dateUtils
        const startStr = dateUtils.formatDate(currentWeekStart, 'short-numeric'); // e.g., "Apr 8, 2025"
        const endStr = dateUtils.formatDate(weekEnd, 'short-numeric'); // e.g., "Apr 14, 2025"
        
        // Update the week range display
        weekRangeElement.textContent = `${startStr} - ${endStr}`;
        console.log('Week range updated:', weekRangeElement.textContent);
    } catch (error) {
        console.error('Error updating week display:', error);
    }
}

// Function to debug working days
function debugWorkingDays(settings) {
    if (!settings) {
        console.error('No settings provided to debugWorkingDays');
        return;
    }
    
    console.log('Debugging working days:');
    console.log('Settings object:', settings);
    
    // Use compatibility layer if available, otherwise use original workingDays
    const workingDaysForDebug = settings.workingDaysCompat || settings.workingDays;
    
    if (!workingDaysForDebug) {
        console.error('No workingDays found in settings');
        return;
    }
    
    // Check each day
    for (let i = 0; i < 7; i++) {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const value = workingDaysForDebug[i];
        const valueType = typeof value;
        const isWorkingDay = value === true || (typeof value === 'string' && value.toLowerCase() === 'true');
        
        console.log(`${dayNames[i]} (${i}):`, {
            value,
            valueType,
            isWorkingDay,
            booleanValue: !!value,
            strictEquality: value === true
        });
    }
    
    // Also check the original workingDays object if it's in the named format
    if (settings.workingDays && settings.workingDays.monday) {
        console.log('Original workingDays (named format):');
        ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].forEach(day => {
            if (settings.workingDays[day]) {
                console.log(`  ${day}:`, settings.workingDays[day]);
            }
        });
    }
}

// Function to load user schedule
async function loadUserSchedule(showLoadingIndicator = true) {
    console.log('loadUserSchedule called');
    
    if (showLoadingIndicator) {
        showLoading(); // Use updated showLoading
    }

    try {
        const user = firebase.auth().currentUser;
        console.log('Current user:', user);
        if (!user) {
            console.error('No user found');
            if (showLoadingIndicator) hideLoading(); // Hide loading on error
            return;
        }

        // Get user settings from Firestore
        console.log('Fetching user settings from Firestore...');
        // --- Using firestoreService now --- 
        let settings = await firestoreService.getUserSettings(user.uid);
        
        // Use defaults if no settings found
        if (!settings) {
            console.log('No settings found in Firestore, using default settings');
            settings = DEFAULT_SETTINGS;
        } else {
            console.log('User settings from Firestore:', settings);
            // Merge with defaults to ensure all properties exist
            settings = { ...DEFAULT_SETTINGS, ...settings };
            console.log('Merged settings:', settings);
        }
        // --- End firestoreService usage --- 

        // --- Process workingDays (Handle potential structure differences) ---
        // Check if workingDays exists and has the named format
        if (settings.workingDays && typeof settings.workingDays === 'object' && settings.workingDays.monday !== undefined) {
            console.log('Detected named workingDays format, creating compatibility layer.');
            // Create compatibility layer
            settings.workingDaysCompat = {
                0: settings.workingDays.sunday?.isWorking === true,
                1: settings.workingDays.monday?.isWorking === true,
                2: settings.workingDays.tuesday?.isWorking === true, 
                3: settings.workingDays.wednesday?.isWorking === true,
                4: settings.workingDays.thursday?.isWorking === true,
                5: settings.workingDays.friday?.isWorking === true,
                6: settings.workingDays.saturday?.isWorking === true
            };
            // Use the compatibility layer for schedule generation
            settings.processedWorkingDays = settings.workingDaysCompat;
        } else if (settings.workingDays && typeof settings.workingDays === 'object') {
            // Assume numeric format (0-6), ensure boolean values
            console.log('Detected numeric workingDays format, ensuring boolean values.');
            const processed = {};
            for (let i = 0; i < 7; i++) {
                processed[i] = !!settings.workingDays[i]; // Convert to boolean
            }
            settings.processedWorkingDays = processed;
        } else {
            console.warn('workingDays format not recognized or missing, using default processed values.');
            settings.processedWorkingDays = { ...DEFAULT_SETTINGS.workingDays }; // Use default numeric format
        }
        console.log('Processed working days for schedule generation:', settings.processedWorkingDays);
        // --- End workingDays processing ---

        // Debug working days
        // debugWorkingDays(settings);

        // Call generateSchedule with the processed settings
        await generateSchedule(settings);
        
        if (showLoadingIndicator) hideLoading(); // Hide loading after successful generation

    } catch (error) {
        console.error('Error loading user schedule or settings:', error);
        // TODO: Show error message to user?
        if (showLoadingIndicator) hideLoading(); // Hide loading on error
    }
}

// Function to generate schedule
async function generateSchedule(settings) { // Settings might still be needed for timezone or fallback display logic
    console.log('Generating schedule for week starting:', currentWeekStart);
    const scheduleContainer = document.getElementById('schedule-container');
    if (!scheduleContainer) {
        console.error('Schedule container not found');
        return;
    }

    showLoading('Loading your schedule...');
    scheduleContainer.innerHTML = '';
    currentWeekStart = dateUtils.getStartOfWeek(currentWeekStart || new Date());
    const weekEndDate = dateUtils.addDays(currentWeekStart, 6); // Calculate week end date

    // Ensure Firebase Functions is initialized
    const functions = firebase.functions(); 
    const getAvailableSlotsCallable = functions.httpsCallable('getAvailableSlots');

    try {
        const user = firebase.auth().currentUser;
        if (!user) throw new Error("User not logged in");

        // Fetch settings ONCE if needed (e.g., for timezone) - keep this part
        let currentSettings = settings;
        if (!currentSettings) {
            currentSettings = await firestoreService.getUserSettings(user.uid);
            if (!currentSettings) {
                 console.warn("Could not load user settings, using defaults for timezone.");
                 currentSettings = {}; 
            }
        }
        const timezone = currentSettings.timezone || dateUtils.getLocalTimezone();
        console.log("Using timezone:", timezone);

        // --- FETCH AVAILABILITY FOR THE ENTIRE WEEK ---
        let weeklyScheduleData = null;
        try {
            console.log(`Calling Cloud Function 'getAvailableSlots' for week: ${currentWeekStart.toISOString()} to ${weekEndDate.toISOString()}`);
             const cloudFunctionResult = await getAvailableSlotsCallable({
                 housekeeperId: user.uid,
                 startDateString: currentWeekStart.toISOString(), 
                 endDateString: weekEndDate.toISOString() 
             });
             console.log('Cloud Function raw result:', cloudFunctionResult);

             if (cloudFunctionResult.data && cloudFunctionResult.data.schedule) {
                 weeklyScheduleData = cloudFunctionResult.data.schedule;
                 console.log('Received weekly schedule data:', weeklyScheduleData);
             } else if (cloudFunctionResult.data && cloudFunctionResult.data.error) {
                 throw new Error(cloudFunctionResult.data.error); // Throw specific error from function
             } 
             else {
                  console.error('Invalid data structure received from Cloud Function:', cloudFunctionResult.data);
                  throw new Error('Received invalid schedule data from the server.');
             }
        } catch (cloudError) {
             console.error('Error calling getAvailableSlots Cloud Function:', cloudError);
             let friendlyMessage = cloudError.message || 'Could not fetch schedule data.';
             // Add specific checks if needed (e.g., functions/not-found)
             throw new Error(`Failed to load schedule: ${friendlyMessage}`); // Re-throw to be caught by outer try/catch
        }
        // --- END WEEKLY FETCH ---

        // Fetch bookings for the week (keep this part)
        const bookings = await firestoreService.getBookingsForHousekeeperInRange(user.uid, currentWeekStart, weekEndDate);
        console.log('Loaded bookings:', bookings);
        const bookingsByDate = {};
        bookings.forEach(booking => {
            const dateKey = booking.date;
            if (!bookingsByDate[dateKey]) bookingsByDate[dateKey] = [];
            bookingsByDate[dateKey].push(booking);
        });
        console.log('Bookings grouped by date:', bookingsByDate);
        
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        // --- Generate schedule for each day using pre-fetched data ---
        for (let i = 0; i < 7; i++) {
            const date = dateUtils.addDays(currentWeekStart, i);
            const dateText = dateUtils.formatDate(date, 'full-date');
            const isTodayFlag = isToday(date);
            const dayOfWeek = date.getDay();
            const dateKey = dateUtils.formatDate(date, 'YYYY-MM-DD');
            const dateBookings = bookingsByDate[dateKey] || [];
            
            addDateHeader(scheduleContainer, dateText, isTodayFlag);
                    const dayContainer = document.createElement('div');
            dayContainer.className = isTodayFlag ? 'bg-primary-light/70 rounded-lg p-4 mb-6' : 'space-y-4 mb-6';
            dayContainer.setAttribute('data-date', dateKey);
            dayContainer.setAttribute('data-day-of-week', dayOfWeek);
            dayContainer.innerHTML = '';
            scheduleContainer.appendChild(dayContainer);

            // --- GET SLOTS FROM PRE-FETCHED WEEKLY DATA ---
            const dayData = weeklyScheduleData ? weeklyScheduleData[dateKey] : null;
            console.log(`[${dateKey}] Day data from weekly fetch:`, dayData);

            let availableSlots = [];
            let dayStatus = 'loading'; // Initial status
            let unavailableReason = '';

            if (!weeklyScheduleData) {
                // This case should ideally be handled by the error thrown earlier
                dayStatus = 'error';
                unavailableReason = 'Weekly data fetch failed';
                addUnavailableMessage(dayContainer, unavailableReason);
            } else if (!dayData) {
                 console.warn(`No data found for ${dateKey} in Cloud Function result.`);
                 dayStatus = 'error'; // Treat missing day data as an error or unavailable?
                 unavailableReason = 'Data unavailable'; // Or 'Not configured'
                 addUnavailableMessage(dayContainer, unavailableReason);
             } else if (dayData.status === 'unavailable' || dayData.status === 'not_working') { // Handle Cloud Function keys
                 dayStatus = 'unavailable';
                 // Use reason from CF (e.g., time_off, rest_day) or message if reason is missing
                 unavailableReason = dayData.reason || dayData.message || 'Unavailable';
                 addUnavailableMessage(dayContainer, unavailableReason);
             } else if (dayData.slots && dayData.slots.length > 0) {
                 dayStatus = 'available';
                 // Filter out past slots using the retrieved slots
                  availableSlots = dayData.slots.filter(slot => {
                      // --- FIX: Check for undefined startTime --- 
                      if (!slot || !slot.startTime) {
                          console.warn(`[${dateKey}] Filtering out slot with missing startTime:`, slot);
                          return false; // Discard invalid slot
                      }
                      // --- END FIX ---
                      const slotDateTime = dateUtils.parseDateTime(date, slot.startTime, timezone);
                      // --- FIX: Add check for invalid parsed date --- 
                      if (!slotDateTime || isNaN(slotDateTime.getTime())) {
                           console.warn(`[${dateKey}] Filtering out slot with unparseable startTime '${slot.startTime}':`, slot);
                           return false; // Discard if parsing failed
                      }
                      // --- END FIX ---
                      return !(slotDateTime < new Date()); // Keep if not past
                  });
                  if (availableSlots.length !== dayData.slots.length) {
                      console.log(`Filtered out ${dayData.slots.length - availableSlots.length} invalid or past slots for ${dateKey}`); // Updated log message
                  }
                  if (availableSlots.length === 0) { 
                     // Check original data length before filtering to distinguish between all past/invalid vs. none returned
                     if (dayData.slots.length > 0) {
                         dayStatus = 'all_past_or_invalid';
                         addUnavailableMessage(dayContainer, 'all_slots_past'); // Keep same message for now
                    } else {
                         dayStatus = 'no_slots'; 
                         addUnavailableMessage(dayContainer, 'no_slots');
                     }
                  }
             } else { // Status was likely 'available' but no slots were returned
                 dayStatus = 'no_slots';
                    addUnavailableMessage(dayContainer, 'no_slots');
             }
             // --- END SLOT PROCESSING ---

            // Sort existing bookings (already fetched)
            dateBookings.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

            // Combine Booked and (filtered) Available Slots
            const bookedSlotKeys = new Set(dateBookings.map(b => `${normalizeTimeFormat(b.startTime)}-${normalizeTimeFormat(b.endTime)}`));
            const displaySlots = availableSlots.filter(slot => {
                // Use startTime/endTime directly from the slot object from CF
                const slotKey = `${normalizeTimeFormat(slot.startTime)}-${normalizeTimeFormat(slot.endTime)}`;
                return !bookedSlotKeys.has(slotKey);
            }).map(slot => ({ ...slot, type: 'available' }));

            const allItems = [...dateBookings.map(b => ({ ...b, type: 'booked' })), ...displaySlots];
            allItems.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

            // Render all items
            if (allItems.length > 0) {
                allItems.forEach(item => {
                    if (item.type === 'booked') {
                        addBookingCard(dayContainer, item, isTodayFlag);
                    } else { // type === 'available'
                        // Pass startTime/endTime from the slot item
                        addTimeSlot(dayContainer, item.startTime, item.endTime, date, item.durationMinutes);
                    }
                });
            } else if (dayStatus === 'available' || dayStatus === 'all_past_or_invalid') {
                  // If status was available but all slots were past or booked
                addUnavailableMessage(dayContainer, 'fully_booked');
            } // else: unavailable/no_slots/error messages already added

        }
    } catch (error) { // Catch errors from initial setup or re-thrown from CF call
        console.error('Error generating schedule:', error);
        // Display the specific error message caught
        scheduleContainer.innerHTML = `<div class=\"text-center text-red-600 p-4\">${error.message || 'Error loading schedule. Please try again.'}</div>`;
        hideLoading();
    } finally {
        hideLoading();
        updateNavigationState();
    }
}

// Function to add date header
function addDateHeader(container, dateText, isToday) {
    const dateHeader = document.createElement('div');
    dateHeader.className = 'mb-4';
    
    // Create the date header with today indicator if applicable
    dateHeader.innerHTML = `
        <h2 class="text-xl font-bold text-gray-900 mb-1 flex items-center">
            ${dateText}
            ${isToday ? '<span class="ml-2 bg-primary text-white text-xs py-1 px-2 rounded-full">Today</span>' : ''}
        </h2>
        <div class="h-1 w-24 bg-primary rounded"></div>
    `;
    
    container.appendChild(dateHeader);
}

// Function to add unavailable message
function addUnavailableMessage(container, reason = 'default') {
    let message = 'No available time slots';
    let icon = 'fa-calendar-xmark';
    let title = 'Unavailable';
    
    if (reason === 'rest_day' || reason === 'non_working_day') {
        message = 'Not a working day';
        icon = 'fa-calendar-xmark';
        title = 'Not Working';
    } else if (reason === 'fully_booked') {
        message = 'All available slots for this day are booked.';
        icon = 'fa-calendar-check';
        title = 'Fully Booked';
    } else if (reason === 'no_slots') {
        message = 'No time slots configured for this day.';
        icon = 'fa-calendar-xmark';
        title = 'No Slots Configured';
    }
    
    const messageElement = document.createElement('div');
    messageElement.className = 'text-center py-8 bg-gray-100 rounded-lg mb-4';
    messageElement.innerHTML = `
        <div class="bg-gray-200 text-gray-600 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <i class="fas ${icon} text-2xl"></i>
        </div>
        <h3 class="text-xl font-bold mb-2">${title}</h3>
        <p class="text-gray-600">${message}</p>
    `;
    
    container.appendChild(messageElement);
}

// Function to help with debugging on mobile devices
function logDeviceInfo() {
    const deviceInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        currentTime: new Date().toString(),
        currentTimeISO: new Date().toISOString(),
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight
    };
    
    console.log('Device Info:', deviceInfo);
    return deviceInfo;
}

// Function to get Monday of the week for a given date
function getWeekStartDate(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0); // Ensure comparison at midnight
    const day = d.getDay(); // 0 = Sunday, 1 = Monday, ...
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to get Monday
    return new Date(d.setDate(diff));
}

// Document ready function
document.addEventListener('DOMContentLoaded', () => {
    console.log('Housekeeper schedule.js DOM loaded');
    
    // Initialize currentWeekStart to Monday of the current week
    currentWeekStart = getWeekStartDate(new Date());
    console.log('Initial currentWeekStart (Monday):', currentWeekStart);
    
    // Initial display update
    updateWeekDisplay(); 
    
    // Attach navigation listeners
    const prevBtn = document.getElementById('prev-week');
    const nextBtn = document.getElementById('next-week');
    const todayBtn = document.getElementById('today-btn'); // Assuming an ID for the Today button
    
    if (prevBtn) prevBtn.addEventListener('click', navigateToPreviousWeek);
    if (nextBtn) nextBtn.addEventListener('click', navigateToNextWeek);
    if (todayBtn) todayBtn.addEventListener('click', navigateToCurrentWeek);
    
    // Setup booking modal and other initializations
    initializeBookingModal();
    
    // Authenticate and load initial data
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            console.log('User authenticated, loading initial schedule...');

            // --- ADD todayBtn listener attachment HERE ---
            const todayBtn = document.getElementById('today-btn');
            if (todayBtn) {
                // Remove previous listener if any to prevent duplicates
                todayBtn.removeEventListener('click', navigateToCurrentWeek);
                todayBtn.addEventListener('click', navigateToCurrentWeek);
                console.log("Attached listener to today-btn.");
            }
            else console.error("Today button not found after auth change.");
            // --- END ADD --- 

             // Attach navigation listeners (safe to do here too)
             const prevBtn = document.getElementById('prev-week');
             const nextBtn = document.getElementById('next-week');
             if (prevBtn) {
                 prevBtn.removeEventListener('click', navigateToPreviousWeek);
                 prevBtn.addEventListener('click', navigateToPreviousWeek);
             }
            if (nextBtn) {
                nextBtn.removeEventListener('click', navigateToNextWeek);
                nextBtn.addEventListener('click', navigateToNextWeek);
            }

            updateWeekDisplay(); // Update display after auth
            loadUserSchedule(); // Load schedule data which implicitly calls generateSchedule WITH settings
            updateNavigationState(); // Update nav state after initial load
        } else {
            console.log('User not authenticated');
            // Handle logged-out state (e.g., redirect or show message)
            showLoading('Please log in.'); // Or redirect
        }
    });
});

function setupBookingHandlers() {
    console.log('Setting up booking handlers');
    
    // New client button
    const newClientBtn = document.getElementById('newClientBtn');
    if (newClientBtn) {
        console.log('Found new client button');
        newClientBtn.addEventListener('click', function() {
            console.log('New client button clicked');
            // Show new client form
            showNewClientForm();
        });
    } else {
        console.error('New client button not found');
    }
    
    // Frequency options
    const frequencyOptions = document.querySelectorAll('.frequency-option');
    console.log(`Found ${frequencyOptions.length} frequency options`);
    
    frequencyOptions.forEach(button => {
        const frequency = button.getAttribute('data-frequency');
        console.log(`Setting up listener for frequency: ${frequency}`);
        
        button.addEventListener('click', function() {
            console.log(`Frequency option clicked: ${frequency}`);
            selectFrequency(frequency);
        });
    });
    
    // Confirm booking button
    const confirmBookingBtn = document.getElementById('confirmBookingBtn');
    if (confirmBookingBtn) {
        console.log('Found confirm booking button');
        confirmBookingBtn.addEventListener('click', function() {
            console.log('Confirm booking button clicked');
            saveBooking();
        });
    } else {
        console.error('Confirm booking button not found');
    }
    
    console.log('Booking handlers setup complete');
}

function showBookingStep(stepId) {
    console.log(`Attempting to show booking step: ${stepId}`);
    
    // Check if the booking modal exists
    const bookingModal = document.getElementById('bookingModal');
    if (!bookingModal) {
        console.error('Booking modal not found in the DOM');
        return;
    }
    
    // Log all available steps for debugging
    const allSteps = document.querySelectorAll('.booking-step');
    console.log(`Found ${allSteps.length} booking steps:`);
    allSteps.forEach(step => {
        console.log(`- Step ID: ${step.id}, visibility: ${step.classList.contains('hidden') ? 'hidden' : 'visible'}`);
    });
    
    // Hide all steps
    allSteps.forEach(step => {
        step.classList.add('hidden');
        console.log(`Hidden step: ${step.id}`);
    });
    
    // Show the requested step
    const stepElement = document.getElementById(stepId);
    if (stepElement) {
        stepElement.classList.remove('hidden');
        console.log(`Showed step: ${stepId}`);
    } else {
        console.error(`Step element with ID "${stepId}" not found`);
    }
}

function selectFrequency(frequency) {
    console.log('Frequency selected:', frequency);
    
    // Update booking data with frequency
    currentBookingData.frequency = frequency;
    
    // Update the booking date/time display
    updateBookingDateTime();
    
    // Ensure the confirmation step exists
    const confirmationStep = document.getElementById('confirmationStep');
    if (!confirmationStep) {
        console.error('Confirmation step not found in the DOM');
        alert('Unable to proceed with booking. Please refresh the page and try again.');
        return;
    }
    
    // Show the confirmation step
    showBookingStep('confirmationStep');
}

function updateBookingDateTime() {
    console.log('Updating booking date and time display');
    
    const dateTimeEl = document.getElementById('bookingDateTime');
    console.log('Booking date time element:', dateTimeEl);
    console.log('Current booking data:', currentBookingData);
    
    if (dateTimeEl && currentBookingData.dateTime) {
        const { date, startTime, endTime } = currentBookingData.dateTime;
        console.log('Formatting date:', date);
        
        try {
            const formattedDate = new Date(date).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
            
            console.log('Formatted date:', formattedDate);
            
            dateTimeEl.innerHTML = `
                <p class="font-medium">${formattedDate}</p>
                <p class="text-lg font-bold">${startTime} - ${endTime}</p>
            `;
            
            console.log('Date time display updated successfully');
        } catch (error) {
            console.error('Error formatting date:', error);
        }
    } else {
        console.warn('Cannot update booking date and time: element or data missing');
    }
    
    // Update confirmation details
    const confirmationEl = document.getElementById('confirmationDetails');
    if (confirmationEl && currentBookingData.dateTime && currentBookingData.frequency) {
        const { date, startTime, endTime } = currentBookingData.dateTime;
        const formattedDate = new Date(date).toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        // Get client name
        const clientName = currentBookingData.client?.name || 'New Client';
        
        // Format frequency text
        let frequencyText = '';
        let occurrences = 1;
        
        if (currentBookingData.frequency === 'one-time') {
            frequencyText = 'One-time booking';
        } else if (currentBookingData.frequency === 'weekly') {
            occurrences = 8; // 8 weeks (2 months)
            frequencyText = `Weekly recurring (${occurrences} occurrences)`;
        } else if (currentBookingData.frequency === 'bi-weekly') {
            occurrences = 6; // 6 bi-weekly occurrences (3 months)
            frequencyText = `Bi-weekly recurring (${occurrences} occurrences)`;
        } else if (currentBookingData.frequency === 'monthly') {
            occurrences = 3; // 3 monthly occurrences (3 months)
            frequencyText = `Monthly recurring (${occurrences} occurrences)`;
        }
        
        // Calculate end date for recurring bookings
        let endDateText = '';
        if (occurrences > 1) {
            const startDate = new Date(date);
            let endDate;
            
            if (currentBookingData.frequency === 'weekly') {
                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + (7 * (occurrences - 1)));
            } else if (currentBookingData.frequency === 'bi-weekly') {
                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + (14 * (occurrences - 1)));
            } else if (currentBookingData.frequency === 'monthly') {
                endDate = new Date(startDate);
                endDate.setMonth(startDate.getMonth() + (occurrences - 1));
            } // No else needed here - one-time bookings don't need an end date
            
            if (endDate) {
                const formattedEndDate = endDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                endDateText = `<p class="text-sm text-gray-600">Final booking on: ${formattedEndDate}</p>`;
            }
        }
        
        confirmationEl.innerHTML = `
            <div class="mb-3">
                <p class="font-medium text-gray-700">Client</p>
                <p class="text-lg font-bold">${clientName}</p>
            </div>
            <div class="mb-3">
                <p class="font-medium text-gray-700">Date & Time</p>
                <p class="text-lg font-bold">${formattedDate}</p>
                <p class="text-lg font-bold">${startTime} - ${endTime}</p>
            </div>
            <div>
                <p class="font-medium text-gray-700">Frequency</p>
                <p class="text-lg font-bold">${frequencyText}</p>
                ${endDateText}
            </div>
        `;
    }
}

async function loadClients() {
    console.log('Loading clients and linked homeowners');
    
    const user = firebase.auth().currentUser;
    if (!user) {
        console.error('No authenticated user found');
        return;
    }
    
    const clientsContainer = document.getElementById('existingClients');
    if (!clientsContainer) {
        console.error('Clients container not found in the DOM');
        return;
    }
    
    console.log('Updating clients container with loading message');
    clientsContainer.innerHTML = '<p class="text-gray-600 mb-2">Loading clients...</p>';
    
    try {
        const allClients = new Map(); // Use a Map to handle potential duplicates (key = homeownerId)

        // 1. Fetch Explicit Clients
        console.log('Fetching explicit clients from Firestore');
        const explicitClientsRef = firebase.firestore().collection('users').doc(user.uid).collection('clients');
        const explicitSnapshot = await explicitClientsRef.get();
        
        explicitSnapshot.forEach(doc => {
            const clientData = doc.data();
            // Assuming doc.id is the homeowner's User ID
            allClients.set(doc.id, { 
                id: doc.id, 
                data: clientData, 
                type: 'explicit',
                name: `${clientData.firstName || ''} ${clientData.lastName || ''}`.trim(),
                address: clientData.address || `${clientData.street || ''}, ${clientData.city || ''}, ${clientData.state || ''} ${clientData.zip || ''}`.trim().replace(/^,\\s*/, '').replace(/,\\s*$/, '')
            });
        });
        console.log(`Found ${allClients.size} explicit clients`);

        // 2. Fetch Linked Homeowners
        console.log('Fetching linked homeowners from Firestore');
        const linkedHomeownersRef = firebase.firestore().collection('homeowner_profiles');
        const linkedSnapshot = await linkedHomeownersRef.where('linkedHousekeeperId', '==', user.uid).get();

        console.log(`Found ${linkedSnapshot.size} linked homeowners`);
        linkedSnapshot.forEach(doc => {
            const homeownerData = doc.data();
            const homeownerId = doc.id; 
            
            // Only add if not already present as an explicit client
            if (!allClients.has(homeownerId)) {
                allClients.set(homeownerId, {
                    id: homeownerId,
                    data: homeownerData,
                    type: 'linked',
                    name: `${homeownerData.firstName || ''} ${homeownerData.lastName || ''}`.trim() || 'Linked Homeowner', // Use profile name or default
                    address: homeownerData.address || 'No address provided' // Use profile address or default
                });
            } else {
                // Optional: If already present as explicit, update type or add marker? 
                // For now, we just keep the explicit version.
                console.log(`Homeowner ${homeownerId} is already an explicit client.`);
            }
        });

        // 3. Display Combined List
        if (allClients.size === 0) {
            console.log('No clients or linked homeowners found');
            clientsContainer.innerHTML = '<p class="text-gray-600 mb-2">No existing clients or linked homeowners</p>';
            return;
        }
        
        console.log(`Displaying ${allClients.size} total clients/homeowners`);
        clientsContainer.innerHTML = '<p class="text-gray-600 mb-2">Your clients & linked homeowners:</p>'; // Updated title
        
        // Sort clients alphabetically by name for consistent order
        const sortedClients = Array.from(allClients.values()).sort((a, b) => a.name.localeCompare(b.name));

        sortedClients.forEach(client => {
            const fullName = client.name;
            const initials = fullName ? fullName.substring(0, 2).toUpperCase() : (client.type === 'linked' ? 'LH' : 'CL'); // Different initials?
            const address = client.address || 'No address';
            
            console.log(`Creating element for: ${fullName} (Type: ${client.type}, ID: ${client.id})`);
            
            const clientEl = document.createElement('button');
            clientEl.className = 'w-full p-3 bg-gray-100 rounded-lg text-left mb-2 hover:bg-gray-200';
            
            // Add a visual indicator for linked homeowners not explicitly added
            let linkedIndicator = '';
            if (client.type === 'linked') {
                linkedIndicator = '<span class="text-xs text-blue-500 ml-2">(Linked)</span>'; 
            }

            clientEl.innerHTML = `
                <div class="flex items-center">
                    <div class="h-10 w-10 rounded-full bg-primary-light flex items-center justify-center text-primary font-bold mr-3">
                        ${initials}
                    </div>
                    <div>
                        <p class="font-medium">${fullName}${linkedIndicator}</p>
                        <p class="text-sm text-gray-600">${address}</p>
                    </div>
                </div>
            `;
            
            // Add click handler - passes the correct homeowner User ID (client.id)
            clientEl.addEventListener('click', () => {
                console.log(`Client selected: ${fullName} (ID: ${client.id})`);
                selectClient(client.id, fullName); // Pass homeowner ID and name
            });
            
            clientsContainer.appendChild(clientEl);
        });
        
        console.log('Clients and linked homeowners loaded successfully');
    } catch (error) {
        console.error('Error loading clients or linked homeowners:', error);
        clientsContainer.innerHTML = '<p class="text-red-500 mb-2">Error loading clients. Please try again.</p>';
    }
}

function selectClient(clientId, clientName) {
    console.log('Client selected:', clientId, clientName);
    
    // Update booking data with client info
    currentBookingData.client = {
        id: clientId,
        name: clientName
    };
    
    // Ensure the frequency selection step exists
    const frequencySelectionStep = document.getElementById('frequencySelection');
    if (!frequencySelectionStep) {
        console.error('Frequency selection step not found in the DOM');
        alert('Unable to proceed with booking. Please refresh the page and try again.');
        return;
    }
    
    // Show the frequency selection step
    showBookingStep('frequencySelection');
}

// Function to validate booking data before saving
function validateBookingData(bookingData) {
    const errors = [];
    
    // Required fields
    if (!bookingData.date) {
        errors.push('Booking date is required');
    }
    
    if (!bookingData.startTime) {
        errors.push('Start time is required');
    }
    
    if (!bookingData.endTime) {
        errors.push('End time is required');
    }
    
    // Validate date format (YYYY-MM-DD)
    if (bookingData.date) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(bookingData.date)) {
            errors.push('Invalid date format. Expected YYYY-MM-DD');
        } else {
            // Check if it's a valid date
            const dateObj = new Date(bookingData.date);
            if (isNaN(dateObj.getTime())) {
                errors.push('Invalid date');
            }
        }
    }
    
    // Validate time format (HH:MM AM/PM)
    const timeRegex = /^(1[0-2]|0?[1-9]):[0-5][0-9] (AM|PM)$/i;
    
    if (bookingData.startTime && !timeRegex.test(bookingData.startTime)) {
        errors.push('Invalid start time format. Expected HH:MM AM/PM');
    }
    
    if (bookingData.endTime && !timeRegex.test(bookingData.endTime)) {
        errors.push('Invalid end time format. Expected HH:MM AM/PM');
    }
    
    // Validate that end time is after start time
    if (bookingData.startTime && bookingData.endTime) {
        const startDate = new Date(`2000-01-01 ${bookingData.startTime}`);
        const endDate = new Date(`2000-01-01 ${bookingData.endTime}`);
        
        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && startDate >= endDate) {
            errors.push('End time must be after start time');
        }
    }
    
    // Validate frequency
    const validFrequencies = ['one-time', 'weekly', 'bi-weekly', 'monthly'];
    if (bookingData.frequency && !validFrequencies.includes(bookingData.frequency)) {
        errors.push('Invalid frequency');
    }
    
    // Return validation result
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

async function saveBooking() {
    const user = firebase.auth().currentUser;
    if (!user) return;
    
    const confirmBtn = document.getElementById('confirmBookingBtn');
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Saving...';
    
    try {
        console.log('Saving booking with data:', currentBookingData);
        
        // Validate booking data
        const bookingToValidate = {
            date: currentBookingData.dateTime.date,
            startTime: currentBookingData.dateTime.startTime,
            endTime: currentBookingData.dateTime.endTime,
            frequency: currentBookingData.frequency
        };
        
        const validation = validateBookingData(bookingToValidate);
        if (!validation.isValid) {
            console.error('Booking validation failed:', validation.errors);
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = 'Confirm Booking';
            showAlertModal('Cannot save booking: ' + validation.errors.join(', '));
            return;
        }
        
        // Get client details if a client was selected
        let clientDetails = {};
        if (currentBookingData.client?.id) {
            console.log('Fetching client details for ID:', currentBookingData.client.id);
            const clientDoc = await firebase.firestore().collection('users').doc(user.uid)
                .collection('clients').doc(currentBookingData.client.id).get();
            
            if (clientDoc.exists) {
                const userData = clientDoc.data();
                // Enhanced client details with consistent field structure
                clientDetails = {
                    clientId: currentBookingData.client.id,
                    clientFirstName: userData.firstName || '',
                    clientLastName: userData.lastName || '',
                    clientAddress: userData.address || 
                        `${userData.street || ''}, ${userData.city || ''}, ${userData.state || ''} ${userData.zip || ''}`.trim().replace(/^,\s*/, '').replace(/,\s*$/, ''),
                    clientPhone: userData.phone || '',
                    clientEmail: userData.email || '',
                    accessInfo: userData.accessInfo || userData.notes || '',
                    propertyDetails: userData.propertyDetails || '',
                    specialInstructions: userData.specialInstructions || userData.notes || '',
                    frequency: userData.frequency || currentBookingData.frequency || 'one-time',
                    price: userData.price || null
                };
                console.log('Retrieved client details:', clientDetails);
            } else {
                console.log('Client document does not exist');
            }
        }
        
        // Check if a booking with the same date, time, and client already exists
        const bookingsRef = firebase.firestore().collection('users').doc(user.uid).collection('bookings');
        const existingBookingsQuery = await bookingsRef
            .where('date', '==', currentBookingData.dateTime.date)
            .where('startTime', '==', currentBookingData.dateTime.startTime)
            .where('endTime', '==', currentBookingData.dateTime.endTime)
            .get();
        
        if (!existingBookingsQuery.empty) {
            console.warn('Found bookings with the same date and time, checking if any are active');
            
            // Check if any of the existing bookings have the same client and are not cancelled
            let duplicateFound = false;
            existingBookingsQuery.forEach(doc => {
                const existingBooking = doc.data();
                // Only consider bookings that are not cancelled
                if (existingBooking.clientId === currentBookingData.client?.id && existingBooking.status !== 'cancelled') {
                    duplicateFound = true;
                    console.log('Found duplicate active booking with same client:', existingBooking);
                }
            });
            
            // Also check if there are any active bookings for this time slot (regardless of client)
            let timeSlotOccupied = false;
            existingBookingsQuery.forEach(doc => {
                const existingBooking = doc.data();
                // Only consider bookings that are not cancelled
                if (existingBooking.status !== 'cancelled') {
                    timeSlotOccupied = true;
                    console.log('Found active booking occupying this time slot:', existingBooking);
                }
            });
            
            if (duplicateFound) {
                console.error('A booking with the same date, time, and client already exists');
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = 'Confirm Booking';
                showAlertModal('A booking with the same date, time, and client already exists. Please choose a different time slot.');
                return;
            }
            
            if (timeSlotOccupied) {
                console.error('This time slot is already occupied by an active booking');
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = 'Confirm Booking';
                showAlertModal('A booking with the same date and time already exists. Please choose a different time slot.');
                return;
            }
        }
        
        // Determine the number of occurrences based on frequency
        let occurrences = 1; // Default for one-time bookings
        
        if (currentBookingData.frequency === 'weekly') {
            occurrences = 8; // 8 weeks (2 months)
        } else if (currentBookingData.frequency === 'bi-weekly') {
            occurrences = 6; // 6 bi-weekly occurrences (3 months)
        } else if (currentBookingData.frequency === 'monthly') {
            occurrences = 3; // 3 monthly occurrences (3 months)
        }
        
        console.log(`Creating ${occurrences} booking(s) for ${currentBookingData.frequency} frequency`);
        
        // Create an array to hold all booking promises
        const bookingPromises = [];
        
        // Generate a series ID for recurring bookings
        const seriesId = occurrences > 1 ? `series-${Date.now()}-${Math.random().toString(36).substring(2, 15)}` : null;
        
        // Create bookings for each occurrence
        for (let i = 0; i < occurrences; i++) {
            // Calculate the date for this occurrence
            const baseDate = new Date(currentBookingData.dateTime.date);
            let occurrenceDate;
            
            if (i === 0) {
                // First occurrence is on the selected date
                occurrenceDate = baseDate;
            } else if (currentBookingData.frequency === 'weekly') {
                // Add i weeks to the base date
                occurrenceDate = new Date(baseDate);
                occurrenceDate.setDate(baseDate.getDate() + (i * 7));
            } else if (currentBookingData.frequency === 'bi-weekly') {
                // Add i*2 weeks to the base date
                occurrenceDate = new Date(baseDate);
                occurrenceDate.setDate(baseDate.getDate() + (i * 14));
            } else if (currentBookingData.frequency === 'monthly') {
                // Add i months to the base date
                occurrenceDate = new Date(baseDate);
                occurrenceDate.setMonth(baseDate.getMonth() + i);
            } else {
                // One-time booking, should only run once with i=0
                // Skip this iteration for one-time bookings after the first occurrence
                continue;
            }
            
            // Format the date as YYYY-MM-DD
            const formattedDate = occurrenceDate.toISOString().split('T')[0];
            
            // Determine if the booking is for today
            const today = new Date();
            const isToday = occurrenceDate.toDateString() === today.toDateString();
            
            // Determine initial status based on date and time
            let initialStatus = 'scheduled';
            if (isToday) {
                const now = new Date();
                const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} ${now.getHours() >= 12 ? 'PM' : 'AM'}`;
                
                if (currentBookingData.dateTime.startTime <= currentTime && currentTime <= currentBookingData.dateTime.endTime) {
                    initialStatus = 'in-progress';
                }
            }
            
            // Create the booking data for this occurrence with consistent client references
            const bookingData = {
                date: formattedDate,
                startTime: currentBookingData.dateTime.startTime,
                endTime: currentBookingData.dateTime.endTime,
                frequency: currentBookingData.frequency,
                occurrenceNumber: i + 1,
                totalOccurrences: occurrences,
                status: initialStatus,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                // Include all client details or set defaults for new clients
                clientId: currentBookingData.client?.id || null,
                clientName: clientDetails.clientFirstName && clientDetails.clientLastName ? 
                    `${clientDetails.clientFirstName} ${clientDetails.clientLastName}` : 
                    currentBookingData.client?.name || 'New Client',
                ...clientDetails,
                price: clientDetails.price || 0 // Ensure price is a number
            };

            console.log(`[Occurrence ${i + 1}] Saving booking data:`, bookingData);
            
            // Add series ID for recurring bookings
            if (seriesId) {
                bookingData.seriesId = seriesId;
            }
            
            console.log(`Creating booking ${i+1}/${occurrences} for ${formattedDate}:`, bookingData);
            
            // Add the promise to set this booking
            bookingPromises.push(firestoreService.addBooking(user.uid, bookingData));
        }
        
        // Wait for all booking promises to resolve
        await Promise.all(bookingPromises);
        console.log(`Successfully created ${bookingPromises.length} booking(s)`);
        
        // Close the booking modal with animation
        closeBookingModal();
        
        // Show success message as a separate modal
        const message = occurrences > 1 
            ? `Booking confirmed successfully! Created ${occurrences} ${currentBookingData.frequency} bookings.`
            : 'Booking confirmed successfully!';
            
        // Reload the schedule immediately to show the new booking(s)
        await loadUserSchedule();
        
        // Then show the success message
        showAlertModal(message);
    } catch (error) {
        console.error('Error saving booking:', error);
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = 'Confirm Booking';
        showAlertModal('Error saving booking. Please try again.');
    }
}

// Function to reset the booking modal to its initial state
function resetBookingModal() {
    console.log('Resetting booking modal...');
    
    const bookingModal = document.getElementById('bookingModal');
    if (!bookingModal) {
        console.error('Booking modal not found in the DOM');
        return false;
    }
    
    const bookingContent = document.getElementById('bookingContent');
    if (!bookingContent) {
        console.error('Booking content not found in the DOM');
        return false;
    }
    
    // Reset the booking content to its original structure
    bookingContent.innerHTML = `
        <div id="bookingDateTime" class="mb-4 p-3 bg-primary-light/30 rounded-lg">
            <p class="font-medium">Loading booking details...</p>
        </div>
        
        <div id="bookingSteps">
            <!-- Client Selection -->
            <div id="clientSelection" class="booking-step">
                <h3 class="text-lg font-bold mb-3">Select Client</h3>
                <div id="existingClients" class="mb-4">
                    <p class="text-gray-600 mb-2">Loading clients...</p>
                </div>
                <button id="newClientBtn" class="w-full p-3 bg-gray-100 rounded-lg text-left mb-2 hover:bg-gray-200">
                    <div class="flex items-center">
                        <div class="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center mr-3">
                            <i class="fas fa-plus"></i>
                        </div>
                        <span>Add New Client</span>
                    </div>
                </button>
            </div>
            
            <!-- Frequency Selection -->
            <div id="frequencySelection" class="booking-step hidden">
                <h3 class="text-lg font-bold mb-3">Select Frequency</h3>
                <div class="grid grid-cols-1 gap-3">
                    <button class="frequency-option p-3 bg-gray-100 rounded-lg text-left hover:bg-gray-200" data-frequency="one-time">
                        <div class="flex items-center">
                            <div class="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center mr-3">
                                <i class="fas fa-calendar-day"></i>
                            </div>
                            <div>
                                <span class="font-medium">One-time</span>
                                <p class="text-sm text-gray-600">Single cleaning service</p>
                            </div>
                        </div>
                    </button>
                    <button class="frequency-option p-3 bg-gray-100 rounded-lg text-left hover:bg-gray-200" data-frequency="weekly">
                        <div class="flex items-center">
                            <div class="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center mr-3">
                                <i class="fas fa-calendar-week"></i>
                            </div>
                            <div>
                                <span class="font-medium">Weekly</span>
                                <p class="text-sm text-gray-600">Every week on this day</p>
                            </div>
                        </div>
                    </button>
                    <button class="frequency-option p-3 bg-gray-100 rounded-lg text-left hover:bg-gray-200" data-frequency="biweekly">
                        <div class="flex items-center">
                            <div class="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center mr-3">
                                <i class="fas fa-calendar-alt"></i>
                            </div>
                            <div>
                                <span class="font-medium">Bi-weekly</span>
                                <p class="text-sm text-gray-600">Every two weeks on this day</p>
                            </div>
                        </div>
                    </button>
                    <button class="frequency-option p-3 bg-gray-100 rounded-lg text-left hover:bg-gray-200" data-frequency="monthly">
                        <div class="flex items-center">
                            <div class="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center mr-3">
                                <i class="fas fa-calendar-check"></i>
                            </div>
                            <div>
                                <span class="font-medium">Monthly</span>
                                <p class="text-sm text-gray-600">Once a month on this day</p>
                            </div>
                        </div>
                    </button>
                </div>
            </div>
            
            <!-- Confirmation -->
            <div id="confirmationStep" class="booking-step hidden">
                <h3 class="text-lg font-bold mb-3">Confirm Booking</h3>
                <div class="bg-gray-100 p-4 rounded-lg mb-4">
                    <div id="confirmationDetails">
                        <p class="text-gray-600">Loading confirmation details...</p>
                    </div>
                </div>
                <button id="confirmBookingBtn" class="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-primary-dark">
                    Confirm Booking
                </button>
            </div>
        </div>
    `;
    
    // Set up booking handlers again
    setupBookingHandlers();
    
    console.log('Booking modal reset successfully');
    return true;
}

// Function to add a time slot button
function addTimeSlot(container, startTime, endTime, date, durationMinutes) {
    console.log('Adding time slot:', { container, startTime, endTime, date, durationMinutes });
    if (!startTime || !endTime) {
        console.warn('Attempted to add time slot with missing start or end time');
        return;
    }

    const timeSlotBtn = document.createElement('button');
    timeSlotBtn.className = 'w-full flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 hover:border-gray-300 transition duration-150 ease-in-out mb-2'; // Added mb-2
    timeSlotBtn.setAttribute('data-start-time', startTime);
    timeSlotBtn.setAttribute('data-end-time', endTime);
    timeSlotBtn.setAttribute('data-date', dateUtils.formatDate(date, 'YYYY-MM-DD')); // Store full date
    timeSlotBtn.setAttribute('data-duration', durationMinutes);

    // --- REMOVE isMobileDevice CHECK --- 
    // const isMobile = isMobileDevice(); // This function is not defined
    const formattedDate = dateUtils.formatDate(date, 'short-weekday-numeric'); // e.g., "Mon, Apr 7"
    
    timeSlotBtn.innerHTML = `
        <div class="flex flex-col text-left">
            <span class="text-sm font-medium text-primary">${startTime} - ${endTime}</span>
            <span class="text-xs text-gray-500">${durationMinutes ? durationMinutes + ' mins' : 'Duration not set'}</span>
                </div>
        <span class="text-sm font-semibold text-primary">Book</span>
    `;
    // --- END REMOVAL --- 

    // Attach event listener to open the booking modal
    timeSlotBtn.addEventListener('click', () => {
        const bookingDetails = {
            date: dateUtils.formatDate(date, 'YYYY-MM-DD'),
            startTime: startTime,
            endTime: endTime,
            durationMinutes: durationMinutes,
            // Add any other necessary details
        };
        openBookingModal(bookingDetails);
    });

    container.appendChild(timeSlotBtn);
}

// Function to show the new client form
function showNewClientForm() {
    // Create the new client step if it doesn't exist
    if (!document.getElementById('newClientStep')) {
        const newClientStep = document.createElement('div');
        newClientStep.id = 'newClientStep';
        newClientStep.className = 'booking-step hidden';
        newClientStep.innerHTML = `
            <div class="flex items-center mb-4">
                <button id="backToClientSelection" class="text-gray-500 hover:text-gray-700 mr-2">
                    <i class="fas fa-arrow-left"></i>
                </button>
                <h3 class="text-lg font-bold">Add New Client</h3>
            </div>
            
            <div class="space-y-6">
                <!-- Client Information -->
                <div class="bg-white rounded-lg shadow-sm p-4">
                    <h2 class="text-lg font-medium text-gray-900 mb-4">Client Information</h2>
                    <div class="space-y-4">
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <input type="text" id="clientFirstName" placeholder="First Name" required
                                    class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary-light">
                            </div>
                            <div>
                                <input type="text" id="clientLastName" placeholder="Last Name" required
                                    class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary-light">
                            </div>
                        </div>
                        <div>
                            <input type="tel" id="clientPhone" placeholder="Phone Number" required
                                class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary-light">
                        </div>
                        <div>
                            <input type="email" id="clientEmail" placeholder="Email (optional)"
                                class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary-light">
                        </div>
                        <div>
                            <input type="text" id="clientAddress" placeholder="Address" required
                                class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary-light">
                        </div>
                    </div>
                </div>

                <!-- Price per Cleaning -->
                <div class="bg-white rounded-lg shadow-sm p-4">
                    <h2 class="text-lg font-medium text-gray-900 mb-3">Price per Cleaning</h2>
                    <div class="relative">
                        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span class="text-gray-500">$</span>
                        </div>
                        <input type="number" id="cleaningPrice" placeholder="50" 
                            class="w-full pl-8 pr-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary-light">
                    </div>
                </div>

                <!-- Special Instructions -->
                <div class="bg-white rounded-lg shadow-sm p-4">
                    <h2 class="text-lg font-medium text-gray-900 mb-3">Special Instructions</h2>
                    <div>
                        <textarea id="clientNotes" rows="3" class="block w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-primary focus:ring-2 focus:ring-primary-light" 
                            placeholder="Enter any special instructions or notes (products to use, pets, entry instructions, etc.)"></textarea>
                    </div>
                </div>

                <!-- Access Information -->
                <div class="bg-white rounded-lg shadow-sm p-4">
                    <h2 class="text-lg font-medium text-gray-900 mb-3">Access Information</h2>
                    <div>
                        <textarea id="accessInfo" rows="3" class="block w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-primary focus:ring-2 focus:ring-primary-light" 
                            placeholder="Key location, door codes, alarm information, etc."></textarea>
                    </div>
                </div>

                <!-- Save Button -->
                <div class="mt-8">
                    <button type="button" id="saveClientBtn" class="block w-full bg-green-500 hover:bg-green-600 text-white font-medium py-4 px-4 rounded-lg flex items-center justify-center gap-2">
                        <i class="fas fa-check"></i>
                        Save Client & Continue
                    </button>
                    
                    <button type="button" id="cancelClientBtn" class="block w-full text-center text-gray-600 py-4">
                        Cancel
                    </button>
                </div>
            </div>
        `;
        
        document.getElementById('bookingSteps').appendChild(newClientStep);
        
        // Add back button handler
        document.getElementById('backToClientSelection').addEventListener('click', function() {
            showBookingStep('clientSelection');
        });
        
        // Add cancel button handler
        document.getElementById('cancelClientBtn').addEventListener('click', function() {
            showBookingStep('clientSelection');
        });
        
        // Add save button handler
        document.getElementById('saveClientBtn').addEventListener('click', function() {
            saveNewClient();
        });
    }
    
    // Show the new client step
    showBookingStep('newClientStep');
}

// Function to save a new client
async function saveNewClient() {
    const user = firebase.auth().currentUser;
    if (!user) return;
    
    const firstNameInput = document.getElementById('clientFirstName');
    const lastNameInput = document.getElementById('clientLastName');
    const phoneInput = document.getElementById('clientPhone');
    const emailInput = document.getElementById('clientEmail');
    const addressInput = document.getElementById('clientAddress');
    const notesInput = document.getElementById('clientNotes');
    const accessInfoInput = document.getElementById('accessInfo');
    const priceInput = document.getElementById('cleaningPrice');
    
    // Basic validation
    if (!firstNameInput.value.trim() || !phoneInput.value.trim() || !addressInput.value.trim()) {
        alert('Please fill in all required fields');
        return;
    }
    
    // Disable the save button and show loading state
    const saveBtn = document.getElementById('saveClientBtn');
    const originalBtnText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Saving...';
    
    try {
        // Get values from the form
        const firstName = firstNameInput.value.trim();
        const lastName = lastNameInput.value.trim();
        const fullName = `${firstName} ${lastName}`.trim();
        
        // Save the client to Firestore with firstName and lastName fields
        const clientsRef = firebase.firestore().collection('users').doc(user.uid).collection('clients');
        const newClientRef = await clientsRef.add({
            firstName: firstName,
            lastName: lastName,
            phone: phoneInput.value.trim(),
            email: emailInput.value.trim() || null,
            street: addressInput.value.trim(), // Store as street for consistency
            notes: notesInput.value.trim() || null,
            accessInfo: accessInfoInput.value.trim() || null,
            price: priceInput.value ? Number(priceInput.value) : null,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Select the newly created client
        selectClient(newClientRef.id, fullName);
        
        // Move to frequency selection
        showBookingStep('frequencySelection');
        
    } catch (error) {
        console.error('Error saving new client:', error);
        alert('Error saving client. Please try again.');
        // Stay on the new client form
        return;
    } finally {
        // Restore the button state
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalBtnText;
    }
}

// Function to load user's bookings from Firestore
async function loadUserBookings(startDate, endDate) {
    const user = firebase.auth().currentUser;
    if (!user) {
        console.log('No user found, cannot load bookings');
        return [];
    }
    
    // Format dates for Firestore query
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    console.log('Loading bookings from', startDateStr, 'to', endDateStr);
    
    try {
        const bookingsRef = firebase.firestore().collection('users').doc(user.uid).collection('bookings');
        
        // First, try to get all bookings and filter client-side
        // This is more reliable than using where() with dates which can be tricky
        const snapshot = await bookingsRef.get();
        
        const bookings = [];
        const bookingKeys = new Set(); // Track unique bookings
        const cancelledBookings = []; // Track cancelled bookings for debugging
        
        snapshot.forEach(doc => {
            const booking = {
                id: doc.id,
                ...doc.data()
            };
            
            // Check if the booking is within the date range
            if (booking.date >= startDateStr && booking.date <= endDateStr) {
                // Create a unique key for this booking based on date, time, and client
                const bookingKey = `${booking.date}_${booking.startTime}_${booking.endTime}_${booking.clientName}`;
                
                // Check if the booking is cancelled
                if (booking.status === 'cancelled') {
                    cancelledBookings.push({
                        id: booking.id,
                        date: booking.date,
                        time: `${booking.startTime} - ${booking.endTime}`,
                        client: booking.clientName,
                        status: booking.status
                    });
                    console.log(`Skipping cancelled booking: ${bookingKey}`);
                } else {
                    // Only add this booking if we haven't seen it before and it's not cancelled
                    if (!bookingKeys.has(bookingKey)) {
                        bookingKeys.add(bookingKey);
                        bookings.push(booking);
                    } else {
                        console.warn('Duplicate booking found and skipped:', bookingKey);
                    }
                }
            }
        });
        
        console.log('Found', bookings.length, 'active bookings in date range');
        console.log('Excluded', cancelledBookings.length, 'cancelled bookings');
        if (cancelledBookings.length > 0) {
            console.log('Cancelled bookings:', cancelledBookings);
        }
        
        return bookings;
    } catch (error) {
        console.error('Error loading bookings:', error);
        return [];
    }
}

// Function to add a booking card to the schedule
function addBookingCard(container, booking, isToday) {
    console.log('Adding booking card for:', booking);
    
        const card = document.createElement('div');
        card.className = 'bg-white rounded-lg shadow-sm mb-4';
    
    // Add a data attribute with the booking ID for easy reference
    if (booking.id) {
        card.setAttribute('data-booking-id', booking.id);
    }
    
    // Determine status based on booking status in database
    let status = 'Upcoming';
    let statusClass = 'bg-gray-100 text-gray-800';
    
    // Map database status to display status
    switch(booking.status) {
        case 'in-progress':
            status = 'In Progress';
            statusClass = 'bg-blue-100 text-blue-800';
            break;
        case 'completed':
            status = 'Done';
            statusClass = 'bg-green-100 text-green-800';
            break;
        case 'paid':
            status = 'Done & Paid';
            statusClass = 'bg-green-100 text-green-800';
            break;
        case 'cancelled':
            status = 'Cancelled';
            statusClass = 'bg-red-100 text-red-800';
            break;
        default: // 'scheduled' or any other status
            // If it's today and the current time is between start and end time, mark as "In Progress"
            if (isToday) {
                const now = new Date();
                const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
                
                if (booking.startTime <= currentTime && currentTime <= booking.endTime) {
                    status = 'In Progress';
                    statusClass = 'bg-blue-100 text-blue-800';
                } else if (currentTime > booking.endTime) {
                    status = 'Done';
                    statusClass = 'bg-green-100 text-green-800';
                }
            }
            break;
    }
    
    // Create client name from available fields
    let clientName = booking.clientName || '';
    
    // If clientName is not available but we have firstName/lastName, use those
    if (!clientName && (booking.clientFirstName || booking.clientLastName)) {
        clientName = `${booking.clientFirstName || ''} ${booking.clientLastName || ''}`.trim();
    }
    
    // If still no name, use a placeholder
    if (!clientName) {
        clientName = 'Unnamed Client';
    }
    
    // Create the card HTML with consistent format
    let cardHTML = `
            <div class="p-6">
                <!-- Time and Status -->
                <div class="flex justify-between items-center mb-4">
                    <div class="flex items-center gap-x-2">
                    <span class="text-xl font-bold text-gray-900">${booking.startTime} - ${booking.endTime}</span>
                    </div>
                <!-- Status Button -->
                <button class="px-3 py-2 text-sm font-medium rounded-lg ${statusClass}">
                    ${status}
                </button>
                </div>
                
            <!-- Client Name -->
            <h3 class="font-medium text-gray-900">${clientName}</h3>
    `;
    
    // Add address if available
    if (booking.clientAddress) {
        cardHTML += `
            <div class="flex items-center text-gray-600 text-sm mt-1">
                <i class="fas fa-map-marker-alt mr-2 text-gray-500"></i>
                <a href="https://maps.google.com/?q=${encodeURIComponent(booking.clientAddress)}" target="_blank">
                    ${booking.clientAddress}
                </a>
            </div>
        `;
    }
    
    // Add notes if available
    if (booking.notes) {
        cardHTML += `
            <div class="flex items-center text-gray-600 text-sm mt-1">
                <i class="fas fa-info-circle mr-2 text-gray-500"></i>
                ${booking.notes}
            </div>
        `;
    }
    
    // Add access info if available and different from notes
    if (booking.accessInfo && booking.accessInfo !== booking.notes) {
        cardHTML += `
            <div class="flex items-center text-gray-600 text-sm mt-1">
                <i class="fas fa-key mr-2 text-gray-500"></i>
                ${booking.accessInfo}
            </div>
        `;
    }
    
    // Add phone if available
    if (booking.clientPhone) {
        cardHTML += `
            <div class="flex items-center text-primary text-sm mt-1">
                        <i class="fas fa-phone-alt mr-2"></i>
                <a href="tel:${booking.clientPhone}">
                    ${booking.clientPhone}
                    </a>
                </div>
        `;
    }
                
    // Add action buttons
    cardHTML += `
                <!-- Action Buttons -->
            <div class="flex gap-2 mt-4">
                <button class="flex-1 py-2 px-4 bg-gray-100 rounded-lg text-center text-gray-700 text-sm font-medium view-details" data-booking-id="${booking.id}">
                        View Details
                </button>
                <button class="flex-1 py-2 px-4 bg-primary-light rounded-lg text-center text-primary text-sm font-medium reschedule" data-booking-id="${booking.id}">
                        Reschedule
                </button>
                </div>
            </div>
        `;
    
    card.innerHTML = cardHTML;
    
    // Add to container
    container.appendChild(card);
    
    // Add event listeners for the action buttons
    const viewDetailsBtn = card.querySelector('.view-details');
    const rescheduleBtn = card.querySelector('.reschedule');
    
    viewDetailsBtn.addEventListener('click', () => {
        showBookingDetails(booking);
    });
    
    rescheduleBtn.addEventListener('click', () => {
        showRescheduleOptions(booking);
    });
}

// Function to show booking details
function showBookingDetails(booking) {
    // Create a modal to show booking details
    const modal = document.createElement('div');
    modal.id = 'bookingDetailsModal';
    modal.className = 'fixed inset-x-0 bottom-0 z-50 transform transition-transform duration-300 ease-in-out translate-y-full';
    
    // Format the date for display
    const formattedDate = new Date(booking.date).toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    // Determine if the booking is in the past
    const bookingEndTime = new Date(booking.date + 'T' + booking.endTime.replace(' PM', ':00 PM').replace(' AM', ':00 AM'));
    const now = new Date();
    const isPastBooking = bookingEndTime < now;
    
    // Determine if the booking is cancelled
    const isCancelled = booking.status === 'cancelled';
    
    // Determine the current status
    const currentStatus = booking.status || 'scheduled';
    
    // Determine if this is a recurring booking
    const isRecurring = booking.frequency && booking.frequency !== 'one-time' && booking.seriesId;
    const isPartOfSeries = !!booking.seriesId;
    
    modal.innerHTML = `
        <div class="bg-white w-full rounded-t-xl overflow-hidden shadow-xl transform transition-all max-h-[90vh] flex flex-col">
            <div class="flex justify-center pt-2 pb-1">
                <div class="w-10 h-1 bg-gray-300 rounded-full"></div>
            </div>
            <div class="flex justify-between items-center p-4 border-b border-gray-200">
                <h2 class="text-xl font-bold text-gray-900">Booking Details</h2>
                <button class="text-gray-500 hover:text-gray-700 close-modal">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="overflow-y-auto p-4 flex-grow">
                <div class="mb-4">
                    <div class="flex justify-between items-center mb-2">
                        <h3 class="text-lg font-semibold text-gray-900">Date & Time</h3>
                        <span class="px-2 py-1 rounded text-sm ${isCancelled ? 'bg-red-100 text-red-800' : isPastBooking ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800'}">
                            ${isCancelled ? 'Cancelled' : isPastBooking ? 'Past' : 'Upcoming'}
                        </span>
                    </div>
                    <p class="text-gray-700">${formattedDate}</p>
                    <p class="text-gray-700">${booking.startTime} - ${booking.endTime}</p>
                </div>
                
                ${!isPastBooking && !isCancelled ? `
                <div class="mb-4">
                    <h3 class="text-lg font-semibold text-gray-900 mb-2">Status</h3>
                    <div class="flex space-x-2">
                        <button class="status-btn px-3 py-2 rounded-lg border ${currentStatus === 'scheduled' ? 'bg-primary text-white' : 'text-gray-900'}" data-status="scheduled">
                            Upcoming
                        </button>
                        <button class="status-btn px-3 py-2 rounded-lg border ${currentStatus === 'in-progress' ? 'bg-primary text-white' : 'text-gray-900'}" data-status="in-progress">
                            In Progress
                        </button>
                        <button class="status-btn px-3 py-2 rounded-lg border ${currentStatus === 'completed' ? 'bg-primary text-white' : 'text-gray-900'}" data-status="completed">
                            Done
                        </button>
                    </div>
                </div>
                ` : ''}
                
                <div class="mb-4">
                    <h3 class="text-lg font-semibold text-gray-900 mb-2">Client</h3>
                    <p class="text-gray-700">${booking.clientName || 'No client name provided'}</p>
                    ${booking.clientPhone ? `<p class="text-gray-700"><i class="fas fa-phone mr-1"></i> ${booking.clientPhone}</p>` : ''}
                    ${booking.address ? `<p class="text-gray-700"><i class="fas fa-map-marker-alt mr-1"></i> ${booking.address}</p>` : ''}
                </div>
                
                ${booking.accessInfo ? `
                <div class="mb-4">
                    <h3 class="text-lg font-semibold text-gray-900 mb-2">Access Information</h3>
                    <p class="text-gray-700">${booking.accessInfo}</p>
                </div>
                ` : ''}
                
                ${booking.specialInstructions ? `
                <div class="mb-4">
                    <h3 class="text-lg font-semibold text-gray-900 mb-2">Special Instructions</h3>
                    <p class="text-gray-700">${booking.specialInstructions}</p>
                </div>
                ` : ''}
                
                ${booking.notes ? `
                <div class="mb-4">
                    <h3 class="text-lg font-semibold text-gray-900 mb-2">Notes</h3>
                    <p class="text-gray-700">${booking.notes}</p>
                </div>
                ` : ''}
                
                ${isRecurring ? `
                <div class="mb-4">
                    <h3 class="text-lg font-semibold text-gray-900 mb-2">Recurring</h3>
                    <p class="text-gray-700">This is a ${booking.frequency} booking</p>
                    <p class="text-gray-700">Occurrence ${booking.occurrenceNumber} of ${booking.totalOccurrences}</p>
                </div>
                ` : ''}
            </div>
            <div class="p-4 border-t border-gray-200">
                <div class="flex space-x-3">
                    ${!isPastBooking && !isCancelled ? `
                    <button class="flex-1 py-3 px-4 bg-red-500 rounded-lg text-center text-white text-sm font-medium cancel-booking">
                        <i class="fas fa-times-circle mr-1"></i> Cancel Booking
                    </button>
                    ` : ''}
                    <button class="flex-1 py-3 px-4 bg-primary rounded-lg text-center text-white text-sm font-medium close-modal">
                        <i class="fas fa-check mr-1"></i> Close
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Use the existing bookingModalBackdrop instead of creating a new one
    const bookingModalBackdrop = document.getElementById('bookingModalBackdrop');
    
    // Add the modal to the document
    document.body.appendChild(modal);
    
    // Prevent body scrolling
    document.body.style.overflow = 'hidden';
    
    // Show and animate the backdrop
    if (bookingModalBackdrop) {
        bookingModalBackdrop.classList.remove('hidden');
        bookingModalBackdrop.style.opacity = '1';
    }
    
    // Animate in the modal
    setTimeout(() => {
        modal.classList.remove('translate-y-full');
    }, 10);
    
    // Set up drag functionality
    setupBottomSheetDrag(modal);
    
    // Function to close the modal
    const closeModal = () => {
        // Animate out
        modal.classList.add('translate-y-full');
        
        // Fade out the backdrop
        if (bookingModalBackdrop) {
            bookingModalBackdrop.style.opacity = '0';
        }
        
        // Wait for animation to complete before removing
        setTimeout(() => {
            modal.remove();
            
            // Hide backdrop
            if (bookingModalBackdrop) {
                bookingModalBackdrop.classList.add('hidden');
            }
            
            document.body.style.overflow = '';
        }, 300);
    };
    
    // Add event listeners for the close buttons
    const closeButtons = modal.querySelectorAll('.close-modal');
    closeButtons.forEach(button => {
        button.addEventListener('click', closeModal);
    });
    
    // Add event listener for backdrop click
    if (bookingModalBackdrop) {
        bookingModalBackdrop.addEventListener('click', closeModal);
    }
    
    // Add event listener for the cancel booking button
    const cancelButton = modal.querySelector('.cancel-booking');
    if (cancelButton) {
        cancelButton.addEventListener('click', () => {
            // Check if this is a recurring booking
            if (isPartOfSeries && booking.occurrenceNumber < booking.totalOccurrences) {
                // Show enhanced cancellation options for recurring bookings
                showCancellationOptions(booking);
                closeModal();
            } else {
                // Show a standard confirmation modal for one-time bookings
                showConfirmationModal('Are you sure you want to cancel this booking? This action cannot be undone.', () => {
                    closeModal();
                    cancelBooking(booking.id);
                }, () => {
                    // Do nothing if the user cancels
                });
            }
        });
    }
    
    // Add event listeners for status buttons
    const statusButtons = modal.querySelectorAll('.status-btn');
    statusButtons.forEach(button => {
        button.addEventListener('click', () => {
            const newStatus = button.getAttribute('data-status');
            console.log('Status button clicked:', newStatus);
            
            // Update UI immediately to provide feedback
            statusButtons.forEach(btn => {
                if (btn === button) {
                    btn.classList.remove('text-gray-900');
                    btn.classList.add('text-white', 'bg-primary');
                } else {
                    btn.classList.remove('text-white', 'bg-primary');
                    btn.classList.add('text-gray-900');
                }
            });
            
            // Update the booking status in Firestore
            updateBookingStatus(booking.id, newStatus);
        });
    });
}

// Function to cancel a booking
async function cancelBooking(bookingId) {
    const user = firebase.auth().currentUser;
    if (!user) {
        showAlertModal('You must be logged in to cancel a booking');
        return;
    }
    
    showLoading('Cancelling booking...');
    
    try {
        console.log('Attempting to cancel booking with ID:', bookingId);
        
        // Get the booking document first to verify it exists
        const bookingRef = firebase.firestore().collection('users').doc(user.uid).collection('bookings').doc(bookingId);
        const bookingDoc = await bookingRef.get();
        
        if (!bookingDoc.exists) {
            console.error('Booking not found:', bookingId);
            hideLoading();
            showAlertModal('Booking not found. It may have been already deleted.');
            return;
        }
        
        // Get the booking data before updating it
        const bookingData = bookingDoc.data();
        console.log('Booking data to be cancelled:', bookingData);
        
        // Update the booking status to cancelled
        await bookingRef.update({
            status: 'cancelled',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('Booking cancelled successfully:', bookingId);
        
        // Refresh the entire schedule with loading indicator
        console.log('Refreshing schedule after booking cancellation');
        await loadUserSchedule(true); // Show loading indicator for better user experience
        
        // Show success message
        showAlertModal('Booking cancelled successfully');
    } catch (error) {
        console.error('Error cancelling booking:', error);
        hideLoading();
        
        // Show a more user-friendly error message
        let errorMessage = 'Error cancelling booking. Please try again.';
        if (error.code === 'permission-denied') {
            errorMessage = 'You do not have permission to cancel this booking.';
        } else if (error.code === 'not-found') {
            errorMessage = 'Booking not found. It may have been already deleted.';
        }
        
        showAlertModal(errorMessage);
    }
}

// Function to show a custom alert modal
function showAlertModal(message, onClose) {
    // Create the modal element
    const modal = document.createElement('div');
    modal.id = 'alertModal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-60 flex items-center justify-center'; // Higher z-index
    
    // Create the modal content
    modal.innerHTML = `
        <div class="bg-white rounded-lg w-full max-w-md mx-4">
            <div class="p-4 border-b border-gray-200">
                <h2 class="text-xl font-bold text-gray-900">Message</h2>
            </div>
            <div class="p-6">
                <p class="text-gray-700 mb-6">${message}</p>
                <div class="flex justify-end">
                    <button class="ok-btn px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark">
                        OK
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Add the modal to the document
    document.body.appendChild(modal);
    
    // Add event listener for the OK button
    const okBtn = modal.querySelector('.ok-btn');
    okBtn.addEventListener('click', () => {
        modal.remove();
        if (onClose) onClose();
    });
    
    // Also close the modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
            if (onClose) onClose();
        }
    });
    
    return modal;
}

// Function to show reschedule options
function showRescheduleOptions(booking) {
    // For now, just show an alert
    alert('Reschedule functionality will be implemented in a future update.');
}

// Function to navigate to the previous week
function navigateToPreviousWeek() {
    if (!currentWeekStart) return;
    currentWeekStart = dateUtils.subtractDays(currentWeekStart, 7); // Use dateUtils
        updateWeekDisplay();
    generateSchedule();
        updateNavigationState();
}

// Function to navigate to the next week
function navigateToNextWeek() {
    if (!currentWeekStart) return;
    currentWeekStart = dateUtils.addDays(currentWeekStart, 7); // Use dateUtils
        updateWeekDisplay();
    generateSchedule();
        updateNavigationState();
}

// Function to navigate to the current week
function navigateToCurrentWeek() {
    currentWeekStart = dateUtils.getStartOfWeek(new Date()); // Use dateUtils
        updateWeekDisplay();
    generateSchedule();
        updateNavigationState();
}

// Function to initialize booking modal
function initializeBookingModal() {
    console.log('Initializing booking modal...');
    
    // Check if booking modal exists
    const bookingModal = document.getElementById('bookingModal');
    if (!bookingModal) {
        console.error('Booking modal not found in the DOM');
        return false;
    }
    
    // Check if client selection step exists
    const clientSelectionStep = document.getElementById('clientSelection');
    if (!clientSelectionStep) {
        console.error('Client selection step not found in the DOM');
        return false;
    }
    
    // Check if frequency selection step exists
    const frequencySelectionStep = document.getElementById('frequencySelection');
    if (!frequencySelectionStep) {
        console.error('Frequency selection step not found in the DOM');
        return false;
    }
    
    // Check if confirmation step exists
    const confirmationStep = document.getElementById('confirmationStep');
    if (!confirmationStep) {
        console.error('Confirmation step not found in the DOM');
        return false;
    }
    
    // Set up booking handlers if not already initialized
    if (!bookingHandlersInitialized) {
        setupBookingHandlers();
        bookingHandlersInitialized = true;
    }
    
    // Set up backdrop click to close modal
    const bookingModalBackdrop = document.getElementById('bookingModalBackdrop');
    if (bookingModalBackdrop) {
        bookingModalBackdrop.addEventListener('click', function() {
            closeBookingModal();
        });
    }
    
    console.log('Booking modal initialized successfully');
    return true;
}

// Function to show a custom confirmation modal
function showConfirmationModal(message, onConfirm, onCancel) {
    // Create the modal element
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center';
    
    // Create the modal content
    modal.innerHTML = `
        <div class="bg-white rounded-lg w-full max-w-md mx-4">
            <div class="p-4 border-b border-gray-200">
                <h2 class="text-xl font-bold text-gray-900">Confirm Action</h2>
            </div>
            <div class="p-6">
                <p class="text-gray-700 mb-6">${message}</p>
                <div class="flex justify-end space-x-3">
                    <button class="cancel-btn px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">
                        Cancel
                    </button>
                    <button class="confirm-btn px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark">
                        OK
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Add the modal to the document
    document.body.appendChild(modal);
    
    // Add event listeners for the buttons
    const confirmBtn = modal.querySelector('.confirm-btn');
    const cancelBtn = modal.querySelector('.cancel-btn');
    
    confirmBtn.addEventListener('click', () => {
        modal.remove();
        if (onConfirm) onConfirm();
    });
    
    cancelBtn.addEventListener('click', () => {
        modal.remove();
        if (onCancel) onCancel();
    });
    
    // Also close the modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
            if (onCancel) onCancel();
        }
    });
    
    return modal;
}

// Function to show cancellation options for recurring bookings
function showCancellationOptions(booking) {
    // Create a modal to show cancellation options
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center';
    
    // Format the date for display
    const formattedDate = new Date(booking.date).toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric' 
    });
    
    // Calculate how many future bookings there are in the series
    const futureBookingsCount = booking.totalOccurrences - booking.occurrenceNumber;
    
    modal.innerHTML = `
        <div class="bg-white rounded-lg w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div class="p-4 border-b border-gray-200">
                <h2 class="text-xl font-bold text-gray-900">Cancel Booking</h2>
            </div>
            <div class="p-4">
                <p class="text-gray-700 mb-4">This is part of a recurring booking series. What would you like to cancel?</p>
                
                <div class="space-y-3">
                    <!-- Option 1: Cancel This Cleaning Only -->
                    <button class="cancel-option w-full p-4 border border-gray-300 rounded-lg text-left hover:bg-gray-50" data-option="this">
                        <div class="flex items-start">
                            <div class="flex-shrink-0 mt-0.5">
                                <i class="fas fa-calendar-day text-red-600 text-lg"></i>
                            </div>
                            <div class="ml-3">
                                <h3 class="font-medium text-gray-900">Cancel This Cleaning Only</h3>
                                <p class="text-sm text-gray-500">Only this ${formattedDate} booking will be cancelled.</p>
                            </div>
                        </div>
                    </button>
                    
                    <!-- Option 2: Cancel This and All Future Cleanings -->
                    <button class="cancel-option w-full p-4 border border-gray-300 rounded-lg text-left hover:bg-gray-50" data-option="future">
                        <div class="flex items-start">
                            <div class="flex-shrink-0 mt-0.5">
                                <i class="fas fa-calendar-alt text-red-600 text-lg"></i>
                            </div>
                            <div class="ml-3">
                                <h3 class="font-medium text-gray-900">Cancel This and All Future Cleanings</h3>
                                <p class="text-sm text-gray-500">This and ${futureBookingsCount} future bookings will be cancelled.</p>
                            </div>
                        </div>
                    </button>
                    
                    <!-- Option 3: Cancel All Cleanings in Series -->
                    <button class="cancel-option w-full p-4 border border-gray-300 rounded-lg text-left hover:bg-gray-50" data-option="all">
                        <div class="flex items-start">
                            <div class="flex-shrink-0 mt-0.5">
                                <i class="fas fa-calendar-times text-red-600 text-lg"></i>
                            </div>
                            <div class="ml-3">
                                <h3 class="font-medium text-gray-900">Cancel All Cleanings in Series</h3>
                                <p class="text-sm text-gray-500">All ${booking.totalOccurrences} bookings in this series will be cancelled.</p>
                            </div>
                        </div>
                    </button>
                </div>
                
                <div class="mt-6">
                    <button class="back-btn w-full py-3 px-4 bg-gray-100 rounded-lg text-center text-gray-700 text-sm font-medium hover:bg-gray-200">
                        <i class="fas fa-arrow-left mr-1"></i> Back
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listener for the back button
    const backButton = modal.querySelector('.back-btn');
    backButton.addEventListener('click', () => {
        modal.remove();
        showBookingDetails(booking);
    });
    
    // Add event listeners for the cancellation options
    const cancelOptions = modal.querySelectorAll('.cancel-option');
    cancelOptions.forEach(option => {
        option.addEventListener('click', () => {
            const cancelOption = option.getAttribute('data-option');
            
            // Show a confirmation modal based on the selected option
            let confirmationMessage = '';
            
            if (cancelOption === 'this') {
                confirmationMessage = `Are you sure you want to cancel only this cleaning on ${formattedDate}?`;
            } else if (cancelOption === 'future') {
                confirmationMessage = `Are you sure you want to cancel this and all future cleanings (${futureBookingsCount + 1} total)?`;
            } else if (cancelOption === 'all') {
                confirmationMessage = `Are you sure you want to cancel all ${booking.totalOccurrences} cleanings in this series?`;
            }
            
            showConfirmationModal(confirmationMessage, () => {
                modal.remove();
                
                // Call the appropriate cancellation function based on the option
                if (cancelOption === 'this') {
                    cancelBooking(booking.id);
                } else if (cancelOption === 'future') {
                    cancelFutureBookings(booking);
                } else if (cancelOption === 'all') {
                    cancelAllBookingsInSeries(booking);
                }
            }, () => {
                // Do nothing if the user cancels
            });
        });
    });
}

// Function to cancel future bookings in a series
async function cancelFutureBookings(booking) {
    const user = firebase.auth().currentUser;
    if (!user) {
        showAlertModal('You must be logged in to cancel bookings');
        return;
    }
    
    showLoading('Cancelling future bookings...');
    
    try {
        console.log('Cancelling future bookings for series:', booking.seriesId);
        
        // Get all bookings in the series with occurrence number >= the current booking
        const bookingsRef = firebase.firestore().collection('users').doc(user.uid).collection('bookings');
        const snapshot = await bookingsRef
            .where('seriesId', '==', booking.seriesId)
            .where('occurrenceNumber', '>=', booking.occurrenceNumber)
            .get();
        
        if (snapshot.empty) {
            console.warn('No future bookings found for series:', booking.seriesId);
            hideLoading();
            showAlertModal('No future bookings found to cancel.');
            return;
        }
        
        // Count how many bookings will be cancelled
        const bookingsToCancel = snapshot.docs.length;
        console.log(`Found ${bookingsToCancel} bookings to cancel`);
        
        // Create an array to hold all cancellation promises
        const cancellationPromises = [];
        
        // Cancel each booking
        snapshot.forEach(doc => {
            const bookingId = doc.id;
            console.log('Cancelling booking:', bookingId);
            
            // Add the promise to update this booking
            cancellationPromises.push(
                bookingsRef.doc(bookingId).update({
                    status: 'cancelled',
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                })
            );
        });
        
        // Wait for all cancellations to complete
        await Promise.all(cancellationPromises);
        console.log(`Successfully cancelled ${cancellationPromises.length} bookings`);
        
        // Refresh the entire schedule with loading indicator
        console.log('Refreshing schedule after cancelling future bookings');
        await loadUserSchedule(true);
        
        // Show success message
        showAlertModal(`Successfully cancelled ${bookingsToCancel} bookings.`);
        
    } catch (error) {
        console.error('Error cancelling future bookings:', error);
        hideLoading();
        
        // Show a more user-friendly error message
        let errorMessage = 'Error cancelling bookings. Please try again.';
        if (error.code === 'permission-denied') {
            errorMessage = 'You do not have permission to cancel these bookings.';
        }
        
        showAlertModal(errorMessage);
    }
}

// Function to cancel all bookings in a series
async function cancelAllBookingsInSeries(booking) {
    const user = firebase.auth().currentUser;
    if (!user) {
        showAlertModal('You must be logged in to cancel bookings');
        return;
    }
    
    showLoading('Cancelling all bookings in series...');
    
    try {
        console.log('Cancelling all bookings for series:', booking.seriesId);
        
        // Get all bookings in the series
        const bookingsRef = firebase.firestore().collection('users').doc(user.uid).collection('bookings');
        const snapshot = await bookingsRef
            .where('seriesId', '==', booking.seriesId)
            .get();
        
        if (snapshot.empty) {
            console.warn('No bookings found for series:', booking.seriesId);
            hideLoading();
            showAlertModal('No bookings found to cancel.');
            return;
        }
        
        // Count how many bookings will be cancelled
        const bookingsToCancel = snapshot.docs.length;
        console.log(`Found ${bookingsToCancel} bookings to cancel`);
        
        // Create an array to hold all cancellation promises
        const cancellationPromises = [];
        
        // Cancel each booking
        snapshot.forEach(doc => {
            const bookingId = doc.id;
            console.log('Cancelling booking:', bookingId);
            
            // Add the promise to update this booking
            cancellationPromises.push(
                bookingsRef.doc(bookingId).update({
                    status: 'cancelled',
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                })
            );
        });
        
        // Wait for all cancellations to complete
        await Promise.all(cancellationPromises);
        console.log(`Successfully cancelled ${cancellationPromises.length} bookings`);
        
        // Refresh the entire schedule with loading indicator
        console.log('Refreshing schedule after cancelling all bookings in series');
        await loadUserSchedule(true);
        
        // Show success message
        showAlertModal(`Successfully cancelled ${bookingsToCancel} bookings.`);
        
    } catch (error) {
        console.error('Error cancelling all bookings in series:', error);
        hideLoading();
        
        // Show a more user-friendly error message
        let errorMessage = 'Error cancelling bookings. Please try again.';
        if (error.code === 'permission-denied') {
            errorMessage = 'You do not have permission to cancel these bookings.';
        }
        
        showAlertModal(errorMessage);
    }
}

// Update the emergency button click handler to use the unified reset function
document.getElementById('emergencyButton').addEventListener('click', async function() {
    try {
        showLoading('Resetting database...');
        await resetAndPopulateDatabase();
        hideLoading();
        showSuccessMessage('Database reset successfully. Reloading page...');
        setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
        hideLoading();
        showErrorMessage('Failed to reset database: ' + error.message);
    }
});

// Helper function to normalize time format to HH:MM AM/PM
function normalizeTimeFormat(timeStr) {
    // --- FIX: Handle undefined/null/invalid input --- 
    if (!timeStr || typeof timeStr !== 'string') { 
        // console.warn('normalizeTimeFormat received invalid input:', timeStr);
        return "12:00 AM"; // Return a default valid time string
    }
    // --- END FIX ---
    if (timeStr === "Invalid Date") {
        console.warn('Normalizing "Invalid Date" string to default time');
        return "12:00 AM";
    }
    const match = timeStr.match(/(\d+):(\d+)\s*(a\.m\.|p\.m\.|AM|PM|am|pm)/i);
    if (!match) {
        console.warn(`Could not match time format in string: ${timeStr}`);
        return timeStr; // Return as is if no match
    }
    
    try {
        const hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        
        // Validate parsed values
        if (isNaN(hours) || hours < 0 || hours > 23) {
            console.warn(`Invalid hours in time string: ${timeStr}`);
            return "09:00 AM"; // Return a default valid time
        }
        
        // Normalize the period to uppercase AM/PM without periods
        let period = match[3].toUpperCase().replace(/\./g, '');
        if (period === 'AM' || period === 'PM') {
            // Already in the right format
        } else if (period === 'AM') {
            period = 'AM';
        } else if (period === 'PM') {
            period = 'PM';
        }
        
        // Ensure hours is in 12-hour format and has leading zero if needed
        const formattedHours = hours === 0 ? '12' : 
                            hours > 12 ? (hours - 12).toString() : 
                            hours.toString();
        
        // Return in the exact format expected: "HH:MM AM/PM"
        return `${formattedHours.padStart(2, '0')}:${minutes} ${period}`;
    } catch (error) {
        console.error(`Error normalizing time format for ${timeStr}:`, error);
        return "09:00 AM"; // Return a default valid time
    }
}

// Function to clean up all backdrops and reset body scrolling
function cleanupAllBackdrops() {
    console.log('Cleaning up all backdrops...');
    
    // Reset body scrolling
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    
    // Find and remove any backdrop elements
    const backdrops = document.querySelectorAll('.fixed.inset-0.bg-black.bg-opacity-50');
    backdrops.forEach(backdrop => {
        console.log('Removing backdrop:', backdrop);
        backdrop.remove();
    });
    
    // Also check for specific backdrop elements
    const bookingModalBackdrop = document.getElementById('bookingModalBackdrop');
    if (bookingModalBackdrop) {
        bookingModalBackdrop.classList.add('hidden');
        bookingModalBackdrop.style.opacity = '0';
    }
    
    // Check for any alert modals
    const alertModal = document.getElementById('alertModal');
    if (alertModal) {
        alertModal.remove();
    }
}

// Function to close the booking modal with animation
function closeBookingModal() {
    const bookingModal = document.getElementById('bookingModal');
    const bookingModalBackdrop = document.getElementById('bookingModalBackdrop');
    
    if (bookingModal) {
        // Slide down the modal
        bookingModal.classList.add('translate-y-full');
        
        // Fade out the backdrop
        if (bookingModalBackdrop) {
            bookingModalBackdrop.style.opacity = '0';
        }
        
        // Wait for animation to complete before hiding
        setTimeout(() => {
            // Hide backdrop
            if (bookingModalBackdrop) {
                bookingModalBackdrop.classList.add('hidden');
            }
            
            // Clean up all backdrops and reset body scrolling
            cleanupAllBackdrops();
            
            // Reset the booking data
            resetBookingModal();
        }, 300); // Match the duration in the CSS transition
    } else {
        // If modal not found, still clean up backdrops
        cleanupAllBackdrops();
    }
}

// Function to set up drag functionality for the bottom sheet
function setupBottomSheetDrag(bottomSheet) {
    if (!bottomSheet) return;
    
    const dragHandle = bottomSheet.querySelector('.w-10.h-1.bg-gray-300');
    if (!dragHandle) return;
    
    let startY = 0;
    let startTranslate = 0;
    let currentTranslate = 0;
    
    const onStart = (e) => {
        startY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
        
        // Get the current transform value
        const transform = window.getComputedStyle(bottomSheet).transform;
        if (transform && transform !== 'none') {
            // Extract the Y translation value
            const matrix = transform.match(/^matrix\((.+)\)$/);
            if (matrix) {
                const values = matrix[1].split(', ');
                startTranslate = parseInt(values[5]) || 0;
            }
        } else {
            startTranslate = 0;
        }
        
        currentTranslate = startTranslate;
        
        document.addEventListener('mousemove', onMove);
        document.addEventListener('touchmove', onMove);
        document.addEventListener('mouseup', onEnd);
        document.addEventListener('touchend', onEnd);
    };
    
    const onMove = (e) => {
        const y = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
        const diff = y - startY;
        
        // Only allow dragging down, not up past the starting position
        if (diff > 0) {
            currentTranslate = startTranslate + diff;
            bottomSheet.style.transform = `translateY(${currentTranslate}px)`;
        }
    };
    
    const onEnd = (e) => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('mouseup', onEnd);
        document.removeEventListener('touchend', onEnd);
        
        // If dragged more than 150px down, close the sheet
        if (currentTranslate > 150) {
            closeBookingModal();
        } else {
            // Otherwise, snap back to fully open
            bottomSheet.style.transform = '';
            bottomSheet.classList.remove('translate-y-full');
        }
    };
    
    dragHandle.addEventListener('mousedown', onStart);
    dragHandle.addEventListener('touchstart', onStart);
}

// Function to update booking status
async function updateBookingStatus(bookingId, newStatus) {
    // Create and show a loading overlay
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'fixed inset-0 bg-black bg-opacity-50 z-60 flex items-center justify-center';
    loadingOverlay.innerHTML = `
        <div class="bg-white p-4 rounded-lg shadow-lg flex items-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
            <p class="text-gray-700">Updating status...</p>
        </div>
    `;
    document.body.appendChild(loadingOverlay);
    
    // Get a reference to the booking document
    const user = firebase.auth().currentUser;
    if (!user) {
        loadingOverlay.remove();
        showAlertModal('You must be logged in to update a booking status');
        return;
    }
    
    try {
        const bookingRef = firebase.firestore().collection('users').doc(user.uid).collection('bookings').doc(bookingId);
        
        await bookingRef.update({
            status: newStatus,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('Booking status updated successfully');
        loadingOverlay.remove();
        
        // Update the booking card in the UI
        const bookingCard = document.querySelector(`[data-booking-id="${bookingId}"]`);
        if (bookingCard) {
            // Determine status display and class
            let statusDisplay = 'Upcoming';
            let statusClass = 'bg-gray-100 text-gray-800';
            
            switch(newStatus) {
                case 'in-progress':
                    statusDisplay = 'In Progress';
                    statusClass = 'bg-blue-100 text-blue-800';
                    break;
                case 'completed':
                    statusDisplay = 'Done';
                    statusClass = 'bg-green-100 text-green-800';
                    break;
                case 'paid':
                    statusDisplay = 'Done & Paid';
                    statusClass = 'bg-green-100 text-green-800';
                    break;
                case 'cancelled':
                    statusDisplay = 'Cancelled';
                    statusClass = 'bg-red-100 text-red-800';
                    break;
            }
            
            // Update the button text and class
            const statusBtn = bookingCard.querySelector('button:first-of-type');
            if (statusBtn) {
                statusBtn.textContent = statusDisplay;
                statusBtn.className = `px-3 py-2 text-sm font-medium rounded-lg ${statusClass}`;
            }
        }
    } catch (error) {
        console.error('Error updating booking status:', error);
        loadingOverlay.remove();
        showAlertModal('Error updating booking status: ' + error.message);
        
        // Revert UI changes if there was an error
        try {
            const doc = await bookingRef.get();
            if (doc.exists) {
                const currentStatus = doc.data().status || 'scheduled';
                const statusButtons = document.querySelectorAll('.status-btn');
                statusButtons.forEach(btn => {
                    const status = btn.getAttribute('data-status');
                    if (status === currentStatus) {
                        btn.classList.remove('text-gray-900');
                        btn.classList.add('text-white', 'bg-primary');
                    } else {
                        btn.classList.remove('text-white', 'bg-primary');
                        btn.classList.add('text-gray-900');
                    }
                });
            }
        } catch (err) {
            console.error('Error getting current booking status:', err);
        }
    }
}

// Add these debug functions at the appropriate location in schedule.js

function debugTimeSlotData(timeSlots, label) {
  console.log(`DEBUG [${label}] - Time slot data inspection:`);
  if (!timeSlots) {
    console.log(`  Time slots is ${timeSlots} (type: ${typeof timeSlots})`);
    return;
  }
  
  console.log(`  Time slots array length: ${timeSlots.length}`);
  timeSlots.forEach((slot, index) => {
    console.log(`  Slot ${index}:`, {
      startTime: slot.startTime,
      startTimeType: typeof slot.startTime,
      endTime: slot.endTime,
      endTimeType: typeof slot.endTime,
      day: slot.day,
      raw: slot
    });
  });
}

function debugUserSettings(settings, label) {
  console.log(`DEBUG [${label}] - User settings inspection:`);
  console.log(`  Working hours:`, settings.workingHours);
  
  if (settings.calculatedTimeSlots) {
    console.log(`  Calculated time slots (count: ${settings.calculatedTimeSlots.length}):`);
    settings.calculatedTimeSlots.forEach((slot, index) => {
      console.log(`    Slot ${index}:`, {
        startTime: slot.startTime,
        endTime: slot.endTime,
        day: slot.day || 'not specified'
      });
    });
  }
  
  // Log working days structure in detail
  console.log(`  Working days detailed structure:`);
  for (const [key, value] of Object.entries(settings.workingDays)) {
    const valueType = typeof value;
    const valueDetails = valueType === 'object' ? JSON.stringify(value) : value;
    console.log(`    Day ${key} (${typeof key}): ${valueDetails} (${valueType})`);
  }
}

function enhancedTimeToMinutes(timeString, callerInfo) {
  console.log(`DEBUG [timeToMinutes] - Called from ${callerInfo}`);
  console.log(`  Input: "${timeString}" (type: ${typeof timeString})`);
  
  if (!timeString) {
    console.log(`  ERROR: Empty or null time string`);
    return 0; // Return default instead of proceeding with invalid input
  }
  
  // Try to normalize and see what happens
  try {
    const normalized = normalizeTimeString(timeString);
    console.log(`  Normalized to: "${normalized}"`);
    
    // Test parsing with different methods to see what works
    const date1 = new Date(`2000-01-01 ${normalized}`);
    const date2 = new Date(`2000-01-01T${normalized}`);
    
    console.log(`  Parse test 1: ${date1} (valid: ${!isNaN(date1.getTime())})`);
    console.log(`  Parse test 2: ${date2} (valid: ${!isNaN(date2.getTime())})`);
    
    // Continue with original function logic
    // ...
  } catch (err) {
    console.log(`  ERROR during time parsing: ${err.message}`);
    return 0; // Default fallback
  }
}

// Also add this to inspect when the settings are loaded from Firestore
function inspectFirestoreData(userData, rawData) {
  console.log(`DEBUG [Firestore] - Inspecting raw Firestore data:`);
  console.log(`  Raw data keys: ${Object.keys(rawData).join(', ')}`);
  
  if (rawData.workingHours) {
    console.log(`  Working hours from Firestore:`, rawData.workingHours);
  }
  
  if (rawData.calculatedTimeSlots) {
    console.log(`  Raw calculated time slots:`, rawData.calculatedTimeSlots);
    
    // Check each slot's data types and values
    rawData.calculatedTimeSlots.forEach((slot, index) => {
      console.log(`  Slot ${index} raw data:`, {
        startTime: slot.startTime,
        startTimeType: typeof slot.startTime,
        startTimeValue: JSON.stringify(slot.startTime),
        endTime: slot.endTime,
        endTimeType: typeof slot.endTime,
        endTimeValue: JSON.stringify(slot.endTime)
      });
    });
  }
}

// --- ADD MISSING FUNCTION --- 
// Function to open the booking modal and set initial data
function openBookingModal(bookingDetails) {
    console.log('Opening booking modal with details:', bookingDetails);
    
    if (!bookingDetails || !bookingDetails.date || !bookingDetails.startTime || !bookingDetails.endTime) {
        console.error('Cannot open booking modal: Missing required details.');
        showAlertModal('Could not load booking details. Please try again.');
        return;
    }

    try {
        // Store the booking data globally
        currentBookingData.dateTime = {
            date: bookingDetails.date, // Should be YYYY-MM-DD
            startTime: bookingDetails.startTime, // Should be HH:MM AM/PM
            endTime: bookingDetails.endTime,     // Should be HH:MM AM/PM
            durationMinutes: bookingDetails.durationMinutes
        };
        currentBookingData.client = null; // Reset client selection
        currentBookingData.frequency = null; // Reset frequency selection
        console.log('Current booking data set:', currentBookingData);

        // Get modal and backdrop elements
        const bookingModal = document.getElementById('bookingModal');
        const bookingModalBackdrop = document.getElementById('bookingModalBackdrop');

        if (!bookingModal || !bookingModalBackdrop) {
            console.error('Booking modal or backdrop element not found in the DOM');
            showAlertModal('UI Error: Booking component missing. Please refresh.');
            return;
        }

        // Reset the modal content (in case it was left in a different state)
        if (!resetBookingModal()) { // resetBookingModal also re-attaches handlers
             console.error("Failed to reset booking modal content.");
             showAlertModal('UI Error: Could not prepare booking form. Please refresh.');
             return;
        }

        // Update the booking date and time display within the modal
        updateBookingDateTime();
        console.log('Booking date and time display updated in modal');

        // Show backdrop first
        bookingModalBackdrop.classList.remove('hidden');
        setTimeout(() => { bookingModalBackdrop.style.opacity = '1'; }, 10); // Fade in
        
        // Prevent body scrolling
        document.body.style.overflow = 'hidden';
        
        // Slide up the modal
        bookingModal.classList.remove('translate-y-full');
        console.log('Booking modal shown');
        
        // Set up drag functionality
        setupBottomSheetDrag(bookingModal);
        
        // Show the client selection step first
        console.log('Attempting to show client selection step');
        showBookingStep('clientSelection');
        
        // Load clients for the client selection step
        console.log('Loading clients for selection');
        loadClients();

    } catch (error) {
        console.error('Error in openBookingModal:', error);
        showAlertModal(`An error occurred while opening the booking form: ${error.message}`);
        // Clean up UI just in case
        closeBookingModal(); 
    }
}
// --- END ADD MISSING FUNCTION ---
