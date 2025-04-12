import * as dateUtils from '/common/js/date-utils.js'; // Ensure this is at the top

// Initialize the current week start date
let currentWeekStart; // Will be set after DOMContentLoaded
let housekeeperTimezone = 'UTC'; // << ADDED: Store timezone globally

// Global booking data
let currentBookingData = {
    dateTime: null,
    duration: null, // Store duration too
    client: null,
    baseService: null, // NEW: Store selected base service {id, name, price}
    addonServices: [] // NEW: Store selected add-on services [{id, name, price}]
};

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

// Flag to track if booking handlers are set up - DECLARED ONCE HERE
let bookingHandlersInitialized = false;

// Global loading indicator functions
function showLoading(message = 'Loading...') {
    const loadingOverlay = document.getElementById('loading-overlay'); // Re-query each time
    if (loadingOverlay) {
        // Optional: Update message if needed, though the current one is just an icon
        loadingOverlay.classList.remove('hidden');
    } else {
        // Reduced severity, as it might be called early
        console.warn('#loading-overlay element not found, might be called before DOM ready.');
    }
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loading-overlay'); // Re-query each time
    if (loadingOverlay) {
        loadingOverlay.classList.add('hidden');
    } else {
        // Reduced severity
        console.warn('#loading-overlay element not found, might be called before DOM ready.');
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

        // --- ADDED: Store Timezone ---
        housekeeperTimezone = settings.timezone || dateUtils.getLocalTimezone(); // Use fetched or local
        console.log(`Housekeeper timezone set to: ${housekeeperTimezone}`);
        // --- END ADDED ---

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
    console.log(`Fetching schedule for week starting: ${startDate.toISOString()}`);
    
    // --- ADDED: Slight delay for showLoading ---
    setTimeout(() => showLoading(), 0); // Delay slightly to ensure DOM is ready
    // --- END ADDED ---
    
    const scheduleContainer = document.getElementById('schedule-container');
    if (!scheduleContainer) {
        console.error("Schedule container element not found!");
        hideLoading(); // Still try to hide if showLoading failed
        return;
    }
    scheduleContainer.innerHTML = ''; // Clear previous schedule

    const functions = firebase.functions(); // Ensure Functions SDK is initialized
    const getAvailableSlots = functions.httpsCallable('getAvailableSlots');
    const endDate = dateUtils.addDays(startDate, 6);

    try {
        const result = await getAvailableSlots({
            housekeeperId: housekeeperId,
            startDateString: startDate.toISOString(),
            endDateString: endDate.toISOString(),
        });

        console.log('Cloud Function schedule result:', result.data);

        if (result.data && result.data.schedule) {
            renderScheduleFromData(result.data.schedule, startDate);
        } else {
            console.error('Invalid schedule data received from function:', result.data);
            scheduleContainer.innerHTML = '<p class="text-center text-red-500">Error loading schedule data.</p>';
        }

    } catch (error) {
        console.error('Error calling getAvailableSlots function:', error);
        scheduleContainer.innerHTML = `<p class="text-center text-red-500">Error calling schedule service: ${error.message}</p>`;
    } finally {
        hideLoading();
        updateWeekDisplay(); // Ensure week display is correct
        updateNavigationState(); // Update prev/next buttons
    }
}

// NEW: Renders the schedule grid from the data fetched by the Cloud Function
function renderScheduleFromData(scheduleData, weekStartDate) {
    const scheduleContainer = document.getElementById('schedule-container');
    if (!scheduleContainer) return; // Already checked, but safe

    // --- UPDATED: ADD Grid Classes, don't overwrite existing (like p-4) ---
    scheduleContainer.classList.add('grid', 'grid-cols-1', 'md:grid-cols-3', 'lg:grid-cols-7', 'gap-4');
    // Ensure any previous styles not related to grid/padding are cleared if needed, but preserve p-4 from HTML
    scheduleContainer.innerHTML = ''; // Clear previous schedule content
    // --- END UPDATED ---

    // Get today's date for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekDates = dateUtils.getWeekDates(weekStartDate);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Create the grid structure - REMOVED grid classes from here
    // scheduleContainer.className = 'grid grid-cols-1 md:grid-cols-7 gap-4'; 
    // space-y-4 is now handled in the HTML container

    weekDates.forEach((date, dayIndex) => {
        const dateString = dateUtils.formatDate(date, 'YYYY-MM-DD');
        const dayData = scheduleData[dateString];
        const currentDateOnly = new Date(date); 
        currentDateOnly.setHours(0, 0, 0, 0);
        const isPastDay = currentDateOnly.getTime() < today.getTime();

        // Create Day Column Div (now acts as Day Card)
        const dayColumn = document.createElement('div');
        // Ensure flex column for proper stacking within the card
        // REVERTED: REMOVE p-4 from individual card, rely on container padding
        dayColumn.className = 'bg-white rounded-lg shadow flex flex-col min-h-[150px]'; // Base style for card NO PADDING

        if (isPastDay) {
            // Hide past day columns completely
            dayColumn.classList.add('hidden');
        } else {
            // Only add padding and content for non-past days
            // Removed p-4 here, will add to header and slots container
            // dayColumn.classList.add('p-4');
            
            // Add Header
            const dayHeader = document.createElement('h3');
            dayHeader.textContent = `${dayNames[date.getUTCDay()]} ${dateUtils.formatDate(date, 'short-numeric')}`;
            // Add padding to header, consistent font size
            // ADDED BACK internal padding for header
            dayHeader.className = 'text-lg font-semibold mb-4 text-gray-800 flex-shrink-0 px-4 pt-4'; // Added padding back
            dayColumn.appendChild(dayHeader);

            // Slots Container - Add padding
            const slotsContainer = document.createElement('div');
            // Use space-y-3 like homeowner?
            // ADDED BACK internal padding for slots
            slotsContainer.className = 'flex-grow space-y-3 px-4 pb-4'; // Added padding back

            // Populate based on status and slots
            if (dayData && dayData.slots && dayData.slots.length > 0) {
                dayData.slots.forEach(slot => {
                    const slotElement = createSlotElement(slot, dateString);
                    slotsContainer.appendChild(slotElement);
                });
            } else {
                // Display "Not scheduled to work" if no slots and day is active
                const noWorkText = document.createElement('p');
                noWorkText.textContent = 'Not scheduled to work';
                // Apply styling similar to homeowner view
                noWorkText.className = 'text-center text-gray-500 text-sm mt-4'; // Centered, muted, small margin-top
                slotsContainer.appendChild(noWorkText);
            }

            dayColumn.appendChild(slotsContainer);
        }

        // Always append the column to maintain grid structure
        scheduleContainer.appendChild(dayColumn);
    });
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
            div.classList.add('bg-gray-200', 'flex', 'items-center', 'justify-between');
            // Info Div (Left)
            const confirmedInfoDiv = document.createElement('div');
            confirmedInfoDiv.innerHTML = `
                <p class="font-semibold text-gray-800">${timeDisplay} <span class="text-sm font-normal text-gray-600">${durationDisplay}</span></p>
                <p class="text-base font-semibold ${slotData.status === 'confirmed' ? 'text-green-700' : 'text-gray-700'}">${slotData.status === 'confirmed' ? 'Confirmed' : 'Booked'}</p>
                <p class="text-sm text-gray-600 mt-1">Client: ${slotData.clientName || '...'}</p>
            `;
            div.appendChild(confirmedInfoDiv);
            // Cancel Button Div (Right)
            const cancelButton = document.createElement('button');
            cancelButton.textContent = 'Cancel';
            // Simplified button style
            cancelButton.className = 'ml-4 px-4 py-2 bg-red-500 text-white text-sm font-medium rounded hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-400';
            cancelButton.dataset.bookingId = slotData.bookingId;
            cancelButton.dataset.action = 'request_cancel';
            div.appendChild(cancelButton);
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
async function openBookingModal(dateTimeString, durationMinutes) {
    console.log('[Modal] Opening booking modal for:', dateTimeString);
    currentBookingData = { dateTime: dateTimeString, duration: durationMinutes, client: null, baseService: null, addonServices: [] }; // Reset/set initial data

    // Display date/time info
    try {
        const dateObject = new Date(dateTimeString);
        // --- FIX: Use valid formatDate and formatTime arguments --- 
        const displayDate = dateUtils.formatDate(dateObject, 'full-date', housekeeperTimezone); // e.g., "Monday, April 14, 2025"
        const displayTime = dateUtils.formatTime(dateObject, housekeeperTimezone, 'h:mm A'); // e.g., "8:00 AM"
        // --- END FIX ---
        const displayDuration = formatDuration(durationMinutes);
        bookingDateTimeElement.innerHTML = `<p class="font-medium">${displayDate} at ${displayTime}</p><p class="text-sm text-gray-600">Duration: ${displayDuration}</p>`;
    } catch(e) {
        console.error("[Modal] Error formatting date/time for display:", e);
        bookingDateTimeElement.innerHTML = `<p class="font-medium text-red-600">Error displaying time</p>`;
    }

    // Reset steps visibility
    showBookingStep('clientSelection'); // Start with client selection

    // Load clients
    await loadClientsForSelection();
    
    // Load Services
    await loadAndDisplayServicesForBooking();

    // Show the modal AFTER content is likely loaded/loading
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
        console.log('[Modal] Review Booking button clicked');
        
        // Gather selected services
        const selectedBaseRadio = baseServiceOptionsContainer.querySelector('input[name="baseService"]:checked');
        const selectedAddonCheckboxes = addonServiceOptionsContainer.querySelectorAll('input[name="addonServices"]:checked');

        if (!selectedBaseRadio) {
            // Show error inline near base services
             baseServiceErrorMsg.textContent = 'Please select a base service.';
             baseServiceErrorMsg.classList.remove('hidden');
             baseServiceOptionsContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return; // Stop processing
        } else {
             baseServiceErrorMsg.classList.add('hidden'); // Clear error if present
        }

        currentBookingData.baseService = {
            id: selectedBaseRadio.value,
            name: selectedBaseRadio.dataset.serviceName,
            price: parseFloat(selectedBaseRadio.dataset.servicePrice)
        };

        currentBookingData.addonServices = [];
        selectedAddonCheckboxes.forEach(checkbox => {
            currentBookingData.addonServices.push({
                id: checkbox.value,
                name: checkbox.dataset.serviceName,
                price: parseFloat(checkbox.dataset.servicePrice)
            });
        });

        console.log('[Modal] Services selected:', {
             base: currentBookingData.baseService,
             addons: currentBookingData.addonServices
        });

        // Populate confirmation details
        populateConfirmationDetails();

        // Move to confirmation step
        showBookingStep('confirmationStep');
    });
    // --- END Review Booking Button Listener ---

    // Confirmation Button Listener
    confirmBookingBtn.addEventListener('click', async () => {
        console.log('[Modal] Confirm Booking button clicked with data:', currentBookingData);
        
        // --- Validate required data ---
        if (!currentBookingData.client || !currentBookingData.baseService || !currentBookingData.dateTime || !currentBookingData.duration) {
            console.error('[Modal] Missing required data for booking confirmation.');
            // TODO: Show error in modal confirmation step?
            alert('Missing required information (Client, Base Service, or Time). Please go back and select.');
            return;
        }
        
        const user = firebase.auth().currentUser;
        if (!user) {
            console.error('[Modal] User not authenticated.');
            alert('Authentication error. Please log in again.');
            return;
        }

        // --- Set loading state --- 
        confirmBookingBtn.disabled = true;
        confirmBookingBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Confirming...';
        // TODO: Clear any previous confirmation errors

        try {
            // --- Prepare Timestamps --- 
            const startDateTime = new Date(currentBookingData.dateTime);
            const endDateTime = new Date(startDateTime.getTime() + currentBookingData.duration * 60000); // duration is in minutes
            
            const startTimestamp = firebase.firestore.Timestamp.fromDate(startDateTime);
            const endTimestamp = firebase.firestore.Timestamp.fromDate(endDateTime);
            const startTimestampMillis = startTimestamp.toMillis();
            const endTimestampMillis = endTimestamp.toMillis();

            // --- Construct Booking Object --- 
            const bookingData = {
                housekeeperId: user.uid,
                clientId: currentBookingData.client.id,
                clientName: currentBookingData.client.name, // Store name for easy display
                
                startTimestamp: startTimestamp,
                endTimestamp: endTimestamp,
                startTimestampMillis: startTimestampMillis,
                endTimestampMillis: endTimestampMillis,
                durationMinutes: currentBookingData.duration,
                
                baseServiceId: currentBookingData.baseService.id,
                baseServiceName: currentBookingData.baseService.name,
                baseServicePrice: currentBookingData.baseService.price,
                
                addonServices: currentBookingData.addonServices.map(s => ({ // Store addons as array of objects
                    id: s.id,
                    name: s.name,
                    price: s.price
                })),

                // Calculate total price (simple sum for now)
                // TODO: Refine price calculation if needed (e.g., discounts, taxes)
                totalPrice: currentBookingData.baseService.price + currentBookingData.addonServices.reduce((sum, addon) => sum + addon.price, 0),

                status: 'confirmed', // Default status for housekeeper booking
                frequency: 'one-time', // Explicitly set as one-time
                notes: '', // Add a notes field later if needed
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            console.log('[Modal] Saving booking data:', bookingData);

            // --- Save to Firestore --- 
            const bookingsPath = `users/${user.uid}/bookings`;
            const bookingsCollection = firebase.firestore().collection(bookingsPath);
            await bookingsCollection.add(bookingData);

            console.log('[Modal] Booking saved successfully!');
            // TODO: Add success toast notification?

            closeBookingModal();
            // Refresh schedule view to show the new booking
            await fetchAndRenderSchedule(currentWeekStart, user.uid); 

        } catch (error) {
            console.error('[Modal] Error saving booking:', error);
            // TODO: Show error in modal confirmation step?
            alert(`Failed to save booking: ${error.message || 'Please try again.'}`);
        } finally {
            // --- Reset loading state --- 
            confirmBookingBtn.disabled = false;
            confirmBookingBtn.textContent = 'Confirm Booking';
        }
    });

    console.log('[Modal] Booking modal event listeners initialized.');
}

// Function to close the booking modal
function closeBookingModal() {
    bookingModalBackdrop.classList.add('hidden');
    bookingModal.classList.add('translate-y-full');
    // Reset full state including services
    currentBookingData = { dateTime: null, duration: null, client: null, baseService: null, addonServices: [] }; 
    console.log('[Modal] Booking modal closed.');
}

// Function to show a specific step in the booking process
function showBookingStep(stepId) {
    // Hide all steps first
    // REMOVED: frequencySelectionStep from array
    [clientSelectionStep, baseServiceSelectionStep, addonServiceSelectionStep, reviewBookingButtonContainer, confirmationStep].forEach(step => {
        if (step) step.classList.add('hidden');
    });

    // Show the target step
    const targetStep = document.getElementById(stepId);
    if (targetStep) {
        targetStep.classList.remove('hidden');
        console.log(`[Modal] Showing step: ${stepId}`);
        
        // Show Add-on step and Review button when Base step is shown
        if (stepId === 'baseServiceSelection') {
            // Ensure elements exist before modifying classList
            if (addonServiceSelectionStep) addonServiceSelectionStep.classList.remove('hidden');
            if (reviewBookingButtonContainer) reviewBookingButtonContainer.classList.remove('hidden'); // Show Review button
            console.log(`[Modal] Also showing steps: addonServiceSelection, reviewBookingButtonContainer`);
        } // No 'else' needed here, warning logic removed as it was possibly problematic
        
    } else {
        console.error(`[Modal] Step not found: ${stepId}`);
    }
    
    // Scroll content area to top when changing steps
    if (bookingContent) bookingContent.scrollTop = 0;
}

// Function to load clients for the selection step
async function loadClientsForSelection() {
    console.log("[Modal] Loading clients...");
    if (!existingClientsContainer || !clientLoadingErrorMsg) {
        console.error("[Modal] Client container or error message element not found.");
        return;
    }

    existingClientsContainer.innerHTML = '<p class="text-gray-600 mb-2">Loading clients...</p>';
    clientLoadingErrorMsg.classList.add('hidden');

    try {
        const user = firebase.auth().currentUser;
        if (!user) {
             throw new Error("User not authenticated."); // Throw error to be caught below
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
        console.error("Error loading clients:", error);
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
    console.log('[Modal Debug] Entering openCancelConfirmModal'); // Log entry
    if (!bookingId) {
        console.error("Cannot open cancel confirmation: Booking ID is missing.");
        return;
    }
    
    // --- Debug: Log Element References ---
    console.log('[Modal Debug] cancelConfirmModal reference:', cancelConfirmModal);
    console.log('[Modal Debug] cancelConfirmBackdrop reference:', cancelConfirmBackdrop);
    // --- End Debug ---

    if (!cancelConfirmModal || !cancelConfirmBackdrop) {
        console.error('[Modal Debug] Cannot open cancel modal - element reference is null!');
        alert('Error: Cannot display cancellation confirmation.');
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
    console.log('[Modal Debug] cancelConfirmModal reference:', cancelConfirmModal);
    console.log('[Modal Debug] cancelConfirmBackdrop reference:', cancelConfirmBackdrop);
    // --- End Debug ---
    
    if (!cancelConfirmModal || !cancelConfirmBackdrop) {
         console.error('[Modal Debug] Cannot close cancel modal - element reference is null!');
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

// --- Initialization and Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    currentWeekStart = dateUtils.getStartOfWeek(new Date()); // Initialize to current week's Monday

    // Initial load & Auth Listener
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            console.log('Auth state changed, user logged in. Loading schedule...');
            loadUserSchedule(); 
    if (!bookingHandlersInitialized) {
                 setupBookingModalListeners(); 
        bookingHandlersInitialized = true;
    }
        } else {
            console.log('No user logged in, redirecting...');
            window.location.href = '../../login.html';
        }
    });

    // Navigation Listeners
    document.getElementById('prev-week')?.addEventListener('click', () => {
        if(firebase.auth().currentUser) {
             currentWeekStart = dateUtils.addDays(currentWeekStart, -7);
             fetchAndRenderSchedule(currentWeekStart, firebase.auth().currentUser.uid);
        }
    });
    document.getElementById('next-week')?.addEventListener('click', () => {
        if(firebase.auth().currentUser) {
             currentWeekStart = dateUtils.addDays(currentWeekStart, 7);
             fetchAndRenderSchedule(currentWeekStart, firebase.auth().currentUser.uid);
        }
    });
    document.getElementById('today-btn')?.addEventListener('click', () => {
        if(firebase.auth().currentUser) {
             currentWeekStart = dateUtils.getStartOfWeek(new Date());
             fetchAndRenderSchedule(currentWeekStart, firebase.auth().currentUser.uid);
        }
    });

    // --- ADD: Event Listeners for Cancel Confirmation Modal ---
    confirmCancelBookingBtn.addEventListener('click', executeBookingCancellation);
    keepBookingBtn.addEventListener('click', closeCancelConfirmModal);
    closeCancelModalBtnX.addEventListener('click', closeCancelConfirmModal);
    cancelConfirmBackdrop.addEventListener('click', closeCancelConfirmModal);
    // --- END ADD ---

    // Event Delegation for Schedule Actions (including cancel)
    const scheduleContainer = document.getElementById('schedule-container');
    if (scheduleContainer) {
        scheduleContainer.addEventListener('click', (event) => {
            const pendingButton = event.target.closest('button[data-action="confirm"], button[data-action="reject"]');
            const cancelButton = event.target.closest('button[data-action="request_cancel"]');
            
            if (pendingButton) {
                handlePendingAction(event); // Call existing handler
            } else if (cancelButton) {
                handleCancelRequestClick(event); // Updated handler now opens modal
            }
        });
    } else {
        console.error('Schedule container not found for action delegation.');
    }

    // Handle logout if a logout button exists on this page
    // Ensure the button has id="logout-button"
    const logoutButton = document.getElementById('logout-button');
    logoutButton?.addEventListener('click', () => {
        firebase.auth().signOut()
            .then(() => {
                console.log('User signed out successfully');
                window.location.href = '/'; // Redirect to root (login page)
            })
            .catch((error) => {
                console.error('Sign out error:', error);
                alert('Error signing out.');
            });
    });
});

// Export functions if needed by other modules (or rely on global scope for now)
// export { openBookingModal, closeBookingModal };
