import * as dateUtils from '/common/js/date-utils.js'; // Ensure this is at the top

// Initialize the current week start date
let currentWeekStart = null; // Will be set after DOMContentLoaded
let housekeeperTimezone = 'UTC'; // << ADDED: Store timezone globally
let userProfile = null; // Store user profile globally
let userSettings = null; // <<< DECLARED GLOBALLY >>>
let loadingOverlayElement = null; // <<< NEW: Global reference for loading overlay

// Global booking data
let currentBookingData = {
    dateTime: null,
    duration: null, // Store duration too
    client: null,
    baseService: null, // NEW: Store selected base service {id, name, price}
    addonServices: [] // NEW: Store selected add-on services [{id, name, price}]
};
let currentProposingRequestData = null; // NEW: For Propose Alternative flow
let currentOpenRequestDataForAI = null; // <<<< NEW GLOBAL VARIABLE FOR AI SUGGESTIONS

// --- DOM Elements (Add new ones for services) ---
const baseServiceOptionsContainer = document.getElementById('base-service-options');
const addonServiceOptionsContainer = document.getElementById('addon-service-options');
const baseServiceErrorMsg = document.getElementById('base-service-error');
const addonServiceErrorMsg = document.getElementById('addon-service-error');
const baseServiceSelectionStep = document.getElementById('baseServiceSelection'); // The whole step div
const addonServiceSelectionStep = document.getElementById('addonServiceSelection'); // The whole step div
// Existing modal elements
const bookingModal = document.getElementById('bookingModal');
const closeBookingModalBtn = document.getElementById('closeBookingModal');
const bookingModalBackdrop = document.getElementById('bookingModalBackdrop');
const bookingContent = document.getElementById('bookingContent');
const bookingDateTimeElement = document.getElementById('bookingDateTime');
const bookingStepsContainer = document.getElementById('bookingSteps');
const clientSelectionStep = document.getElementById('clientSelection');
const existingClientsContainer = document.getElementById('existingClients');
const clientLoadingErrorMsg = document.getElementById('client-loading-error');
const frequencySelectionStep = null; // REMOVED: No longer used
const reviewBookingButtonContainer = document.getElementById('reviewBookingButtonContainer'); // NEW
const reviewBookingBtn = document.getElementById('reviewBookingBtn'); // NEW
const confirmationStep = document.getElementById('confirmationStep');
const confirmationDetailsElement = document.getElementById('confirmationDetails');
const confirmBookingBtn = document.getElementById('confirmBookingBtn');

// --- NEW: Incoming Requests Elements (MOVED TO GLOBAL SCOPE) ---
const viewIncomingRequestsBtn = document.getElementById('view-incoming-requests-btn');
const incomingRequestsBadge = document.getElementById('incoming-requests-badge');
const incomingRequestsContainer = document.getElementById('incoming-requests-container');
const incomingRequestsList = document.getElementById('incoming-requests-list');
const mainScheduleContainer = document.getElementById('schedule-container');
// NEW: Add references for the button's text and icon elements
const incomingRequestsTextLabel = document.getElementById('incoming-requests-text-label');
const incomingRequestsIcon = document.getElementById('incoming-requests-icon');

// --- END DOM Elements ---

// --- NEW: Cancel Confirm Modal Elements ---
const cancelConfirmModal = document.getElementById('cancel-confirm-modal');
const cancelConfirmBackdrop = document.getElementById('cancel-confirm-backdrop');
const cancelConfirmMessage = document.getElementById('cancel-confirm-message');
const confirmCancelBookingBtn = document.getElementById('confirm-cancel-booking-btn');
const keepBookingBtn = document.getElementById('keep-booking-btn');
const closeCancelModalBtnX = document.getElementById('close-cancel-modal-btn-x');
const bookingIdToCancelInput = document.getElementById('booking-id-to-cancel');
const cancelConfirmError = document.getElementById('cancel-confirm-error');
const cancelConfirmIndicator = document.getElementById('cancel-confirm-indicator');
// --- END Cancel Confirm Modal Elements ---

// --- NEW: Booking Detail Modal Elements (CORRECTED IDs) ---
const bookingDetailModal = document.getElementById('booking-detail-modal');
const bookingDetailBackdrop = document.getElementById('booking-detail-backdrop');
const bookingDetailContent = document.getElementById('booking-detail-content');
const bookingDetailFooter = document.getElementById('booking-detail-footer'); // Ensure this is defined
const proposeAlternativeForm = document.getElementById('propose-alternative-form');
const alternativeDateInput = document.getElementById('alternative-date');
const alternativeTimeInput = document.getElementById('alternative-time');
const alternativeNotesInput = document.getElementById('alternative-notes');
const standardRequestActionsContainer = document.getElementById('standard-request-actions');
const proposeAlternativeActionsContainer = document.getElementById('propose-alternative-actions');
// --- END Booking Detail Modal Elements ---

// --- NEW: AI Suggestion Section Elements (inside booking-detail-modal) ---
const aiManualTravelTimeInput = document.getElementById('ai-manual-travel-time');
const getAiSuggestionBtn = document.getElementById('get-ai-suggestion-btn');
const aiSuggestionDisplay = document.getElementById('ai-suggestion-display');
const aiLoadingIndicator = document.getElementById('ai-loading-indicator');
const aiSuggestionError = document.getElementById('ai-suggestion-error');
const aiSuggestionSectionGlobalRef = document.getElementById('ai-suggestion-section'); // Used to get dataset
// --- END AI Suggestion Section Elements ---

// --- NEW: Manual Time Input for Approved Request in Modal ---
const manualTimeInputContainer = document.getElementById('manualTimeInputContainer');
const manualStartTimeInput = document.getElementById('manualStartTime');

// Flag to track if booking handlers are set up - DECLARED ONCE HERE
let bookingHandlersInitialized = false;

// --- NEW: escapeHtml utility ---
function escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) {
        return '';
    }
    return String(unsafe)
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
 }
 // --- END escapeHtml --- 

// --- NEW: showSuccessMessage (adapted from clients.js) ---
function showSuccessMessage(message, duration = 3000) {
    // Reuse or create a container for notifications
    let notificationContainer = document.getElementById('schedule-notification-container');
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'schedule-notification-container';
        // Style for top-center position (adjust as needed)
        notificationContainer.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] w-auto max-w-md'; 
        document.body.appendChild(notificationContainer);
    }

    // Create the specific message element
    const successDiv = document.createElement('div');
    successDiv.className = 'p-3 mb-2 bg-green-100 border border-green-400 text-green-700 rounded shadow-md transition-opacity duration-300 ease-in-out';
    successDiv.innerHTML = `
        <div class="flex items-center">
            <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
            </svg>
            <span>${escapeHtml(message)}</span>
        </div>
    `;
    
    notificationContainer.appendChild(successDiv);

    // Auto-hide after duration
    setTimeout(() => {
        successDiv.style.opacity = '0';
        setTimeout(() => { 
            successDiv.remove(); 
            // Optionally remove container if empty? Or leave it.
        }, 300); // Wait for fade out
    }, duration);
}

// --- NEW: showErrorMessage (adapted from clients.js) ---
function showErrorMessage(message) {
     // Reuse or create a container for notifications (same as success)
     let notificationContainer = document.getElementById('schedule-notification-container');
     if (!notificationContainer) {
         notificationContainer = document.createElement('div');
         notificationContainer.id = 'schedule-notification-container';
         notificationContainer.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] w-auto max-w-md'; 
         document.body.appendChild(notificationContainer);
     }
 
     // Create the specific message element
     const errorDiv = document.createElement('div');
     // Slightly different style for errors
     errorDiv.className = 'p-3 mb-2 bg-red-100 border border-red-400 text-red-700 rounded shadow-md transition-opacity duration-300 ease-in-out'; 
     errorDiv.innerHTML = `
         <div class="flex items-center">
             <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>
             <span>${escapeHtml(message)}</span>
         </div>
     `;
     
     notificationContainer.appendChild(errorDiv);
 
     // Errors usually persist until dismissed or another action clears them.
     // Auto-hide after a longer duration:
     setTimeout(() => {
         errorDiv.style.opacity = '0';
         setTimeout(() => { errorDiv.remove(); }, 300); 
     }, 6000); // Hide after 6 seconds
 }
// --- END NEW Message Functions --- 

// Global loading indicator functions
function showLoading(message = 'Loading...') {
    // const loadingOverlay = document.getElementById('loading-overlay'); // Re-query each time << REMOVED
    if (loadingOverlayElement) { // <<< CHANGED: Use global reference
        // Optional: Update message if needed, though the current one is just an icon
        loadingOverlayElement.classList.remove('hidden');
    } else {
        // Reduced severity, as it might be called early
        console.warn('#loading-overlay element not found or not yet initialized.');
    }
}

function hideLoading() {
    // const loadingOverlay = document.getElementById('loading-overlay'); // Re-query each time << REMOVED
    if (loadingOverlayElement) { // <<< CHANGED: Use global reference
        loadingOverlayElement.classList.add('hidden');
    } else {
        // Reduced severity
        console.warn('#loading-overlay element not found or not yet initialized.');
    }
}

/**
 * Formats duration in minutes into a human-readable string "X hr Y min".
 * Simplified for clarity.
 * @param {number} totalMinutes - Duration in minutes.
 * @returns {string} Formatted duration string (e.g., "3 hr 30 min").
 */
function formatDuration(totalMinutes) {
    if (totalMinutes === null || totalMinutes === undefined || totalMinutes <= 0) {
        return '';
    }
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    let durationStr = '';
    if (hours > 0) {
        durationStr += `${hours} hr`;
    }
    if (minutes > 0) {
         if (hours > 0) durationStr += ' '; // Add space if hours are also present
        durationStr += `${minutes} min`;
    }
    return durationStr.trim();
}

// Function to check if a date is in the past (compares date part only)
function isInPast(date) {
    // Use dateUtils for robust comparison
    const todayStart = dateUtils.startOfDay(new Date());
    const compareDateStart = dateUtils.startOfDay(new Date(date));
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

        userProfile = await firestoreService.getUserProfile(user.uid);
        console.log('User profile:', userProfile);

        console.log('Fetching user settings from Firestore...');
        userSettings = await firestoreService.getUserSettings(user.uid);
        if (!userSettings) {
            console.warn('User settings not found or failed to load, using defaults.');
            userSettings = DEFAULT_SETTINGS; // Use imported defaults
        } else {
            // Merge with defaults to ensure all necessary properties exist
             userSettings = { ...DEFAULT_SETTINGS, ...userSettings };
             console.log('User settings from Firestore:', userSettings);
        }
        console.log('Merged settings:', userSettings);
        
        // Set timezone globally if available in settings
        if (userSettings.timezone) {
            housekeeperTimezone = userSettings.timezone;
            console.log('Housekeeper timezone set to:', housekeeperTimezone);
        } else {
            console.warn('Timezone not found in user settings, using default:', housekeeperTimezone);
        }

        // Handle working days format (backward compatibility)
        // ... (rest of loadUserSchedule function uses the global userSettings) ...

        // Debug working days
        // debugWorkingDays(settings);

        // Call generateSchedule with the processed settings
        // REMOVED: No longer generating schedule client-side
        // generateSchedule(settings);

        // NEW: Fetch schedule data from Cloud Function
        if (!currentWeekStart) {
            currentWeekStart = dateUtils.getStartOfWeek(new Date());
        }
        await fetchAndRenderSchedule(currentWeekStart, user.uid); // Pass user ID
        
        if (showLoadingIndicator) hideLoading(); // Hide loading after successful generation

    } catch (error) {
        console.error('Error loading user schedule or settings:', error);
        // TODO: Show error message to user?
        if (showLoadingIndicator) hideLoading(); // Hide loading on error
    }
}

// --- Schedule Generation (Refactored to use Cloud Function Data) ---
async function fetchAndRenderSchedule(startDate, housekeeperId) {
    console.log(`[SCHEDULE_DEBUG] fetchAndRenderSchedule START for week: ${startDate?.toISOString()}, housekeeperId: ${housekeeperId}`);
    
    // --- ADDED: Slight delay for showLoading ---
    setTimeout(() => showLoading(), 0); 
    
    const scheduleContainer = document.getElementById('schedule-container');
    if (!scheduleContainer) {
        console.error("[SCHEDULE_DEBUG] Schedule container element not found in fetchAndRenderSchedule!");
        hideLoading();
        return;
    }
    console.log("[SCHEDULE_DEBUG] fetchAndRenderSchedule: Clearing scheduleContainer.innerHTML");
    scheduleContainer.innerHTML = ''; // Clear previous schedule

    const functions = firebase.functions();
    const getAvailableSlots = functions.httpsCallable('getAvailableSlots');
    const endDate = dateUtils.addDays(startDate, 6);

    try {
        console.log(`[SCHEDULE_DEBUG] Calling getAvailableSlots with startDate: ${startDate?.toISOString()}, endDate: ${endDate?.toISOString()}, housekeeperId: ${housekeeperId}`);
        const result = await getAvailableSlots({
            housekeeperId: housekeeperId,
            startDateString: startDate.toISOString(),
            endDateString: endDate.toISOString(),
        });

        console.log('[SCHEDULE_DEBUG] Cloud Function getAvailableSlots RAW result:', JSON.parse(JSON.stringify(result)));

        if (result.data && result.data.schedule) {
            console.log('[SCHEDULE_DEBUG] Schedule data received from function. Calling renderScheduleFromData.');
            renderScheduleFromData(result.data.schedule, startDate);
                    } else {
            console.error('[SCHEDULE_DEBUG] Invalid or missing schedule data received from function:', result.data);
            scheduleContainer.innerHTML = '<p class="text-center text-red-500">Error loading schedule data (invalid structure).</p>';
        }
        console.log('[SCHEDULE_DEBUG] fetchAndRenderSchedule FINISHED successfully.');

    } catch (error) {
        console.error('[SCHEDULE_DEBUG] Error calling getAvailableSlots function or in subsequent processing:', error);
        scheduleContainer.innerHTML = `<p class="text-center text-red-500">Error calling schedule service: ${error.message}</p>`;
        console.log('[SCHEDULE_DEBUG] fetchAndRenderSchedule FINISHED with error.');
    } finally {
        hideLoading();
        updateWeekDisplay();
        updateNavigationState();
    }
}

// NEW: Renders the schedule grid from the data fetched by the Cloud Function
function renderScheduleFromData(scheduleData, weekStartDate) {
    console.log(`[SCHEDULE_DEBUG] renderScheduleFromData START. weekStartDate: ${weekStartDate?.toISOString()}`);
    console.log('[SCHEDULE_DEBUG] renderScheduleFromData received scheduleData:', JSON.parse(JSON.stringify(scheduleData)));

    const scheduleContainer = document.getElementById('schedule-container');
    if (!scheduleContainer) {
         console.error("[SCHEDULE_DEBUG] Schedule container element not found in renderScheduleFromData!");
        return;
    }

    scheduleContainer.classList.add('grid', 'grid-cols-1', 'md:grid-cols-3', 'lg:grid-cols-7', 'gap-4');
    console.log("[SCHEDULE_DEBUG] renderScheduleFromData: Clearing scheduleContainer.innerHTML before rendering.");
    scheduleContainer.innerHTML = ''; // Clear previous schedule content

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekDates = dateUtils.getWeekDates(weekStartDate);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    console.log(`[SCHEDULE_DEBUG] Processing ${weekDates.length} dates for the week.`);

    weekDates.forEach((date, dayIndex) => {
        const dateString = dateUtils.formatDate(date, 'YYYY-MM-DD');
        // console.log(`[SCHEDULE_DEBUG] Rendering day ${dayIndex}: ${dateString}`); // Optional: too verbose?
        const dayData = scheduleData[dateString];
        const currentDateOnly = new Date(date); 
        currentDateOnly.setHours(0, 0, 0, 0);
        const isPastDay = currentDateOnly.getTime() < today.getTime();

        const dayColumn = document.createElement('div');
        dayColumn.className = 'bg-white rounded-lg shadow flex flex-col min-h-[150px]'; 

        if (isPastDay) {
            dayColumn.classList.add('hidden');
        } else {
            const dayHeader = document.createElement('h3');
            dayHeader.textContent = `${dayNames[date.getUTCDay()]} ${dateUtils.formatDate(date, 'short-numeric')}`;
            dayHeader.className = 'text-lg font-semibold mb-4 text-gray-800 flex-shrink-0 px-4 pt-4';
            dayColumn.appendChild(dayHeader);

            const slotsContainer = document.createElement('div');
            slotsContainer.className = 'flex-grow space-y-3 px-4 pb-4';

            if (dayData && dayData.slots && dayData.slots.length > 0) {
                // console.log(`[SCHEDULE_DEBUG] Day ${dateString} has ${dayData.slots.length} slots.`); // Optional
                dayData.slots.forEach(slot => {
                    const slotElement = createSlotElement(slot, dateString);
                    slotsContainer.appendChild(slotElement);
        });
    } else {
                // console.log(`[SCHEDULE_DEBUG] Day ${dateString} has no slots or dayData is missing/empty.`); // Optional
                const noWorkText = document.createElement('p');
                noWorkText.textContent = dayData?.message || 'Not scheduled to work'; // Use message from dayData if available
                noWorkText.className = 'text-center text-gray-500 text-sm mt-4'; 
                slotsContainer.appendChild(noWorkText);
            }
            dayColumn.appendChild(slotsContainer);
        }
        scheduleContainer.appendChild(dayColumn);
    });
    console.log('[SCHEDULE_DEBUG] renderScheduleFromData FINISHED processing all dates.');
}

