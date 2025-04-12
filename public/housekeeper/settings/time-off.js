// public/housekeeper/settings/time-off.js

// Import date utility functions
import * as dateUtils from '../../common/js/date-utils.js';

document.addEventListener('DOMContentLoaded', () => {
  console.log('Time-off settings script loaded');

  // --- Firebase Services (Assuming global availability) ---
  const auth = firebase.auth();
  const firestoreService = window.firestoreService;
  // Requires dateUtils - ensure it's loaded in time-off.html
  // Assuming global for now: 
  // const dateUtils = window.dateUtils; // Removed - using import now

  // --- State Variables ---
  let currentYear = new Date().getFullYear();
  let currentMonth = new Date().getMonth(); // 0-indexed
  let timeOffDates = new Set(); // Stores dates as 'YYYY-MM-DD' strings

  // --- UI Element References ---
  const calendarGrid = document.getElementById('calendarGrid');
  const currentMonthDisplay = document.getElementById('currentMonthDisplay');
  const prevMonthBtn = document.getElementById('prevMonthBtn');
  const nextMonthBtn = document.getElementById('nextMonthBtn');
  const calendarError = document.getElementById('calendarError');
  const saveTimeOffButton = document.getElementById('save-timeoff-button'); // Added save button ref
  const savingIndicator = document.getElementById('saving-indicator'); // Added indicator ref

  let initialTimeOffDates = new Set(); // Store initially loaded dates
  let changedDates = new Set(); // Track dates toggled during the session

  // --- Functions (Copied and adapted from settings-old.js) ---

  /**
   * Fetches time off dates for the current user and month.
   */
  async function fetchTimeOffData(year, month) { // month is 0-indexed
    const user = auth.currentUser;
    if (!user) {
        console.error('User not logged in, cannot fetch time off.');
        return; // Or handle appropriately
    }
    
    // Calculate start and end dates for the Firestore query (YYYY-MM-DD format)
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0); // Last day of the month
    
    const startDateString = `${year}-${(month + 1).toString().padStart(2, '0')}-01`;
    const endDateString = `${endDate.getFullYear()}-${(endDate.getMonth() + 1).toString().padStart(2, '0')}-${endDate.getDate().toString().padStart(2, '0')}`;

    console.log(`Fetching time off for ${user.uid} between ${startDateString} and ${endDateString}`);
    
    try {
        const fetchedDates = await firestoreService.getTimeOffDates(user.uid, startDateString, endDateString);
        // Clear previous dates for the viewed month before adding new ones
        // (Important if user navigates back and forth)
        // We need a more robust way to manage the global set if we fetch month-by-month
        // For now, let's just add fetched dates, assuming they are the source of truth for that month
        fetchedDates.forEach(dateStr => timeOffDates.add(dateStr));
        console.log('Fetched time off dates:', fetchedDates);
    } catch (error) {
        console.error('Error fetching time off dates:', error);
        if (calendarError) {
            calendarError.textContent = 'Error loading time off data.';
            calendarError.classList.remove('hidden');
        }
    }
}

  /**
   * Renders the calendar grid for the specified month and year.
   */
  async function renderCalendar(year, month) { // month is 0-indexed
    if (!calendarGrid || !currentMonthDisplay || !dateUtils) {
        console.error('Calendar elements or dateUtils not found!');
        return;
    }
    console.log(`[renderCalendar] Rendering for Year: ${year}, Month: ${month}`);
    calendarGrid.innerHTML = ''; // Clear previous grid
    if(calendarError) calendarError.classList.add('hidden'); // Clear errors

    // Use initialTimeOffDates + changedDates for rendering
    const currentDisplayDates = new Set(initialTimeOffDates);
    changedDates.forEach(dateString => {
        if (currentDisplayDates.has(dateString)) {
            currentDisplayDates.delete(dateString); // If it was initially ON and changed, it's now OFF
        } else {
            currentDisplayDates.add(dateString); // If it was initially OFF and changed, it's now ON
        }
    });

    // Update month display
    const monthName = new Date(year, month).toLocaleString('default', { month: 'long' });
    currentMonthDisplay.textContent = `${monthName} ${year}`;

    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = firstDayOfMonth.getDay(); // 0 = Sunday, ..., 6 = Saturday
    console.log(`[renderCalendar] First day index: ${firstDayIndex}, Days in Month: ${daysInMonth}`);

    // Add empty cells for days before the 1st
    for (let i = 0; i < firstDayIndex; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'p-2 border border-transparent'; // Adjust styling as needed
        calendarGrid.appendChild(emptyCell);
    }

    // Add day cells
    const today = new Date();
    today.setHours(0, 0, 0, 0); // For comparing dates only

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateString = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        // Determine current display state based on initial load + changes
        const isTimeOff = currentDisplayDates.has(dateString); 
        const isPast = date < today;

        const dayCell = document.createElement('div');
        dayCell.textContent = day;
        dayCell.dataset.date = dateString;
        dayCell.className = 'text-center p-2 border rounded cursor-pointer transition-colors duration-150 relative'; // Base styling

        if (isPast) {
            dayCell.classList.add('text-gray-400', 'bg-gray-100', 'cursor-not-allowed', 'border-gray-200');
            // Optional: Add a visual cue for past time-off days if needed
            if (isTimeOff) {
                dayCell.classList.add('line-through'); // Example: strike-through past time-off
            }
        } else {
            // Style for future/current dates
            dayCell.classList.add('border-gray-300');
            if (isTimeOff) {
                dayCell.classList.add('bg-red-500', 'text-white', 'font-semibold', 'border-red-600');
                dayCell.title = 'Tap to remove time off';
            } else {
                dayCell.classList.add('bg-white', 'text-gray-700', 'hover:bg-blue-50');
                dayCell.title = 'Tap to mark as time off';
            }
             // Add click listener only for non-past dates
            dayCell.addEventListener('click', handleDateClick);
        }

        calendarGrid.appendChild(dayCell);
    }
    updateSaveButtonState(); // Update save button after rendering
}

  /**
   * Handles clicking on a date in the calendar.
   */
  function handleDateClick(event) { // NO LONGER async
    const cell = event.target;
    const dateString = cell.dataset.date;
    if (!dateString) return;

    // Determine the state BEFORE this click, considering initial load + previous changes
    let isCurrentlyOff;
    if (changedDates.has(dateString)) { // If it was already changed in this session
        isCurrentlyOff = !initialTimeOffDates.has(dateString); // It's the opposite of initial state
    } else { // Otherwise, it's the initial state
        isCurrentlyOff = initialTimeOffDates.has(dateString);
    }
    
    console.log(`Date clicked: ${dateString}, Displayed as Off: ${isCurrentlyOff}`);

    // Prevent modification of past dates (double check)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Use UTC parsing for comparison to avoid timezone issues with date boundaries
    const clickedDate = new Date(dateString + 'T00:00:00Z'); 
    if (clickedDate < today) {
        console.log('Cannot modify past date.');
        return;
    }

    // Update the changedDates Set: If a date is clicked, it's state relative to initial state has flipped.
    if (changedDates.has(dateString)) {
        changedDates.delete(dateString); // Clicked again, reverts to initial state
    } else {
        changedDates.add(dateString); // Clicked first time, state is different from initial
    }

    // Show visual feedback immediately based on the NEW state after the click
    const isNowOff = !isCurrentlyOff; // The state after the click
    cell.classList.toggle('bg-red-500', isNowOff);
    cell.classList.toggle('text-white', isNowOff);
    cell.classList.toggle('font-semibold', isNowOff);
    cell.classList.toggle('border-red-600', isNowOff);
    cell.classList.toggle('bg-white', !isNowOff);
    cell.classList.toggle('text-gray-700', !isNowOff);
    cell.classList.toggle('hover:bg-blue-50', !isNowOff);
    cell.title = isNowOff ? 'Tap to remove time off' : 'Tap to mark as time off';

    // **REMOVED Firestore save calls**
    updateSaveButtonState(); // Enable/disable save button based on changes
  }

  /**
   * Enables/disables the save button based on whether changes have been made.
   */
  function updateSaveButtonState() {
    if (saveTimeOffButton) {
      saveTimeOffButton.disabled = changedDates.size === 0;
    }
  }

  /**
   * Saves the changes made to time off dates to Firestore.
   */
  async function handleSaveTimeOff() {
    const user = auth.currentUser;
    if (!user) {
      console.error('User not authenticated.');
      alert('Error: Please log in again.');
      return;
    }
    if (changedDates.size === 0) {
        console.log('No time off changes to save.');
        return;
    }

    showSavingIndicator();
    
    const promises = [];
    changedDates.forEach(dateString => {
        // Determine if this date should now be ON or OFF
        const originallyOff = !initialTimeOffDates.has(dateString);
        const changedToOn = originallyOff; // If it was originally OFF and is in changedDates, it's now ON

        if (changedToOn) {
            promises.push(firestoreService.addTimeOffDate(user.uid, dateString));
        } else {
            promises.push(firestoreService.removeTimeOffDate(user.uid, dateString));
        }
    });

    try {
        await Promise.all(promises);
        console.log('Successfully saved time off changes.');
        // Update initial state to reflect saved changes and clear changedDates
        changedDates.forEach(dateString => {
             if (initialTimeOffDates.has(dateString)) {
                 initialTimeOffDates.delete(dateString);
             } else {
                 initialTimeOffDates.add(dateString);
             }
        });
        changedDates.clear();
        hideSavingIndicator(true); // Show success
        updateSaveButtonState(); // Disable save button again
    } catch (error) {
        console.error('Error saving time off changes:', error);
        alert(`Error saving changes: ${error.message}`);
        hideSavingIndicator(false); // Show error
        // Do not clear changedDates, allow user to retry
        updateSaveButtonState(); // Re-enable button potentially?
    }
  }
  
  /**
   * Shows a saving indicator.
   */
  function showSavingIndicator() {
    if (!savingIndicator) return;
    savingIndicator.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i> Saving...';
    if (saveTimeOffButton) saveTimeOffButton.disabled = true;
  }

  /**
   * Hides the saving indicator and optionally shows success/error message.
   */
  function hideSavingIndicator(success = true) {
    if (!savingIndicator) return;
    if (success) {
      savingIndicator.innerHTML = '<i class="fas fa-check mr-2 text-green-500"></i> Saved!';
    } else {
      savingIndicator.innerHTML = '<i class="fas fa-times mr-2 text-red-500"></i> Error saving!';
    }
    setTimeout(() => { 
      if (savingIndicator) savingIndicator.innerHTML = ''; 
    }, 2500);
    // Re-enable button based on whether there are still pending changes (e.g., after error)
    updateSaveButtonState(); 
  }

  /**
   * Initializes the time off calendar and navigation.
   */
  async function initializeTimeOffCalendar() { // Make async to await fetch
    if (!prevMonthBtn || !nextMonthBtn) {
        console.error('Calendar navigation buttons not found.');
        return;
    }
    // Fetch initial data before rendering
    const user = auth.currentUser;
    if (user) {
        try {
            // Fetch for a wider range initially? Or just current month?
            // Let's stick to current month for now.
            const startOfMonth = new Date(currentYear, currentMonth, 1);
            const endOfMonth = new Date(currentYear, currentMonth + 1, 0); // Last day
            const startStr = `${startOfMonth.getFullYear()}-${(startOfMonth.getMonth() + 1).toString().padStart(2, '0')}-01`;
            const endStr = `${endOfMonth.getFullYear()}-${(endOfMonth.getMonth() + 1).toString().padStart(2, '0')}-${endOfMonth.getDate().toString().padStart(2, '0')}`;

            initialTimeOffDates = new Set(await firestoreService.getTimeOffDates(user.uid, startStr, endStr));
            console.log('Initial time off dates loaded:', initialTimeOffDates);
            changedDates.clear(); // Clear any pending changes from previous views

        } catch(error) {
            console.error('Failed to load initial time off dates:', error);
            if (calendarError) {
                calendarError.textContent = 'Error loading initial time off data.';
                calendarError.classList.remove('hidden');
            }
            // Proceed with empty initial data?
            initialTimeOffDates = new Set();
            changedDates.clear();
        }
    }
    
    prevMonthBtn.addEventListener('click', async () => { // Make async
        // ** Important: Check for unsaved changes before navigating months **
        if (changedDates.size > 0) {
            if (!confirm('You have unsaved changes. Discard changes and switch month?')) {
                return; // Cancel navigation
            }
        }
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        await loadAndRenderMonth(currentYear, currentMonth); // Use new function
    });

    nextMonthBtn.addEventListener('click', async () => { // Make async
         if (changedDates.size > 0) {
            if (!confirm('You have unsaved changes. Discard changes and switch month?')) {
                return; // Cancel navigation
            }
        }
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        await loadAndRenderMonth(currentYear, currentMonth); // Use new function
    });

    // Add listener for the save button
    if (saveTimeOffButton) {
      saveTimeOffButton.addEventListener('click', handleSaveTimeOff);
      updateSaveButtonState(); // Initialize button state
    } else {
       console.error('Save time off button (#save-timeoff-button) not found!');
    }

    // Initial render
    await renderCalendar(currentYear, currentMonth); 
  }

  // New function to handle loading data for a month and rendering
  async function loadAndRenderMonth(year, month) {
    const user = auth.currentUser;
    if (!user) return; // Should not happen if called after auth check
    
    // Show loading state?
    calendarGrid.innerHTML = '<p class="text-center text-gray-500 col-span-7">Loading...</p>';
    
    try {
        const startOfMonth = new Date(year, month, 1);
        const endOfMonth = new Date(year, month + 1, 0);
        const startStr = `${startOfMonth.getFullYear()}-${(startOfMonth.getMonth() + 1).toString().padStart(2, '0')}-01`;
        const endStr = `${endOfMonth.getFullYear()}-${(endOfMonth.getMonth() + 1).toString().padStart(2, '0')}-${endOfMonth.getDate().toString().padStart(2, '0')}`;

        initialTimeOffDates = new Set(await firestoreService.getTimeOffDates(user.uid, startStr, endStr));
        changedDates.clear(); // Clear changes when switching months
        await renderCalendar(year, month); // Render with newly fetched initial data

    } catch (error) {
        console.error(`Failed to load time off dates for ${year}-${month + 1}:`, error);
        if (calendarError) {
            calendarError.textContent = 'Error loading time off data for this month.';
            calendarError.classList.remove('hidden');
        }
         initialTimeOffDates = new Set(); // Reset on error
         changedDates.clear();
         await renderCalendar(year, month); // Render empty/error state
    }
  }

  // --- Initialization --- 
   auth.onAuthStateChanged(async (user) => { // Make async
    if (user) {
      console.log('User authenticated, initializing Time Off Calendar.');
      await initializeTimeOffCalendar(); // Await initialization
    } else {
      // Handle logged out state if necessary (e.g., clear calendar)
      console.log('User logged out on Time Off page.');
       if (calendarGrid) calendarGrid.innerHTML = '<p class="text-center text-gray-500 col-span-7">Please log in to manage time off.</p>';
       if (currentMonthDisplay) currentMonthDisplay.textContent = '-';
    }
  });

}); 