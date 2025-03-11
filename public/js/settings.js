document.addEventListener('DOMContentLoaded', function() {
    // Firebase initialization check
    if (!firebase.apps.length) {
        console.error('Firebase not initialized');
        return;
    }

    console.log('Settings.js loaded');

    // References to form elements
    const dayButtons = document.querySelectorAll('[data-day]');
    const daySettings = document.querySelectorAll('[data-day-settings]');
    const monFriSetupButton = document.getElementById('mon-fri-setup');
    const weekendsSetupButton = document.getElementById('weekends-setup');
    const resetDefaultsButton = document.getElementById('reset-defaults');
    const hourlyRateInput = document.getElementById('hourly-rate');
    const autoSendReceiptsToggle = document.getElementById('auto-send-receipts');
    
    // Create hidden inputs for default settings (since we removed the visible ones)
    const settingsContainer = document.querySelector('.p-4');
    const hiddenInputsContainer = document.createElement('div');
    hiddenInputsContainer.style.display = 'none';
    hiddenInputsContainer.innerHTML = `
        <select id="cleanings-per-day">
            <option value="2" selected>2 jobs per day</option>
        </select>
        <select id="cleaning-duration">
            <option value="180" selected>3 hours</option>
        </select>
        <select id="break-time">
            <option value="90" selected>1.5 hours</option>
        </select>
        <select id="max-hours">
            <option value="420" selected>7 hours</option>
        </select>
    `;
    settingsContainer.appendChild(hiddenInputsContainer);
    
    // Default values for settings
    const DEFAULT_JOBS_PER_DAY = 2;
    const DEFAULT_CLEANING_DURATION = 180; // 3 hours in minutes
    const DEFAULT_BREAK_TIME = 90; // 1.5 hours in minutes
    const DEFAULT_MAX_HOURS = 420; // 7 hours in minutes
    const DEFAULT_START_TIME = '8:00 AM';
    const DEFAULT_END_TIME = '5:00 PM';
    
    // Working days state
    const workingDays = {
        monday: {
            isWorking: true,
            startTime: DEFAULT_START_TIME,
            endTime: DEFAULT_END_TIME,
            jobsPerDay: DEFAULT_JOBS_PER_DAY,
            cleaningDuration: DEFAULT_CLEANING_DURATION,
            breakTime: DEFAULT_BREAK_TIME,
            maxHours: DEFAULT_MAX_HOURS
        },
        tuesday: {
            isWorking: true,
            startTime: DEFAULT_START_TIME,
            endTime: DEFAULT_END_TIME,
            jobsPerDay: DEFAULT_JOBS_PER_DAY,
            cleaningDuration: DEFAULT_CLEANING_DURATION,
            breakTime: DEFAULT_BREAK_TIME,
            maxHours: DEFAULT_MAX_HOURS
        },
        wednesday: {
            isWorking: true,
            startTime: DEFAULT_START_TIME,
            endTime: DEFAULT_END_TIME,
            jobsPerDay: DEFAULT_JOBS_PER_DAY,
            cleaningDuration: DEFAULT_CLEANING_DURATION,
            breakTime: DEFAULT_BREAK_TIME,
            maxHours: DEFAULT_MAX_HOURS
        },
        thursday: {
            isWorking: true,
            startTime: DEFAULT_START_TIME,
            endTime: DEFAULT_END_TIME,
            jobsPerDay: DEFAULT_JOBS_PER_DAY,
            cleaningDuration: DEFAULT_CLEANING_DURATION,
            breakTime: DEFAULT_BREAK_TIME,
            maxHours: DEFAULT_MAX_HOURS
        },
        friday: {
            isWorking: true,
            startTime: DEFAULT_START_TIME,
            endTime: DEFAULT_END_TIME,
            jobsPerDay: DEFAULT_JOBS_PER_DAY,
            cleaningDuration: DEFAULT_CLEANING_DURATION,
            breakTime: DEFAULT_BREAK_TIME,
            maxHours: DEFAULT_MAX_HOURS
        },
        saturday: {
            isWorking: false,
            startTime: DEFAULT_START_TIME,
            endTime: DEFAULT_END_TIME,
            jobsPerDay: DEFAULT_JOBS_PER_DAY,
            cleaningDuration: DEFAULT_CLEANING_DURATION,
            breakTime: DEFAULT_BREAK_TIME,
            maxHours: DEFAULT_MAX_HOURS
        },
        sunday: {
            isWorking: false,
            startTime: DEFAULT_START_TIME,
            endTime: DEFAULT_END_TIME,
            jobsPerDay: DEFAULT_JOBS_PER_DAY,
            cleaningDuration: DEFAULT_CLEANING_DURATION,
            breakTime: DEFAULT_BREAK_TIME,
            maxHours: DEFAULT_MAX_HOURS
        }
    };
    
    // Quick setup handlers
    monFriSetupButton.addEventListener('click', function() {
        setupDays(['monday', 'tuesday', 'wednesday', 'thursday', 'friday'], true);
        setupDays(['saturday', 'sunday'], false);
        updateQuickSetupButtons(this);
    });
    
    weekendsSetupButton.addEventListener('click', function() {
        setupDays(['monday', 'tuesday', 'wednesday', 'thursday', 'friday'], false);
        setupDays(['saturday', 'sunday'], true);
        updateQuickSetupButtons(this);
    });
    
    resetDefaultsButton.addEventListener('click', function() {
        if (confirm('Reset all days to default settings?')) {
            Object.keys(workingDays).forEach(day => {
                workingDays[day] = {
                    isWorking: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(day),
                    startTime: DEFAULT_START_TIME,
                    endTime: DEFAULT_END_TIME,
                    jobsPerDay: DEFAULT_JOBS_PER_DAY,
                    cleaningDuration: DEFAULT_CLEANING_DURATION,
                    breakTime: DEFAULT_BREAK_TIME,
                    maxHours: DEFAULT_MAX_HOURS
                };
                updateDayButtonStyle(day, workingDays[day].isWorking);
            });
            
            showSavingIndicator();
            validateAndSaveSettings();
        }
        updateQuickSetupButtons(monFriSetupButton);
    });
    
    function setupDays(daysList, isWorking) {
        daysList.forEach(day => {
            workingDays[day].isWorking = isWorking;
            updateDayButtonStyle(day, isWorking);
        });
        
        showSavingIndicator();
        validateAndSaveSettings();
    }
    
    function updateQuickSetupButtons(activeButton) {
        const allButtons = [monFriSetupButton, weekendsSetupButton, resetDefaultsButton];
        
        allButtons.forEach(btn => {
            btn.classList.toggle('bg-primary', btn === activeButton);
            btn.classList.toggle('text-white', btn === activeButton);
            btn.classList.toggle('bg-gray-200', btn !== activeButton);
            btn.classList.toggle('text-gray-700', btn !== activeButton);
        });
    }
    
    // Accordion functionality for day settings
    dayButtons.forEach(button => {
        button.addEventListener('click', function() {
            const day = this.getAttribute('data-day');
            const settings = document.querySelector(`[data-day-settings="${day}"]`);
            const arrow = this.querySelector('svg');
            
            // Close all other panels
            daySettings.forEach(panel => {
                if (panel !== settings) {
                    panel.classList.add('hidden');
                    const otherArrow = panel.previousElementSibling.querySelector('svg');
                    otherArrow.classList.remove('rotate-180');
                }
            });
            
            // Toggle current panel
            settings.classList.toggle('hidden');
            arrow.classList.toggle('rotate-180');
        });
    });
    
    // Make Working Day / Rest Day toggle
    document.querySelectorAll('[data-day-settings] button').forEach(button => {
        button.addEventListener('click', function() {
            const day = this.closest('[data-day-settings]').getAttribute('data-day-settings');
            const isCurrentlyWorking = workingDays[day].isWorking;
            
            workingDays[day].isWorking = !isCurrentlyWorking;
            updateDayButtonStyle(day, !isCurrentlyWorking);
            
            showSavingIndicator();
            validateAndSaveSettings();
        });
    });
    
    function updateDayButtonStyle(day, isWorking) {
        const button = document.querySelector(`[data-day="${day}"]`);
        const circle = button.querySelector('.rounded-full');
        const statusText = button.querySelector('.text-sm.text-gray-500');
        const settingsPanel = document.querySelector(`[data-day-settings="${day}"]`);
        
        if (isWorking) {
            circle.classList.remove('bg-gray-200', 'text-gray-600');
            circle.classList.add('bg-primary', 'text-white');
            statusText.textContent = 'Working Day';
            
            // Show time settings
            settingsPanel.innerHTML = `
                <div class="flex justify-end mb-3">
                    <label class="inline-flex items-center cursor-pointer">
                        <span class="mr-3 text-sm font-medium text-gray-700">Rest Day</span>
                        <div class="relative">
                            <input type="checkbox" value="" class="sr-only peer day-toggle" data-day-toggle="${day}" checked>
                            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-light rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </div>
                        <span class="ml-3 text-sm font-medium text-gray-700">Working Day</span>
                    </label>
                </div>
                <div class="grid grid-cols-2 gap-3 mb-3">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                        <select class="block w-full rounded-md border-gray-300 text-sm" data-start-time="${day}">
                            <option ${workingDays[day].startTime === '6:00 AM' ? 'selected' : ''}>6:00 AM</option>
                            <option ${workingDays[day].startTime === '6:30 AM' ? 'selected' : ''}>6:30 AM</option>
                            <option ${workingDays[day].startTime === '7:00 AM' ? 'selected' : ''}>7:00 AM</option>
                            <option ${workingDays[day].startTime === '7:30 AM' ? 'selected' : ''}>7:30 AM</option>
                            <option ${workingDays[day].startTime === '8:00 AM' ? 'selected' : ''}>8:00 AM</option>
                            <option ${workingDays[day].startTime === '8:30 AM' ? 'selected' : ''}>8:30 AM</option>
                            <option ${workingDays[day].startTime === '9:00 AM' ? 'selected' : ''}>9:00 AM</option>
                            <option ${workingDays[day].startTime === '9:30 AM' ? 'selected' : ''}>9:30 AM</option>
                            <option ${workingDays[day].startTime === '10:00 AM' ? 'selected' : ''}>10:00 AM</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                        <select class="block w-full rounded-md border-gray-300 text-sm" data-end-time="${day}">
                            <option ${workingDays[day].endTime === '3:00 PM' ? 'selected' : ''}>3:00 PM</option>
                            <option ${workingDays[day].endTime === '3:30 PM' ? 'selected' : ''}>3:30 PM</option>
                            <option ${workingDays[day].endTime === '4:00 PM' ? 'selected' : ''}>4:00 PM</option>
                            <option ${workingDays[day].endTime === '4:30 PM' ? 'selected' : ''}>4:30 PM</option>
                            <option ${workingDays[day].endTime === '5:00 PM' ? 'selected' : ''}>5:00 PM</option>
                            <option ${workingDays[day].endTime === '5:30 PM' ? 'selected' : ''}>5:30 PM</option>
                            <option ${workingDays[day].endTime === '6:00 PM' ? 'selected' : ''}>6:00 PM</option>
                            <option ${workingDays[day].endTime === '6:30 PM' ? 'selected' : ''}>6:30 PM</option>
                            <option ${workingDays[day].endTime === '7:00 PM' ? 'selected' : ''}>7:00 PM</option>
                        </select>
                    </div>
                </div>
                <div class="space-y-3">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Jobs on ${day.charAt(0).toUpperCase() + day.slice(1)}</label>
                        <select class="block w-full rounded-md border-gray-300 text-sm" data-jobs-per-day="${day}">
                            <option value="1" ${workingDays[day].jobsPerDay === 1 ? 'selected' : ''}>1 job</option>
                            <option value="2" ${workingDays[day].jobsPerDay === 2 ? 'selected' : ''}>2 jobs</option>
                            <option value="3" ${workingDays[day].jobsPerDay === 3 ? 'selected' : ''}>3 jobs</option>
                        </select>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Job Duration</label>
                            <select class="block w-full rounded-md border-gray-300 text-sm" data-cleaning-duration="${day}">
                                <option value="120" ${workingDays[day].cleaningDuration === 120 ? 'selected' : ''}>2 hours</option>
                                <option value="150" ${workingDays[day].cleaningDuration === 150 ? 'selected' : ''}>2.5 hours</option>
                                <option value="180" ${workingDays[day].cleaningDuration === 180 ? 'selected' : ''}>3 hours</option>
                                <option value="210" ${workingDays[day].cleaningDuration === 210 ? 'selected' : ''}>3.5 hours</option>
                                <option value="240" ${workingDays[day].cleaningDuration === 240 ? 'selected' : ''}>4 hours</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Break Time</label>
                            <select class="block w-full rounded-md border-gray-300 text-sm" data-break-time="${day}">
                                <option value="30" ${workingDays[day].breakTime === 30 ? 'selected' : ''}>30 min</option>
                                <option value="60" ${workingDays[day].breakTime === 60 ? 'selected' : ''}>1 hour</option>
                                <option value="90" ${workingDays[day].breakTime === 90 ? 'selected' : ''}>1.5 hours</option>
                                <option value="120" ${workingDays[day].breakTime === 120 ? 'selected' : ''}>2 hours</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Max Hours</label>
                        <select class="block w-full rounded-md border-gray-300 text-sm" data-max-hours="${day}">
                            <option value="300" ${workingDays[day].maxHours === 300 ? 'selected' : ''}>5 hours</option>
                            <option value="360" ${workingDays[day].maxHours === 360 ? 'selected' : ''}>6 hours</option>
                            <option value="420" ${workingDays[day].maxHours === 420 ? 'selected' : ''}>7 hours</option>
                            <option value="480" ${workingDays[day].maxHours === 480 ? 'selected' : ''}>8 hours</option>
                            <option value="540" ${workingDays[day].maxHours === 540 ? 'selected' : ''}>9 hours</option>
                        </select>
                    </div>
                </div>
            `;
            
            // Add event listeners to the newly created selects
            addDaySpecificListeners(day);
        } else {
            circle.classList.remove('bg-primary', 'text-white');
            circle.classList.add('bg-gray-200', 'text-gray-600');
            statusText.textContent = 'Rest Day';
            
            // Show "Make Working Day" button and toggle
            settingsPanel.innerHTML = `
                <div class="flex justify-end mb-3">
                    <label class="inline-flex items-center cursor-pointer">
                        <span class="mr-3 text-sm font-medium text-gray-700">Rest Day</span>
                        <div class="relative">
                            <input type="checkbox" value="" class="sr-only peer day-toggle" data-day-toggle="${day}">
                            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-light rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </div>
                        <span class="ml-3 text-sm font-medium text-gray-700">Working Day</span>
                    </label>
                </div>
                <div class="text-center py-2">
                    <p class="text-sm text-gray-500">This day is set as a rest day. Toggle the switch above to make it a working day.</p>
                </div>
            `;
            
            // Add event listener to the toggle
            const dayToggle = settingsPanel.querySelector(`[data-day-toggle="${day}"]`);
            if (dayToggle) {
                dayToggle.addEventListener('change', function() {
                    workingDays[day].isWorking = this.checked;
                    updateDayButtonStyle(day, this.checked);
                    showSavingIndicator();
                    validateAndSaveSettings();
                });
            }
        }
    }
    
    // Add event listeners for day-specific settings
    function addDaySpecificListeners(day) {
        // Start time
        const startTimeSelect = document.querySelector(`[data-start-time="${day}"]`);
        if (startTimeSelect) {
            startTimeSelect.addEventListener('change', function() {
                workingDays[day].startTime = this.value;
                showSavingIndicator();
                validateAndSaveSettings();
            });
        }
        
        // End time
        const endTimeSelect = document.querySelector(`[data-end-time="${day}"]`);
        if (endTimeSelect) {
            endTimeSelect.addEventListener('change', function() {
                workingDays[day].endTime = this.value;
                showSavingIndicator();
                validateAndSaveSettings();
            });
        }
        
        // Jobs per day
        const jobsPerDaySelect = document.querySelector(`[data-jobs-per-day="${day}"]`);
        if (jobsPerDaySelect) {
            jobsPerDaySelect.addEventListener('change', function() {
                workingDays[day].jobsPerDay = parseInt(this.value);
                showSavingIndicator();
                validateAndSaveSettings();
            });
        }
        
        // Cleaning duration
        const cleaningDurationSelect = document.querySelector(`[data-cleaning-duration="${day}"]`);
        if (cleaningDurationSelect) {
            cleaningDurationSelect.addEventListener('change', function() {
                workingDays[day].cleaningDuration = parseInt(this.value);
                showSavingIndicator();
                validateAndSaveSettings();
            });
        }
        
        // Break time
        const breakTimeSelect = document.querySelector(`[data-break-time="${day}"]`);
        if (breakTimeSelect) {
            breakTimeSelect.addEventListener('change', function() {
                workingDays[day].breakTime = parseInt(this.value);
                showSavingIndicator();
                validateAndSaveSettings();
            });
        }
        
        // Max hours
        const maxHoursSelect = document.querySelector(`[data-max-hours="${day}"]`);
        if (maxHoursSelect) {
            maxHoursSelect.addEventListener('change', function() {
                workingDays[day].maxHours = parseInt(this.value);
                showSavingIndicator();
                validateAndSaveSettings();
            });
        }
        
        // Day toggle
        const dayToggle = document.querySelector(`[data-day-toggle="${day}"]`);
        if (dayToggle) {
            dayToggle.addEventListener('change', function() {
                workingDays[day].isWorking = this.checked;
                updateDayButtonStyle(day, this.checked);
                showSavingIndicator();
                validateAndSaveSettings();
            });
        }
    }
    
    // Add change event listeners to default settings
    document.getElementById('cleanings-per-day').addEventListener('change', function() {
        // Ask if user wants to apply this change to all working days
        if (confirm('Do you want to apply this change to all working days?')) {
            Object.keys(workingDays).forEach(day => {
                if (workingDays[day].isWorking) {
                    workingDays[day].jobsPerDay = parseInt(this.value);
                    
                    // Update the day-specific select if it's visible
                    const daySelect = document.querySelector(`[data-jobs-per-day="${day}"]`);
                    if (daySelect) {
                        daySelect.value = this.value;
                    }
                }
            });
        }
        
        showSavingIndicator();
        validateAndSaveSettings();
    });
    
    document.getElementById('break-time').addEventListener('change', function() {
        // Ask if user wants to apply this change to all working days
        if (confirm('Do you want to apply this change to all working days?')) {
            Object.keys(workingDays).forEach(day => {
                if (workingDays[day].isWorking) {
                    workingDays[day].breakTime = parseInt(this.value);
                    
                    // Update the day-specific select if it's visible
                    const daySelect = document.querySelector(`[data-break-time="${day}"]`);
                    if (daySelect) {
                        daySelect.value = this.value;
                    }
                }
            });
        }
        
        showSavingIndicator();
        validateAndSaveSettings();
    });
    
    document.getElementById('cleaning-duration').addEventListener('change', function() {
        // Ask if user wants to apply this change to all working days
        if (confirm('Do you want to apply this change to all working days?')) {
            Object.keys(workingDays).forEach(day => {
                if (workingDays[day].isWorking) {
                    workingDays[day].cleaningDuration = parseInt(this.value);
                    
                    // Update the day-specific select if it's visible
                    const daySelect = document.querySelector(`[data-cleaning-duration="${day}"]`);
                    if (daySelect) {
                        daySelect.value = this.value;
                    }
                }
            });
        }
        
        showSavingIndicator();
        validateAndSaveSettings();
    });
    
    document.getElementById('max-hours').addEventListener('change', function() {
        // Ask if user wants to apply this change to all working days
        if (confirm('Do you want to apply this change to all working days?')) {
            Object.keys(workingDays).forEach(day => {
                if (workingDays[day].isWorking) {
                    workingDays[day].maxHours = parseInt(this.value);
                    
                    // Update the day-specific select if it's visible
                    const daySelect = document.querySelector(`[data-max-hours="${day}"]`);
                    if (daySelect) {
                        daySelect.value = this.value;
                    }
                }
            });
        }
        
        showSavingIndicator();
        validateAndSaveSettings();
    });
    
    hourlyRateInput.addEventListener('change', function() {
        showSavingIndicator();
        validateAndSaveSettings();
    });
    
    autoSendReceiptsToggle.addEventListener('change', function() {
        showSavingIndicator();
        validateAndSaveSettings();
    });
    
    // Saving indicator
    const savingIndicator = document.createElement('div');
    savingIndicator.className = 'fixed bottom-20 right-4 bg-primary text-white py-2 px-4 rounded-lg shadow-lg transform translate-y-10 opacity-0 transition-all duration-300';
    savingIndicator.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Saving...';
    document.body.appendChild(savingIndicator);
    
    function showSavingIndicator() {
        savingIndicator.classList.remove('translate-y-10', 'opacity-0');
    }
    
    function hideSavingIndicator(success = true) {
        if (success) {
            savingIndicator.innerHTML = '<i class="fas fa-check mr-2"></i> Saved!';
            setTimeout(() => {
                savingIndicator.classList.add('translate-y-10', 'opacity-0');
            }, 1500);
        } else {
            savingIndicator.innerHTML = '<i class="fas fa-times mr-2"></i> Error saving!';
            setTimeout(() => {
                savingIndicator.classList.add('translate-y-10', 'opacity-0');
            }, 3000);
        }
    }
    
    function validateTimeSlots() {
        // Validate each working day's time slots
        const workingDaysList = Object.entries(workingDays).filter(([_, settings]) => settings.isWorking);
        
        for (const [day, settings] of workingDaysList) {
            const startTime = new Date('2000-01-01 ' + settings.startTime);
            const endTime = new Date('2000-01-01 ' + settings.endTime);
            const cleaningsPerDay = settings.jobsPerDay;
            const cleaningDuration = settings.cleaningDuration;
            const breakTime = settings.breakTime;
            const maxHours = settings.maxHours;
            
            // 1. Validate that end time is after start time
            if (endTime <= startTime) {
                alert(`${day.charAt(0).toUpperCase() + day.slice(1)}: End time must be after start time`);
                return false;
            }
            
            // 2. Calculate total available minutes in the working day
            const totalAvailableMinutes = (endTime - startTime) / 60000; // Convert milliseconds to minutes
            
            // 3. Calculate total time needed for cleanings and breaks
            const totalCleaningMinutes = cleaningDuration * cleaningsPerDay;
            const totalBreakMinutes = breakTime * (cleaningsPerDay - 1); // One fewer breaks than cleanings
            const totalTimeNeeded = totalCleaningMinutes + totalBreakMinutes;
            
            console.log(`Validation for ${day}:`, {
                totalAvailableMinutes,
                maxHours,
                totalCleaningMinutes,
                totalBreakMinutes,
                totalTimeNeeded
            });
            
            // 4. Check if the total time needed fits within the working hours
            if (totalTimeNeeded > totalAvailableMinutes) {
                const maxPossibleJobDuration = Math.floor((totalAvailableMinutes - (breakTime * (cleaningsPerDay - 1))) / cleaningsPerDay);
                const maxPossibleJobs = Math.floor((totalAvailableMinutes + breakTime) / (cleaningDuration + breakTime));
                
                let suggestedChanges = '';
                
                if (maxPossibleJobDuration >= 120) {
                    suggestedChanges += `\n- Reduce job duration to ${Math.floor(maxPossibleJobDuration/60)} hours`;
                }
                
                if (maxPossibleJobs > 0) {
                    suggestedChanges += `\n- Reduce jobs per day to ${maxPossibleJobs}`;
                }
                
                suggestedChanges += `\n- Increase working hours for ${day}`;
                suggestedChanges += `\n- Reduce break time between jobs`;
                
                alert(`Your current settings won't fit in your working hours for ${day}.\n\nYou've selected ${cleaningsPerDay} jobs of ${cleaningDuration/60} hours each with ${breakTime/60} hour breaks, requiring ${Math.round(totalTimeNeeded/60)} total hours, but you only have ${Math.round(totalAvailableMinutes/60)} hours available.\n\nPossible solutions:${suggestedChanges}`);
                return false;
            }
            
            // 5. Check if the total time needed exceeds the maximum working hours
            if (totalCleaningMinutes > maxHours) {
                const maxPossibleJobDuration = Math.floor(maxHours / cleaningsPerDay);
                const maxPossibleJobs = Math.floor(maxHours / cleaningDuration);
                
                let suggestedChanges = '';
                
                if (maxPossibleJobDuration >= 120) {
                    suggestedChanges += `\n- Reduce job duration to ${Math.floor(maxPossibleJobDuration/60)} hours`;
                }
                
                if (maxPossibleJobs > 0) {
                    suggestedChanges += `\n- Reduce jobs per day to ${maxPossibleJobs}`;
                }
                
                suggestedChanges += `\n- Increase maximum working hours per day`;
                
                alert(`Your cleaning time exceeds your maximum working hours for ${day}.\n\nYou've selected ${cleaningsPerDay} jobs of ${cleaningDuration/60} hours each, requiring ${Math.round(totalCleaningMinutes/60)} hours of cleaning time, but your maximum is ${Math.round(maxHours/60)} hours.\n\nPossible solutions:${suggestedChanges}`);
                return false;
            }
        }
        
        return true;
    }
    
    function validateAndSaveSettings() {
        if (!validateTimeSlots()) {
            hideSavingIndicator(false);
            return;
        }
        saveSettings();
    }
    
    function saveSettings() {
        const user = firebase.auth().currentUser;
        
        if (!user) {
            console.error('User not logged in');
            hideSavingIndicator(false);
            return;
        }
        
        const timeSlots = calculateTimeSlots();
        console.log('Calculated time slots:', timeSlots);
        
        // Create compatibility layer for schedule.js
        const compatWorkingDays = {
            0: workingDays.sunday.isWorking,    // Sunday
            1: workingDays.monday.isWorking,    // Monday
            2: workingDays.tuesday.isWorking,   // Tuesday
            3: workingDays.wednesday.isWorking, // Wednesday
            4: workingDays.thursday.isWorking,  // Thursday
            5: workingDays.friday.isWorking,    // Friday
            6: workingDays.saturday.isWorking   // Saturday
        };
        
        // Convert time slots from object format to array format for schedule.js
        const dayMapping = {
            'sunday': 0,
            'monday': 1,
            'tuesday': 2,
            'wednesday': 3,
            'thursday': 4,
            'friday': 5,
            'saturday': 6
        };
        
        const formattedTimeSlots = [];
        Object.entries(timeSlots).forEach(([dayName, slots]) => {
            if (slots.length > 0) {
                formattedTimeSlots.push({
                    day: dayMapping[dayName],
                    slots: slots
                });
            }
        });
        
        console.log('Formatted time slots for schedule:', formattedTimeSlots);
        
        // Create settings object
        const settings = {
            workingDays: workingDays,
            // Compatibility properties for schedule.js
            workingDaysCompat: compatWorkingDays,
            workingHours: {
                start: workingDays.monday.startTime,
                end: workingDays.monday.endTime
            },
            cleaningsPerDay: parseInt(document.getElementById('cleanings-per-day').value),
            breakTime: parseInt(document.getElementById('break-time').value),
            cleaningDuration: parseInt(document.getElementById('cleaning-duration').value),
            maxHours: parseInt(document.getElementById('max-hours').value),
            hourlyRate: parseFloat(hourlyRateInput.value) || 0,
            autoSendReceipts: autoSendReceiptsToggle.checked,
            calculatedTimeSlots: formattedTimeSlots,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        console.log('Saving settings:', settings);
        
        // Save to Firestore
        firebase.firestore().collection('users').doc(user.uid)
            .set({ settings }, { merge: true })
            .then(() => {
                console.log('Settings saved successfully');
                hideSavingIndicator(true);
                
                // Force reload the schedule to show the new time slots
                if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
                    console.log('Reloading schedule with new settings...');
                    if (typeof loadUserSchedule === 'function') {
                        loadUserSchedule();
                    }
                }
            })
            .catch(error => {
                console.error('Error saving settings:', error);
                hideSavingIndicator(false);
            });
    }
    
    function loadSettings() {
        const user = firebase.auth().currentUser;
        
        if (!user) {
            console.error('User not logged in');
            return;
        }
        
        firebase.firestore().collection('users').doc(user.uid).get()
            .then(doc => {
                if (doc.exists && doc.data().settings) {
                    const settings = doc.data().settings;
                    console.log('Loading settings:', settings);
                    
                    // Populate working days
                    if (settings.workingDays) {
                        Object.entries(settings.workingDays).forEach(([day, daySettings]) => {
                            workingDays[day] = daySettings;
                            updateDayButtonStyle(day, daySettings.isWorking);
                            
                            // Update time selects if they exist
                            const startSelect = document.querySelector(`[data-start-time="${day}"]`);
                            const endSelect = document.querySelector(`[data-end-time="${day}"]`);
                            
                            if (startSelect && daySettings.startTime) {
                                startSelect.value = daySettings.startTime;
                            }
                            if (endSelect && daySettings.endTime) {
                                endSelect.value = daySettings.endTime;
                            }
                        });
                    }
                    
                    // Populate other settings
                    if (settings.cleaningsPerDay) {
                        document.getElementById('cleanings-per-day').value = settings.cleaningsPerDay;
                    }
                    
                    if (settings.breakTime) {
                        document.getElementById('break-time').value = settings.breakTime;
                    }
                    
                    if (settings.cleaningDuration) {
                        document.getElementById('cleaning-duration').value = settings.cleaningDuration;
                    }
                    
                    if (settings.maxHours) {
                        document.getElementById('max-hours').value = settings.maxHours;
                    }
                    
                    if (settings.hourlyRate) {
                        hourlyRateInput.value = settings.hourlyRate;
                    }
                    
                    if (typeof settings.autoSendReceipts !== 'undefined') {
                        autoSendReceiptsToggle.checked = settings.autoSendReceipts;
                        const toggle = autoSendReceiptsToggle.nextElementSibling;
                        toggle.querySelector('span').classList.toggle('translate-x-7', settings.autoSendReceipts);
                        toggle.classList.toggle('bg-primary', settings.autoSendReceipts);
                    }
                } else {
                    console.log('No settings found, using defaults');
                }
            })
            .catch(error => {
                console.error('Error loading settings:', error);
            });
    }
    
    // Initialize settings when auth state changes
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            console.log('User logged in, loading settings');
            loadSettings();
        } else {
            console.log('User not logged in, using defaults');
        }
    });
    
    // Toggle for auto-send receipts
    autoSendReceiptsToggle.addEventListener('change', function() {
        const toggleLabel = document.querySelector('label[for="auto-send-receipts"]');
        const toggleSpan = toggleLabel.querySelector('span');
        
        if (this.checked) {
            toggleLabel.classList.add('bg-primary');
            toggleLabel.classList.remove('bg-gray-300');
            toggleSpan.classList.add('translate-x-7');
            toggleSpan.classList.remove('translate-x-1');
        } else {
            toggleLabel.classList.remove('bg-primary');
            toggleLabel.classList.add('bg-gray-300');
            toggleSpan.classList.remove('translate-x-7');
            toggleSpan.classList.add('translate-x-1');
        }
    });

    function calculateTimeSlots() {
        const slots = {};
        
        // Calculate slots for each working day
        Object.entries(workingDays).forEach(([day, settings]) => {
            if (!settings.isWorking) {
                slots[day] = [];
                return;
            }
            
            console.log(`Calculating slots for ${day}:`, settings);
            
            const startTime = new Date('2000-01-01 ' + settings.startTime);
            const endTime = new Date('2000-01-01 ' + settings.endTime);
            const cleaningsPerDay = settings.jobsPerDay || 2;
            const cleaningDuration = settings.cleaningDuration || 180;
            const breakTime = settings.breakTime || 90;
            
            console.log(`${day} settings:`, {
                startTime: settings.startTime,
                endTime: settings.endTime,
                cleaningsPerDay,
                cleaningDuration,
                breakTime
            });
            
            const daySlots = [];
            let currentTime = new Date(startTime);
            
            for (let i = 0; i < cleaningsPerDay; i++) {
                // Add the cleaning slot
                const slotEnd = new Date(currentTime.getTime() + cleaningDuration * 60000);
                const slotObj = {
                    start: currentTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }),
                    end: slotEnd.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }),
                    durationMinutes: cleaningDuration
                };
                
                console.log(`Adding slot ${i+1} for ${day}:`, slotObj);
                daySlots.push(slotObj);
                
                // Add break time if not the last cleaning
                if (i < cleaningsPerDay - 1) {
                    currentTime = new Date(slotEnd.getTime() + breakTime * 60000);
                }
            }
            
            console.log(`Generated ${daySlots.length} slots for ${day}:`, daySlots);
            slots[day] = daySlots;
        });
        
        return slots;
    }

    // Add change event listeners for day-specific time settings
    function addTimeSettingsListeners() {
        document.addEventListener('change', function(e) {
            const startTimeMatch = e.target.getAttribute('data-start-time');
            const endTimeMatch = e.target.getAttribute('data-end-time');
            const jobsPerDayMatch = e.target.getAttribute('data-jobs-per-day');
            const cleaningDurationMatch = e.target.getAttribute('data-cleaning-duration');
            const breakTimeMatch = e.target.getAttribute('data-break-time');
            const maxHoursMatch = e.target.getAttribute('data-max-hours');
            
            let day = null;
            
            if (startTimeMatch) {
                day = startTimeMatch;
                workingDays[day].startTime = e.target.value;
            } else if (endTimeMatch) {
                day = endTimeMatch;
                workingDays[day].endTime = e.target.value;
            } else if (jobsPerDayMatch) {
                day = jobsPerDayMatch;
                workingDays[day].jobsPerDay = parseInt(e.target.value);
            } else if (cleaningDurationMatch) {
                day = cleaningDurationMatch;
                workingDays[day].cleaningDuration = parseInt(e.target.value);
            } else if (breakTimeMatch) {
                day = breakTimeMatch;
                workingDays[day].breakTime = parseInt(e.target.value);
            } else if (maxHoursMatch) {
                day = maxHoursMatch;
                workingDays[day].maxHours = parseInt(e.target.value);
            }
            
            if (day) {
                showSavingIndicator();
                validateAndSaveSettings();
            }
        });
    }

    // Initialize time settings listeners
    addTimeSettingsListeners();
}); 