// NEW: Helper function to create HTML element for a single time slot
function createSlotElement(slotData, dateString) {
    const div = document.createElement('div');
    // Simplified base style: More padding, remove border/shadow by default
    div.className = 'p-3 rounded text-base'; // Slightly larger base padding and font

    // --- UPDATED TIME FORMATTING ---
    // Assume housekeeperTimezone variable is accessible here
    // Use formatTime for simplicity (e.g., "9:00 AM")
    const startTime = slotData.startTimestampMillis 
        ? dateUtils.formatTime(new Date(slotData.startTimestampMillis), housekeeperTimezone, 'h:mm A') 
        : 'N/A';
    const endTime = slotData.endTimestampMillis 
        ? dateUtils.formatTime(new Date(slotData.endTimestampMillis), housekeeperTimezone, 'h:mm A') 
        : 'N/A';
    // --- END UPDATED TIME FORMATTING ---

    const durationText = formatDuration(slotData.durationMinutes);
    const timeDisplay = `${startTime} - ${endTime}`; // Now uses formatted times
    const durationDisplay = durationText ? `(${durationText})` : '';

    // --- Style and Content based on Status --- 
    switch (slotData.status) {
        case 'available':
            // Simplified Available Style: Clear blue bg, simple button
            div.classList.add('bg-blue-100', 'flex', 'items-center', 'justify-between');
            // Text Div (Left)
            const availableTextDiv = document.createElement('div');
            availableTextDiv.innerHTML = `
                <p class="font-semibold text-blue-900">${timeDisplay}</p>
                <p class="text-sm text-blue-700">Available ${durationDisplay}</p>
            `;
            div.appendChild(availableTextDiv);
            // Button Div (Right)
            const availableButton = document.createElement('button');
            availableButton.textContent = 'Book'; // Simpler text
            // Simplified button style: Clear bg, good padding, no shadow/icon
            availableButton.className = 'px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400';
            div.appendChild(availableButton);
            
            // Event Listener
            div.addEventListener('click', (e) => { 
                // Prevent event listener if the button itself was clicked
                if (e.target === availableButton) return;
                console.log('Available slot area clicked (not button):', dateString, slotData);
                let slotDateTimeString = null;
                if (slotData.startTimestampMillis) {
                    slotDateTimeString = new Date(slotData.startTimestampMillis).toISOString();
                }
                if (slotDateTimeString) {
                    openBookingModal(slotDateTimeString, slotData.durationMinutes);
            } else {
                    alert('Error preparing booking time. Missing timestamp.');
                }
            });
             // Add separate listener for the button itself if needed later, 
             // but for now, clicking anywhere (except button) triggers modal.
            availableButton.addEventListener('click', () => {
                 console.log('Available slot BOOK button clicked:', dateString, slotData);
                 let slotDateTimeString = null;
                 if (slotData.startTimestampMillis) {
                     slotDateTimeString = new Date(slotData.startTimestampMillis).toISOString();
                 }
                 if (slotDateTimeString) {
                     openBookingModal(slotDateTimeString, slotData.durationMinutes);
                 } else {
                     alert('Error preparing booking time. Missing timestamp.');
                }
            });
            break;
        case 'pending':
            // Simplified Pending Style: Clear yellow bg, simple buttons
            div.classList.add('bg-yellow-100');
            div.innerHTML = `
                    <div>
                    <p class="font-semibold text-yellow-900">${timeDisplay} <span class="text-sm font-normal">${durationDisplay}</span></p>
                    <p class="text-base font-semibold text-yellow-800">Pending</p>
                    <p class="text-sm text-yellow-700 mt-1">Client: ${slotData.clientName || '...'}</p>
                    </div>
                <div class="mt-3 flex space-x-3">
                    <button class="flex-1 px-4 py-2 text-sm font-medium bg-green-500 text-white rounded hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-green-400" data-booking-id="${slotData.bookingId}" data-action="confirm">Confirm</button>
                    <button class="flex-1 px-4 py-2 text-sm font-medium bg-red-500 text-white rounded hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-400" data-booking-id="${slotData.bookingId}" data-action="reject">Reject</button>
                </div>
            `;
            break;
        case 'booked': 
        case 'confirmed':
            // Simplified Booked/Confirmed Style: Clearer gray bg, simple cancel button
            div.classList.add('bg-gray-200', 'flex', 'items-center', 'justify-between', 'cursor-pointer');
            div.dataset.action = 'view_details';
            div.dataset.bookingId = slotData.bookingId;
            // Info Div (Left)
            const confirmedInfoDiv = document.createElement('div');
            confirmedInfoDiv.innerHTML = `
                <p class="font-semibold text-gray-800">${timeDisplay} <span class="text-sm font-normal text-gray-600">${durationDisplay}</span></p>
                <p class="text-base font-semibold ${slotData.status === 'confirmed' ? 'text-green-700' : 'text-gray-700'}">${slotData.status === 'confirmed' ? 'Confirmed' : 'Booked'}</p>
                <p class="text-sm text-gray-600 mt-1">Client: ${slotData.clientName || '...'}</p>
            `;
            div.appendChild(confirmedInfoDiv);
            break;
        case 'unavailable':
        case 'break':
        default:
            // Simplified Unavailable/Break Style: Clearer gray bg
            div.classList.add('bg-gray-200');
            div.innerHTML = `
                <div>
                    <p class="text-gray-700">${timeDisplay}</p>
                    <p class="text-sm text-gray-500">${slotData.type === 'break' ? 'Break' : 'Unavailable'}</p>
                </div>
            `;
            break;
    }

    return div;
}

// UPDATED: Handles clicks on Confirm/Reject buttons using event delegation
async function handlePendingAction(event) {
    const button = event.target.closest('button[data-action]'); // Find the actual button clicked
    if (!button) return; // Exit if click wasn't on a confirm/reject button

    event.stopPropagation(); // Prevent click on parent div triggering anything

    const bookingId = button.dataset.bookingId;
    const action = button.dataset.action;
    const newStatus = action === 'confirm' ? 'confirmed' : 'rejected'; // Use 'confirmed'

    console.log(`Action: ${action} (${newStatus}) for bookingId: ${bookingId}`);

    // Disable buttons while processing
    const confirmBtn = button.parentElement.querySelector('[data-action="confirm"]');
    const rejectBtn = button.parentElement.querySelector('[data-action="reject"]');
    if(confirmBtn) confirmBtn.disabled = true;
    if(rejectBtn) rejectBtn.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; // Show spinner on clicked button

    try {
    const user = firebase.auth().currentUser;
        if (!user) throw new Error("User not authenticated.");
        
        await firestoreService.updateBookingStatus(user.uid, bookingId, newStatus);
        console.log(`Booking ${bookingId} status updated to ${newStatus} successfully.`);
        
        // Refresh the schedule to show the change
        await fetchAndRenderSchedule(currentWeekStart, user.uid);
        // TODO: Add a success toast notification?

    } catch (error) {
        console.error(`Error updating booking ${bookingId} status to ${newStatus}:`, error);
        alert(`Failed to ${action} booking: ${error.message}`);
        // Re-enable buttons on error
        if(confirmBtn) confirmBtn.disabled = false;
        if(rejectBtn) rejectBtn.disabled = false;
        button.innerHTML = action === 'confirm' ? 'Confirm' : 'Reject'; // Restore original text
    }
}

// UPDATED: Handler for clicking the Cancel button on a booked slot
function handleCancelRequestClick(event) {
    const button = event.target.closest('button[data-action="request_cancel"]');
    if (!button) return;
    
    event.stopPropagation();
    const bookingId = button.dataset.bookingId;
    // Try to get client name from the displayed slot for a better message
    const slotDiv = button.closest('.flex.items-center.justify-between'); // Find parent slot div
    const clientNameElement = slotDiv?.querySelector('.text-sm.text-gray-600'); // Find client name p tag
    const clientNameText = clientNameElement?.textContent.replace('Client: ', '').trim() || 'this client';
    
    console.log(`Request cancellation modal for booking ID: ${bookingId}`);
    openCancelConfirmModal(bookingId, clientNameText); // Open the custom modal
}

// --- NEW: Function to Execute Booking Cancellation (Deletion) ---
async function executeBookingCancellation() {
    const bookingId = bookingIdToCancelInput.value;
    const user = firebase.auth().currentUser;

    if (!user || !bookingId) {
        console.error('Execute Cancel Error: Missing user or booking ID.');
        cancelConfirmError.textContent = 'Could not cancel booking. User or Booking ID missing.';
        cancelConfirmError.classList.remove('hidden');
        return;
    }

    console.log(`Executing cancellation (deletion) for booking: ${bookingId}`);
    cancelConfirmIndicator.textContent = 'Cancelling...';
    confirmCancelBookingBtn.disabled = true;
    keepBookingBtn.disabled = true; // Disable both during processing
    closeCancelModalBtnX.disabled = true;
    cancelConfirmError.classList.add('hidden');

    try {
        const bookingRef = firebase.firestore().collection(`users/${user.uid}/bookings`).doc(bookingId);
        await bookingRef.delete(); // Delete the document
        console.log('Booking deleted successfully:', bookingId);

        closeCancelConfirmModal();
        await fetchAndRenderSchedule(currentWeekStart, user.uid); // Refresh schedule

    } catch (error) {
        console.error('Error deleting booking:', error);
        cancelConfirmError.textContent = `Failed to cancel: ${error.message || 'Please try again.'}`;
        cancelConfirmError.classList.remove('hidden');
    } finally {
        // Re-enable buttons regardless of outcome
        cancelConfirmIndicator.textContent = '';
        confirmCancelBookingBtn.disabled = false;
        keepBookingBtn.disabled = false;
        closeCancelModalBtnX.disabled = false;
    }
}
// --- END Execute Booking Cancellation ---

// --- NEW: Function to Load and Display Services --- 
async function loadAndDisplayServicesForBooking() {
    const user = firebase.auth().currentUser;
    if (!user) {
        console.error('Cannot load services: user not authenticated.');
        baseServiceErrorMsg.textContent = 'Authentication error.';
        addonServiceErrorMsg.textContent = 'Authentication error.';
        baseServiceErrorMsg.classList.remove('hidden');
        addonServiceErrorMsg.classList.remove('hidden');
        return;
    }
    
    // Clear previous options and errors
    baseServiceOptionsContainer.innerHTML = '<p class="text-gray-600 mb-2">Loading base services...</p>';
    addonServiceOptionsContainer.innerHTML = '<p class="text-gray-600 mb-2">Loading add-on services...</p>';
    baseServiceErrorMsg.classList.add('hidden');
    addonServiceErrorMsg.classList.add('hidden');

    try {
        const servicesPath = `users/${user.uid}/services`;
        const servicesCollection = firebase.firestore().collection(servicesPath);
        // Fetch only active services, order by name
        const snapshot = await servicesCollection
                                .where('isActive', '==', true)
                                .orderBy('serviceName', 'asc')
                                .get();

        baseServiceOptionsContainer.innerHTML = ''; // Clear loading message
        addonServiceOptionsContainer.innerHTML = '';

        const services = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const baseServices = services.filter(s => s.type === 'base');
        const addonServices = services.filter(s => s.type === 'addon');

        // Populate Base Services (Radio Buttons)
        if (baseServices.length === 0) {
            baseServiceOptionsContainer.innerHTML = '<p class="text-gray-500 text-sm italic">No active base services found. Please define them in Settings.</p>';
        } else {
            baseServices.forEach((service, index) => {
                const div = document.createElement('div');
                div.className = 'flex items-center p-2 rounded hover:bg-gray-100 cursor-pointer';

                const input = document.createElement('input');
                input.type = 'radio';
                input.id = `base-${service.id}`;
                input.name = 'baseService'; // Group radio buttons
                input.value = service.id;
                input.dataset.serviceName = service.serviceName; // Store name for later use
                input.dataset.servicePrice = service.basePrice; // Store price
                input.className = 'focus:ring-primary h-4 w-4 text-primary border-gray-300 mr-3';
                if (index === 0) input.checked = true; // Default check the first one
                
                const label = document.createElement('label');
                label.htmlFor = `base-${service.id}`;
                label.className = 'text-sm text-gray-900 cursor-pointer flex-grow';
                label.textContent = `${service.serviceName} ($${service.basePrice.toFixed(2)})`;
                
                div.appendChild(input);
                div.appendChild(label);
                div.addEventListener('click', () => input.checked = true); // Allow clicking the div
                baseServiceOptionsContainer.appendChild(div);
            });
        }

        // Populate Add-on Services (Checkboxes)
        if (addonServices.length === 0) {
            addonServiceOptionsContainer.innerHTML = '<p class="text-gray-500 text-sm italic">No active add-on services found.</p>';
        } else {
            addonServices.forEach(service => {
                const div = document.createElement('div');
                div.className = 'flex items-center p-2 rounded hover:bg-gray-100 cursor-pointer';

                const input = document.createElement('input');
                input.type = 'checkbox';
                input.id = `addon-${service.id}`;
                input.name = 'addonServices';
                input.value = service.id;
                input.dataset.serviceName = service.serviceName;
                input.dataset.servicePrice = service.basePrice;
                input.className = 'focus:ring-primary h-4 w-4 text-primary border-gray-300 rounded mr-3';

                const label = document.createElement('label');
                label.htmlFor = `addon-${service.id}`;
                label.className = 'text-sm text-gray-900 cursor-pointer flex-grow';
                label.textContent = `${service.serviceName} ($${service.basePrice.toFixed(2)})`;

                div.appendChild(input);
                div.appendChild(label);
                // Allow clicking the div to toggle checkbox
                div.addEventListener('click', (e) => {
                    // Prevent double toggling if label is clicked directly
                    if (e.target !== input) {
                        input.checked = !input.checked;
                    } 
                });
                addonServiceOptionsContainer.appendChild(div);
            });
        }

        console.log('Services loaded and displayed for booking modal.');

    } catch (error) {
        console.error('Error loading services for booking:', error);
        baseServiceOptionsContainer.innerHTML = ''; // Clear loading message
        addonServiceOptionsContainer.innerHTML = '';
        baseServiceErrorMsg.textContent = 'Failed to load base services.';
        addonServiceErrorMsg.textContent = 'Failed to load add-on services.';
        baseServiceErrorMsg.classList.remove('hidden');
        addonServiceErrorMsg.classList.remove('hidden');
    }
}
// --- END Service Loading Function --- 

