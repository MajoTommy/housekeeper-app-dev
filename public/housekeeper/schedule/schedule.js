import * as dateUtils from '/common/js/date-utils.js'; // Ensure this is at the top

// Initialize the current week start date
let currentWeekStart; // Will be set after DOMContentLoaded

// Global booking data
let currentBookingData = {
    dateTime: null,
    client: null,
    frequency: null
};

// Flag to track if booking handlers are set up - DECLARED ONCE HERE
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
    showLoading(); // Show loading indicator
    
    const scheduleContainer = document.getElementById('schedule-container');
    if (!scheduleContainer) {
        console.error("Schedule container element not found!");
        hideLoading();
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

    // Get today's date for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekDates = dateUtils.getWeekDates(weekStartDate);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Create the grid structure - REMOVED grid classes
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
        dayColumn.className = 'bg-white rounded-lg shadow flex flex-col min-h-[150px]'; // Base style for card

        if (isPastDay) {
            // Hide past day columns completely
            dayColumn.classList.add('hidden');
        } else {
            // Only add padding and content for non-past days
            dayColumn.classList.add('p-4');
            
            // Add Header
            const dayHeader = document.createElement('h3');
            dayHeader.textContent = `${dayNames[date.getUTCDay()]} ${dateUtils.formatDate(date, 'short-numeric')}`;
            // Make header larger for card layout
            dayHeader.className = 'text-lg font-semibold mb-4 text-gray-800 flex-shrink-0 px-4 pt-4'; // Increased margin bottom to mb-4
            dayColumn.appendChild(dayHeader);

            // Slots Container - Add padding
            const slotsContainer = document.createElement('div');
            slotsContainer.className = 'flex-grow space-y-2 px-4 pb-4'; // Added padding

            // Populate based on status and slots
            if (dayData && dayData.slots && dayData.slots.length > 0) {
                // Iterate through ALL returned slots for the day
                dayData.slots.forEach(slotData => {
                    const slotElement = createSlotElement(slotData, dateString); // Use a helper
                    slotsContainer.appendChild(slotElement);
        });
    } else {
                // Handle no slots or error for the day
                slotsContainer.innerHTML = `<p class="text-xs text-gray-400 text-center italic">${dayData?.message || 'No slots defined'}</p>`;
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
    // Consistent padding and rounding, reduced padding
    div.className = 'p-2 rounded-lg text-sm'; 

    const startTime = slotData.startTime || 'N/A';
    const endTime = slotData.endTime || 'N/A';
    const durationText = formatDuration(slotData.durationMinutes);
    const timeDisplay = `${startTime} - ${endTime}`;
    const durationDisplay = durationText ? `(${durationText})` : '';

    // --- Style and Content based on Status --- 
    switch (slotData.status) {
        case 'available':
            // Match Homeowner Available Style
            div.classList.add('bg-blue-50', 'border', 'border-blue-200', 'cursor-pointer', 'hover:bg-blue-100', 'flex', 'items-center', 'justify-between');
            // Text Div (Left)
            const availableTextDiv = document.createElement('div');
            availableTextDiv.innerHTML = `
                <p class="font-semibold text-blue-800">${timeDisplay}</p>
                <p class="text-xs text-blue-600">Available ${durationDisplay}</p>
            `;
            div.appendChild(availableTextDiv);
            // Button Div (Right)
            const availableButton = document.createElement('button');
            availableButton.innerHTML = 'Book <i class="fas fa-chevron-right fa-xs ml-1"></i>'; 
            availableButton.className = 'inline-flex items-center px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors'; // Reduced padding
            div.appendChild(availableButton);
            
            // Event Listener (keep existing logic to open HK modal)
            div.addEventListener('click', () => {
                console.log('Available slot clicked:', dateString, slotData);
                let slotDateTimeString = null;
                try {
                    const slotStartTimeStr = `${dateString} ${startTime}`;
                    const slotDateObject = new Date(slotStartTimeStr);
                    if (!isNaN(slotDateObject.getTime())) { slotDateTimeString = slotDateObject.toISOString(); }
                } catch (e) { console.error('Error parsing start time'); }
                
                if (slotDateTimeString) {
                    openBookingModal(slotDateTimeString, slotData.durationMinutes);
            } else {
                    alert('Error preparing booking time.');
                }
            });
            break;
        case 'pending':
            // Keep distinct yellow style, ensure clean layout
            div.classList.add('bg-yellow-100', 'border', 'border-yellow-300');
            div.innerHTML = `
                    <div>
                    <p class="font-medium text-yellow-800">${timeDisplay} <span class="text-xs font-normal">${durationDisplay}</span></p>
                    <p class="text-sm font-semibold text-yellow-900">Pending Confirmation</p>
                    <p class="text-xs text-yellow-700 mt-1">Client: ${slotData.clientName || 'Loading...'}</p>
                    </div>
                <div class="mt-2 flex space-x-2">
                    <button class="flex-1 px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-green-500" data-booking-id="${slotData.bookingId}" data-action="confirm">Confirm</button>
                    <button class="flex-1 px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-500" data-booking-id="${slotData.bookingId}" data-action="reject">Reject</button>
                </div>
            `;
            break;
        case 'booked': 
        case 'confirmed':
            // Match Homeowner Non-Available Style (Gray) + Cancel Btn
            div.classList.add('bg-gray-100', 'flex', 'items-center', 'justify-between');
            // Info Div (Left)
            const confirmedInfoDiv = document.createElement('div');
            confirmedInfoDiv.innerHTML = `
                <p class="font-medium text-gray-700">${timeDisplay} <span class="text-xs font-normal text-gray-500">${durationDisplay}</span></p>
                <p class="text-sm font-semibold ${slotData.status === 'confirmed' ? 'text-green-700' : 'text-gray-600'}">${slotData.status === 'confirmed' ? 'Confirmed' : 'Booked'}</p>
                <p class="text-xs text-gray-500 mt-1">Client: ${slotData.clientName || 'Loading...'}</p>
            `;
            div.appendChild(confirmedInfoDiv);
            // Cancel Button Div (Right)
            const cancelButton = document.createElement('button');
            cancelButton.textContent = 'Cancel';
            // Style like Homeowner cancel button
            cancelButton.className = 'ml-4 px-2 py-1 text-xs font-medium text-red-600 bg-red-100 rounded hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-500';
            cancelButton.dataset.bookingId = slotData.bookingId;
            cancelButton.dataset.action = 'request_cancel';
            div.appendChild(cancelButton);
            break;
        case 'unavailable':
        case 'break':
        default:
            // Match Homeowner Non-Available Style (Gray)
            div.classList.add('bg-gray-100');
            div.innerHTML = `
                <div> <!-- Wrap text for consistent structure -->
                    <p class="text-gray-600">${timeDisplay}</p>
                    <p class="text-xs text-gray-400">${slotData.type === 'break' ? 'Break' : 'Unavailable'}</p>
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

// NEW: Placeholder handler specifically for cancel requests (can consolidate later)
function handleCancelRequestClick(event) {
    const button = event.target.closest('button[data-action="request_cancel"]');
    if (!button) return;
    
    event.stopPropagation();
    const bookingId = button.dataset.bookingId;
    console.log(`Request cancellation for booking ID: ${bookingId}`);
    // TODO: Open cancellation modal
    alert(`Cancellation request for ${bookingId} - Modal to be implemented.`);
}

// --- Booking Modal Logic (Needs review/integration) ---
let selectedDateTime = null;
let selectedDuration = null;

// Function to open the booking modal (ensure it gets the correct datetime format)
function openBookingModal(dateTimeString, durationMinutes) {
    console.log('Opening booking modal for:', dateTimeString, durationMinutes);
    const modal = document.getElementById('bookingModal');
    const content = document.getElementById('bookingContent');
    const dateTimeDisplay = document.getElementById('bookingDateTime');
    
    if (!modal || !content || !dateTimeDisplay) {
        console.error('Booking modal elements not found!');
        return;
    }
    
    selectedDateTime = dateTimeString; // Store the ISO string
    selectedDuration = durationMinutes; // Store duration

    // Format for display
    const displayDate = new Date(dateTimeString);
    // Use valid options for date and time formatting
    const dateOptions = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
    dateTimeDisplay.innerHTML = `
        <p class="font-medium text-lg">${displayDate.toLocaleDateString(undefined, dateOptions)}</p>
        <p class="text-sm">${displayDate.toLocaleTimeString(undefined, timeOptions)} (${formatDuration(durationMinutes)})</p>
    `;
    
    // Reset to client selection step
    showBookingStep('clientSelection'); 
    
    // Load clients
    loadClientsForSelection(); 
    
    // Show modal
        modal.classList.remove('translate-y-full');
    modal.classList.add('translate-y-0');
    // Add backdrop maybe?
}

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

    // NEW: Event Delegation for Pending Actions AND Cancel Requests
    const scheduleContainer = document.getElementById('schedule-container');
    if (scheduleContainer) {
        scheduleContainer.addEventListener('click', (event) => {
            const pendingButton = event.target.closest('button[data-action="confirm"], button[data-action="reject"]');
            const cancelButton = event.target.closest('button[data-action="request_cancel"]');
            
            if (pendingButton) {
                handlePendingAction(event); // Call existing handler
            } else if (cancelButton) {
                handleCancelRequestClick(event); // Call new handler
            }
        });
    } else {
        console.error('Schedule container not found for action delegation.');
    }
});

// Ensure other functions like setupBookingModalListeners, loadClientsForSelection, showBookingStep, etc., are defined correctly elsewhere in the file or imported.
// Placeholder for setupBookingModalListeners - Adapt based on actual modal HTML/JS
function setupBookingModalListeners() {
     console.log("Setting up booking modal listeners...");
     document.getElementById('closeBookingModal')?.addEventListener('click', closeBookingModal);
     // Add listeners for client selection, frequency buttons, final confirm etc.
     // This needs to be carefully re-integrated with the new structure.
}

function closeBookingModal() {
    const modal = document.getElementById('bookingModal');
    if (modal) {
        modal.classList.remove('translate-y-0');
        modal.classList.add('translate-y-full');
    }
}

function showBookingStep(stepId) {
    // Hide all steps
    document.querySelectorAll('.booking-step').forEach(step => step.classList.add('hidden'));
    // Show the target step
    const targetStep = document.getElementById(stepId);
    if (targetStep) {
        targetStep.classList.remove('hidden');
    }
}

async function loadClientsForSelection() {
    // Placeholder - adapt based on actual client loading logic
    const clientContainer = document.getElementById('existingClients');
    if (!clientContainer) return;
    clientContainer.innerHTML = '<p>Loading clients...</p>';
    // const clients = await firestoreService.getClients(firebase.auth().currentUser.uid);
    // Render client buttons...
}
