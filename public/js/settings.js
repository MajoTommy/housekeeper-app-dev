document.addEventListener('DOMContentLoaded', function() {
    // Firebase initialization check
    if (!firebase.apps.length) {
        console.error('Firebase not initialized');
        return;
    }

    console.log('Settings.js loaded');

    // References to form elements
    const dayToggles = document.querySelectorAll('.day-toggle');
    const daySettings = document.querySelectorAll('[data-day-settings]');
    const autoSendReceiptsToggle = document.getElementById('auto-send-receipts');
    
    // Create hidden inputs for default settings
    const settingsContainer = document.querySelector('.p-4');
    const hiddenInputsContainer = document.createElement('div');
    hiddenInputsContainer.style.display = 'none';
    hiddenInputsContainer.innerHTML = `
        <select id="cleanings-per-day">
            <option value="2" selected>2 jobs per day</option>
        </select>
        <select id="break-time">
            <option value="90" selected>1.5 hours</option>
        </select>
    `;
    settingsContainer.appendChild(hiddenInputsContainer);
    
    // Default values for settings
    const DEFAULT_JOBS_PER_DAY = 2;
    const DEFAULT_BREAK_TIME = 90; // 1.5 hours in minutes
    const DEFAULT_START_TIME = '8:00 AM';
    const DEFAULT_END_TIME = '5:00 PM';
    const DEFAULT_JOB_DURATION = 180; // 3 hours in minutes
    
    // Initialize default working days
    const workingDays = {
        monday: { 
            isWorking: true, 
            startTime: '8:00 AM', 
            jobsPerDay: 2, 
            breakTime: 90, // Legacy - kept for backward compatibility
            breakDurations: [90],  // New array to store individual break durations
            jobDurations: [DEFAULT_JOB_DURATION, DEFAULT_JOB_DURATION]
        },
        tuesday: { 
            isWorking: true, 
            startTime: '8:00 AM', 
            jobsPerDay: 2, 
            breakTime: 90,
            breakDurations: [90],
            jobDurations: [DEFAULT_JOB_DURATION, DEFAULT_JOB_DURATION]
        },
        wednesday: { 
            isWorking: false, 
            startTime: '8:00 AM', 
            jobsPerDay: 2, 
            breakTime: 90,
            breakDurations: [90],
            jobDurations: [DEFAULT_JOB_DURATION, DEFAULT_JOB_DURATION]
        },
        thursday: { 
            isWorking: true, 
            startTime: '8:00 AM', 
            jobsPerDay: 2, 
            breakTime: 90,
            breakDurations: [90],
            jobDurations: [DEFAULT_JOB_DURATION, DEFAULT_JOB_DURATION]
        },
        friday: { 
            isWorking: true, 
            startTime: '8:00 AM', 
            jobsPerDay: 2, 
            breakTime: 90,
            breakDurations: [90],
            jobDurations: [DEFAULT_JOB_DURATION, DEFAULT_JOB_DURATION]
        },
        saturday: { 
            isWorking: false, 
            startTime: '8:00 AM', 
            jobsPerDay: 2, 
            breakTime: 90,
            breakDurations: [90],
            jobDurations: [DEFAULT_JOB_DURATION, DEFAULT_JOB_DURATION]
        },
        sunday: { 
            isWorking: false, 
            startTime: '8:00 AM', 
            jobsPerDay: 2, 
            breakTime: 90,
            breakDurations: [90],
            jobDurations: [DEFAULT_JOB_DURATION, DEFAULT_JOB_DURATION]
        }
    };
    
    // Day toggle handlers
    dayToggles.forEach(toggle => {
        toggle.addEventListener('change', function() {
            const day = this.getAttribute('data-day-toggle');
            workingDays[day].isWorking = this.checked;
            
            // Show/hide settings panel
            const settingsPanel = document.querySelector(`[data-day-settings="${day}"]`);
            if (settingsPanel) {
                if (this.checked) {
                    settingsPanel.classList.remove('hidden');
                    updateDayVisualIndicators(day);
                } else {
                    settingsPanel.classList.add('hidden');
                }
            }
            
            // Update visual style of the day card
            const dayCard = this.closest('.rounded-lg');
            const dayIcon = dayCard.querySelector('.rounded-full');
            
            if (this.checked) {
                dayIcon.classList.remove('bg-gray-300');
                dayIcon.classList.add('bg-primary');
            } else {
                dayIcon.classList.remove('bg-primary');
                dayIcon.classList.add('bg-gray-300');
            }
            
            showSavingIndicator();
            validateAndSaveSettings();
        });
    });
    
    // Day card header click to expand/collapse
    document.querySelectorAll('.rounded-lg > div:first-child').forEach(header => {
        header.addEventListener('click', function(e) {
            // Don't trigger if clicking on the toggle switch
            if (e.target.closest('.inline-flex') || e.target.closest('input')) {
                return;
            }
            
            const card = this.closest('.rounded-lg');
            const day = card.querySelector('.day-toggle').getAttribute('data-day-toggle');
            const settingsPanel = document.querySelector(`[data-day-settings="${day}"]`);
            
            if (settingsPanel) {
                settingsPanel.classList.toggle('hidden');
                
                // Make sure the day is working if we're showing the settings
                if (!settingsPanel.classList.contains('hidden')) {
                    const toggle = card.querySelector('.day-toggle');
                    if (toggle && !toggle.checked) {
                        toggle.checked = true;
                        workingDays[day].isWorking = true;
                        
                        // Update UI
                        const dayIcon = card.querySelector('.rounded-full');
                        dayIcon.classList.remove('bg-gray-300');
                        dayIcon.classList.add('bg-primary');
            
            showSavingIndicator();
            validateAndSaveSettings();
        }
                }
            }
        });
    });
    
    // Job option radio button handlers
    document.querySelectorAll('[data-job-option]').forEach(option => {
        option.addEventListener('click', function() {
            const jobCount = parseInt(this.getAttribute('data-job-option'));
            const day = this.querySelector('input').getAttribute('data-jobs-input');
            
            // Update selected state
            const container = this.closest('.flex');
            container.querySelectorAll('[data-job-option]').forEach(opt => {
                opt.classList.remove('bg-blue-50', 'border-blue-300');
            });
            this.classList.add('bg-blue-50', 'border-blue-300');
            
            // Update job count in state
            workingDays[day].jobsPerDay = jobCount;
            
            // Update visual timeline
            updateDayVisualIndicators(day);
        
        showSavingIndicator();
        validateAndSaveSettings();
        });
    });
    
    // Job duration radio button handlers
    document.querySelectorAll('[data-duration-option]').forEach(option => {
        option.addEventListener('click', function() {
            const duration = parseInt(this.getAttribute('data-duration-option'));
            const day = this.querySelector('input').getAttribute('data-duration-input');
            
            // Update selected state
            const container = this.closest('.flex');
            container.querySelectorAll('[data-duration-option]').forEach(opt => {
                opt.classList.remove('bg-blue-50', 'border-blue-300');
            });
            this.classList.add('bg-blue-50', 'border-blue-300');
            
            // Update job duration in state
            workingDays[day].jobDurations = Array(workingDays[day].jobsPerDay).fill(duration);
            
            // Update visual timeline
            updateDayVisualIndicators(day);
            
            showSavingIndicator();
            validateAndSaveSettings();
        });
    });
    
    // Break time radio button handlers
    document.querySelectorAll('[data-break-option]').forEach(option => {
        option.addEventListener('click', function() {
            const breakTime = parseInt(this.getAttribute('data-break-option'));
            const day = this.querySelector('input').getAttribute('data-break-input');
            
            // Update selected state
            const container = this.closest('.flex');
            container.querySelectorAll('[data-break-option]').forEach(opt => {
                opt.classList.remove('bg-blue-50', 'border-blue-300');
            });
            this.classList.add('bg-blue-50', 'border-blue-300');
            
            // Update break time in state
            workingDays[day].breakTime = breakTime;
            
            // Update visual timeline
            updateDayVisualIndicators(day);
            
            showSavingIndicator();
            validateAndSaveSettings();
        });
    });
    
    // Convert 24-hour format time to AM/PM display
    function convertTo12HourFormat(timeStr) {
        // Handle empty strings
        if (!timeStr) return '';
        
        // If already in 12-hour format, return as is
        if (timeStr.includes('AM') || timeStr.includes('PM')) {
            return timeStr;
        }
        
        try {
            // Parse time in 24-hour format (HH:MM)
            const [hours, minutes] = timeStr.split(':').map(Number);
            
            // Convert to 12-hour format
            const period = hours >= 12 ? 'PM' : 'AM';
            const hours12 = hours % 12 || 12;
            
            // Format the time string
            return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
        } catch (error) {
            console.error('Error converting time format:', error);
            return timeStr;
        }
    }
    
    // Convert AM/PM time to 24-hour format for the input
    function convertTo24HourFormat(timeStr) {
        // If already in 24-hour format or empty, return as is
        if (!timeStr || (timeStr.includes(':') && !timeStr.includes('AM') && !timeStr.includes('PM'))) {
            return timeStr;
        }
        
        try {
            // Parse the 12-hour format time
            const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
            if (!match) return timeStr;
            
            let hours = parseInt(match[1]);
            const minutes = parseInt(match[2]);
            const period = match[3].toUpperCase();
            
            // Convert to 24-hour format
            if (period === 'PM' && hours < 12) hours += 12;
            if (period === 'AM' && hours === 12) hours = 0;
            
            // Format the time string for the input
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        } catch (error) {
            console.error('Error converting to 24-hour format:', error);
            return timeStr;
        }
    }
    
    // Start time change handler
    document.addEventListener('change', function(e) {
        const startTimeMatch = e.target.getAttribute('data-start-time');
        const breakTimeMatch = e.target.getAttribute('data-break-time');
        
        let day = null;
        
        if (startTimeMatch) {
            day = startTimeMatch;
            // For type="time" inputs, they return 24-hour format (HH:MM)
            // We need to convert to 12-hour format for our internal data
            const timeValue = e.target.value;
            workingDays[day].startTime = convertTo12HourFormat(timeValue);
            
            // Update visual timeline
            updateDayVisualIndicators(day);
        } else if (breakTimeMatch) {
            day = breakTimeMatch;
            workingDays[day].breakTime = parseInt(e.target.value);
            
            // Update visual timeline
            updateDayVisualIndicators(day);
        }
        
        if (day) {
            showSavingIndicator();
            validateAndSaveSettings();
        }
    });
    
    // Function to update the visual job timeline
    function updateDayVisualIndicators(day) {
        const timelineContainer = document.querySelector(`[data-day-settings="${day}"] .bg-white.p-3.rounded-md.border`);
        if (!timelineContainer) return;
        
        const startTimeSelect = document.querySelector(`[data-start-time="${day}"]`);
        
        // Get the current settings
        const jobCount = workingDays[day].jobsPerDay || 2;
        const startTime = startTimeSelect ? startTimeSelect.value : workingDays[day].startTime;
        
        // Initialize job durations if not set
        if (!workingDays[day].jobDurations) {
            workingDays[day].jobDurations = Array(jobCount).fill(DEFAULT_JOB_DURATION);
        }
        
        // Make sure we have enough durations for all jobs
        while (workingDays[day].jobDurations.length < jobCount) {
            workingDays[day].jobDurations.push(DEFAULT_JOB_DURATION);
        }
        
        // Trim extra durations if needed
        if (workingDays[day].jobDurations.length > jobCount) {
            workingDays[day].jobDurations = workingDays[day].jobDurations.slice(0, jobCount);
        }
        
        // Initialize break durations if not set
        if (!workingDays[day].breakDurations) {
            // If we have a legacy breakTime, use it for all breaks
            const breakTime = workingDays[day].breakTime || DEFAULT_BREAK_TIME;
            workingDays[day].breakDurations = Array(jobCount - 1).fill(breakTime);
        }
        
        // Make sure we have enough break durations
        while (workingDays[day].breakDurations.length < jobCount - 1) {
            workingDays[day].breakDurations.push(DEFAULT_BREAK_TIME);
        }
        
        // Trim extra break durations if needed
        if (workingDays[day].breakDurations.length > jobCount - 1) {
            workingDays[day].breakDurations = workingDays[day].breakDurations.slice(0, jobCount - 1);
        }
        
        // Calculate timeline
        const timeline = [];
        let currentTime = new Date(`2000-01-01 ${startTime}`);
        
        // Add job slots
        for (let i = 0; i < jobCount; i++) {
            // Get the duration for this specific job
            const jobDuration = workingDays[day].jobDurations[i];
            
            // Add job
            const jobStart = formatTime(currentTime);
            const jobEnd = new Date(currentTime.getTime() + jobDuration * 60000);
            timeline.push({
                type: 'job',
                index: i + 1,
                startTime: jobStart,
                endTime: formatTime(jobEnd),
                duration: jobDuration,
                durationText: getDurationText(jobDuration)
            });
            
            // Add break if not the last job
            if (i < jobCount - 1) {
                // Get the duration for this specific break
                const breakDuration = workingDays[day].breakDurations[i];
                
                const breakStart = new Date(jobEnd);
                const breakEnd = new Date(breakStart.getTime() + breakDuration * 60000);
                timeline.push({
                    type: 'break',
                    index: i, // Add index to identify which break this is
                    startTime: formatTime(breakStart),
                    endTime: formatTime(breakEnd),
                    duration: breakDuration,
                    durationText: getBreakDurationText(breakDuration)
                });
                currentTime = new Date(breakEnd);
            } else {
                // Final end time
                timeline.push({
                    type: 'end',
                    time: formatTime(jobEnd)
                });
            }
        }
        
        // Render the timeline
        let timelineHTML = '';
        timeline.forEach(item => {
            if (item.type === 'job') {
                const hours = item.duration / 60;
                timelineHTML += `
                    <div class="flex items-start text-sm ${item.index > 1 ? 'mt-4' : ''}">
                        <div class="w-16 text-gray-500 pt-2">${item.startTime}</div>
                        <div class="flex-1">
                            <div class="bg-blue-100 rounded-md border-l-4 border-blue-500 overflow-hidden">
                                <!-- Job header with title -->
                                <div class="px-3 py-2 font-medium text-blue-800 border-b border-blue-200">
                                    Job ${item.index}
                                </div>
                                
                                <!-- Duration controls in a separate row -->
                                <div class="px-3 py-3 bg-blue-50 flex items-center justify-between">
                                    <div class="text-blue-700 font-medium">
                                        ${item.durationText}
                        </div>
                                    <div class="flex items-center space-x-4">
                                        <button type="button" class="h-10 w-10 rounded-full bg-white border border-blue-300 flex items-center justify-center text-blue-800 shadow-sm" data-job-decrease="${day}-${item.index - 1}" ${hours <= 1 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                                            <i class="fas fa-minus text-lg"></i>
                                        </button>
                                        <button type="button" class="h-10 w-10 rounded-full bg-white border border-blue-300 flex items-center justify-center text-blue-800 shadow-sm" data-job-increase="${day}-${item.index - 1}" ${hours >= 5 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                                            <i class="fas fa-plus text-lg"></i>
                                        </button>
                </div>
                    </div>
                    </div>
                </div>
                    </div>
                `;
            } else if (item.type === 'break') {
                timelineHTML += `
                    <div class="flex items-start text-sm mt-3">
                        <div class="w-16 text-gray-500 pt-2">${item.startTime}</div>
                        <div class="flex-1">
                            <div class="bg-gray-100 rounded-md overflow-hidden">
                                <!-- Break header -->
                                <div class="px-3 py-2 font-medium text-gray-600 border-b border-gray-200">
                                    Break
                        </div>
                                
                                <!-- Duration controls in a separate row -->
                                <div class="px-3 py-3 bg-gray-50 flex items-center justify-between">
                                    <div class="text-gray-600 font-medium">
                                        ${item.durationText}
                        </div>
                                    <div class="flex items-center space-x-4">
                                        <button type="button" class="h-9 w-9 rounded-full bg-white border border-gray-300 flex items-center justify-center text-gray-600 shadow-sm" data-break-decrease="${day}-${item.index}" ${item.duration <= 30 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                                            <i class="fas fa-minus"></i>
                                        </button>
                                        <button type="button" class="h-9 w-9 rounded-full bg-white border border-gray-300 flex items-center justify-center text-gray-600 shadow-sm" data-break-increase="${day}-${item.index}" ${item.duration >= 180 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                                            <i class="fas fa-plus"></i>
                                        </button>
                    </div>
                    </div>
                </div>
                        </div>
                </div>
                `;
            } else if (item.type === 'end') {
                timelineHTML += `
                    <div class="flex items-center text-sm mt-4">
                        <div class="w-16 text-gray-500">${item.time}</div>
                        <div class="flex-1 bg-gray-50 py-2 px-3 rounded-md border border-gray-200 text-gray-500">
                            Done for the day
                        </div>
                </div>
            `;
            }
        });
        
        timelineContainer.innerHTML = timelineHTML;
        
        // Add event listeners to the + and - buttons for jobs
        timeline.filter(item => item.type === 'job').forEach((item, index) => {
            const decreaseButton = timelineContainer.querySelector(`[data-job-decrease="${day}-${index}"]`);
            const increaseButton = timelineContainer.querySelector(`[data-job-increase="${day}-${index}"]`);
            
            if (decreaseButton) {
                decreaseButton.addEventListener('click', function() {
                    const currentDuration = workingDays[day].jobDurations[index];
                    // Minimum duration is 60 minutes (1 hour)
                    if (currentDuration > 60) {
                        workingDays[day].jobDurations[index] = currentDuration - 30;
                        updateDayVisualIndicators(day);
                showSavingIndicator();
                validateAndSaveSettings();
                    }
                });
            }
            
            if (increaseButton) {
                increaseButton.addEventListener('click', function() {
                    const currentDuration = workingDays[day].jobDurations[index];
                    // Maximum duration is 300 minutes (5 hours)
                    if (currentDuration < 300) {
                        workingDays[day].jobDurations[index] = currentDuration + 30;
                        updateDayVisualIndicators(day);
                showSavingIndicator();
                validateAndSaveSettings();
                    }
                });
            }
        });
        
        // Add event listeners to the + and - buttons for breaks
        timeline.filter(item => item.type === 'break').forEach(breakItem => {
            const breakIndex = breakItem.index;
            const breakDecreaseButton = timelineContainer.querySelector(`[data-break-decrease="${day}-${breakIndex}"]`);
            const breakIncreaseButton = timelineContainer.querySelector(`[data-break-increase="${day}-${breakIndex}"]`);
            
            if (breakDecreaseButton) {
                breakDecreaseButton.addEventListener('click', function() {
                    const currentBreakTime = workingDays[day].breakDurations[breakIndex];
                    // Minimum break is 30 minutes
                    if (currentBreakTime > 30) {
                        workingDays[day].breakDurations[breakIndex] = currentBreakTime - 30;
                        updateDayVisualIndicators(day);
                        showSavingIndicator();
                        validateAndSaveSettings();
                    }
                });
            }
            
            if (breakIncreaseButton) {
                breakIncreaseButton.addEventListener('click', function() {
                    const currentBreakTime = workingDays[day].breakDurations[breakIndex];
                    // Maximum break is 180 minutes (3 hours)
                    if (currentBreakTime < 180) {
                        workingDays[day].breakDurations[breakIndex] = currentBreakTime + 30;
                        updateDayVisualIndicators(day);
                        showSavingIndicator();
                        validateAndSaveSettings();
                    }
                });
            }
        });
        
        // Also calculate and update end time in the state
        const lastItem = timeline.find(item => item.type === 'end');
        if (lastItem) {
            workingDays[day].endTime = lastItem.time;
        }
    }
    
    function getBreakDurationText(breakMinutes) {
        if (breakMinutes < 60) {
            return `${breakMinutes} min`;
        } else if (breakMinutes === 60) {
            return `1 hour`;
        } else if (breakMinutes % 60 === 0) {
            return `${breakMinutes / 60} hours`;
        } else {
            return `${Math.floor(breakMinutes / 60)}.${Math.floor((breakMinutes % 60) / 6)} hours`;
        }
    }
    
    function getDurationText(durationMinutes) {
        const hours = durationMinutes / 60;
        return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    
    function formatTime(dateObj) {
        return dateObj.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit', 
            hour12: true 
        });
    }
    
    // Initialize the visual indicators for all working days
            Object.keys(workingDays).forEach(day => {
                if (workingDays[day].isWorking) {
            updateDayVisualIndicators(day);
        }
    });
    
    // Saving indicator
    const savingIndicator = document.createElement('div');
    savingIndicator.className = 'fixed bottom-20 right-4 bg-primary text-white py-2 px-4 rounded-lg shadow-lg transform translate-y-10 opacity-0 transition-all duration-300';
    savingIndicator.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Saving...';
    document.body.appendChild(savingIndicator);
    
    function showSavingIndicator() {
        savingIndicator.classList.remove('translate-y-10', 'opacity-0');
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
        const newBreakTime = parseInt(this.value);
        
        // Ask if user wants to apply this change to all working days
        if (confirm('Do you want to apply this change to all working days?')) {
            Object.keys(workingDays).forEach(day => {
                if (workingDays[day].isWorking) {
                    // Update both legacy breakTime and new breakDurations array
                    workingDays[day].breakTime = newBreakTime;
                    
                    // Initialize or update break durations array
                    const jobCount = workingDays[day].jobsPerDay || 2;
                    if (!workingDays[day].breakDurations) {
                        workingDays[day].breakDurations = Array(jobCount - 1).fill(newBreakTime);
                    } else {
                        // Fill all break durations with the new value
                        workingDays[day].breakDurations = workingDays[day].breakDurations.map(() => newBreakTime);
                    }
                    
                    // Update the day-specific select if it's visible
                    const daySelect = document.querySelector(`[data-break-time="${day}"]`);
                    if (daySelect) {
                        daySelect.value = String(newBreakTime);
                    }
                }
            });
        }
        
        showSavingIndicator();
        validateAndSaveSettings();
    });
    
    autoSendReceiptsToggle.addEventListener('change', function() {
        showSavingIndicator();
        validateAndSaveSettings();
    });
    
    function validateTimeSlots() {
        // Use our new validateTimeSettings function for each working day
        const workingDaysList = Object.entries(workingDays).filter(([_, settings]) => settings.isWorking);
        let allValid = true;
        let warningMessages = [];
        
        for (const [day, _] of workingDaysList) {
            if (!validateTimeSettings(day)) {
                allValid = false;
                
                // Get specific validation error messages for this day
                const settings = workingDays[day];
                const dayName = day.charAt(0).toUpperCase() + day.slice(1);
                
                try {
                    // iOS-compatible time parsing
                    let startTime, endTime;
                    
                    // Parse start time
                    const startTimeStr = settings.startTime;
                    if (startTimeStr.includes(':')) {
                        const startMatch = startTimeStr.match(/(\d+):(\d+)\s*(AM|PM|am|pm)?/i);
                        if (startMatch) {
                            let hours = parseInt(startMatch[1]);
                            const minutes = parseInt(startMatch[2]);
                            const period = startMatch[3] ? startMatch[3].toUpperCase() : null;
                            
                            // Convert to 24-hour format if AM/PM is specified
                            if (period === 'PM' && hours < 12) hours += 12;
                            if (period === 'AM' && hours === 12) hours = 0;
                            
                            startTime = new Date(2000, 0, 1);
                            startTime.setHours(hours, minutes, 0, 0);
                        } else {
                            warningMessages.push(`${dayName}: Invalid start time format`);
                            throw new Error("Invalid start time format");
                        }
                    } else {
                        warningMessages.push(`${dayName}: Invalid start time format`);
                        throw new Error("Invalid start time format");
                    }
                    
                    // Parse end time (if used)
                    if (settings.endTime) {
                        const endTimeStr = settings.endTime;
                        if (endTimeStr.includes(':')) {
                            const endMatch = endTimeStr.match(/(\d+):(\d+)\s*(AM|PM|am|pm)?/i);
                            if (endMatch) {
                                let hours = parseInt(endMatch[1]);
                                const minutes = parseInt(endMatch[2]);
                                const period = endMatch[3] ? endMatch[3].toUpperCase() : null;
                                
                                // Convert to 24-hour format if AM/PM is specified
                                if (period === 'PM' && hours < 12) hours += 12;
                                if (period === 'AM' && hours === 12) hours = 0;
                                
                                endTime = new Date(2000, 0, 1);
                                endTime.setHours(hours, minutes, 0, 0);
                            } else {
                                warningMessages.push(`${dayName}: Invalid end time format`);
                                throw new Error("Invalid end time format");
                            }
                        } else {
                            warningMessages.push(`${dayName}: Invalid end time format`);
                            throw new Error("Invalid end time format");
                        }
                    } else {
                        // If no end time, calculate based on start time and job duration
                        endTime = new Date(startTime.getTime());
                        const totalMinutes = (settings.jobsPerDay || 2) * 180; // Default 3 hours per job
                        endTime.setMinutes(endTime.getMinutes() + totalMinutes);
                    }
                    
                    if (isNaN(startTime) || (endTime && isNaN(endTime))) {
                        warningMessages.push(`${dayName}: Invalid time format`);
                    } else if (endTime && startTime >= endTime) {
                        warningMessages.push(`${dayName}: End time must be after start time`);
                    } else {
                        // Calculate time requirements
                        const totalMinutes = (endTime - startTime) / (60 * 1000);
                        const jobsPerDay = settings.jobsPerDay || 2;
                        const cleaningDuration = 180; // Fixed at 3 hours
                        const breakTime = settings.breakTime || 90;
                        const requiredMinutes = (cleaningDuration * jobsPerDay) + (breakTime * (jobsPerDay - 1));
                        
                        if (totalMinutes < requiredMinutes) {
                            warningMessages.push(`${dayName}: Not enough time for ${jobsPerDay} jobs`);
                        }
                    }
                } catch (error) {
                    warningMessages.push(`${dayName}: Invalid settings`);
                }
            }
        }
        
        // Display warnings if we have any
        if (warningMessages.length > 0) {
            // Create or update warning banner
            let warningBanner = document.getElementById('settings-warning-banner');
            if (!warningBanner) {
                warningBanner = document.createElement('div');
                warningBanner.id = 'settings-warning-banner';
                warningBanner.className = 'fixed top-16 right-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded shadow-md max-w-md z-50 transform transition-all duration-300';
                document.body.appendChild(warningBanner);
            }
            
            // Populate warning content
            warningBanner.innerHTML = `
                <div class="flex items-start">
                    <div class="flex-shrink-0">
                        <i class="fas fa-exclamation-triangle text-yellow-600"></i>
                    </div>
                    <div class="ml-3">
                        <h3 class="text-sm font-medium">Schedule Warning</h3>
                        <div class="mt-1 text-xs">
                            <ul class="list-disc pl-5 space-y-1">
                                ${warningMessages.map(msg => `<li>${msg}</li>`).join('')}
                            </ul>
                        </div>
                        <div class="mt-2 text-xs">
                            <p>Your settings have been saved, but may need adjustment.</p>
                        </div>
                        <button id="dismiss-warning" class="mt-2 px-2 py-1 text-xs text-yellow-800 hover:bg-yellow-200 rounded">Dismiss</button>
                    </div>
                </div>
            `;
            
            // Show the banner
            setTimeout(() => {
                warningBanner.classList.add('translate-y-2');
            }, 100);
            
            // Add dismiss functionality
            document.getElementById('dismiss-warning').addEventListener('click', function() {
                warningBanner.classList.remove('translate-y-2');
                setTimeout(() => {
                    warningBanner.remove();
                }, 300);
            });
            
            // Auto-dismiss after 15 seconds
            setTimeout(() => {
                if (document.getElementById('settings-warning-banner')) {
                    document.getElementById('settings-warning-banner').classList.remove('translate-y-2');
                    setTimeout(() => {
                        if (document.getElementById('settings-warning-banner')) {
                            document.getElementById('settings-warning-banner').remove();
                        }
                    }, 300);
                }
            }, 15000);
        }
        
        // Always return true to allow saving, we just show warnings
        return true;
    }
    
    function validateTimeSettings(day) {
        try {
            const daySettings = workingDays[day];
            
            if (!daySettings.isWorking) {
                return true; // No need to validate non-working days
            }
            
            // iOS-compatible time parsing
            let startTime;
            const startTimeStr = daySettings.startTime;
            
            // Parse time string in a way that works across all devices
            if (startTimeStr.includes(':')) {
                const timeMatch = startTimeStr.match(/(\d+):(\d+)\s*(AM|PM|am|pm)?/i);
                if (timeMatch) {
                    let hours = parseInt(timeMatch[1]);
                    const minutes = parseInt(timeMatch[2]);
                    const period = timeMatch[3] ? timeMatch[3].toUpperCase() : null;
                    
                    // Convert to 24-hour format if AM/PM is specified
                    if (period === 'PM' && hours < 12) hours += 12;
                    if (period === 'AM' && hours === 12) hours = 0;
                    
                    // Create a new date object with the extracted time
                    startTime = new Date(2000, 0, 1);
                    startTime.setHours(hours, minutes, 0, 0);
                } else {
                    console.error(`Invalid time format in validateTimeSettings: ${startTimeStr}`);
                    return false;
                }
            } else {
                console.error(`Invalid time format in validateTimeSettings: ${startTimeStr}`);
                return false;
            }
            
            const jobCount = daySettings.jobsPerDay || 2;
            const breakDuration = daySettings.breakTime || DEFAULT_BREAK_TIME;
            
            // Ensure we have job durations initialized
            if (!daySettings.jobDurations || daySettings.jobDurations.length !== jobCount) {
                daySettings.jobDurations = Array(jobCount).fill(DEFAULT_JOB_DURATION);
            }
            
            // Calculate total working time in minutes
            const totalJobTime = daySettings.jobDurations.reduce((sum, duration) => sum + duration, 0);
            const totalBreakTime = (jobCount - 1) * breakDuration;
            const totalMinutes = totalJobTime + totalBreakTime;
            
            // Check if we exceed 12 hours in a day
            if (totalMinutes > 12 * 60) {
                console.warn(`Warning: ${day} has a long schedule of ${Math.round(totalMinutes / 60)} hours`);
                return false;
        }
        
        return true;
        } catch (error) {
            console.error(`Error validating time settings for ${day}:`, error);
            return false;
        }
    }
    
    function validateAndSaveSettings() {
        // Validate time settings for each working day
        let hasInvalidSettings = false;
        Object.keys(workingDays).forEach(day => {
            if (workingDays[day].isWorking && !validateTimeSettings(day)) {
                hasInvalidSettings = true;
                // Visual indication for invalid day settings
                const dayToggle = document.querySelector(`[data-day-toggle="${day}"]`);
                if (dayToggle) {
                    const card = dayToggle.closest('.rounded-lg');
                    if (card) {
                        card.classList.add('border-red-300', 'bg-red-50');
                        setTimeout(() => {
                            card.classList.remove('border-red-300', 'bg-red-50');
                        }, 3000);
                    }
                }
            }
        });
        
        // Even if we have invalid settings, still save the current state
        if (hasInvalidSettings) {
            console.warn('Some days have invalid time settings');
            // Optionally show a warning to the user
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
        
        // Add debug logging to ensure the conversion is correct
        console.log('CONVERSION TO COMPAT FORMAT:', {
            original: {
                sunday: workingDays.sunday.isWorking,
                monday: workingDays.monday.isWorking,
                tuesday: workingDays.tuesday.isWorking,
                wednesday: workingDays.wednesday.isWorking,
                thursday: workingDays.thursday.isWorking,
                friday: workingDays.friday.isWorking,
                saturday: workingDays.saturday.isWorking
            },
            compat: compatWorkingDays,
            wednesdayDetailCheck: {
                isWorking: workingDays.wednesday.isWorking,
                value: compatWorkingDays[3],
                typeBeforeConvert: typeof workingDays.wednesday.isWorking,
                typeAfterConvert: typeof compatWorkingDays[3],
                explicitlyFalse: workingDays.wednesday.isWorking === false
            }
        });
        
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
                            // Initialize with default job durations if missing
                            if (!daySettings.jobDurations) {
                                const jobCount = daySettings.jobsPerDay || DEFAULT_JOBS_PER_DAY;
                                
                                // If they have the old single jobDuration property, use it
                                if (daySettings.jobDuration) {
                                    daySettings.jobDurations = Array(jobCount).fill(daySettings.jobDuration);
                                } else {
                                    daySettings.jobDurations = Array(jobCount).fill(DEFAULT_JOB_DURATION);
                                }
                            }
                            
                            // Copy to working days state
                            workingDays[day] = daySettings;
                            
                            // Update UI elements
                            const dayToggle = document.querySelector(`[data-day-toggle="${day}"]`);
                            const settingsPanel = document.querySelector(`[data-day-settings="${day}"]`);
                            const startTimeSelect = document.querySelector(`[data-start-time="${day}"]`);
                            
                            // Update day toggle
                            if (dayToggle) {
                                dayToggle.checked = daySettings.isWorking;
                                
                                // Update the day card appearance
                                const dayCard = dayToggle.closest('.rounded-lg');
                                const dayIcon = dayCard.querySelector('.rounded-full');
                                
                                if (daySettings.isWorking) {
                                    dayIcon.classList.remove('bg-gray-300');
                                    dayIcon.classList.add('bg-primary');
                                    
                                    // Show settings panel
                                    if (settingsPanel) {
                                        settingsPanel.classList.remove('hidden');
                                    }
                                } else {
                                    dayIcon.classList.remove('bg-primary');
                                    dayIcon.classList.add('bg-gray-300');
                                    
                                    // Hide settings panel
                                    if (settingsPanel) {
                                        settingsPanel.classList.add('hidden');
                                    }
                                }
                            }
                            
                            // Update start time
                            if (startTimeSelect && daySettings.startTime) {
                                // For input type="time", convert to 24-hour format
                                if (startTimeSelect.type === 'time') {
                                    startTimeSelect.value = convertTo24HourFormat(daySettings.startTime);
                                } else {
                                    // For select elements (backward compatibility)
                                    startTimeSelect.value = daySettings.startTime;
                                }
                            }
                            
                            // Update job count radio buttons
                            const jobRadios = document.querySelectorAll(`[data-jobs-input="${day}"]`);
                            if (jobRadios.length > 0) {
                                jobRadios.forEach(radio => {
                                    const value = parseInt(radio.value);
                                    const label = radio.closest('label');
                                    
                                    if (value === daySettings.jobsPerDay) {
                                        radio.checked = true;
                                        if (label) {
                                            label.classList.add('bg-blue-50', 'border-blue-300');
                                        }
                                    } else {
                                        radio.checked = false;
                                        if (label) {
                                            label.classList.remove('bg-blue-50', 'border-blue-300');
                                        }
                                    }
                                });
                            }
                            
                            // Update break time radio buttons
                            const breakRadios = document.querySelectorAll(`[data-break-input="${day}"]`);
                            if (breakRadios.length > 0) {
                                breakRadios.forEach(radio => {
                                    const value = parseInt(radio.value);
                                    const label = radio.closest('label');
                                    
                                    if (value === (daySettings.breakTime || DEFAULT_BREAK_TIME)) {
                                        radio.checked = true;
                                        if (label) {
                                            label.classList.add('bg-blue-50', 'border-blue-300');
                                        }
                                    } else {
                                        radio.checked = false;
                                        if (label) {
                                            label.classList.remove('bg-blue-50', 'border-blue-300');
                                        }
                                    }
                                });
                            }
                            
                            // Update visual timeline
                            if (daySettings.isWorking) {
                                updateDayVisualIndicators(day);
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
            console.log(`JobsPerDay setting for ${day}: ${settings.jobsPerDay}`);
            
            // Ensure we have valid time values
            if (!settings.startTime) {
                console.error(`Invalid time settings for ${day}`);
                return;
            }
            
            try {
                // iOS-compatible date parsing
                const startTimeStr = settings.startTime;
                let startTime;
                
                // Parse time string in a way that works across all devices including iOS
                if (startTimeStr.includes(':')) {
                    // Extract hours and minutes in a way that's compatible across browsers
                    const timeMatch = startTimeStr.match(/(\d+):(\d+)\s*(AM|PM|am|pm)?/i);
                    if (timeMatch) {
                        let hours = parseInt(timeMatch[1]);
                        const minutes = parseInt(timeMatch[2]);
                        const period = timeMatch[3] ? timeMatch[3].toUpperCase() : null;
                        
                        // Convert to 24-hour format if AM/PM is specified
                        if (period === 'PM' && hours < 12) hours += 12;
                        if (period === 'AM' && hours === 12) hours = 0;
                        
                        // Create a new date object with the extracted time
                        startTime = new Date(2000, 0, 1);
                        startTime.setHours(hours, minutes, 0, 0);
                    } else {
                        console.error(`Could not parse time string: ${startTimeStr} for ${day}`);
                        throw new Error(`Invalid time format for ${day}`);
                    }
                } else {
                    console.error(`Invalid time format for ${day}: ${startTimeStr}`);
                    throw new Error(`Invalid time format for ${day}`);
                }
                
                // Validate date objects
                if (isNaN(startTime.getTime())) {
                    console.error(`Invalid date objects created for ${day}`);
                    return;
                }
                
                const jobCount = settings.jobsPerDay || 2;
                const breakTime = settings.breakTime || DEFAULT_BREAK_TIME;
                
                // Ensure we have job durations initialized
                if (!settings.jobDurations || settings.jobDurations.length !== jobCount) {
                    settings.jobDurations = Array(jobCount).fill(DEFAULT_JOB_DURATION);
                }
            
            console.log(`${day} settings:`, {
                startTime: settings.startTime,
                    jobCount,
                    jobDurations: settings.jobDurations,
                breakTime
            });
            
            const daySlots = [];
            let currentTime = new Date(startTime);
            
                // Generate slots based on job count, start time, job durations, and break time
                console.log(`Creating ${jobCount} slots for ${day}`);
                for (let i = 0; i < jobCount; i++) {
                    // Get the duration for this specific job
                    const jobDuration = settings.jobDurations[i];
                    
                // Add the cleaning slot
                    const slotEnd = new Date(currentTime.getTime() + jobDuration * 60000);
                    
                    // Format times in a way that works on all devices including iOS
                    const formatTimeForAllDevices = (date) => {
                        // First get formatted time
                        let timeStr = date.toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit', 
                            hour12: true 
                        });
                        
                        // Then make sure we have strict formatting
                        const timeMatch = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
                        if (timeMatch) {
                            const hours = parseInt(timeMatch[1]);
                            const minutes = timeMatch[2];
                            const period = timeMatch[3].toUpperCase();
                            return `${hours}:${minutes} ${period}`;
                        }
                        
                        // Fallback if the regex match fails
                        return `${date.getHours() % 12 || 12}:${String(date.getMinutes()).padStart(2, '0')} ${date.getHours() >= 12 ? 'PM' : 'AM'}`;
                    };
                    
                    const startTimeStr = formatTimeForAllDevices(currentTime);
                    const endTimeStr = formatTimeForAllDevices(slotEnd);
                    
                const slotObj = {
                        start: startTimeStr,
                        end: endTimeStr,
                        durationMinutes: jobDuration
                };
                
                console.log(`Adding slot ${i+1} for ${day}:`, slotObj);
                daySlots.push(slotObj);
                
                // Add break time if not the last cleaning
                    if (i < jobCount - 1) {
                    // Get the specific break duration for this break
                    let breakDuration;
                    if (settings.breakDurations && settings.breakDurations[i]) {
                        breakDuration = settings.breakDurations[i];
                    } else {
                        // Fallback to legacy breakTime or default
                        breakDuration = settings.breakTime || DEFAULT_BREAK_TIME;
                    }
                    
                    currentTime = new Date(slotEnd.getTime() + breakDuration * 60000);
                }
            }
            
            console.log(`Generated ${daySlots.length} slots for ${day}:`, daySlots);
            slots[day] = daySlots;
            } catch (error) {
                console.error(`Error calculating time slots for ${day}:`, error);
                // Provide a default set of slots if there's an error
                const defaultSlots = [];
                const defaultDurations = Array(settings.jobsPerDay || 2).fill(DEFAULT_JOB_DURATION);
                
                let startTime = new Date('2000-01-01 9:00 AM');
                for (let i = 0; i < defaultDurations.length; i++) {
                    const slotEnd = new Date(startTime.getTime() + defaultDurations[i] * 60000);
                    defaultSlots.push({
                        start: formatTime(startTime),
                        end: formatTime(slotEnd),
                        durationMinutes: defaultDurations[i]
                    });
                    
                    if (i < defaultDurations.length - 1) {
                        startTime = new Date(slotEnd.getTime() + DEFAULT_BREAK_TIME * 60000);
                    }
                }
                
                console.log(`Using ${defaultSlots.length} default slots for ${day} due to error`);
                slots[day] = defaultSlots;
            }
        });
        
        return slots;
    }

    function hideSavingIndicator(success = true) {
        if (success) {
            savingIndicator.innerHTML = '<i class="fas fa-check mr-2"></i> Saved!';
            
            // Create a success toast notification
            const successToast = document.createElement('div');
            successToast.className = 'fixed top-16 right-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded shadow-md max-w-md z-50 transform transition-all duration-300 opacity-0 translate-y-2';
            successToast.innerHTML = `
                <div class="flex items-center">
                    <div class="flex-shrink-0">
                        <i class="fas fa-check-circle text-green-600"></i>
                    </div>
                    <div class="ml-3">
                        <p class="text-sm font-medium">Settings saved successfully!</p>
                    </div>
                </div>
            `;
            document.body.appendChild(successToast);
            
            // Show the toast with a slight delay
            setTimeout(() => {
                successToast.classList.remove('opacity-0', 'translate-y-2');
            }, 100);
            
            // Hide the saving indicator and toast
            setTimeout(() => {
                savingIndicator.classList.add('translate-y-10', 'opacity-0');
                successToast.classList.add('opacity-0');
                setTimeout(() => {
                    successToast.remove();
                }, 300);
            }, 2000);
        } else {
            savingIndicator.innerHTML = '<i class="fas fa-times mr-2"></i> Error saving!';
            setTimeout(() => {
                savingIndicator.classList.add('translate-y-10', 'opacity-0');
            }, 3000);
        }
    }
}); 