// Function to open the booking modal
async function openBookingModal(dateTimeString, durationMinutes, prefillData = null) { // MODIFIED: Added prefillData parameter
    console.log('[Modal] Opening booking modal for:', dateTimeString, 'Prefill:', prefillData);

    if (prefillData && prefillData.client) {
        // --- APPROVED REQUEST FLOW ---
        console.log('[Modal] Approved request flow. Prefilling data.');
        currentBookingData = {
            dateTime: dateTimeString, // This is preferredDateForModal (ISO string)
            duration: durationMinutes, // This is totalDurationMinutes from services in request
            client: prefillData.client,
            baseService: prefillData.baseService,
            addonServices: prefillData.addonServices || [],
            originalRequestId: prefillData.originalRequestId, // Store the original request ID
            finalQuotedPrice: prefillData.finalQuotedPrice // <<< ADDED: Store final quoted price
        };
        console.log('[Modal] currentBookingData after prefill:', currentBookingData);

        // Display date/time info using the initial preferred date and calculated total duration
        try {
            const dateObject = new Date(dateTimeString); // Preferred date
            const displayDate = dateUtils.formatDate(dateObject, 'full-date', housekeeperTimezone);
            // Duration comes from calculated totalDurationMinutes passed to this function
            const displayDuration = formatDuration(durationMinutes); 
            bookingDateTimeElement.innerHTML = `<p class="font-medium">${displayDate}</p><p class="text-sm text-gray-600">Total Duration: ${displayDuration}</p><p class="text-sm text-gray-600 mt-1">Please select a specific start time below.</p>`;
        } catch (e) {
            console.error("[Modal] Error formatting date/time for prefill display:", e);
            bookingDateTimeElement.innerHTML = `<p class="font-medium text-red-600">Error displaying time</p>`;
        }

        // Hide client and service selection steps
        if (clientSelectionStep) clientSelectionStep.classList.add('hidden');
        if (baseServiceSelectionStep) baseServiceSelectionStep.classList.add('hidden');
        if (addonServiceSelectionStep) addonServiceSelectionStep.classList.add('hidden');
        
        // Show manual time input
        if (manualTimeInputContainer) manualTimeInputContainer.classList.remove('hidden');
        manualStartTimeInput.value = ''; // Clear previous time

        // Show review button directly
        if (reviewBookingButtonContainer) reviewBookingButtonContainer.classList.remove('hidden');
        
        // Hide other steps that might have been visible from a previous normal flow
        if (confirmationStep) confirmationStep.classList.add('hidden');

        // Ensure booking steps container itself is visible if it was hidden
        if (bookingStepsContainer) bookingStepsContainer.classList.remove('hidden');


    } else {
        // --- STANDARD MANUAL BOOKING FLOW (from available slot or manual add) ---
        console.log('[Modal] Standard manual booking flow.');
        currentBookingData = { dateTime: dateTimeString, duration: durationMinutes, client: null, baseService: null, addonServices: [], finalQuotedPrice: null }; // Reset/set initial data, ensure finalQuotedPrice is null

        // Display date/time info
        try {
            const dateObject = new Date(dateTimeString);
            const displayDate = dateUtils.formatDate(dateObject, 'full-date', housekeeperTimezone);
            const displayTime = dateUtils.formatTime(dateObject, housekeeperTimezone, 'h:mm A');
            const displayDuration = formatDuration(durationMinutes);
            bookingDateTimeElement.innerHTML = `<p class="font-medium">${displayDate} at ${displayTime}</p><p class="text-sm text-gray-600">Duration: ${displayDuration}</p>`;
        } catch(e) {
            console.error("[Modal] Error formatting date/time for display:", e);
            bookingDateTimeElement.innerHTML = `<p class="font-medium text-red-600">Error displaying time</p>`;
        }

        // Reset steps visibility for standard flow
        showBookingStep('clientSelection'); // Start with client selection
        
        // Hide manual time input if it was visible
        if (manualTimeInputContainer) manualTimeInputContainer.classList.add('hidden');

        // Load clients & services for selection
        await loadClientsForSelection();
        await loadAndDisplayServicesForBooking();
    }

    // Show the modal AFTER content is likely loaded/set up
    bookingModalBackdrop.classList.remove('hidden');
    bookingModal.classList.remove('translate-y-full');
    bookingContent.scrollTop = 0; // Scroll to top

    // Setup listeners *once* if not already done - MOVED TO DOMContentLoaded
    // if (!bookingHandlersInitialized) {
    //     setupBookingModalListeners();
    //     bookingHandlersInitialized = true;
    // }
}

// Function to set up modal event listeners (only once)
function setupBookingModalListeners() {
    closeBookingModalBtn.addEventListener('click', closeBookingModal);
    bookingModalBackdrop.addEventListener('click', closeBookingModal);

    // Client Selection Listener (Example using event delegation)
    existingClientsContainer.addEventListener('click', (event) => {
        const clientButton = event.target.closest('.client-option');
        if (clientButton) {
            const clientId = clientButton.dataset.clientId;
            const clientName = clientButton.dataset.clientName;
            currentBookingData.client = { id: clientId, name: clientName };
            console.log('[Modal] Client selected:', currentBookingData.client);
            
            // Remove selection style from others, add to clicked
            document.querySelectorAll('.client-option.bg-primary-light').forEach(btn => btn.classList.remove('bg-primary-light'));
            clientButton.classList.add('bg-primary-light');
            
            // --- MODIFIED: Move to Service Selection Steps --- 
            showBookingStep('baseServiceSelection'); 
        }
    });

    // REMOVED: Frequency Selection Listener
    // frequencySelectionStep.querySelectorAll('.frequency-option').forEach(button => { ... });

    // --- NEW: Review Booking Button Listener ---
    reviewBookingBtn.addEventListener('click', () => {
        console.log('[Modal Review Btn] Review Booking button clicked. currentBookingData:', JSON.parse(JSON.stringify(currentBookingData)));
        
        if (manualTimeInputContainer && !manualTimeInputContainer.classList.contains('hidden')) {
            // Handling approved request: Get manual start time
            console.log('[Modal Review Btn] Approved request flow detected.');
            const manualTime = manualStartTimeInput.value;
            console.log('[Modal Review Btn] Manual start time input value:', manualTime);

            if (!manualTime) {
                alert('Please select a start time for the approved request.');
                console.warn('[Modal Review Btn] Manual start time is missing.');
                manualStartTimeInput.focus();
                return;
            }
            console.log('[Modal Review Btn] Manual start time IS PRESENT.');

            try {
            const preferredDatePart = currentBookingData.dateTime.substring(0, 10); // YYYY-MM-DD
                console.log('[Modal Review Btn] Preferred date part:', preferredDatePart);
                const newDateTimeString = `${preferredDatePart}T${manualTime}`;
                console.log('[Modal Review Btn] Constructed new DateTime string for Date object:', newDateTimeString);
                currentBookingData.dateTime = new Date(newDateTimeString).toISOString();
                console.log('[Modal Review Btn] Successfully updated currentBookingData.dateTime:', currentBookingData.dateTime);

            // Update display with specific time
            const dateObject = new Date(currentBookingData.dateTime);
            const displayDate = dateUtils.formatDate(dateObject, 'full-date', housekeeperTimezone);
            const displayTime = dateUtils.formatTime(dateObject, housekeeperTimezone, 'h:mm A');
            const displayDuration = formatDuration(currentBookingData.duration);
            bookingDateTimeElement.innerHTML = `<p class="font-medium">${displayDate} at ${displayTime}</p><p class="text-sm text-gray-600">Duration: ${displayDuration}</p>`;
                console.log('[Modal Review Btn] BookingDateTimeElement updated.');

            if (!currentBookingData.client || !currentBookingData.baseService) {
                alert('Critical error: Client or base service data missing for approved request. Please close and retry.');
                    console.error('[Modal Review Btn] Critical: Client or baseService missing in currentBookingData for approved request.');
                    return;
                }
                console.log('[Modal Review Btn] Client and BaseService checks passed.');
            } catch (error) {
                console.error('[Modal Review Btn] Error processing manual time or updating UI:', error);
                alert('An error occurred while processing the time. Please check the console and try again.');
                return;
            }

        } else {
            // Standard manual booking: Gather selected services
            const selectedBaseRadio = baseServiceOptionsContainer.querySelector('input[name="baseService"]:checked');
            const selectedAddonCheckboxes = addonServiceOptionsContainer.querySelectorAll('input[name="addonServices"]:checked');

            if (!selectedBaseRadio) {
                baseServiceErrorMsg.textContent = 'Please select a base service.';
                baseServiceErrorMsg.classList.remove('hidden');
                baseServiceOptionsContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            } else {
                baseServiceErrorMsg.classList.add('hidden');
            }

            currentBookingData.baseService = {
                id: selectedBaseRadio.value,
                name: selectedBaseRadio.dataset.serviceName,
                price: parseFloat(selectedBaseRadio.dataset.servicePrice),
                durationMinutes: parseInt(selectedBaseRadio.dataset.serviceDuration || 0) // Assuming duration is in dataset
            };

            currentBookingData.addonServices = [];
            selectedAddonCheckboxes.forEach(checkbox => {
                currentBookingData.addonServices.push({
                    id: checkbox.value,
                    name: checkbox.dataset.serviceName,
                    price: parseFloat(checkbox.dataset.servicePrice),
                    durationMinutes: parseInt(checkbox.dataset.serviceDuration || 0) // Assuming duration
                });
            });
             // Recalculate total duration for manual bookings
            let totalDuration = currentBookingData.baseService.durationMinutes || 0;
            currentBookingData.addonServices.forEach(s => totalDuration += (s.durationMinutes || 0));
            currentBookingData.duration = totalDuration;
            // Update display with specific time and new duration
            const dateObject = new Date(currentBookingData.dateTime);
            const displayDate = dateUtils.formatDate(dateObject, 'full-date', housekeeperTimezone);
            const displayTime = dateUtils.formatTime(dateObject, housekeeperTimezone, 'h:mm A');
            const displayDuration = formatDuration(currentBookingData.duration);
            bookingDateTimeElement.innerHTML = `<p class="font-medium">${displayDate} at ${displayTime}</p><p class="text-sm text-gray-600">Duration: ${displayDuration}</p>`;
        }

        console.log('[Modal] Services for confirmation:', {
             base: currentBookingData.baseService,
             addons: currentBookingData.addonServices
        });

        // Populate confirmation details
        console.log('[Modal Review Btn] Calling populateConfirmationDetails().');
        populateConfirmationDetails();
        console.log('[Modal Review Btn] populateConfirmationDetails() finished.');

        // Move to confirmation step
        console.log("[Modal Review Btn] Calling showBookingStep('confirmationStep').");
        showBookingStep('confirmationStep');
        console.log("[Modal Review Btn] showBookingStep('confirmationStep') finished.");
    });
    // --- END Review Booking Button Listener ---

    // Confirmation Button Listener
    confirmBookingBtn.addEventListener('click', async () => {
        console.log('[Modal] Confirm Booking button clicked with data:', currentBookingData);
        
        if (!currentBookingData.client || !currentBookingData.baseService || !currentBookingData.dateTime || !currentBookingData.duration) {
            console.error('[Modal] Missing required data for booking confirmation.');
            alert('Missing required information (Client, Base Service, or Time). Please go back and select.');
            return;
        }
        
        const user = firebase.auth().currentUser;
        if (!user) {
            console.error('[Modal] User not authenticated.');
            alert('Authentication error. Please log in again.');
            return;
        }

        confirmBookingBtn.disabled = true;
        confirmBookingBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Confirming...';
        
        try {
            const startDateTime = new Date(currentBookingData.dateTime);
            const endDateTime = new Date(startDateTime.getTime() + currentBookingData.duration * 60000);
            const startTimestamp = firebase.firestore.Timestamp.fromDate(startDateTime);
            const endTimestamp = firebase.firestore.Timestamp.fromDate(endDateTime);
            const startTimestampMillis = startTimestamp.toMillis();
            const endTimestampMillis = endTimestamp.toMillis();

            const bookingData = {
                housekeeperId: user.uid,
                clientId: currentBookingData.client.id,
                clientName: currentBookingData.client.name, 
                startTimestamp: startTimestamp,
                endTimestamp: endTimestamp,
                startTimestampMillis: startTimestampMillis,
                endTimestampMillis: endTimestampMillis,
                durationMinutes: currentBookingData.duration,
                baseServiceId: currentBookingData.baseService.id,
                baseServiceName: currentBookingData.baseService.name,
                baseServicePrice: currentBookingData.baseService.price,
                baseServiceDurationMinutes: currentBookingData.baseService.durationMinutes || 0, 
                addonServices: currentBookingData.addonServices.map(s => ({ 
                    id: s.id,
                    name: s.name,
                    price: s.price,
                    durationMinutes: s.durationMinutes || 0 
                })),
                totalPrice: (currentBookingData.finalQuotedPrice !== undefined && currentBookingData.finalQuotedPrice !== null) 
                            ? currentBookingData.finalQuotedPrice 
                            : (currentBookingData.baseService.price + currentBookingData.addonServices.reduce((sum, addon) => sum + addon.price, 0)),
                status: 'confirmed', 
                frequency: 'one-time', 
                BookingNote: '', 
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                source: currentBookingData.originalRequestId ? 'service_request' : 'manual_booking' 
            };

            console.log('[Modal] Saving booking data:', bookingData);

            const bookingsPath = `users/${user.uid}/bookings`;
            const bookingsCollection = firebase.firestore().collection(bookingsPath);
            const newBookingRef = await bookingsCollection.add(bookingData); 
            const newBookingId = newBookingRef.id; 

            console.log('[Modal] Booking saved successfully with ID:', newBookingId);
            
            let successMessage = 'Booking confirmed and scheduled!'; // Default message for manual bookings

            if (currentBookingData.originalRequestId) {
                console.log(`[Modal] Updating original booking request ${currentBookingData.originalRequestId} to approved_and_scheduled, linking booking ${newBookingId}`);
                await window.firestoreService.updateBookingRequestStatus(
                    user.uid, 
                    currentBookingData.originalRequestId, 
                    'approved_and_scheduled',
                    { scheduledBookingId: newBookingId } 
                );
                successMessage = 'Service request approved and scheduled!'; // Override for approved requests
                
                // Refresh pending items AFTER request status update is confirmed
                await updatePendingRequestCountBadge(); 
                const latestRequests = await fetchPendingRequests();
                displayPendingRequests(latestRequests); // Update the HTML for the list (it will be hidden)
                                
                if (mainScheduleContainer && incomingRequestsContainer) {
                    mainScheduleContainer.classList.remove('hidden'); 
                    incomingRequestsContainer.classList.add('hidden');  
                }
            }
            
            showSuccessMessage(successMessage);
            closeBookingModal();
            await fetchAndRenderSchedule(currentWeekStart, user.uid); // Refresh main schedule view for all cases

        } catch (error) {
            console.error('[Modal] Error saving booking:', error);
            showErrorMessage(`Failed to save booking: ${error.message || 'Please try again.'}`);
        } finally {
            confirmBookingBtn.disabled = false;
            confirmBookingBtn.textContent = 'Confirm Booking';
        }
    });

    console.log('[Modal] Booking modal event listeners initialized.');
}

// Function to close the booking modal
function closeBookingModal() {
    console.log('[Modal Close] closeBookingModal function called.'); // Added log
    bookingModalBackdrop.classList.add('hidden');
    bookingModal.classList.add('translate-y-full');
    // Reset full state including services
    currentBookingData = { dateTime: null, duration: null, client: null, baseService: null, addonServices: [] }; 
    console.log('[Modal] Booking modal closed.');
}

// Function to show a specific step in the booking process
function showBookingStep(stepId) {
    // Hide all steps first
    const allSteps = [
        clientSelectionStep, 
        baseServiceSelectionStep, 
        addonServiceSelectionStep, 
        reviewBookingButtonContainer, // This is also a "step" in the flow
        confirmationStep
        // manualTimeInputContainer is NOT part of this standard flow, managed separately
    ];

    allSteps.forEach(step => {
        if (step) step.classList.add('hidden');
    });

    // Show the target step if it's one of the known steps
    const targetStep = document.getElementById(stepId);
    if (targetStep && allSteps.includes(targetStep)) { // Only show if it's a known step
        targetStep.classList.remove('hidden');
        console.log(`[Modal] Showing standard booking step: ${stepId}`);
        
        // Special handling for baseServiceSelection to also show addon and review button
        if (stepId === 'baseServiceSelection') {
            if (addonServiceSelectionStep) addonServiceSelectionStep.classList.remove('hidden');
            if (reviewBookingButtonContainer) reviewBookingButtonContainer.classList.remove('hidden');
            console.log(`[Modal] Also showing steps: addonServiceSelection, reviewBookingButtonContainer`);
        }
    } else if (stepId !== 'prefill_mode') { // Don't log error for our special prefill_mode ID
        console.warn(`[Modal] Standard booking step not found or not part of main flow: ${stepId}`);
    }
    
    if (bookingContent) bookingContent.scrollTop = 0;
}

