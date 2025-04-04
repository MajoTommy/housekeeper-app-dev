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
        const timezoneSelect = document.getElementById('timezone');
        const userInitialsSpan = document.getElementById('user-initials');
        const userDisplayNameH2 = document.getElementById('user-display-name');
        const userEmailP = document.getElementById('user-email');
        const saveSettingsButton = document.getElementById('save-settings-button');
        const savingIndicatorContainer = document.getElementById('saving-indicator');

        // Call the function to populate the dropdown
        populateTimezoneOptions();

        // --- Core Functions (Defined Locally) ---

        function showSavingIndicator() {
            console.log('Showing saving indicator');
            if (!savingIndicatorContainer) return;
            savingIndicatorContainer.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i> Saving...';
            if(saveSettingsButton) saveSettingsButton.disabled = true;
        }

        function hideSavingIndicator(success = true) {
            if (!savingIndicatorContainer) return;
            if (success) {
                savingIndicatorContainer.innerHTML = '<i class="fas fa-check mr-2 text-green-500"></i> Saved!';
            } else {
                savingIndicatorContainer.innerHTML = '<i class="fas fa-times mr-2 text-red-500"></i> Error saving!';
            }
            setTimeout(() => { savingIndicatorContainer.innerHTML = ''; }, 3000);
            if(saveSettingsButton) saveSettingsButton.disabled = false;
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

        // NEW: Function to populate timezone dropdown
        function populateTimezoneOptions() {
            if (!timezoneSelect) return;

            // Use a predefined list of North American timezones
            const northAmericanTimezones = [
                "America/New_York",    // Eastern Time (ET)
                "America/Chicago",     // Central Time (CT)
                "America/Denver",      // Mountain Time (MT)
                "America/Phoenix",     // Mountain Time (Arizona - no DST)
                "America/Los_Angeles", // Pacific Time (PT)
                "America/Vancouver",   // Pacific Time (Canada)
                "America/Edmonton",    // Mountain Time (Canada)
                "America/Winnipeg",    // Central Time (Canada)
                "America/Toronto",     // Eastern Time (Canada)
                "America/Halifax",     // Atlantic Time (Canada)
                "America/St_Johns",    // Newfoundland Time (Canada)
                "America/Anchorage",   // Alaska Time (AKT)
                "Pacific/Honolulu"     // Hawaii Time (HST - no DST)
                // Add others like Mexico if needed
                // "America/Mexico_City", // Central Time (Mexico)
                // "America/Tijuana",     // Pacific Time (Mexico)
                // "America/Chihuahua",   // Mountain Time (Mexico)
            ];

            try {
                // const timezones = Intl.supportedValuesOf('timeZone'); // Replaced with predefined list
                timezoneSelect.innerHTML = '<option value="">Select Time Zone</option>'; // Changed placeholder
                northAmericanTimezones.forEach(tz => {
                    const option = document.createElement('option');
                    option.value = tz;
                    // Format the display name nicely (e.g., America/New York -> New York)
                    const displayName = tz.split('/').pop().replace(/_/g, ' '); 
                    option.textContent = `${displayName} (${tz.startsWith('Pacific') || tz.startsWith('Atlantic') ? tz.split('/')[0] : 'America'})`; // Add region hint
                    timezoneSelect.appendChild(option);
                });
            } catch (error) {
                console.error("Error populating time zones:", error);
                // Fallback in case of unexpected errors, though less likely with predefined list
                timezoneSelect.innerHTML = '<option value="">Error loading timezones</option>';
            }
        }

        // --- Data Handling Functions ---
        
        async function loadSettings() {
            console.log('loadSettings called');

            // User is logged in, load settings
            const user = firebase.auth().currentUser;
            if (!user) {
                console.error('Cannot load settings, no user logged in');
                return false;
            }
            
            try {
                console.log('Loading settings from centralized service');
                const settings = await firestoreService.getUserSettings(user.uid);
                
                if (!settings || !settings.workingDays) {
                    console.error('Failed to load settings or missing workingDays', settings);
                    return false;
                }
                
                console.log('Loaded settings:', JSON.stringify(settings, null, 2));
                
                // Apply loaded settings to UI
                applyLoadedSettings(settings);
                
                // Fix any data issues in loaded settings
                console.log('Fixing any data issues in loaded settings...');
                fixLoadedSettings(settings);
                
                // Initialize debugging for schedule.js
                if (typeof window.debugWorkingDays === 'function') {
                    console.log('Initializing schedule.js debugging...');
                    window.debugWorkingDays(settings);
                }
                
                return true;
            } catch (error) {
                console.error('Error loading settings:', error);
                return false;
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
                const daySettings = settings.workingDays[day] || {};
                const currentDayState = workingDays[day];

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
                if (!toggle) {
                    console.error(`Toggle for ${day} not found`);
                    return;
                }
                toggle.checked = currentDayState.isWorking;
                
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
            } else {
                console.error('Auto send receipts toggle not found');
            }

            // Apply timezone setting
            if (timezoneSelect && settings.timezone) {
                timezoneSelect.value = settings.timezone;
                if(timezoneSelect.selectedIndex === -1 && settings.timezone) { 
                    console.warn(`Saved timezone "${settings.timezone}" not found in standard list. Adding it.`);
                    const option = document.createElement('option');
                    option.value = settings.timezone;
                    option.textContent = `${settings.timezone.replace(/_/g, ' ')} (Saved)`;
                    timezoneSelect.appendChild(option);
                    timezoneSelect.value = settings.timezone;
                } else if (!settings.timezone) {
                    timezoneSelect.value = "";
                }
            } else if (timezoneSelect) {
                timezoneSelect.value = "";
            }

            console.log('Settings successfully applied to UI');
        }

        async function saveSettings() {
            console.log('saveSettings called');
            showSavingIndicator();

            const user = firebase.auth().currentUser;
            if (!user) {
                console.error('Cannot save settings, no user logged in');
                hideSavingIndicator(false);
                return false;
            }

            const settingsToSave = {
                workingDays: { ...workingDays }, // Save a copy
                autoSendReceipts: autoSendReceiptsToggle ? autoSendReceiptsToggle.checked : false,
                timezone: timezoneSelect ? timezoneSelect.value : null // Add selected timezone
            };

            // --- Data Formatting/Cleanup Before Save ---
            dayNames.forEach(day => {
                const dayData = settingsToSave.workingDays[day];
                // ADDED: Log initial state for the day being processed
                console.log(`[SAVE - ${day}] Initial dayData before format:`, JSON.stringify(dayData));
                // END ADDED
                
                if (!dayData.isWorking) {
                    // If not working, nullify time/job details for consistency
                    dayData.startTime = null;
                    dayData.jobsPerDay = null;
                    dayData.breakTime = null;
                    dayData.jobDurations = [];
                    dayData.breakDurations = [];
                } else {
                    // Ensure times are in 12-hour format for storage consistency
                    if (dayData.startTime) {
                        dayData.startTime = convertTo12HourFormat(dayData.startTime);
                    }
                    // Ensure durations are numbers
                    if (dayData.jobsPerDay !== null) dayData.jobsPerDay = parseInt(dayData.jobsPerDay, 10) || null;
                    if (dayData.breakTime !== null) dayData.breakTime = parseInt(dayData.breakTime, 10) || null;

                    // Ensure job/break arrays match job count
                    const jobCount = dayData.jobsPerDay;
                    if (jobCount > 0) {
                        if (!Array.isArray(dayData.jobDurations) || dayData.jobDurations.length !== jobCount) {
                            console.warn(`Job durations array length mismatch for ${day}, resetting.`);
                            dayData.jobDurations = Array(jobCount).fill(DEFAULT_JOB_DURATION);
                        }
                        const breakCount = Math.max(0, jobCount - 1);
                        if (!Array.isArray(dayData.breakDurations) || dayData.breakDurations.length !== breakCount) {
                            console.warn(`Break durations array length mismatch for ${day}, resetting.`);
                            dayData.breakDurations = Array(breakCount).fill(DEFAULT_BREAK_TIME);
                        }
                        // ADDED: Log durations before final map/parse
                        console.log(`[SAVE - ${day}] Durations before final map:`, {
                            jobs: JSON.stringify(dayData.jobDurations),
                            breaks: JSON.stringify(dayData.breakDurations)
                        });
                        // Ensure all durations are numbers
                        dayData.jobDurations = dayData.jobDurations.map(d => parseInt(d, 10) || DEFAULT_JOB_DURATION);
                        dayData.breakDurations = dayData.breakDurations.map(d => parseInt(d, 10) || DEFAULT_BREAK_TIME);
                    } else {
                         dayData.jobDurations = [];
                         dayData.breakDurations = [];
                    }
                }
            });

            console.log('Attempting to save settings:', JSON.stringify(settingsToSave, null, 2));

            try {
                await firestoreService.updateUserSettings(user.uid, settingsToSave);
                console.log('Settings saved successfully via centralized service');
                hideSavingIndicator(true);

                 // Update debugging in schedule.js if available
                 if (typeof window.debugWorkingDays === 'function') {
                    window.debugWorkingDays(settingsToSave);
                 }

                return true;
            } catch (error) {
                console.error('Error saving settings:', error);
                hideSavingIndicator(false);
                return false;
            }
        }
    
        function validateTimeSlots() {
            // Basic validation stub - implement actual logic if needed
            console.log("Validating time slots (stub)");
            return true; // Assume valid for now
        }

        async function validateAndSaveSettings() {
            console.log('[VALIDATION] validateAndSaveSettings called');
            
            // Ensure firestoreService is available
            if (!window.firestoreService || typeof window.firestoreService.updateUserSettings !== 'function') {
                console.error('[VALIDATION] firestoreService or updateUserSettings not available!');
                return false;
            }
            
            // Check for logged in user
            const user = firebase.auth().currentUser;
            if (!user) {
                console.error('[VALIDATION] Cannot save settings - no user logged in');
                return false;
            }
            
            try {
                if (validateTimeSlots()) {
                    console.log('[VALIDATION] Validation passed, calling saveSettings()');
                    const result = await saveSettings(); // Call local saveSettings
                    console.log('[VALIDATION] saveSettings result:', result);
                    return result;
                } else {
                    console.warn('[VALIDATION] Settings validation failed, not saving');
                    return false;
                }
            } catch (error) {
                console.error('[VALIDATION] Error in validateAndSaveSettings:', error);
                return false;
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
            
            // Clean up any unexpected string-indexed properties that might have gotten into the object
            Object.keys(workingDays[day]).forEach(key => {
                if (!isNaN(parseInt(key))) {
                    console.log(`Cleaning up unexpected property ${key} from ${day}`);
                    delete workingDays[day][key];
                }
            });
            
            workingDays[day].jobsPerDay = jobCount;
            
            // Adjust duration arrays
            const oldJobDurations = workingDays[day].jobDurations || [];
            workingDays[day].jobDurations = Array(jobCount).fill(0).map((_, i) => 
                i < oldJobDurations.length ? oldJobDurations[i] : DEFAULT_JOB_DURATION);
            
            const oldBreakDurations = workingDays[day].breakDurations || [];
            workingDays[day].breakDurations = Array(Math.max(0, jobCount - 1)).fill(0).map((_, i) => 
                i < oldBreakDurations.length ? oldBreakDurations[i] : DEFAULT_BREAK_TIME);

            console.log(`Updated ${day} job durations:`, workingDays[day].jobDurations);
            console.log(`Updated ${day} break durations:`, workingDays[day].breakDurations);

            updateDayVisualIndicators(day); // Update UI
        }

        // NEW FUNCTION: Update job duration values
        function updateJobDuration(day, jobIndex, durationMinutes) {
            if (!workingDays[day]) {
                console.error(`Cannot update job duration, workingDays[${day}] does not exist.`);
                return false;
            }
            
            if (!workingDays[day].jobDurations) {
                workingDays[day].jobDurations = [];
            }
            
            // Ensure jobDurations array matches jobsPerDay
            if (workingDays[day].jobsPerDay > workingDays[day].jobDurations.length) {
                const oldJobDurations = [...workingDays[day].jobDurations];
                workingDays[day].jobDurations = Array(workingDays[day].jobsPerDay).fill(0).map((_, i) => 
                    i < oldJobDurations.length ? oldJobDurations[i] : DEFAULT_JOB_DURATION);
                console.log(`Fixed ${day} job durations array length:`, workingDays[day].jobDurations);
            }
            
            // Update the specific job duration
            if (jobIndex >= 0 && jobIndex < workingDays[day].jobDurations.length) {
                workingDays[day].jobDurations[jobIndex] = durationMinutes;
                console.log(`Updated ${day} job ${jobIndex+1} duration to ${durationMinutes} minutes`);
                
                updateDayVisualIndicators(day); // Update UI
                return true;
            } else {
                console.error(`Invalid job index ${jobIndex} for ${day}`);
                return false;
            }
        }
        
        // NEW FUNCTION: Update break duration values
        function updateBreakDuration(day, breakIndex, durationMinutes) {
            if (!workingDays[day]) {
                console.error(`Cannot update break duration, workingDays[${day}] does not exist.`);
                return false;
            }
            
            if (!workingDays[day].breakDurations) {
                workingDays[day].breakDurations = [];
            }
            
            // Ensure breakDurations array matches jobsPerDay - 1
            const expectedBreaks = Math.max(0, workingDays[day].jobsPerDay - 1);
            if (expectedBreaks > workingDays[day].breakDurations.length) {
                const oldBreakDurations = [...workingDays[day].breakDurations];
                workingDays[day].breakDurations = Array(expectedBreaks).fill(0).map((_, i) => 
                    i < oldBreakDurations.length ? oldBreakDurations[i] : DEFAULT_BREAK_TIME);
                console.log(`Fixed ${day} break durations array length:`, workingDays[day].breakDurations);
            }
            
            // Update the specific break duration
            if (breakIndex >= 0 && breakIndex < workingDays[day].breakDurations.length) {
                workingDays[day].breakDurations[breakIndex] = durationMinutes;
                console.log(`Updated ${day} break ${breakIndex+1} duration to ${durationMinutes} minutes`);
                
                updateDayVisualIndicators(day); // Update UI
                return true;
            } else {
                console.error(`Invalid break index ${breakIndex} for ${day}`);
                return false;
            }
        }

        // --- Initialization & Event Listeners ---

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
                });
            });

            // Auto-Send Receipts Toggle
            if (autoSendReceiptsToggle) {
                 // No automatic save on toggle change now
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
                          }
                      });
                 }
                // Add similar listeners for job duration controls if implemented
             });

            // Timezone Select listener
            if (timezoneSelect) {
                // No automatic save on timezone change
            }

            // *** ADDED: Save Button Listener ***
            if (saveSettingsButton) {
                saveSettingsButton.addEventListener('click', () => {
                    console.log('Save Settings button clicked.');
                    // Directly call the validation and save function
                    validateAndSaveSettings(); 
                });
            }
        }
        
        // --- Global Exposure (Minimal) ---
        // UPDATED: Expose settings functionality properly
        window.settingsModule = {
            // Expose the working days object directly
            workingDays: workingDays,
            
            // Expose key functions
            setJobCount: setJobCount,
            saveSettings: saveSettings,
            loadSettings: loadSettings,
            updateJobDuration: updateJobDuration,
            updateBreakDuration: updateBreakDuration,
            
            // Add helper for other modules to access current settings
            getWorkingDays: function() {
                return JSON.parse(JSON.stringify(workingDays)); // Return a copy
            },
            
            // Method to update settings from external code
            updateWorkingDay: function(day, updates) {
                if (!workingDays[day]) {
                    console.error(`Cannot update settings, workingDays[${day}] does not exist.`);
                    return false;
                }
                
                // Apply updates to the day's settings
                Object.assign(workingDays[day], updates);
                
                // Update UI 
                updateDayVisualIndicators(day);
                return true; // Indicate success in updating local state
            },
            
            // Fix corrupted working days data
            fixWorkingDaysData: function() {
                console.log('[FIX] Cleaning up potential data issues in workingDays');
                let changesMade = false; // Track if fixes were applied
                dayNames.forEach(day => {
                    if (!workingDays[day]) return;
                    
                    // Clean up any unexpected string-indexed properties
                    Object.keys(workingDays[day]).forEach(key => {
                        if (!isNaN(parseInt(key))) {
                            console.log(`[FIX] Cleaning up unexpected property ${key} from ${day}`);
                            delete workingDays[day][key];
                        }
                    });
                    
                    // Ensure array lengths match job counts
                    if (workingDays[day].isWorking && workingDays[day].jobsPerDay > 0) {
                        const jobCount = workingDays[day].jobsPerDay;
                        
                        // Fix job durations
                        if (!workingDays[day].jobDurations || workingDays[day].jobDurations.length !== jobCount) {
                            const oldJobDurations = workingDays[day].jobDurations || [];
                            workingDays[day].jobDurations = Array(jobCount).fill(0).map((_, i) => 
                                i < oldJobDurations.length ? oldJobDurations[i] : DEFAULT_JOB_DURATION);
                            console.log(`[FIX] Fixed ${day} job durations:`, workingDays[day].jobDurations);
                        }
                        
                        // Fix break durations
                        const expectedBreaks = Math.max(0, jobCount - 1);
                        if (!workingDays[day].breakDurations || workingDays[day].breakDurations.length !== expectedBreaks) {
                            const oldBreakDurations = workingDays[day].breakDurations || [];
                            workingDays[day].breakDurations = Array(expectedBreaks).fill(0).map((_, i) => 
                                i < oldBreakDurations.length ? oldBreakDurations[i] : DEFAULT_BREAK_TIME);
                            console.log(`[FIX] Fixed ${day} break durations:`, workingDays[day].breakDurations);
                        }
                    }
                });
                
                return changesMade; // Return whether fixes were made
            }
        };

        // CRITICAL FIX: Add global compatibility references for external scripts
        window.workingDays = workingDays; // Direct global access to workingDays
        window.setJobCount = setJobCount; // Global function access
        window.saveSettings = saveSettings; // Global function access
        window.validateAndSaveSettings = validateAndSaveSettings; // Global save trigger
        window.updateJobDuration = updateJobDuration; // Global job duration updater
        window.updateBreakDuration = updateBreakDuration; // Global break duration updater
        window.fixWorkingDaysData = window.settingsModule.fixWorkingDaysData; // Data cleaner
        
        // Legacy compatibility variables for different code patterns
        window.settingsWorkingDays = workingDays;
        window.updateSettingsWorkingDays = function(day, updates) {
            return window.settingsModule.updateWorkingDay(day, updates);
        };
        window.getSettingsWorkingDays = function() {
            return window.settingsModule.getWorkingDays();
        };
        
        // For backward compatibility with existing code
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

        // NEW: Define Diagnostic Tool function before calling it
        function createDiagnosticTool() {
            console.log('[DIAGNOSTIC] Initializing settings diagnostic tool placeholder.');
            // Basic placeholder. Can add more detailed checks later if needed.
            window.debugSettings = function() {
                console.group('📊 Basic Settings Diagnostic');
                console.log('Local workingDays object:', workingDays);
                console.log('firestoreService available:', typeof firestoreService !== 'undefined');
                const user = firebase.auth().currentUser;
                console.log('Current user:', user ? user.uid : 'Not logged in');
                 console.log('Timezone select element:', timezoneSelect ? 'Found' : 'Not Found');
                 console.log('Populate function exists:', typeof populateTimezoneOptions === 'function');
                console.groupEnd();
            };
             // Run check after a delay
             // setTimeout(() => { window.debugSettings(); }, 3000); 
        }

        createDiagnosticTool();

        // Listen for auth state changes to load initial settings AND user info
        firebase.auth().onAuthStateChanged(async user => {
            if (user) {
                console.log('User logged in, loading initial settings...');
                
                // Fetch Firestore User Profile for name display
                let displayName = "Name not set";
                try {
                    const userProfile = await firestoreService.getUserProfile(user.uid);
                    if (userProfile) {
                        // Prefer firstName + lastName, fallback to name, then default
                        if (userProfile.firstName && userProfile.lastName) {
                            displayName = `${userProfile.firstName} ${userProfile.lastName}`;
                        } else if (userProfile.name) {
                            displayName = userProfile.name;
                        }
                    }
                } catch (profileError) {
                    console.error("Error fetching user profile for display:", profileError);
                }

                // Populate User Info using Firestore name and Auth email/initials
                if (userDisplayNameH2) userDisplayNameH2.textContent = displayName;
                if (userEmailP) userEmailP.textContent = user.email || "Email not set"; // Still use Auth email
                if (userInitialsSpan) {
                    const nameForInitials = displayName !== "Name not set" ? displayName : (user.email || '');
                    const initials = nameForInitials.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
                    userInitialsSpan.textContent = initials.substring(0, 2); // Max 2 initials
                }

                // Load settings etc.
                populateTimezoneOptions(); 
                await loadSettings(); // Call local loadSettings
                initializeUI(); // Call this after loading settings
            } else {
                console.log('User logged out, settings UI inactive.');
                // Clear user info fields
                if (userDisplayNameH2) userDisplayNameH2.textContent = 'Logged Out';
                if (userEmailP) userEmailP.textContent = '';
                if (userInitialsSpan) userInitialsSpan.textContent = '-';
                // Optionally clear UI or show logged-out state
                applyLoadedSettings({ workingDays: {} }); // Clear UI by applying empty settings
            }
        });

        console.log('Settings.js initialization complete.');
    } // End of Firebase initialized block
}); 

