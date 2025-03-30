document.addEventListener('DOMContentLoaded', function() {
    console.log('Settings page loaded, initializing with centralized data service');

    // Firebase initialization check
    if (!firebase.apps.length) {
        console.error('Firebase not initialized');
    } else {
        console.log('Settings.js initializing...');

        // --- Local State & Constants ---
        const workingDays = {};
        const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const DEFAULT_JOBS_PER_DAY = 2;
        const DEFAULT_BREAK_TIME = 90;
    const DEFAULT_START_TIME = '8:00 AM';
        const DEFAULT_JOB_DURATION = 180;

        // Initialize local workingDays state
dayNames.forEach(day => {
        workingDays[day] = {
            isWorking: false,
                jobsPerDay: null,
                startTime: null,
                breakTime: null,
            breakDurations: [],
            jobDurations: []
        };
        });
        console.log('Local workingDays initialized:', workingDays);

        // --- UI Element References ---
        const dayToggles = document.querySelectorAll('.day-toggle');
        const autoSendReceiptsToggle = document.getElementById('auto-send-receipts');
        const savingIndicator = createSavingIndicator(); // Create indicator element

        // --- Core Functions (Defined Locally) ---

        function showSavingIndicator() {
            console.log('Showing saving indicator');
            savingIndicator.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i> Saving...';
            savingIndicator.classList.remove('translate-y-10', 'opacity-0');
        }

        function hideSavingIndicator(success = true) {
            if (success) {
                savingIndicator.innerHTML = '<i class="fas fa-check mr-2"></i> Saved!';
                setTimeout(() => { savingIndicator.classList.add('translate-y-10', 'opacity-0'); }, 2000);
            } else {
                savingIndicator.innerHTML = '<i class="fas fa-times mr-2"></i> Error saving!';
                setTimeout(() => { savingIndicator.classList.add('translate-y-10', 'opacity-0'); }, 3000);
            }
        }
        
function convertTo12HourFormat(timeStr) {
    if (!timeStr) return '';
            if (timeStr.includes('AM') || timeStr.includes('PM')) return timeStr;
            try {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const period = hours >= 12 ? 'PM' : 'AM';
        const hours12 = hours % 12 || 12;
        return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
            } catch (error) { console.error('Error converting time format:', error); return timeStr; }
}
    
function convertTo24HourFormat(timeStr) {
            if (!timeStr || (timeStr.includes(':') && !timeStr.includes('AM') && !timeStr.includes('PM'))) return timeStr;
            try {
        const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM|am|pm)/i);
        if (!match) return timeStr;
        let hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        const period = match[3].toUpperCase();
        if (period === 'PM' && hours < 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            } catch (error) { console.error('Error converting to 24-hour format:', error); return timeStr; }
        }

        // --- Data Handling Functions ---
        
        async function loadSettings() {
            console.log('loadSettings called');
            const user = firebase.auth().currentUser;
            if (!user) {
                console.log('No user logged in, cannot load settings');
        return;
    }
            console.log('Loading settings from centralized service');
            try {
                const settings = await firestoreService.getUserSettings(user.uid);
                console.log('Loaded settings:', settings);
                applyLoadedSettings(settings);
            } catch (error) {
                console.error('Error loading settings:', error);
            }
        }

        function applyLoadedSettings(settings) {
            console.log('Applying loaded settings to UI:', settings);
            if (!settings || !settings.workingDays) {
                console.error('Invalid settings object received');
                return;
            }

            // Apply working days settings
            dayNames.forEach(day => {
                const daySettings = settings.workingDays[day] || {}; // Use empty obj if day missing
                const currentDayState = workingDays[day]; // Get local state ref

                // Apply all settings explicitly, handling potential missing fields
                currentDayState.isWorking = daySettings.isWorking === true;
                currentDayState.jobsPerDay = daySettings.jobsPerDay !== undefined ? daySettings.jobsPerDay : null;
                currentDayState.startTime = daySettings.startTime !== undefined ? daySettings.startTime : null;
                currentDayState.breakTime = daySettings.breakTime !== undefined ? daySettings.breakTime : null;
                currentDayState.breakDurations = daySettings.breakDurations || [];
                currentDayState.jobDurations = daySettings.jobDurations || [];
                
                // Log detailed information about each day's settings
                console.log(`Day settings for ${day}:`, {
                    isWorking: currentDayState.isWorking,
                    jobsPerDay: currentDayState.jobsPerDay,
                    startTime: currentDayState.startTime,
                    breakTime: currentDayState.breakTime
                });
                // Ensure job/break arrays match job count if needed
                 if (currentDayState.isWorking && currentDayState.jobsPerDay !== null) {
                     const jobCount = currentDayState.jobsPerDay;
                     if (!currentDayState.jobDurations || currentDayState.jobDurations.length !== jobCount) {
                         currentDayState.jobDurations = Array(jobCount).fill(DEFAULT_JOB_DURATION);
                     }
                     if (!currentDayState.breakDurations || currentDayState.breakDurations.length !== Math.max(0, jobCount - 1)) {
                         currentDayState.breakDurations = Array(Math.max(0, jobCount - 1)).fill(DEFAULT_BREAK_TIME);
                     }
        } else {
                     // Clear durations if not working or no jobs specified
                     currentDayState.jobDurations = [];
                     currentDayState.breakDurations = [];
                 }

                // Update UI
                const toggle = document.querySelector(`[data-day-toggle="${day}"]`);
                if (toggle) {
                    toggle.checked = currentDayState.isWorking;
                }
                
                const settingsPanel = document.querySelector(`[data-day-settings="${day}"]`);
                if (settingsPanel) {
                     if (currentDayState.isWorking) {
                        settingsPanel.classList.remove('hidden');
                        // Update input elements inside the panel
                        const startTimeInput = settingsPanel.querySelector(`[data-start-time="${day}"]`);
                        if (startTimeInput) {
                            startTimeInput.value = currentDayState.startTime ? convertTo24HourFormat(currentDayState.startTime) : '';
                        }
                        // Update other inputs (jobsPerDay, breakTime) if they exist as inputs/selects
                        const jobsPerDayInput = settingsPanel.querySelector(`[data-jobs-per-day="${day}"]`); 
                        if (jobsPerDayInput) {
                             jobsPerDayInput.value = currentDayState.jobsPerDay !== null ? currentDayState.jobsPerDay : '';
                        }
                         const breakTimeInput = settingsPanel.querySelector(`[data-break-time="${day}"]`);
                         if (breakTimeInput) {
                             breakTimeInput.value = currentDayState.breakTime !== null ? currentDayState.breakTime : '';
                         }
                        // Update visual indicators (job buttons, timeline)
                    updateDayVisualIndicators(day);
                    } else {
                        settingsPanel.classList.add('hidden');
                    }
                 }
            });

            // Apply autoSendReceipts setting
            if (autoSendReceiptsToggle) {
                autoSendReceiptsToggle.checked = settings.autoSendReceipts === true;
            }
            console.log('Settings successfully applied to UI');
        }

        async function saveSettings() {
            console.log('[SAVE] saveSettings called'); // Log entry
        const user = firebase.auth().currentUser;
            if (!user) {
                console.error('[SAVE] Cannot save settings, no user logged in');
                hideSavingIndicator(false);
                return false;
            }
            
            showSavingIndicator();
            try {
                // Format settings using the local workingDays state
                const formattedSettings = {
                    workingDays: JSON.parse(JSON.stringify(workingDays)), // Deep copy
                    autoSendReceipts: autoSendReceiptsToggle ? autoSendReceiptsToggle.checked : false
                };
                
                // Add compatibility layer for schedule.js
                formattedSettings.workingDaysCompat = {};
                dayNames.forEach((day, index) => {
                    // Map day names to numeric indices (0=Sunday, 1=Monday, etc.)
                    const dayIndex = (index + 1) % 7; // Convert from Monday-based to Sunday-based
                    formattedSettings.workingDaysCompat[dayIndex] = workingDays[day].isWorking === true;
                });
                
                console.log('[SAVE] Formatted settings with compatibility layer:', formattedSettings); // Log formatted data
            
                console.log('[SAVE] Calling firestoreService.updateUserSettings...'); // Log before service call
                const success = await firestoreService.updateUserSettings(user.uid, formattedSettings);
                console.log('[SAVE] firestoreService.updateUserSettings returned:', success); // Log service call result
            
                    if (success) {
                    console.log('[SAVE] Settings saved successfully');
                        hideSavingIndicator(true);
                        return true;
                    } else {
                    console.error('[SAVE] Error saving settings via firestoreService');
                        hideSavingIndicator(false);
                        return false;
                    }
        } catch (error) {
                console.error('[SAVE] Error caught in saveSettings:', error); // Log any caught errors
            hideSavingIndicator(false);
            return false;
        }
    }
    
        function validateTimeSlots() {
            // Basic validation stub - implement actual logic if needed
            console.log("Validating time slots (stub)");
            return true; // Assume valid for now
        }

        function validateAndSaveSettings() {
             console.log('validateAndSaveSettings called');
            if (validateTimeSlots()) {
                saveSettings(); // Call local saveSettings
                    } else {
                console.warn('Settings validation failed, not saving');
            }
        }

        // --- UI Update Functions ---

        function updateDayVisualIndicators(day) {
            console.log(`Updating visual indicators for ${day}`);
            const dayState = workingDays[day];
                        const settingsPanel = document.querySelector(`[data-day-settings="${day}"]`);
            
            // Check for valid panel and working state
            if (!settingsPanel || !dayState || !dayState.isWorking) {
                 console.warn(`Cannot update visuals for ${day}, panel or state missing/not working.`);
                return;
            }
            
            // *** ADDED CHECK FOR NULL START TIME OR JOB COUNT ***
            if (dayState.startTime === null || dayState.jobsPerDay === null) {
                console.log(`Skipping visual update for ${day} due to null startTime or jobsPerDay.`);
                // Optionally clear the timeline container if needed
                const timelineContainer = settingsPanel.querySelector(`#${day}-schedule-preview`);
                if (timelineContainer) {
                    timelineContainer.innerHTML = ''; // Clear any previous visuals
                }
                // Also ensure job buttons are not highlighted if job count is null
                const jobButtons = settingsPanel.querySelectorAll('[data-jobs]');
                 jobButtons.forEach(button => {
                     button.classList.remove('bg-blue-100', 'border-blue-400');
                 });
                return; // Stop further execution
            }
            // *** END ADDED CHECK ***

            // Update Start Time Input (redundant with applyLoadedSettings, but safe)
            const startTimeInput = settingsPanel.querySelector(`[data-start-time="${day}"]`);
            if (startTimeInput) {
                startTimeInput.value = dayState.startTime ? convertTo24HourFormat(dayState.startTime) : '';
            }
            
            // Highlight correct Job Count Button
            const jobCount = dayState.jobsPerDay;
            const jobButtons = settingsPanel.querySelectorAll('[data-jobs]'); // Assumes buttons use data-jobs="N"
             jobButtons.forEach(button => {
                 const btnCount = parseInt(button.getAttribute('data-jobs'));
                 if (btnCount === jobCount) {
                     button.classList.add('bg-blue-100', 'border-blue-400'); // Example highlighting
        } else {
                     button.classList.remove('bg-blue-100', 'border-blue-400');
                 }
             });

            // TODO: Update the visual timeline rendering if it exists
            const timelineContainer = settingsPanel.querySelector(`#${day}-schedule-preview`); 
             if(timelineContainer){
                 console.log(`Timeline update needed for ${day}`);
                 // Add logic to recalculate and render the job/break timeline here
                 // based on dayState.startTime, dayState.jobsPerDay, 
                 // dayState.jobDurations, dayState.breakDurations
                 // timelineContainer.innerHTML = `<p class="text-gray-500 text-sm">Visual timeline update needed.</p>`; // Placeholder - Commented out for testing
             }
        }

        function setJobCount(day, jobCount) {
            if (!workingDays[day]) {
                console.error(`Cannot set job count, workingDays[${day}] does not exist.`);
            return;
        }
            console.log(`Setting ${day} job count to ${jobCount}`);
            workingDays[day].jobsPerDay = jobCount;
            
            // Adjust duration arrays
            const oldJobDurations = workingDays[day].jobDurations || [];
            workingDays[day].jobDurations = Array(jobCount).fill(0).map((_, i) => 
                i < oldJobDurations.length ? oldJobDurations[i] : DEFAULT_JOB_DURATION);
            
            const oldBreakDurations = workingDays[day].breakDurations || [];
             workingDays[day].breakDurations = Array(Math.max(0, jobCount - 1)).fill(0).map((_, i) => 
                 i < oldBreakDurations.length ? oldBreakDurations[i] : DEFAULT_BREAK_TIME);

            updateDayVisualIndicators(day); // Update UI
             validateAndSaveSettings(); // Save changes
        }

        // --- Initialization & Event Listeners ---

        function createSavingIndicator() {
            const indicator = document.createElement('div');
            indicator.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i> Saving...';
            indicator.className = 'fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded shadow-lg transform transition-all duration-300 translate-y-10 opacity-0 z-50';
            document.body.appendChild(indicator);
            return indicator;
        }

        function initializeUI() {
            console.log('Initializing UI event listeners...');
            // Day Toggles
    dayToggles.forEach(toggle => {
        toggle.addEventListener('change', function() {
            const day = this.getAttribute('data-day-toggle');
            const isWorking = this.checked;
                    console.log(`Toggle changed for ${day}: ${isWorking}`);
                    if (!workingDays[day]) { workingDays[day] = {}; }
                workingDays[day].isWorking = isWorking;
                
                    // Ensure default values if turning ON
                if (isWorking) {
                         if (workingDays[day].jobsPerDay === null) workingDays[day].jobsPerDay = DEFAULT_JOBS_PER_DAY;
                         if (workingDays[day].startTime === null) workingDays[day].startTime = DEFAULT_START_TIME;
                         if (workingDays[day].breakTime === null) workingDays[day].breakTime = DEFAULT_BREAK_TIME;
                         // Ensure duration arrays match job count
                         const jobCount = workingDays[day].jobsPerDay;
                          if (!workingDays[day].jobDurations || workingDays[day].jobDurations.length !== jobCount) {
                             workingDays[day].jobDurations = Array(jobCount).fill(DEFAULT_JOB_DURATION);
                          }
                          if (!workingDays[day].breakDurations || workingDays[day].breakDurations.length !== Math.max(0, jobCount - 1)) {
                             workingDays[day].breakDurations = Array(Math.max(0, jobCount - 1)).fill(DEFAULT_BREAK_TIME);
                          }
                     } else {
                         // Optionally clear values when turning OFF
                         // workingDays[day].jobsPerDay = null; 
                         // workingDays[day].startTime = null; 
                         // workingDays[day].breakTime = null;
                         // workingDays[day].jobDurations = [];
                         // workingDays[day].breakDurations = [];
                     }

                    applyLoadedSettings({ workingDays: workingDays }); // Re-apply to update panel visibility and inputs
                    validateAndSaveSettings();
        });
    });

            // Auto-Send Receipts Toggle
                    if (autoSendReceiptsToggle) {
                 autoSendReceiptsToggle.addEventListener('change', validateAndSaveSettings);
            }

            // General input changes (e.g., start time)
             document.querySelectorAll('[data-day-settings]').forEach(panel => {
                 const day = panel.getAttribute('data-day-settings');
                 
                 const startTimeInput = panel.querySelector(`[data-start-time="${day}"]`);
                 if (startTimeInput) {
                     startTimeInput.addEventListener('change', function() {
                         console.log(`Start time changed for ${day}: ${this.value}`);
                         if (workingDays[day]) {
                             workingDays[day].startTime = convertTo12HourFormat(this.value);
                             updateDayVisualIndicators(day); // Update timeline etc.
                             validateAndSaveSettings();
                         }
                     });
                 }
                 
                // Add listeners for job count buttons if they exist
                const jobButtons = panel.querySelectorAll('[data-jobs]');
                jobButtons.forEach(button => {
                    button.addEventListener('click', function() {
                        const jobCount = parseInt(this.getAttribute('data-jobs'));
                         console.log(`Job count button clicked for ${day}: ${jobCount}`);
                        setJobCount(day, jobCount); // Calls save internally
                     });
                 });

                 // Add listeners for break time inputs/selects/buttons if they exist
                 const breakTimeInput = panel.querySelector(`[data-break-time="${day}"]`); 
                 if (breakTimeInput && breakTimeInput.tagName === 'SELECT') { // Example for select
                     breakTimeInput.addEventListener('change', function() {
                          console.log(`Break time select changed for ${day}: ${this.value}`);
                         if (workingDays[day]) {
                             workingDays[day].breakTime = parseInt(this.value);
                    updateDayVisualIndicators(day);
                             validateAndSaveSettings();
                          }
                      });
                 }
                // Add similar listeners for job duration controls if implemented
             });
        }
        
        // --- Global Exposure (Minimal) ---
        // Expose only what's needed externally (e.g., by schedule.js)
        window.getCalculatedTimeSlots = function() {
            console.log('Calculating time slots on demand for external use');
            
            // Calculate time slots for each working day
            const calculatedSlots = [];
            
            dayNames.forEach((day, index) => {
                const dayState = workingDays[day];
                // Skip if not a working day or missing required settings
                if (!dayState || !dayState.isWorking || !dayState.startTime || !dayState.jobsPerDay) {
                    return;
                }
                
                // Map day names to numeric indices (0=Sunday, 1=Monday, etc.)
                const dayIndex = (index + 1) % 7; // Convert from Monday-based to Sunday-based
                
                // Calculate slots for this day
                const daySlots = calculateDayTimeSlots(dayState);
                if (daySlots && daySlots.length > 0) {
                    calculatedSlots.push({
                        day: dayIndex,
                        slots: daySlots
                    });
                }
            });
            
            console.log('Calculated time slots for all working days:', calculatedSlots);
            return calculatedSlots;
        };
        
        // Helper function to calculate time slots for a specific day
        function calculateDayTimeSlots(daySettings) {
            if (!daySettings.startTime || !daySettings.jobsPerDay) {
                return [];
            }
            
            const slots = [];
            const jobCount = daySettings.jobsPerDay;
            const jobDuration = 180; // Default 3 hours (180 minutes)
            const breakDuration = daySettings.breakTime || 90; // Default 1.5 hours (90 minutes)
            
            // Parse start time
            let startHour = 8; // Default 8 AM
            let startMinute = 0;
            
            try {
                const timeMatch = daySettings.startTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
                if (timeMatch) {
                    let hours = parseInt(timeMatch[1]);
                    const minutes = parseInt(timeMatch[2]);
                    const period = timeMatch[3].toUpperCase();
                    
                    // Convert to 24-hour format
                    if (period === 'PM' && hours < 12) hours += 12;
                    if (period === 'AM' && hours === 12) hours = 0;
                    
                    startHour = hours;
                    startMinute = minutes;
                }
            } catch (error) {
                console.error('Error parsing start time:', error);
            }
            
            // Calculate slots based on job count, duration, and breaks
            let currentHour = startHour;
            let currentMinute = startMinute;
            
            for (let i = 0; i < jobCount; i++) {
                // Calculate start time for this slot
                const startTime = formatTime(currentHour, currentMinute);
                
                // Calculate end time (job duration later)
                let endHour = currentHour;
                let endMinute = currentMinute + jobDuration;
                
                // Adjust for hour overflow
                while (endMinute >= 60) {
                    endHour++;
                    endMinute -= 60;
                }
                
                const endTime = formatTime(endHour, endMinute);
                
                // Add the slot
                slots.push({
                    start: startTime,
                    end: endTime,
                    durationMinutes: jobDuration
                });
                
                // Move to next slot start time (after break)
                currentMinute += jobDuration + breakDuration;
                while (currentMinute >= 60) {
                    currentHour++;
                    currentMinute -= 60;
                }
            }
            
            return slots;
        }
        
        // Helper function to format time as "HH:MM AM/PM"
        function formatTime(hours, minutes) {
            const period = hours >= 12 ? 'PM' : 'AM';
            const hours12 = hours % 12 || 12;
            return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
        }

        // --- Initialization Flow ---
        initializeUI(); // Setup event listeners

        // Listen for auth state changes to load initial settings
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                console.log('User logged in, loading initial settings...');
                loadSettings(); // Call local loadSettings
                    } else {
                console.log('User logged out, settings UI inactive.');
                // Optionally clear UI or show logged-out state
                applyLoadedSettings({ workingDays: {} }); // Clear UI by applying empty settings
            }
        });

        console.log('Settings.js initialization complete.');
    } // End of Firebase initialized block
}); 