// Function to load clients for the selection step
async function loadClientsForSelection() {
    console.log("[Modal] Loading clients...");
    if (!existingClientsContainer || !clientLoadingErrorMsg) {
        // Corrected console.error to match the existing log style
        console.error("[Modal Load Clients] Client container or error message element not found.");
        return;
    }

    existingClientsContainer.innerHTML = '<p class="text-gray-600 mb-2">Loading clients...</p>';
    clientLoadingErrorMsg.classList.add('hidden');

    try {
        const user = firebase.auth().currentUser;
        if (!user) {
             // Corrected throw new Error to match existing log style for caught errors.
             throw new Error("[Modal Load Clients] User not authenticated.");
        }

        const clientsPath = `users/${user.uid}/clients`;
        const clientsCollection = firebase.firestore().collection(clientsPath);
        // Fetch clients, order by first name then last name
        const snapshot = await clientsCollection
                                .orderBy('firstName', 'asc')
                                .orderBy('lastName', 'asc')
                                .get();

        existingClientsContainer.innerHTML = ''; // Clear loading message

        const clients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (clients.length === 0) {
            existingClientsContainer.innerHTML = "<p class='text-gray-500 text-sm italic'>No clients found. Add clients in the 'Clients' section.</p>";
        } else {
            clients.forEach(client => {
                const button = document.createElement('button');
                // Styling adjustment for better layout
                button.className = 'client-option w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-left mb-2 hover:bg-primary-light/50 flex items-center transition-colors duration-150';
                button.dataset.clientId = client.id;
                button.dataset.clientName = `${client.firstName} ${client.lastName}`;

                 // Structure: Name, Phone, Address (consider adding profile picture if available)
                const textDiv = document.createElement('div');
                textDiv.className = 'flex-grow'; // Allow text to take available space

                const nameEl = document.createElement('p');
                nameEl.className = 'font-medium text-gray-800';
                nameEl.textContent = `${client.firstName} ${client.lastName}`;
                textDiv.appendChild(nameEl);

                // Add phone and address details below the name
                const detailsEl = document.createElement('p');
                detailsEl.className = 'text-xs text-gray-500 mt-0.5'; // Smaller text for details
                const phone = client.phone ? ` | ${client.phone}` : '';
                detailsEl.textContent = `${client.address || 'No address'} ${phone}`;
                textDiv.appendChild(detailsEl);

                // You could add an icon/image placeholder here if needed

                button.appendChild(textDiv);
                existingClientsContainer.appendChild(button);
            });
        }
        console.log('[Modal] Clients loaded and displayed.');
    } catch (error) {
        console.error("[Modal Load Clients] Error loading clients:", error); // Standardized error log
        existingClientsContainer.innerHTML = ''; // Clear loading message on error
        clientLoadingErrorMsg.textContent = `Failed to load clients: ${error.message || 'Please try again.'}`;
        clientLoadingErrorMsg.classList.remove('hidden');
    }
}

// --- NEW: Function to populate confirmation details ---
function populateConfirmationDetails() {
    if (!confirmationDetailsElement) return;

    let html = '';
    
    // Start with Client (Add top border if it's the first item now)
    if (currentBookingData.client) {
        // Add class for top border only if it's the first element displayed
        const borderClass = html === '' ? '' : ' mt-3 pt-3 border-t border-gray-200'; 
        html += `<div class="${borderClass}"><p class="text-sm font-medium text-gray-600">Client:</p><p>${currentBookingData.client.name}</p></div>`;
    } else {
        const borderClass = html === '' ? '' : ' mt-3 pt-3 border-t border-gray-200';
        html += `<div class="${borderClass}"><p class="text-red-600">Client not selected.</p></div>`;
    }

    // Base Service
    if (currentBookingData.baseService) {
        const borderClass = html === '' ? '' : ' mt-3 pt-3 border-t border-gray-200';
        html += `<div class="${borderClass}"><p class="text-sm font-medium text-gray-600">Base Service:</p><p>${currentBookingData.baseService.name} ($${currentBookingData.baseService.price.toFixed(2)})</p></div>`;
    } else {
        const borderClass = html === '' ? '' : ' mt-3 pt-3 border-t border-gray-200';
         html += `<div class="${borderClass}"><p class="text-red-600">Base service not selected.</p></div>`;
    }

    // Add-on Services
    if (currentBookingData.addonServices && currentBookingData.addonServices.length > 0) {
        const borderClass = html === '' ? '' : ' mt-3 pt-3 border-t border-gray-200';
        html += `<div class="${borderClass}"><p class="text-sm font-medium text-gray-600">Add-ons:</p><ul class="list-disc list-inside text-sm">`;
        currentBookingData.addonServices.forEach(addon => {
            html += `<li>${addon.name} ($${addon.price.toFixed(2)})</li>`;
        });
        html += `</ul></div>`;
    }
    
    // --- NEW: Add Total Price Display --- 
    if (currentBookingData.baseService) { // Only show price if base service is selected
        const totalPrice = currentBookingData.baseService.price + currentBookingData.addonServices.reduce((sum, addon) => sum + addon.price, 0);
        html += `<div class="mt-3 pt-3 border-t border-gray-200"><p class="text-sm font-medium text-gray-600">Estimated Total:</p><p class="font-semibold text-lg text-gray-800">$${totalPrice.toFixed(2)}</p></div>`;
    }
    // --- END Total Price Display ---

    // Handle empty confirmation details case
    if (html === '') {
        html = '<p class="text-gray-500 italic">No details to confirm.</p>';
    }

    confirmationDetailsElement.innerHTML = html;
}
// --- END Confirmation Details Function ---

// --- NEW: Cancel Confirmation Modal Management ---
function openCancelConfirmModal(bookingId, clientName = 'this client') { // Accept optional client name for message
    console.log('[Modal Debug] Entering openCancelConfirmModal for bookingId:', bookingId); // Log entry with bookingId
    if (!bookingId) {
        console.error("[Modal Cancel Confirm] Cannot open cancel confirmation: Booking ID is missing."); // Standardized error log
        return;
    }
    
    // --- Debug: Log Element References ---
    console.log('[Modal Debug] cancelConfirmModal reference:', cancelConfirmModal);
    console.log('[Modal Debug] cancelConfirmBackdrop reference:', cancelConfirmBackdrop);
    // --- End Debug ---

    if (!cancelConfirmModal || !cancelConfirmBackdrop) {
        console.error('[Modal Debug] Cannot open cancel modal - element reference is null!');
        alert('Error: Cannot display cancellation confirmation.'); // Keep alert for user feedback
        return;
    }

    bookingIdToCancelInput.value = bookingId;
    // Customize message slightly if client name is available
    cancelConfirmMessage.textContent = `Are you sure you want to cancel the booking for ${clientName}? This action cannot be undone.`;
    cancelConfirmError.classList.add('hidden');
    cancelConfirmIndicator.textContent = '';
    confirmCancelBookingBtn.disabled = false;

    console.log('[Modal Debug] Backdrop classes BEFORE remove hidden:', cancelConfirmBackdrop.classList.toString());
    cancelConfirmBackdrop.classList.remove('hidden');
    console.log('[Modal Debug] Backdrop classes AFTER remove hidden:', cancelConfirmBackdrop.classList.toString());

    console.log('[Modal Debug] Modal classes BEFORE remove translate-y-full:', cancelConfirmModal.classList.toString());
    // Use transform for drawer effect
    cancelConfirmModal.classList.remove('translate-y-full'); 
    console.log('[Modal Debug] Modal classes AFTER remove translate-y-full:', cancelConfirmModal.classList.toString());
    // cancelConfirmModal.classList.remove('hidden'); // No longer using hidden
}

function closeCancelConfirmModal() {
    console.log('[Modal Debug] Entering closeCancelConfirmModal'); // Log entry
    // --- Debug: Log Element References ---
    console.log('[Modal Debug] cancelConfirmModal reference:', cancelConfirmModal); // Kept for specific debugging
    console.log('[Modal Debug] cancelConfirmBackdrop reference:', cancelConfirmBackdrop); // Kept for specific debugging
    // --- End Debug ---
    
    if (!cancelConfirmModal || !cancelConfirmBackdrop) {
         console.error('[Modal Cancel Confirm] Cannot close cancel modal - element reference is null!'); // Standardized error log
         return; // Prevent errors if elements aren't found
    }
    
    console.log('[Modal Debug] Backdrop classes BEFORE add hidden:', cancelConfirmBackdrop.classList.toString());
    cancelConfirmBackdrop.classList.add('hidden');
    console.log('[Modal Debug] Backdrop classes AFTER add hidden:', cancelConfirmBackdrop.classList.toString());
    
    console.log('[Modal Debug] Modal classes BEFORE add translate-y-full:', cancelConfirmModal.classList.toString());
    // Use transform for drawer effect
    cancelConfirmModal.classList.add('translate-y-full'); 
    console.log('[Modal Debug] Modal classes AFTER add translate-y-full:', cancelConfirmModal.classList.toString());
    // cancelConfirmModal.classList.add('hidden'); // No longer using hidden
    
    // Reset state after transition (optional delay?)
    // setTimeout(() => {
        bookingIdToCancelInput.value = '';
        cancelConfirmError.classList.add('hidden');
        cancelConfirmIndicator.textContent = '';
        confirmCancelBookingBtn.disabled = false;
    // }, 300); // Match transition duration
}
// --- END Cancel Confirmation Modal Management ---

// --- NEW: Booking Detail Modal Management ---
async function openBookingDetailModal(bookingId) {
    console.log('[Detail Modal] Opening for bookingId:', bookingId);
    const modal = document.getElementById('booking-detail-modal');
    // Ensure content and modalTitle are consistently referred or checked
    const content = document.getElementById('booking-detail-content');
    const modalTitle = document.getElementById('booking-detail-title');
    const user = firebase.auth().currentUser;

    if (!modal || !content || !modalTitle || !user) { // Added content and modalTitle check here for robustness
        console.error('[Detail Modal] Modal elements (modal, content, title) or user not found for booking detail');
        return;
    }

    showLoading('Loading booking details...');
    content.innerHTML = ''; // Clear previous content

    try {
        // 1. Fetch Booking Data
        const bookingData = await firestoreService.getBookingDetails(user.uid, bookingId);
        console.log("[Detail Modal] Booking data fetched:", bookingData);
        if (!bookingData) {
            throw new Error('Booking data not found.'); // This will be caught by the catch block
        }

        // 2. Fetch Homeowner Profile OR Client Details (for instructions/notes)
        let homeownerProfile = null; // Initialize as null
        let clientDetailsFromList = null; // Initialize as null
        if (bookingData.clientId) { 
            try {
                homeownerProfile = await firestoreService.getHomeownerProfile(bookingData.clientId);
                console.log("[Detail Modal] Homeowner profile fetched:", homeownerProfile);
                
                if (!homeownerProfile) {
                    console.warn(`[Detail Modal] Homeowner profile null, fetching client details from list.`);
                    clientDetailsFromList = await firestoreService.getClientDetails(user.uid, bookingData.clientId);
                    console.log("[Detail Modal] Client details fetched from list:", clientDetailsFromList);
                }
            } catch (profileError) {
                 console.warn(`[Detail Modal] Could not fetch homeowner profile for ${bookingData.clientId}, attempting client list fallback:`, profileError);
                try {
                    clientDetailsFromList = await firestoreService.getClientDetails(user.uid, bookingData.clientId);
                    console.log("[Detail Modal] Client details fetched from list after profile error:", clientDetailsFromList);
                } catch (fallbackError) {
                     console.error(`[Detail Modal] Failed to fetch client details even from list for ${bookingData.clientId}:`, fallbackError);
                }
            }
        }

        // 3. Populate Modal Content
        modalTitle.textContent = `Booking Details`;
        let detailHtml = '<div class="space-y-4">'; // Increased spacing
        
        // Date & Time (unchanged)
        const formatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', timeZone: userSettings?.timezone || 'UTC' };
        const startStr = bookingData.startTimestamp?.toDate().toLocaleString(undefined, formatOptions);
        const endStr = bookingData.endTimestamp?.toDate().toLocaleTimeString(undefined, { hour: 'numeric', minute: 'numeric', timeZone: userSettings?.timezone || 'UTC' });
        const duration = bookingData.duration ? `(${bookingData.duration} hr${bookingData.duration > 1 ? 's' : ''})` : '';
        detailHtml += `<div><p class="text-sm font-medium text-gray-600">When:</p><p>${startStr || 'N/A'} - ${endStr || 'N/A'} ${duration}</p></div>`;
        
        // Client Name (unchanged)
        detailHtml += `<div><p class="text-sm font-medium text-gray-600">Client:</p><p>${escapeHtml(bookingData.clientName || clientDetailsFromList?.firstName || 'N/A')}</p></div>`; 

        // Address (unchanged)
        const address = bookingData.address || homeownerProfile?.address || clientDetailsFromList?.address || 'N/A';
        detailHtml += `<div><p class="text-sm font-medium text-gray-600">Address:</p><p>${escapeHtml(address)}</p></div>`; 

        // Base Service & Price (unchanged)
        // ... (assuming this part is okay) ...

        // Total Price (unchanged)
        // ... (assuming this part is okay) ...

        // --- UPDATED Notes Sections --- 
        
        // HomeownerInstructions (Read-only)
        const homeownerInstructions = homeownerProfile?.HomeownerInstructions;
        if (homeownerInstructions) {
             // Added top margin for spacing if it appears
             detailHtml += `<div class="mt-4">
                 <p class="block text-sm font-medium text-gray-600">Homeowner General Instructions:</p>
                 <p class="mt-1 text-sm whitespace-pre-wrap bg-gray-100 p-2 rounded border border-gray-200">${escapeHtml(homeownerInstructions)}</p> 
             </div>`;
        }

        // HousekeeperInternalNote (Read-only Paragraph)
        const housekeeperInternalNote = clientDetailsFromList?.HousekeeperInternalNote || '';
        // Only display if there is a note
        if (housekeeperInternalNote) {
             detailHtml += `<div class="mt-4">
                 <p class="block text-sm font-medium text-gray-600">Housekeeper Notes / Access Info:</p>
                 <p class="mt-1 text-sm whitespace-pre-wrap bg-gray-100 p-2 rounded border border-gray-200">${escapeHtml(housekeeperInternalNote)}</p>
             </div>`;
        }

        // BookingNote (Editable Textarea) - Unchanged
        const bookingNote = bookingData.BookingNote || '';
        detailHtml += `<div class="mt-4"> 
                <label for="detail-modal-booking-note" class="block text-sm font-medium text-gray-600">Booking Note:</label>
                <textarea id="detail-modal-booking-note" rows="3" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">${escapeHtml(bookingNote)}</textarea>
            </div>`;
        
        // --- END UPDATED Notes Sections --- 

        detailHtml += '</div>'; // Close space-y-4 div
        content.innerHTML = detailHtml;

        // <<< Store data needed for saving in the modal's dataset >>>
        modal.dataset.bookingId = bookingId;
        modal.dataset.clientId = bookingData.clientId || null; // Keep clientId if needed elsewhere, but not for saving housekeeper note
        modal.dataset.originalBookingNote = bookingNote; // Store original BookingNote
        // modal.dataset.originalHousekeeperNote = housekeeperInternalNote; // REMOVED - No longer needed
        modal.dataset.housekeeperId = user.uid; // Store current user ID

        // Set up modal buttons based on booking status
        setupModalButtons(modal, bookingData); // Pass modal element itself
        
        hideLoading();

        // --- Add More Logging and Ensure Visibility Logic --- 
        console.log('[Detail Modal] About to remove hidden class from modal:', modal.id); // Use modal.id for clarity
        console.log('[Detail Modal] Modal classes BEFORE remove hidden:', modal.className); // Use 'hidden' in log
        modal.classList.remove('hidden');
        console.log('[Detail Modal] Modal classes AFTER remove hidden:', modal.className); // Use 'hidden' in log

        const backdrop = document.getElementById('booking-detail-backdrop'); // ensure backdrop ID is correct
        if (backdrop) {
            console.log('[Detail Modal] Showing backdrop');
            backdrop.classList.remove('hidden');
            setTimeout(() => { 
                backdrop.style.opacity = '0.5'; 
                console.log('[Detail Modal] Backdrop opacity set');
            }, 10); // Fade in backdrop
        } else {
            console.warn('[Detail Modal] Backdrop element not found!');
        }
        
        // Animate modal in
        setTimeout(() => { 
            modal.style.transform = 'translateY(0)'; 
            console.log('[Detail Modal] Modal transform set to translateY(0)');
        }, 10); 
        // --- END Visibility Logic --- 

    } catch (error) {
        hideLoading();
        console.error('[Detail Modal] Error loading booking details:', error);
        if (content) { // Check if content exists before modifying
        content.innerHTML = `<p class="text-red-500 p-4">Error loading details: ${error.message}</p>`;
        }
        if (modalTitle) { // Check if modalTitle exists
        modalTitle.textContent = 'Error'; 
        }
        if (modal) { // Check if modal exists
        modal.classList.remove('hidden'); // Show modal even on error to display message
        }
    }
}