function fixLoadedSettings(settingsData) {
    console.log('[FIX] Cleaning up potential data issues in workingDays');
    let changesMade = false;
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    if (!settingsData || !settingsData.workingDays) {
        console.log('[FIX] No workingDays data found to fix.');
        return; // Nothing to fix
    }

    days.forEach(day => {
        const dayData = settingsData.workingDays[day];
        if (!dayData) {
            console.log(`[FIX] No data found for ${day}`);
            return; // Skip if no data for the day
        }

        if (dayData.isWorking) {
            // Ensure jobsPerDay is valid
            if (!dayData.jobsPerDay || typeof dayData.jobsPerDay !== 'number' || dayData.jobsPerDay < 1 || dayData.jobsPerDay > 3) {
                console.log(`[FIX - ${day}] Invalid jobsPerDay (${dayData.jobsPerDay}), setting to 2`);
                dayData.jobsPerDay = 2;
                changesMade = true;
            }
            
            // Ensure jobDurations array exists and matches jobsPerDay
            if (!dayData.jobDurations || !Array.isArray(dayData.jobDurations) || dayData.jobDurations.length !== dayData.jobsPerDay) {
                const oldDurations = dayData.jobDurations || [];
                dayData.jobDurations = Array(dayData.jobsPerDay).fill(0).map((_, i) => 
                    i < oldDurations.length ? oldDurations[i] : DEFAULT_JOB_DURATION);
                console.log(`[FIX - ${day}] Corrected jobDurations:`, dayData.jobDurations);
                changesMade = true;
            }

            // Ensure breakDurations array exists and matches jobsPerDay - 1
            if (dayData.jobsPerDay > 1) {
                if (!dayData.breakDurations || !Array.isArray(dayData.breakDurations) || dayData.breakDurations.length !== dayData.jobsPerDay - 1) {
                    const oldBreaks = dayData.breakDurations || [];
                    dayData.breakDurations = Array(dayData.jobsPerDay - 1).fill(0).map((_, i) => 
                        i < oldBreaks.length ? oldBreaks[i] : DEFAULT_BREAK_TIME);
                    console.log(`[FIX - ${day}] Corrected breakDurations:`, dayData.breakDurations);
                    changesMade = true;
                }
            } else {
                // If only 1 job, ensure breakDurations is empty
                if (dayData.breakDurations && dayData.breakDurations.length > 0) {
                    console.log(`[FIX - ${day}] Clearing breakDurations for 1 job day`);
                    dayData.breakDurations = [];
                    changesMade = true;
                }
            }

            // Ensure startTime is valid
            if (!dayData.startTime || !/\d{1,2}:\d{2}\s*(AM|PM)/i.test(dayData.startTime)) {
                console.log(`[FIX - ${day}] Invalid startTime (${dayData.startTime}), setting to default`);
                dayData.startTime = '8:00 AM';
                changesMade = true;
            }
        } else {
            // If not working, clear potentially problematic fields
            if (dayData.jobsPerDay !== null || dayData.startTime !== null || dayData.jobDurations?.length > 0 || dayData.breakDurations?.length > 0) {
                console.log(`[FIX - ${day}] Clearing fields for non-working day`);
                dayData.jobsPerDay = null;
                dayData.startTime = null;
                dayData.jobDurations = [];
                dayData.breakDurations = [];
                changesMade = true;
            }
        }
    });

    // // If changes were made by the fix function, trigger a save to ensure consistency
    // // REMOVED THIS CALL - Saving should only happen via manual button click
    // if (changesMade) {
    //     console.log('[FIX] Changes were made during fix, triggering validation and save...');
    //     validateAndSaveSettings(); 
    // } else {
    //     console.log('[FIX] No changes needed during fix routine.');
    // }
}

// --- Saving Logic ---