// --- Update setupModalButtons to include Save button --- 
function setupModalButtons(modalElement, bookingData) {
    const footer = modalElement.querySelector('#booking-detail-footer');
    if (!footer) {
        console.error('[Modal Buttons] Footer element not found in detail modal.');
        return;
    }
    
    footer.innerHTML = ''; // Clear existing buttons
    const bookingId = bookingData.id;
    const clientName = bookingData.clientName || 'this client'; // For confirmation message

    // --- Create Buttons --- 
    const saveButton = document.createElement('button');
    saveButton.textContent = 'Save Notes';
    saveButton.id = 'save-detail-modal-btn'; // Add ID
    saveButton.className = 'w-full mb-3 inline-flex justify-center rounded-lg bg-green-600 px-3 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-green-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700'; // Green save style
    // Onclick handler will be added later or call a wrapper function

    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.className = 'w-full inline-flex justify-center rounded-lg bg-white px-3 py-3.5 text-sm font-semibold text-black shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50';
    closeButton.onclick = closeBookingDetailModal; 

    let cancelButton = null;
    if (bookingData.status === 'confirmed' || bookingData.status === 'booked') { 
        cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel Booking';
        cancelButton.className = 'w-full mb-3 inline-flex justify-center rounded-lg bg-red-600 px-3 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700';
        cancelButton.onclick = () => {
            closeBookingDetailModal(); 
            setTimeout(() => {
                 openCancelConfirmModal(bookingId, clientName);
            }, 150); 
        };
    }

    // --- Append Buttons to Footer --- 
    footer.appendChild(saveButton); // Add Save button
    if (cancelButton) {
        footer.appendChild(cancelButton); // Add Cancel button if applicable
    }
    footer.appendChild(closeButton); // Add Close button last

    // Attach listener for the save button now that it exists
    saveButton.onclick = handleSaveDetailsClick; // Call the save handler function
}

// --- NEW: Save Handler for Detail Modal Notes ---
async function handleSaveDetailsClick() {
    const modal = document.getElementById('booking-detail-modal');
    if (!modal) {
        console.error('[Save Details] Modal element (booking-detail-modal) not found!'); // Clarified modal ID
        return;
    }

    // Retrieve stored data and current values
    const bookingId = modal.dataset.bookingId;
    const housekeeperId = modal.dataset.housekeeperId;
    const originalBookingNote = modal.dataset.originalBookingNote;
    // const originalHousekeeperNote = modal.dataset.originalHousekeeperNote; // REMOVED

    const currentBookingNote = document.getElementById('detail-modal-booking-note').value.trim();
    // const currentHousekeeperNote = document.getElementById('detail-modal-housekeeper-note').value.trim(); // REMOVED - Textarea no longer exists

    if (!bookingId || !housekeeperId) {
        // Using showErrorMessage for user feedback, and console.error for dev logs
        console.error('[Save Details] Could not save notes: Missing bookingId or housekeeperId.');
        showErrorMessage('Could not save notes: Missing necessary booking or user information.');
        return;
    }

    let bookingNoteChanged = currentBookingNote !== originalBookingNote;
    // let housekeeperNoteChanged = clientId && (currentHousekeeperNote !== originalHousekeeperNote); // REMOVED

    // Only proceed if BookingNote changed
    if (!bookingNoteChanged) {
        showSuccessMessage('No changes detected in booking note.'); // Or just close modal silently
        closeBookingDetailModal();
        return;
    }

    showLoading('Saving booking note...'); // Update loading message
    let success = true;
    let errors = [];

    try {
        // Update BookingNote if changed
        // No longer need the outer 'if (bookingNoteChanged)' as we return early if it's not changed
        console.log('[Save Details] Updating BookingNote...');
        await firestoreService.updateBookingNote(housekeeperId, bookingId, currentBookingNote);
        // Update original value in dataset to prevent re-saving if user edits again without closing
        modal.dataset.originalBookingNote = currentBookingNote;
        

        // Update HousekeeperInternalNote if changed and clientId exists
        // if (housekeeperNoteChanged) { // REMOVED THIS BLOCK
        //      console.log('[Save Details] Updating HousekeeperInternalNote...');
        //      await firestoreService.updateHousekeeperInternalNote(housekeeperId, clientId, currentHousekeeperNote);
        //      // Update original value in dataset
        //      modal.dataset.originalHousekeeperNote = currentHousekeeperNote;
        // }
        
    } catch (error) {
        console.error('[Save Details] Error saving notes:', error);
        success = false;
        errors.push(error.message);
    } finally {
        hideLoading();
        if (success) {
            showSuccessMessage('Booking note saved successfully!'); // Update success message
            closeBookingDetailModal(); // Close modal on successful save
            // Optional: Re-fetch schedule if notes display might change in the main view (unlikely)
            // fetchAndRenderSchedule(currentWeekStart, housekeeperId);
        } else {
            showErrorMessage(`Error saving note: ${errors.join(', ')}`); // Update error message
            // Keep modal open for user to retry or copy text
        }
    }
}
// --- END Save Handler ---

// --- Close Booking Detail Modal --- 
function closeBookingDetailModal() {
    const modal = document.getElementById('booking-detail-modal');
    const backdrop = document.getElementById('booking-detail-backdrop');
    if (modal) {
        modal.style.transform = 'translateY(100%)';
        // Add hidden after transition starts to allow animation
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300); 
    }
    if (backdrop) {
        backdrop.style.opacity = '0';
        setTimeout(() => {
            backdrop.classList.add('hidden');
        }, 300);
    }
    // Re-enable body scrolling
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';

    // NEW: Reset proposal mode if active
    if (proposeAlternativeForm && !proposeAlternativeForm.classList.contains('hidden')) {
        handleCancelProposalMode();
    }
    currentProposingRequestData = null; // Clear any stored request data for proposing
    console.log('[Detail Modal] Closed.');
}
// --- END NEW ---

// --- NEW: Incoming Service Requests Logic ---

// Helper function to ensure userProfile is available
async function ensureUserProfile() {
    if (userProfile && userProfile.uid) return userProfile;
    return new Promise((resolve, reject) => { // Added reject for robustness
        const timeoutDuration = 10000; // 10 seconds timeout
        let listenerTriggered = false;

        const unsubscribe = firebase.auth().onAuthStateChanged(user => {
            listenerTriggered = true;
            if (user) {
                userProfile = user; 
                console.log('[Auth Ensure] User resolved via onAuthStateChanged:', user.uid);
                resolve(user);
                unsubscribe(); 
            } else if (firebase.auth().currentUser) {
                userProfile = firebase.auth().currentUser;
                console.log('[Auth Ensure] User resolved via currentUser sync:', userProfile.uid);
                resolve(userProfile);
                unsubscribe();
            } else {
                // This path means onAuthStateChanged fired with no user, and currentUser is also null.
                // This is a valid state if user is logged out.
                console.warn('[Auth Ensure] onAuthStateChanged fired with no user, and currentUser is null. Waiting for login or timeout.');
                // Don't reject here yet, wait for timeout or subsequent login.
            }
        });

        // Fallback / Timeout
        setTimeout(() => {
            if (!listenerTriggered && !userProfile) { // If listener never fired AND userProfile still null
                const syncUser = firebase.auth().currentUser;
                if (syncUser) {
                    userProfile = syncUser;
                    console.log('[Auth Ensure] User resolved via timeout fallback (currentUser sync):', userProfile.uid);
                    resolve(userProfile);
                } else {
                    console.error('[Auth Ensure] Timeout: User authentication could not be resolved.');
                    reject(new Error('User authentication timeout.'));
                }
                unsubscribe(); // Clean up listener in case of timeout resolution
            } else if (!userProfile && listenerTriggered) {
                 // Listener fired but resolved to no user (logged out state), and no userProfile yet.
                 console.warn('[Auth Ensure] Timeout after onAuthStateChanged (no user). Assuming logged out.');
                 reject(new Error('User is logged out.')); // Consider this a "resolved" logged-out state.
                 unsubscribe();
            }
            // If userProfile is already set by the listener, the promise is already resolved, do nothing here.
        }, timeoutDuration);
    });
}

async function fetchPendingRequests() {
    try { // Added try-catch around ensureUserProfile
        await ensureUserProfile(); 
    if (!userProfile || !userProfile.uid) {
        console.error('[Pending Requests] User not logged in or UID missing after ensure.');
        return [];
    }
    const housekeeperId = userProfile.uid;
    console.log(`[Pending Requests] Fetching for housekeeper: ${housekeeperId}`);
    try {
        const requestsSnapshot = await firebase.firestore()
            .collection('users').doc(housekeeperId)
            .collection('bookingRequests')
            .where('status', '==', 'pending_housekeeper_review')
            .orderBy('requestTimestamp', 'asc') // Show oldest first
            .get();

        if (requestsSnapshot.empty) {
            console.log('[Pending Requests] No pending requests found.');
            return [];
        }
        const requests = requestsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log('[Pending Requests] Fetched:', requests);
        return requests;
        } catch (error) {
            console.error('[Pending Requests] Error fetching pending requests:', error);
            showErrorMessage('Could not load incoming requests. Check console.');
            return [];
        }
    } catch (error) {
        console.error('[Pending Requests] Error fetching pending requests:', error);
        showErrorMessage('Could not load incoming requests. Check console.');
        return [];
    }
}

function displayPendingRequests(requests) {
    if (!incomingRequestsList || !incomingRequestsContainer || !mainScheduleContainer) {
        console.error('[Pending Requests] UI containers not found.');
        return;
    }

    incomingRequestsList.innerHTML = ''; // Clear previous list

    if (requests.length === 0) {
        incomingRequestsList.innerHTML = '<p class="text-gray-500 italic">No new service requests at this time.</p>';
    } else {
        requests.forEach(request => {
            const requestEl = document.createElement('div');
            requestEl.className = 'p-3 border rounded-lg hover:bg-gray-50 cursor-pointer';
            requestEl.dataset.requestId = request.id;

            // Use UTC interpretation for preferredDate string for display consistency
            let formattedReqListDate = 'N/A';
            if (request.preferredDate && typeof request.preferredDate === 'string') {
                const parts = request.preferredDate.split('-');
                if (parts.length === 3) {
                    const year = parseInt(parts[0], 10);
                    const month = parseInt(parts[1], 10) - 1; 
                    const day = parseInt(parts[2], 10);
                    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
                        const dateObj = new Date(Date.UTC(year, month, day));
                        formattedReqListDate = dateObj.toLocaleDateString(undefined, { 
                            month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' 
                        });
                    }
                }
            }
            const timeWindow = request.preferredTimeWindow || 'Any time';
            
            let serviceSummary = 'Services not specified';
            if (request.baseServices && request.baseServices.length > 0) {
                serviceSummary = request.baseServices.map(s => s.name).join(', ');
                if (request.addonServices && request.addonServices.length > 0) {
                    serviceSummary += ` (+${request.addonServices.length} add-on${request.addonServices.length > 1 ? 's' : ''})`;
                }
            }

            // --- NEW: Format Frequency for Display in List Item ---
            let frequencyDisplayHtml = '';
            if (request.frequency && request.frequency !== 'one-time') {
                // Attempt to get display text from homeowner's requestFrequencySelect if it were available here
                // For now, just capitalize the value from DB
                let frequencyText = request.frequency.charAt(0).toUpperCase() + request.frequency.slice(1);
                
                // We don't have direct access to the homeowner's <select> options here.
                // A more robust solution might involve storing display names or a mapping if complex.
                // For now, this simple capitalization will work for "weekly", "monthly", "bi-weekly".

                let recurringEndDateText = '';
                if (request.recurringEndDate) {
                    try {
                        // Use imported dateUtils for formatting if available, otherwise basic toLocaleDateString
                        const endDateObj = new Date(request.recurringEndDate); // Assumes YYYY-MM-DD
                        const formattedEndDate = (typeof dateUtils !== 'undefined' && dateUtils.formatDate)
                            ? dateUtils.formatDate(endDateObj, 'short-date') 
                            : endDateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
                        recurringEndDateText = ` until ${formattedEndDate}`;
                    } catch (e) { 
                        console.warn("[Pending Requests] Error formatting recurring end date for display:", e); 
                        recurringEndDateText = request.recurringEndDate ? ` until ${request.recurringEndDate}` : ''; // Fallback
                    }
                }
                frequencyDisplayHtml = `<p class="text-xs text-gray-500 mt-1">Frequency: ${escapeHtml(frequencyText)}${escapeHtml(recurringEndDateText)}</p>`;
            }
            // --- END NEW ---

            requestEl.innerHTML = `
                <div class="flex justify-between items-center">
                    <h4 class="font-semibold text-md">${escapeHtml(request.homeownerName || 'Unknown Homeowner')}</h4>
                    <span class="text-sm text-yellow-600">Pending Review</span>
                </div>
                <p class="text-sm text-gray-600">Date: ${escapeHtml(formattedReqListDate)} (${escapeHtml(timeWindow)})</p>
                ${frequencyDisplayHtml} <!-- NEW: Insert frequency display here -->
                <p class="text-sm text-gray-600">Services: ${escapeHtml(serviceSummary)}</p>
                <p class="text-sm text-gray-600">Est. Total: $${request.estimatedTotalPrice ? request.estimatedTotalPrice.toFixed(2) : 'N/A'}</p>
            `;
            requestEl.addEventListener('click', () => openRequestReviewModal(request));
            incomingRequestsList.appendChild(requestEl);
        });
    }
    // // Toggle visibility -- Ensure these lines are commented out or removed
    // mainScheduleContainer.classList.add('hidden');
    // incomingRequestsContainer.classList.remove('hidden');
}

async function updatePendingRequestCountBadge() {
    if (!incomingRequestsBadge) return;
    try {
        await ensureUserProfile(); 
        // Removed the explicit check for userProfile here, as ensureUserProfile should handle it or throw
        const pendingRequests = await fetchPendingRequests(); 
        const count = pendingRequests.length;
        incomingRequestsBadge.textContent = count;
        if (count > 0) {
            incomingRequestsBadge.classList.remove('hidden');
        } else {
            incomingRequestsBadge.classList.add('hidden');
        }
    } catch (error) {
        console.error('[Pending Requests] Error updating badge count:', error);
        incomingRequestsBadge.classList.add('hidden'); // Hide on error
    }
}

// STUBS for modal functions
function openRequestReviewModal(requestData) {
    console.log('[Request Review Modal] Opening for request:', requestData);
    currentOpenRequestDataForAI = requestData; // <<<< ASSIGN CURRENT REQUEST DATA

    const modalElement = document.getElementById('booking-detail-modal');
    if (!modalElement) {
        console.error("#booking-detail-modal not found!");
        return;
    }

    const modalTitle = document.getElementById('booking-detail-title');
    // NEW DOM element references for the redesigned modal
    const requestDateDisplay = document.getElementById('request-date-display');
    const requestPropertyOverviewDisplay = document.getElementById('request-property-overview-display');
    const requestServicesDisplay = document.getElementById('request-services-display');
    const requestNotesDisplay = document.getElementById('request-notes-display');
    const requestInitialPriceDisplay = document.getElementById('request-initial-price-display');
    const housekeeperQuotedPriceInput = document.getElementById('housekeeper-quoted-price');

    if (modalTitle) modalTitle.textContent = `Review Request: ${escapeHtml(requestData.homeownerName || 'Unknown')}`;
    
    // Clear previous dynamic content
    if (requestDateDisplay) requestDateDisplay.innerHTML = '';
    if (requestPropertyOverviewDisplay) requestPropertyOverviewDisplay.innerHTML = '<p class="italic text-gray-500">Loading property info...</p>';
    if (requestServicesDisplay) requestServicesDisplay.innerHTML = '';
    if (requestNotesDisplay) requestNotesDisplay.innerHTML = '';
    if (requestInitialPriceDisplay) requestInitialPriceDisplay.innerHTML = '';
    if (housekeeperQuotedPriceInput) housekeeperQuotedPriceInput.value = '';


    // Ensure propose-alternative-form is initially hidden
    const proposalForm = document.getElementById('propose-alternative-form');
        if (proposalForm) proposalForm.classList.add('hidden');

    // --- Populate Homeowner's Request Summary ---

    // Requested Date & Time
        let formattedReqDate = 'N/A';
        if (requestData.preferredDate && typeof requestData.preferredDate === 'string') {
            const parts = requestData.preferredDate.split('-');
            if (parts.length === 3) {
                const year = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1; 
                const day = parseInt(parts[2], 10);
                if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
                    const dateObj = new Date(Date.UTC(year, month, day));
                    formattedReqDate = dateObj.toLocaleDateString(undefined, { 
                        month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' 
                    });
                }
            }
        }
        const timeWindow = requestData.preferredTimeWindow || 'Any time';
    if (requestDateDisplay) {
        requestDateDisplay.innerHTML = `<p><span class=\"font-medium text-gray-700\">Requested Date:</span> ${escapeHtml(formattedReqDate)} (${escapeHtml(timeWindow)})</p>`;
    }

    // Frequency
    if (requestData.frequency && requestData.frequency !== 'one-time') {
        let frequencyText = requestData.frequency.charAt(0).toUpperCase() + requestData.frequency.slice(1);
        let recurringEndDateText = '';
        if (requestData.recurringEndDate) {
            try {
                const endDateObj = new Date(requestData.recurringEndDate);
                const formattedEndDate = (typeof dateUtils !== 'undefined' && dateUtils.formatDate)
                    ? dateUtils.formatDate(endDateObj, 'medium-date')
                    : endDateObj.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
                recurringEndDateText = ` until ${formattedEndDate}`;
            } catch (e) {
                recurringEndDateText = requestData.recurringEndDate ? ` until ${requestData.recurringEndDate}` : '';
            }
        }
        if (requestDateDisplay) { // Append to date display
            requestDateDisplay.innerHTML += `<br><p><span class=\"font-medium text-gray-700\">Frequency:</span> ${escapeHtml(frequencyText)}${escapeHtml(recurringEndDateText)}</p>`;
        }
    }
    
    // Property Overview (fetch homeowner profile for this)
    if (requestData.homeownerId && requestData.homeownerId !== 'manual_booking_client') {
        firestoreService.getHomeownerProfile(requestData.homeownerId).then(profile => {
            if (profile && requestPropertyOverviewDisplay) {
                let overview = '<i class="fas fa-home mr-1.5 text-gray-500"></i> Property: ';
                overview += `${escapeHtml(profile.homeType || 'N/A')}`;
                if (profile.squareFootage) overview += ` - ${escapeHtml(profile.squareFootage)} sq ft`;
                if (profile.numBedrooms) overview += `, ${escapeHtml(profile.numBedrooms)} bed(s)`;
                if (profile.numBathrooms) overview += `, ${escapeHtml(profile.numBathrooms)} bath(s)`;
                requestPropertyOverviewDisplay.innerHTML = `<p>${overview}</p>`;
            } else if (requestPropertyOverviewDisplay) {
                requestPropertyOverviewDisplay.innerHTML = '<p class="italic text-gray-500"><i class="fas fa-home mr-1.5 text-gray-500"></i> Property details not found.</p>';
            }
        }).catch(err => {
            console.error("Error fetching homeowner profile for overview:", err);
            if (requestPropertyOverviewDisplay) requestPropertyOverviewDisplay.innerHTML = '<p class="italic text-red-500"><i class="fas fa-exclamation-circle mr-1.5"></i> Error loading property info.</p>';
        });
    } else if (requestPropertyOverviewDisplay) {
         requestPropertyOverviewDisplay.innerHTML = '<p class="italic text-gray-500"><i class="fas fa-home mr-1.5 text-gray-500"></i> Property details not applicable (manual/no profile).</p>';
    }


    // Services - This part needs to become asynchronous due to fetching service details
    // Clear it first
    if (requestServicesDisplay) requestServicesDisplay.innerHTML = '<p class="italic text-gray-500">Loading service details...</p>';

    async function populateServicesWithRanges() {
        let servicesHtml = '';
        const housekeeperId = firebase.auth().currentUser ? firebase.auth().currentUser.uid : null;

        if (!housekeeperId) {
            if (requestServicesDisplay) requestServicesDisplay.innerHTML = '<p class="italic text-red-500">Error: Could not identify housekeeper to load service ranges.</p>';
            return;
        }

        const processServiceList = async (serviceList, listTitle) => {
            if (serviceList && serviceList.length > 0) {
                servicesHtml += `<p class="font-medium text-gray-700">${listTitle}:</p><ul class="list-disc list-inside pl-4 text-sm">`;
                for (const service of serviceList) {
                    let rangeText = '';
                    try {
                        const fullServiceDetails = await firestoreService.getServiceDetails(housekeeperId, service.id);
                        if (fullServiceDetails && fullServiceDetails.homeownerVisibleMinPrice > 0 && fullServiceDetails.homeownerVisibleMaxPrice > 0) {
                            rangeText = ` (Your Range: $${fullServiceDetails.homeownerVisibleMinPrice.toFixed(2)} - $${fullServiceDetails.homeownerVisibleMaxPrice.toFixed(2)})`;
                        } else if (fullServiceDetails && (fullServiceDetails.homeownerVisibleMinPrice > 0 || fullServiceDetails.homeownerVisibleMaxPrice > 0)) {
                            // Handle if only one is set, though UI should enforce both or neither for range
                            rangeText = ` (Your Set Price: $${(fullServiceDetails.homeownerVisibleMinPrice || fullServiceDetails.homeownerVisibleMaxPrice).toFixed(2)})`;
                        } else if (fullServiceDetails && fullServiceDetails.basePrice > 0 && !(fullServiceDetails.homeownerVisibleMinPrice > 0)) {
                            // If it's a flat rate service (basePrice set, but no min/max range was set by housekeeper for display)
                             rangeText = ` (Your Set Flat Rate: $${fullServiceDetails.basePrice.toFixed(2)})`;
                        }
                    } catch (err) {
                        console.warn(`Error fetching details for service ${service.id}:`, err);
                        rangeText = ' (Range not available)';
                    }
                    servicesHtml += `<li>${escapeHtml(service.name)} ($${service.price.toFixed(2)})${rangeText}</li>`;
                }
                servicesHtml += '</ul>';
            }
        };

        await processServiceList(requestData.baseServices, 'Base Service(s)');
        await processServiceList(requestData.addonServices, 'Add-on Service(s)');

        if (requestServicesDisplay) {
            requestServicesDisplay.innerHTML = servicesHtml || '<p class="italic text-gray-500">No specific services listed or ranges unavailable.</p>';
        }
    }

    populateServicesWithRanges(); // Call the async function to populate services

        // Homeowner Notes
    if (requestNotesDisplay) {
        if (requestData.notes) {
            requestNotesDisplay.innerHTML = `<p class="font-medium text-gray-700">Homeowner Notes:</p><p class="text-sm p-2 bg-gray-50 rounded whitespace-pre-wrap border">${escapeHtml(requestData.notes)}</p>`;
        } else {
            requestNotesDisplay.innerHTML = `<p class="font-medium text-gray-700">Homeowner Notes:</p><p class="text-sm italic">No notes provided.</p>`; // Standardized "No notes"
        }
    }

    // Homeowner's Initial Estimated Price
    if (requestInitialPriceDisplay) {
        requestInitialPriceDisplay.innerHTML = `<p class="font-medium text-gray-700">Homeowner's Initial Estimated Price:</p><p class="text-lg font-semibold text-gray-800">$${requestData.estimatedTotalPrice ? requestData.estimatedTotalPrice.toFixed(2) : 'N/A'}</p>`;
    }
    
    // Pre-fill "Your Quoted Price" input
    if (housekeeperQuotedPriceInput) {
        housekeeperQuotedPriceInput.value = requestData.estimatedTotalPrice ? requestData.estimatedTotalPrice.toFixed(2) : '';
    }

    // --- AI Suggestion Section Handling ---
    const aiSuggestionSection = document.getElementById('ai-suggestion-section');
    if (aiSuggestionSection) {
        aiSuggestionSection.dataset.requestId = requestData.id;
        aiSuggestionSection.dataset.homeownerId = requestData.homeownerId; 
        
        const currentAiSuggestionDisplay = aiSuggestionSection.querySelector('#ai-suggestion-display');
        const currentAiSuggestionError = aiSuggestionSection.querySelector('#ai-suggestion-error');
        const currentAiLoadingIndicator = aiSuggestionSection.querySelector('#ai-loading-indicator');
        const getSuggestionButtonInModal = aiSuggestionSection.querySelector('#get-ai-suggestion-btn');

        if (currentAiSuggestionDisplay) currentAiSuggestionDisplay.innerHTML = ''; // Clear previous AI suggestion
        if (currentAiSuggestionError) {
            currentAiSuggestionError.textContent = '';
            currentAiSuggestionError.classList.add('hidden');
        }
        if (currentAiLoadingIndicator) currentAiLoadingIndicator.classList.add('hidden');
        if (getSuggestionButtonInModal) getSuggestionButtonInModal.disabled = false;
        
        // REMOVED: Call to displayPropertyDetailsInModal as it populated the now-removed div
        // if (requestData.homeownerId) {
        //     displayPropertyDetailsInModal(requestData.homeownerId);
        // } else {
        //     const aiPropertyDetailsSummary = document.getElementById(\'ai-property-details-summary\'); // This element is now removed
        //     if (aiPropertyDetailsSummary) aiPropertyDetailsSummary.innerHTML = \'<p class="italic text-gray-500">Property details not available for AI (manual/no profile).</p>\';
        // }
    }
    
    setupRequestActionButtons(modalElement, requestData);

    modalElement.classList.remove('hidden');
    modalElement.style.transform = 'translateY(0)';
    const backdrop = document.getElementById('booking-detail-backdrop');
    if (backdrop) {
        backdrop.classList.remove('hidden');
        backdrop.style.opacity = '0.5';
    }
    document.body.style.overflow = 'hidden';
}

function setupRequestActionButtons(modalElement, requestData) {
    console.log('[Request Review Modal] Setting up action buttons for:', requestData.id);
    // const footer = modalElement.querySelector('#booking-detail-footer'); // Original
    // Ensure footer points to the main footer div, not the sub-containers yet
    const footer = document.getElementById('booking-detail-footer'); 

    if (!footer) {
        console.error('#booking-detail-footer not found in modalElement or document!');
        return;
    }

    const stdActionsContainer = footer.querySelector('#standard-request-actions');
    const propActionsContainer = footer.querySelector('#propose-alternative-actions');

    if (!stdActionsContainer || !propActionsContainer) {
        console.error('Standard or propose alternative action containers not found in footer!');
        return;
    }

    stdActionsContainer.innerHTML = ''; // Clear existing standard buttons
    propActionsContainer.innerHTML = ''; // Clear existing proposal buttons

    const actions = [
        { label: 'Approve', class: 'bg-green-600 hover:bg-green-700', handler: () => handleApproveRequest(requestData.id, requestData) },
        { label: 'Propose Alternative', class: 'bg-blue-600 hover:bg-blue-700', handler: () => handleProposeAlternative(requestData) },
        { label: 'Decline', class: 'bg-red-600 hover:bg-red-700', handler: () => handleDeclineRequest(requestData.id, requestData) },
        { label: 'Close', class: 'bg-gray-500 hover:bg-gray-600', handler: () => closeBookingDetailModal() }
    ];

    actions.forEach(action => {
        const button = document.createElement('button');
        button.textContent = action.label;
        button.className = `w-full mb-2 px-4 py-2.5 text-sm font-semibold text-white rounded-lg shadow-sm ${action.class} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2`;
        button.onclick = action.handler;
        stdActionsContainer.appendChild(button);
    });

    propActionsContainer.classList.add('hidden');
    stdActionsContainer.classList.remove('hidden');
}

// STUBS for handler functions
async function handleApproveRequest(requestId, requestData) {
    console.log(`[Request Action] Approve clicked for request ID: ${requestId}`, requestData);
    
    const housekeeperQuotedPriceInput = document.getElementById('housekeeper-quoted-price');
    const finalQuotedPrice = housekeeperQuotedPriceInput ? parseFloat(housekeeperQuotedPriceInput.value) : null;

    if (finalQuotedPrice === null || isNaN(finalQuotedPrice) || finalQuotedPrice <= 0) {
        showErrorMessage('Please enter a valid quoted price before approving.');
        if (housekeeperQuotedPriceInput) housekeeperQuotedPriceInput.focus();
        return;
    }

    closeBookingDetailModal(); 

    let totalDurationMinutes = 0;
    if (requestData.baseServices && requestData.baseServices.length > 0) {
        requestData.baseServices.forEach(s => { 
            const duration = Number(s.durationMinutes);
            totalDurationMinutes += (isNaN(duration) ? 0 : duration); 
        });
    }
    if (requestData.addonServices && requestData.addonServices.length > 0) {
        requestData.addonServices.forEach(s => { 
            const duration = Number(s.durationMinutes);
            totalDurationMinutes += (isNaN(duration) ? 0 : duration); 
        });
    }

    if (totalDurationMinutes === 0 && (requestData.baseServices?.length > 0 || requestData.addonServices?.length > 0)) {
        console.warn("Service durations were missing or zero. Defaulting to 120 min for scheduling.");
        totalDurationMinutes = 120; 
    } else if (totalDurationMinutes === 0) {
        console.warn("No services found or all durations zero. Defaulting to 60 min.");
        totalDurationMinutes = 60;
    }
    
    const prefillForScheduling = {
        client: { id: requestData.homeownerId, name: requestData.homeownerName },
        baseService: requestData.baseServices && requestData.baseServices.length > 0 
            ? { 
                id: requestData.baseServices[0].id, 
                name: requestData.baseServices[0].name, 
                // Price here is tricky if housekeeper changed total. For now, keep original service price.
                // The *actual* booking total will be the housekeeperQuotedPrice.
                price: requestData.baseServices[0].price, 
                durationMinutes: Number(requestData.baseServices[0].durationMinutes) || 0
              }
            : null,
        addonServices: requestData.addonServices 
            ? requestData.addonServices.map(s => ({ 
                id: s.id, 
                name: s.name, 
                price: s.price,
                durationMinutes: Number(s.durationMinutes) || 0
            })) 
            : [],
        originalRequestId: requestId,
        finalQuotedPrice: finalQuotedPrice // Pass the housekeeper's final price
    };

    let preferredDateForModal;
    if (requestData.preferredDate && requestData.preferredDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        preferredDateForModal = new Date(requestData.preferredDate + "T00:00:00").toISOString();
    } else {
        console.warn("Preferred date missing/invalid, defaulting to today for modal.");
        preferredDateForModal = new Date().toISOString(); 
    }

    console.log(`[Request Action] Opening scheduling modal with prefill:`, prefillForScheduling, `Date: ${preferredDateForModal}, Duration: ${totalDurationMinutes}`);
    // The openBookingModal will need to be aware of `finalQuotedPrice`
    // and the confirmBookingBtn listener will use it for the `totalPrice` in bookingData.
    openBookingModal(preferredDateForModal, totalDurationMinutes, prefillForScheduling);
}

async function handleProposeAlternative(requestData) {
    console.log(`[Request Action] Propose Alternative clicked for request ID: ${requestData.id}`, requestData);
    currentProposingRequestData = requestData; // Store the request data

    const detailContent = document.getElementById('booking-detail-content');
    const requestDetailsDisplay = detailContent ? detailContent.querySelector('#request-details-display') : null;

    // Existing proposal form elements
    const altDateInput = document.getElementById('alternative-date'); // Renamed for clarity
    const altTimeInput = document.getElementById('alternative-time'); // Renamed for clarity
    const altNotesInput = document.getElementById('alternative-notes'); // Renamed for clarity

    // --- NEW: Get DOM elements for proposed frequency ---
    const altFrequencySelect = document.getElementById('alternative-frequency');
    const altRecurringEndDateWrapper = document.getElementById('alternative-recurring-end-date-wrapper');
    const altRecurringEndDateInput = document.getElementById('alternative-recurring-end-date');
    // --- END NEW ---

    if (!proposeAlternativeForm || !standardRequestActionsContainer || !proposeAlternativeActionsContainer || 
        !altDateInput || !altTimeInput || !altNotesInput || 
        !altFrequencySelect || !altRecurringEndDateWrapper || !altRecurringEndDateInput || // Check new elements
        !requestDetailsDisplay) {
        console.error('One or more elements for "Propose Alternative" form or request display are missing.');
        showErrorMessage('UI error: Cannot open proposal form. Essential elements missing.');
        return;
    }

    // Hide original request details, show proposal form
    requestDetailsDisplay.classList.add('hidden');
    proposeAlternativeForm.classList.remove('hidden');

    // Clear and initialize the date/time/notes form fields
    altDateInput.value = '';
    altTimeInput.value = '';
    altNotesInput.value = '';
    if (window.flatpickr && altDateInput._flatpickr) {
        altDateInput._flatpickr.clear();
        const initialDate = requestData.preferredDate && requestData.preferredDate.match(/^\d{4}-\d{2}-\d{2}$/) 
                            ? requestData.preferredDate 
                            : new Date();
        altDateInput._flatpickr.setDate(initialDate, false);
    } else {
        // Fallback if flatpickr not init on this element for some reason
        altDateInput.value = requestData.preferredDate || dateUtils.formatDate(new Date(), 'YYYY-MM-DD');
    }
    altTimeInput.value = requestData.preferredTimeWindow && requestData.preferredTimeWindow.includes(':') ? requestData.preferredTimeWindow : '09:00'; // Default if not specific time

    // --- NEW: Initialize proposed frequency fields ---
    altFrequencySelect.value = requestData.frequency || 'one-time'; // Default to homeowner's request or 'one-time'
    
    if (altFrequencySelect.value === 'one-time') {
        altRecurringEndDateWrapper.classList.add('hidden');
    } else {
        altRecurringEndDateWrapper.classList.remove('hidden');
    }

    if (window.flatpickr && altRecurringEndDateInput) {
        if (!altRecurringEndDateInput._flatpickr) { // Initialize if not already
            flatpickr(altRecurringEndDateInput, {
                altInput: true,
                altFormat: "F j, Y",
                dateFormat: "Y-m-d",
                minDate: "today"
            });
        }
        // Set date if available from original request, otherwise clear
        if (requestData.recurringEndDate && altFrequencySelect.value !== 'one-time') {
            altRecurringEndDateInput._flatpickr.setDate(requestData.recurringEndDate, false);
        } else {
            altRecurringEndDateInput._flatpickr.clear();
        }
    } else if (altRecurringEndDateInput) {
         // Fallback if flatpickr not available on this specific input
        altRecurringEndDateInput.value = (requestData.recurringEndDate && altFrequencySelect.value !== 'one-time') ? requestData.recurringEndDate : '';
    }

    // Event listener for frequency select to show/hide end date picker
    // Remove previous listener if any to prevent multiple attachments
    const newAltFrequencySelect = altFrequencySelect.cloneNode(true);
    altFrequencySelect.parentNode.replaceChild(newAltFrequencySelect, altFrequencySelect);
    // Re-assign the variable to the new cloned element so the rest of the code uses it.
    // This is a common way to ensure old listeners are detached before adding new ones.
    const currentAltFrequencySelect = document.getElementById('alternative-frequency'); // Re-fetch the new element by ID

    if (currentAltFrequencySelect && altRecurringEndDateWrapper && altRecurringEndDateInput) {
        currentAltFrequencySelect.addEventListener('change', () => {
            if (currentAltFrequencySelect.value === 'one-time') {
                altRecurringEndDateWrapper.classList.add('hidden');
                if (altRecurringEndDateInput._flatpickr) {
                    altRecurringEndDateInput._flatpickr.clear();
                }
            } else {
                altRecurringEndDateWrapper.classList.remove('hidden');
                // Optionally, set a minDate for recurringEndDateInput based on alternativeDateInput
                if (altDateInput._flatpickr && altRecurringEndDateInput._flatpickr) {
                    const selectedProposeDate = altDateInput._flatpickr.selectedDates[0];
                    if (selectedProposeDate) {
                        const nextDay = new Date(selectedProposeDate);
                        nextDay.setDate(nextDay.getDate() + 1);
                        altRecurringEndDateInput._flatpickr.set('minDate', nextDay);
                    }
                }
            }
        });
        // Trigger change once to set initial state correctly based on pre-filled value
        currentAltFrequencySelect.dispatchEvent(new Event('change'));
    }
    // --- END NEW ---

    // Scroll the form into view if it's inside a scrollable container
    if (bookingDetailContent) bookingDetailContent.scrollTop = 0; // Scroll to top first
    proposeAlternativeForm.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Switch action buttons
    standardRequestActionsContainer.classList.add('hidden');
    proposeAlternativeActionsContainer.innerHTML = ''; // Clear previous
    proposeAlternativeActionsContainer.classList.remove('hidden');

    const sendButton = document.createElement('button');
    sendButton.textContent = 'Send Proposal';
    sendButton.className = 'w-full mb-2 px-4 py-2.5 text-sm font-semibold text-white rounded-lg shadow-sm bg-green-600 hover:bg-green-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';
    sendButton.onclick = handleSendProposal;
    proposeAlternativeActionsContainer.appendChild(sendButton);

    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel Proposal Mode';
    cancelButton.className = 'w-full mb-2 px-4 py-2.5 text-sm font-semibold text-white rounded-lg shadow-sm bg-gray-500 hover:bg-gray-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';
    cancelButton.onclick = handleCancelProposalMode;
    proposeAlternativeActionsContainer.appendChild(cancelButton);
}

async function handleSendProposal() {
    if (!currentProposingRequestData) {
        showErrorMessage('Error: No request data for proposal.');
        return;
    }
    const altDateInput = document.getElementById('alternative-date');
    const altTimeInput = document.getElementById('alternative-time');
    const altNotesInput = document.getElementById('alternative-notes');
    const altFrequencySelect = document.getElementById('alternative-frequency');
    const altRecurringEndDateInput = document.getElementById('alternative-recurring-end-date');
    const housekeeperQuotedPriceInput = document.getElementById('housekeeper-quoted-price'); // Get the quoted price input

    if (!altDateInput || !altTimeInput || !altFrequencySelect || !altRecurringEndDateInput || !housekeeperQuotedPriceInput) {
        showErrorMessage('Error: Essential form fields are missing for the proposal.');
        return;
    }

    const proposedDate = altDateInput.value;
    const proposedTime = altTimeInput.value;
    const proposedNotes = altNotesInput ? altNotesInput.value.trim() : '';
    const proposedFrequency = altFrequencySelect.value;
    const proposedRecurringEndDate = (proposedFrequency !== 'one-time' && altRecurringEndDateInput.value) 
                                      ? altRecurringEndDateInput.value 
                                      : null;
    const finalQuotedPrice = parseFloat(housekeeperQuotedPriceInput.value); // Get the price

    if (!proposedDate) {
        showErrorMessage('Please select a proposed date.');
        altDateInput.focus();
        return;
    }
    if (!proposedTime) {
        showErrorMessage('Please select a proposed time.');
        altTimeInput.focus();
        return;
    }
    if (isNaN(finalQuotedPrice) || finalQuotedPrice <= 0) {
        showErrorMessage('Please enter a valid quoted price for the proposal.');
        housekeeperQuotedPriceInput.focus();
        return;
    }
    
    const proposalDetails = {
        proposedDate: proposedDate,
        proposedTime: proposedTime,
        housekeeperNotes: proposedNotes,
        proposedFrequency: proposedFrequency,
        proposedRecurringEndDate: proposedRecurringEndDate,
        proposedPrice: finalQuotedPrice, // Add the quoted price to the proposal
        proposedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    console.log(`[Housekeeper Send Proposal] Request ID: ${currentProposingRequestData.id}, Sending proposal:`, JSON.parse(JSON.stringify(proposalDetails)));
    showLoading('Sending proposal...');

    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            throw new Error("User not authenticated to send proposal.");
        }

        await window.firestoreService.updateBookingRequestStatus(
            user.uid,
            currentProposingRequestData.id,
            'housekeeper_proposed_alternative',
            { proposal: proposalDetails }
        );

        showSuccessMessage('Alternative proposal sent to homeowner.');
        
        handleCancelProposalMode(); 
        closeBookingDetailModal();   

        await updatePendingRequestCountBadge();
        const updatedRequests = await fetchPendingRequests();
        displayPendingRequests(updatedRequests);

    } catch (error) {
        console.error('[Request Action] Error sending proposal:', error);
        showErrorMessage(`Failed to send proposal: ${error.message || 'Please try again.'}`);
    } finally {
        hideLoading();
    }
}

function handleCancelProposalMode() {
    const detailContent = document.getElementById('booking-detail-content');
    const requestDetailsDisplay = detailContent ? detailContent.querySelector('#request-details-display') : null;

    if (proposeAlternativeForm) proposeAlternativeForm.classList.add('hidden');
    if (requestDetailsDisplay) requestDetailsDisplay.classList.remove('hidden'); // Show original details again

    if (proposeAlternativeActionsContainer) proposeAlternativeActionsContainer.classList.add('hidden');
    if (standardRequestActionsContainer) standardRequestActionsContainer.classList.remove('hidden');
    
    // Clear input fields
    if (alternativeDateInput && alternativeDateInput._flatpickr) alternativeDateInput._flatpickr.clear();
    else if (alternativeDateInput) alternativeDateInput.value = '';
    if (alternativeTimeInput) alternativeTimeInput.value = '';
    if (alternativeNotesInput) alternativeNotesInput.value = '';

    currentProposingRequestData = null; // Clear stored data
    console.log('[Request Action] Cancelled proposal mode.');
}

// ... existing code ...
async function handleDeclineRequest(requestId, requestData) {
    console.log(`[Request Action] Decline clicked for request ID: ${requestId}`, requestData);
    showLoading('Declining request...');

    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            throw new Error("User not authenticated to decline request.");
        }

        await window.firestoreService.updateBookingRequestStatus(
            user.uid,
            requestId,
            'declined_by_housekeeper'
        );

        showSuccessMessage(`Request from ${requestData.homeownerName || 'homeowner'} has been declined.`);
        
        closeBookingDetailModal();
        await updatePendingRequestCountBadge();
        const updatedRequests = await fetchPendingRequests(); // Fetch latest requests
        displayPendingRequests(updatedRequests); // Refresh the list display

    } catch (error) {
        console.error('[Decline Request] Error:', error);
        showErrorMessage(`Failed to decline request: ${error.message || 'Please try again.'}`);
    } finally {
        hideLoading();
    }
}
window.handleDeclineRequest = handleDeclineRequest; // EXPLICITLY ASSIGN TO WINDOW

// ... existing code ...

document.addEventListener('DOMContentLoaded', async () => {
    // ... (other existing DOMContentLoaded logic) ...

    if (viewIncomingRequestsBtn && !viewIncomingRequestsBtn.hasAttribute('data-listener-set')) { // <<< ADDED GUARD
        viewIncomingRequestsBtn.addEventListener('click', async () => {
            console.log('[View Incoming Requests Button - Guarded First Listener] Clicked. Toggling visibility.');

            const isRequestsContainerCurrentlyVisible = !incomingRequestsContainer.classList.contains('hidden');

            if (isRequestsContainerCurrentlyVisible) {
                // Action: Switch from Incoming Requests to Schedule View
                console.log('[View Incoming Requests Button - Guarded First Listener] Switching from Incoming Requests to Schedule View.');
                incomingRequestsContainer.classList.add('hidden');
                mainScheduleContainer.classList.remove('hidden');

                // Update button to "Incoming Requests" state
                if (incomingRequestsTextLabel) incomingRequestsTextLabel.textContent = 'Incoming Requests';
                if (incomingRequestsIcon) incomingRequestsIcon.className = 'fas fa-bell mr-2';
                
                const pageTitleElement = document.getElementById('page-main-title');
                if (pageTitleElement) pageTitleElement.textContent = 'Schedule'; // Set title to Schedule

                await ensureUserProfile(); 
                await updatePendingRequestCountBadge();
                
                if (mainScheduleContainer.innerHTML.includes("Loading schedule...") || mainScheduleContainer.innerHTML === '') {
                    console.log('[View Incoming Requests Button - Guarded First Listener] Schedule container was empty or loading; re-triggering loadUserSchedule.');
                    await loadUserSchedule(true);
                }

            } else {
                // Action: Switch from Schedule View to Incoming Requests
                console.log('[View Incoming Requests Button - Guarded First Listener] Switching from Schedule View to Incoming Requests.');
                mainScheduleContainer.classList.add('hidden'); 
                incomingRequestsContainer.classList.remove('hidden'); 
                
                if (incomingRequestsTextLabel) incomingRequestsTextLabel.textContent = 'View Schedule';
                if (incomingRequestsIcon) incomingRequestsIcon.className = 'fas fa-calendar-alt mr-2';

                const pageTitleElement = document.getElementById('page-main-title');
                if (pageTitleElement) pageTitleElement.textContent = 'Incoming Service Requests'; // Set title to Incoming Requests
                
            showLoading('Loading requests...');
                try {
                    await ensureUserProfile(); 
            const requests = await fetchPendingRequests();
            displayPendingRequests(requests);
                } catch (error) {
                    console.error('[View Incoming Requests Button - Guarded First Listener] Error fetching or displaying pending requests:', error);
                    showErrorMessage('Could not load pending requests.');
                    if(incomingRequestsList) incomingRequestsList.innerHTML = '<p class="text-red-500">Error loading requests.</p>';
                } finally {
            hideLoading();
                }
            }
        });
        viewIncomingRequestsBtn.setAttribute('data-listener-set', 'true'); // <<< SET ATTRIBUTE
        console.log('[View Incoming Requests Button - Guarded First Listener] Listener attached.');
    } else if (viewIncomingRequestsBtn && viewIncomingRequestsBtn.hasAttribute('data-listener-set')) {
        console.log('[View Incoming Requests Button - Guarded First Listener] Listener ALREADY SET, skipping attachment.');
    } else if (!viewIncomingRequestsBtn) {
        console.error('[View Incoming Requests Button - Guarded First Listener] Button not found.');
    }

    // Initial update of the badge count
    try {
        await ensureUserProfile(); 
        if (userProfile) {
             housekeeperTimezone = userProfile?.timezone || userSettings?.timezone || dateUtils.getLocalTimezone();
             await updatePendingRequestCountBadge();
        } else {
            console.warn('[DOMContentLoaded] User profile not available after ensure for initial badge update.');
        }
    } catch (error) {
        console.error('[DOMContentLoaded] Error during initial setup for pending requests badge:', error);
    }

    const closeDetailX = document.getElementById('close-detail-modal-btn-x');
    if (closeDetailX && typeof closeBookingDetailModal === 'function') {
        closeDetailX.addEventListener('click', closeBookingDetailModal);
    }

    currentWeekStart = dateUtils.getStartOfWeek(new Date());
    // ... (rest of DOMContentLoaded, including Flatpickr initialization etc.)
    // Initialize Flatpickr for the alternative date input
    if (document.getElementById('alternative-date')) {
        flatpickr(document.getElementById('alternative-date'), {
            altInput: true,
            altFormat: "F j, Y", // E.g., "March 15, 2025"
            dateFormat: "Y-m-d",   // Stores as YYYY-MM-DD
            minDate: "today"
        });
        console.log('[Flatpickr] Initialized for #alternative-date');
    } else {
        console.warn('[Flatpickr] #alternative-date input not found on DOMContentLoaded.');
    }
    // ... existing code that was previously removed by mistake ...

    // --- NEW: Add event listener for AI Suggestion Button ---
    if (getAiSuggestionBtn) {
        getAiSuggestionBtn.addEventListener('click', handleGetAiSuggestionClick);
        console.log('[DOMContentLoaded] Event listener added for getAiSuggestionBtn.');
    } else {
        console.warn('[DOMContentLoaded] getAiSuggestionBtn not found. AI features in modal may not work.');
    }
    // --- END NEW ---
});

// --- NEW: AI Suggestion Click Handler ---
async function handleGetAiSuggestionClick() {
    console.log('[AI Suggestion] "Get AI Suggestion" button clicked.');

    const currentAiSuggestionSection = document.getElementById('ai-suggestion-section');
    let currentAiSuggestionDisplay, currentAiLoadingIndicator, currentAiSuggestionError;
    const housekeeperQuotedPriceInput = document.getElementById('housekeeper-quoted-price'); // Get ref to price input


    if (currentAiSuggestionSection) {
        currentAiSuggestionDisplay = currentAiSuggestionSection.querySelector('#ai-suggestion-display');
        currentAiLoadingIndicator = currentAiSuggestionSection.querySelector('#ai-loading-indicator');
        currentAiSuggestionError = currentAiSuggestionSection.querySelector('#ai-suggestion-error');
    }


    if (!currentAiSuggestionSection || !currentAiSuggestionDisplay || !currentAiLoadingIndicator || !currentAiSuggestionError || !housekeeperQuotedPriceInput) {
        console.error('[AI Suggestion] Required AI DOM elements or quoted price input are not available.');
        if (currentAiSuggestionError) { 
            currentAiSuggestionError.textContent = 'Error: UI components for AI helper are missing or not ready.';
            currentAiSuggestionError.classList.remove('hidden');
        } else {
            showErrorMessage('Critical Error: AI Helper UI components are missing.');
        }
        return;
    }

    currentAiSuggestionDisplay.innerHTML = '';
    currentAiSuggestionError.textContent = '';
    currentAiSuggestionError.classList.add('hidden');
    currentAiLoadingIndicator.classList.remove('hidden');
    if (getAiSuggestionBtn) getAiSuggestionBtn.disabled = true; 

    const user = firebase.auth().currentUser;
    if (!user) {
        // Using showErrorMessage and console.error for different audiences
        console.error('[AI Suggestion] User not authenticated.');
        showErrorMessage('You must be logged in to get AI suggestions.');
        currentAiLoadingIndicator.classList.add('hidden'); 
        if (getAiSuggestionBtn) getAiSuggestionBtn.disabled = false; 
        return;
    }
    const housekeeperId = user.uid;

    const requestId = currentAiSuggestionSection.dataset.requestId;
    const homeownerId = currentAiSuggestionSection.dataset.homeownerId;
    
    if (!currentOpenRequestDataForAI || currentOpenRequestDataForAI.id !== requestId) {
        console.error('[AI Suggestion] Critical: Could not find matching request data for the AI modal. RequestID from dataset:', requestId, 'currentOpenRequestDataForAI ID:', currentOpenRequestDataForAI ? currentOpenRequestDataForAI.id : 'undefined');
        currentAiSuggestionError.textContent = 'Error: Could not retrieve full request details for AI suggestion.';
        currentAiSuggestionError.classList.remove('hidden');
        if (currentAiLoadingIndicator) currentAiLoadingIndicator.classList.add('hidden');
        if (getAiSuggestionBtn) getAiSuggestionBtn.disabled = false;
        return;
    }

    const originalRequestServices = currentOpenRequestDataForAI.services || { baseServices: currentOpenRequestDataForAI.baseServices || [], addonServices: currentOpenRequestDataForAI.addonServices || [] };

    if (!requestId || !homeownerId) {
        currentAiSuggestionError.textContent = 'Error: Missing request ID or homeowner ID for AI suggestion.';
        currentAiSuggestionError.classList.remove('hidden');
        console.error('[AI Suggestion] Missing requestId or homeownerId from dataset. RequestID:', requestId, "HomeownerID:", homeownerId); // Log actual values
        if (currentAiLoadingIndicator) currentAiLoadingIndicator.classList.add('hidden');
        if (getAiSuggestionBtn) getAiSuggestionBtn.disabled = false;
        return;
    }

    try {
        const housekeeperUserProfile = await firestoreService.getUserProfile(housekeeperId);
        const targetHourlyRate = housekeeperUserProfile?.aiPreferences?.targetHourlyRate;

        if (typeof targetHourlyRate !== 'number') {
            throw new Error("Target hourly rate is not set or invalid. Please set it in your profile settings."); // More specific error
        }

        let homeownerProfileDetails = null;
        if (homeownerId !== 'manual_booking_client') {
             homeownerProfileDetails = await firestoreService.getHomeownerProfile(homeownerId);
        } else {
            console.warn("[AI Suggestion] Cannot fetch homeowner property details for a manually booked client without a profile (homeownerId was 'manual_booking_client').");
        }

        let servicesForAIPayload = {
            baseServices: [],
            addonServices: []
        };

        const processServices = async (serviceList, serviceType) => {
            if (!serviceList || !Array.isArray(serviceList)) return [];
            
            const processedServices = [];
            for (const service of serviceList) {
                if (!service.id) {
                    console.warn(`[AI Suggestion] Service missing ID, cannot fetch details:`, service);
                    processedServices.push(service); 
                    continue;
                }
                try {
                    const serviceDetails = await firestoreService.getServiceDetails(housekeeperId, service.id);
                    processedServices.push({
                        ...service, 
                        includedTasks: serviceDetails ? serviceDetails.includedTasks || [] : [] 
                    });
                } catch (err) {
                    console.error(`[AI Suggestion] Error fetching details for ${serviceType} service ${service.id}:`, err);
                    processedServices.push(service); 
                }
            }
            return processedServices;
        };

        servicesForAIPayload.baseServices = await processServices(originalRequestServices.baseServices, 'base');
        servicesForAIPayload.addonServices = await processServices(originalRequestServices.addonServices, 'addon');

        const functionPayload = {
            housekeeperId: housekeeperId,
            homeownerId: homeownerId,
            requestId: requestId,
            services: servicesForAIPayload, 
            propertyDetails: homeownerProfileDetails ? { 
                squareFootage: homeownerProfileDetails.squareFootage,
                numBedrooms: homeownerProfileDetails.numBedrooms,
                numBathrooms: homeownerProfileDetails.numBathrooms,
                homeType: homeownerProfileDetails.homeType,
                zipCode: homeownerProfileDetails.zipCode 
            } : null,
            housekeeperPreferences: {
                targetHourlyRate: targetHourlyRate
            }
        };

        console.log("[AI Suggestion] Calling Cloud Function 'getAIPriceAndTimeSuggestion' with payload:", functionPayload);

        const getAIPriceAndTimeSuggestion = firebase.functions().httpsCallable('getAIPriceAndTimeSuggestion');
        const result = await getAIPriceAndTimeSuggestion(functionPayload);

        console.log("[AI Suggestion] Cloud Function result:", result);

        if (result.data && result.data.success) {
            const { estimatedWorkHours, suggestedPrice, explanation } = result.data.suggestion;
            let suggestionHtml = `<p class="text-sm text-gray-700"><strong>Suggested Price:</strong> <span class="text-lg font-semibold text-primary">$${suggestedPrice.toFixed(2)}</span></p>`;
            suggestionHtml += `<p class="text-sm text-gray-700 mt-1"><strong>Estimated Work Hours:</strong> ${estimatedWorkHours.toFixed(1)} hours</p>`;
            if (explanation) {
                suggestionHtml += `<div class="mt-2 p-2 bg-indigo-50 border border-indigo-200 rounded-md text-xs text-indigo-700"><p class="font-semibold mb-1">Rationale:</p><p>${explanation.replace(/\n/g, '<br>')}</p></div>`;
            }
            currentAiSuggestionDisplay.innerHTML = suggestionHtml;
            // Update the housekeeper's quoted price input
            if (housekeeperQuotedPriceInput) {
                housekeeperQuotedPriceInput.value = suggestedPrice.toFixed(2);
            }

        } else {
            const errorMessage = result.data && result.data.error ? result.data.error : 'Unknown error from AI suggestion service.';
            throw new Error(errorMessage); // Throw the specific error message
        }

    } catch (error) {
        console.error('[AI Suggestion] Error:', error);
        // Display a more user-friendly message, error.message might be too technical or generic
        const displayError = error.message.includes("Target hourly rate") ? error.message : 'Failed to get AI suggestion. Please try again or check settings.';
        currentAiSuggestionError.textContent = `Error: ${displayError}`;
        currentAiSuggestionError.classList.remove('hidden');
        currentAiSuggestionDisplay.innerHTML = ''; // Clear any partial display
    } finally {
        if (currentAiLoadingIndicator) currentAiLoadingIndicator.classList.add('hidden');
        if (getAiSuggestionBtn) getAiSuggestionBtn.disabled = false;
    }
}
    // ... existing code ...

// --- NEW: Helper function to display property details in the AI section of the modal ---
async function displayPropertyDetailsInModal(homeownerId) {
    // This function's target element ('ai-property-details-summary') was removed from HTML.
    // The function is still called from openRequestReviewModal if homeownerId exists.
    // To prevent errors and confusion, we can comment out its body or make it a no-op.
    // For now, let's log that it's called and that its target is missing if that's the case.

    const detailsSummaryElement = document.getElementById('ai-property-details-summary'); 
    if (!detailsSummaryElement) {
        console.warn('[Display Property Details In Modal] Called, but target element #ai-property-details-summary is no longer in the HTML. This function will do nothing.');
        return;
    }
    
    // Original logic below, which would now operate on a non-existent element:
    // if (!homeownerId || homeownerId === 'manual_booking_client') {
    //     detailsSummaryElement.innerHTML = '<p class="italic text-gray-500">Property details not available (manual booking or no profile).</p>';
    //     return;
    // }
    // detailsSummaryElement.innerHTML = '<p class="italic">Loading property details...</p>';
    // try {
    //     const profile = await firestoreService.getHomeownerProfile(homeownerId);
    //     if (profile) {
    //         let detailsHtml = '<ul class="list-disc list-inside">';
    //         detailsHtml += `<li><strong>Type:</strong> ${escapeHtml(profile.homeType || 'N/A')}</li>`;
    //         detailsHtml += `<li><strong>Sq Ft:</strong> ${escapeHtml(profile.squareFootage || 'N/A')}</li>`;
    //         detailsHtml += `<li><strong>Beds:</strong> ${escapeHtml(profile.numBedrooms || 'N/A')}</li>`;
    //         detailsHtml += `<li><strong>Baths:</strong> ${escapeHtml(profile.numBathrooms || 'N/A')}</li>`;
    //         detailsHtml += '</ul>';
    //         detailsSummaryElement.innerHTML = detailsHtml;
    //     } else {
    //         detailsSummaryElement.innerHTML = '<p class="italic text-gray-500">Homeowner property details not found.</p>';
    //     }
    // } catch (error) {
    //     console.error('[Property Details Modal] Error fetching homeowner profile for modal display:', error);
    //     detailsSummaryElement.innerHTML = '<p class="italic text-red-500">Error loading property details.</p>';
    // }
}
// --- END NEW Helper function ---

// [Existing code at the end of the file, possibly including a DOMContentLoaded or onAuthStateChanged]
// If a DOMContentLoaded listener already exists, the following should be integrated.
// If not, this will establish it.

document.addEventListener('DOMContentLoaded', () => {
    console.log('[Schedule Page] DOMContentLoaded event fired.');

    loadingOverlayElement = document.getElementById('loading-overlay'); // <<< NEW: Assign global reference
    if (!loadingOverlayElement) {
        console.error('[Schedule Page] CRITICAL: #loading-overlay element not found on DOMContentLoaded!');
    }

    // Initialize currentWeekStart (if not already done elsewhere in an existing listener)
    if (typeof currentWeekStart === 'undefined' || currentWeekStart === null) {
        currentWeekStart = dateUtils.getStartOfWeek(new Date());
        console.log('[Schedule Page] Initial currentWeekStart set by new/merged listener:', currentWeekStart);
    }

    // Initialize Flatpickr (if not already done)
    if (typeof flatpickr !== 'undefined' && alternativeDateInput && !alternativeDateInput.classList.contains('flatpickr-input')) {
        flatpickr(alternativeDateInput, {
            altInput: true,
            altFormat: "F j, Y",
            dateFormat: "Y-m-d",
            minDate: "today"
        });
        console.log('[Flatpickr] Initialized for #alternative-date by new/merged listener.');
    }

    // AI Suggestion Button Listener (if not already done)
    if (getAiSuggestionBtn && !getAiSuggestionBtn.hasAttribute('data-listener-set')) {
        getAiSuggestionBtn.addEventListener('click', handleGetAiSuggestionClick);
        getAiSuggestionBtn.setAttribute('data-listener-set', 'true'); // Mark as set
        console.log('[DOMContentLoaded] Event listener added for getAiSuggestionBtn by new/merged listener.');
    }

    // --- Event listener for the manual load schedule button --- (REMOVING THIS BLOCK)
    // const manualLoadBtn = document.getElementById('manualLoadScheduleBtn');
    // if (manualLoadBtn) {
    //     manualLoadBtn.addEventListener('click', () => {
    //         console.log('[Manual Load Button] Clicked. Calling loadUserSchedule(true).');
    //         if (typeof loadUserSchedule === 'function') {
    //             loadUserSchedule(true);
    //         } else {
    //             console.error('[Manual Load Button] loadUserSchedule function is not defined!');
    //             alert('Error: loadUserSchedule function not found.');
    //         }
    //     });
    //     console.log('[DOMContentLoaded] Event listener added for manualLoadScheduleBtn.');
    // } else {
    //     console.warn('[DOMContentLoaded] manualLoadScheduleBtn not found.');
    // }
    // --- END Manual Load Button Listener ---

    // Main auth state listener
    // Ensure this doesn't duplicate an existing one, or that they are merged carefully.
    // For safety, this is a common pattern.
    if (!window.authStateListenerSet) { // Prevent multiple main auth listeners
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                console.log('[Auth State Change] User is signed in:', user.uid);
                userProfile = user; 
                
                if (window.location.pathname.includes('/housekeeper/schedule')) {
                    console.log('[Auth State Change] On housekeeper schedule page. Attempting to load schedule.');
                    showLoading('Initializing schedule...');
                    if (typeof loadUserSchedule === 'function') {
                        await loadUserSchedule(false); 
                    } else {
                        console.error('[Auth State Change] loadUserSchedule function is not defined!');
                        alert('Error: loadUserSchedule function not found during auth change.');
                    }
                    // Fetch pending requests (this seems to work, keep it)
                    if (typeof fetchPendingRequests === 'function' && typeof displayPendingRequests === 'function' && typeof updatePendingRequestCountBadge === 'function') {
                        await fetchPendingRequests().then(requests => {
                            displayPendingRequests(requests);
                            updatePendingRequestCountBadge();
                        });
                    }
                    hideLoading();
                    console.log('[Auth State Change] Initial data load sequence potentially completed.');
                } else {
                    console.log('[Auth State Change] User signed in, but not on housekeeper schedule page. Path:', window.location.pathname);
                }
            } else {
                console.log('[Auth State Change] User is signed out.');
                userProfile = null;
                // Auth-router.js should handle redirects.
            }
        });
        window.authStateListenerSet = true;
        console.log('[Auth State Change] Main listener has been set up.');
    }


    // Navigation and other listeners (ensure not duplicated if merging with existing DOMContentLoaded)
    const prevWeekBtn = document.getElementById('prev-week');
    const nextWeekBtn = document.getElementById('next-week');
    const todayBtn = document.getElementById('today-btn');

    if (prevWeekBtn && !prevWeekBtn.hasAttribute('data-listener-set')) {
        prevWeekBtn.addEventListener('click', () => {
            currentWeekStart = dateUtils.subtractDays(currentWeekStart, 7);
            if(typeof updateWeekDisplay === 'function') updateWeekDisplay();
            if(typeof loadUserSchedule === 'function') loadUserSchedule();
        });
        prevWeekBtn.setAttribute('data-listener-set', 'true');
    }
    // ... (Repeat for nextWeekBtn and todayBtn if they might also be duplicated) ...

    if (nextWeekBtn && !nextWeekBtn.hasAttribute('data-listener-set')) {
        nextWeekBtn.addEventListener('click', () => {
            currentWeekStart = dateUtils.addDays(currentWeekStart, 7);
            if(typeof updateWeekDisplay === 'function') updateWeekDisplay();
            if(typeof loadUserSchedule === 'function') loadUserSchedule();
        });
        nextWeekBtn.setAttribute('data-listener-set', 'true');
    }

    if (todayBtn && !todayBtn.hasAttribute('data-listener-set')) {
        todayBtn.addEventListener('click', () => {
            currentWeekStart = dateUtils.getStartOfWeek(new Date());
            if(typeof updateWeekDisplay === 'function') updateWeekDisplay();
            if(typeof loadUserSchedule === 'function') loadUserSchedule();
        });
        todayBtn.setAttribute('data-listener-set', 'true');
    }


    if (viewIncomingRequestsBtn && !viewIncomingRequestsBtn.hasAttribute('data-listener-set')) {
        viewIncomingRequestsBtn.addEventListener('click', () => {
            // Existing toggle logic ...
            console.log('View Incoming Requests button clicked (merged listener). Toggling visibility.');
            if (incomingRequestsContainer && mainScheduleContainer) {
                const isHidden = incomingRequestsContainer.classList.contains('hidden');
                if (isHidden) {
                    mainScheduleContainer.classList.add('hidden');
                    incomingRequestsContainer.classList.remove('hidden');
                    if (incomingRequestsTextLabel) incomingRequestsTextLabel.textContent = 'View Schedule';
                    if (incomingRequestsIcon) incomingRequestsIcon.className = 'fas fa-calendar-alt mr-2';
                    fetchPendingRequests().then(requests => {
                        displayPendingRequests(requests);
                        updatePendingRequestCountBadge();
                    });
                } else {
                    incomingRequestsContainer.classList.add('hidden');
                    mainScheduleContainer.classList.remove('hidden');
                    if (incomingRequestsTextLabel) incomingRequestsTextLabel.textContent = 'Incoming Requests';
                    if (incomingRequestsIcon) incomingRequestsIcon.className = 'fas fa-bell mr-2';
                }
            }
        });
        viewIncomingRequestsBtn.setAttribute('data-listener-set', 'true');
    }

    if(typeof updateWeekDisplay === 'function') updateWeekDisplay();
    if(typeof updateNavigationState === 'function') updateNavigationState();
    if(typeof updatePendingRequestCountBadge === 'function') updatePendingRequestCountBadge();
    
    console.log('[Schedule Page] DOMContentLoaded - All initial setup by new/merged listener potentially completed.');
});

// This console log helps confirm the script itself is parsed.
console.log("Housekeeper schedule script loaded (final log).");
