document.addEventListener('DOMContentLoaded', function() {
    // Firebase initialization check
    if (!firebase.apps.length) {
        console.error('Firebase not initialized');
        return;
    }

    console.log('Settings.js loaded');

    // References to form elements
    const workingDayButtons = document.querySelectorAll('.flex.gap-2 button');
    const startTimeSelect = document.getElementById('start-time');
    const endTimeSelect = document.getElementById('end-time');
    const cleaningsPerDaySelect = document.getElementById('cleanings-per-day');
    const breakTimeSelect = document.getElementById('break-time');
    const cleaningDurationSelect = document.getElementById('cleaning-duration');
    const maxHoursSelect = document.getElementById('max-hours');
    const hourlyRateInput = document.getElementById('hourly-rate');
    const autoSendReceiptsToggle = document.getElementById('auto-send-receipts');
    
    // Working days state (initially M-F selected, with Wednesday as rest day)
    const workingDays = {
        0: false, // Sunday
        1: true,  // Monday
        2: true,  // Tuesday
        3: false, // Wednesday (rest day)
        4: true,  // Thursday
        5: true,  // Friday
        6: false  // Saturday
    };
    
    // Add click event listeners to day buttons
    workingDayButtons.forEach((button, index) => {
        button.addEventListener('click', function() {
            const dayIndex = index;
            console.log('Day button clicked:', dayIndex);
            
            // Toggle active state
            workingDays[dayIndex] = !workingDays[dayIndex];
            updateDayButtonStyle(button, workingDays[dayIndex]);
            
            // Show saving indicator
            showSavingIndicator();
            validateAndSaveSettings();
        });
    });

    function updateDayButtonStyle(button, isActive) {
        if (isActive) {
            button.classList.remove('bg-gray-100', 'text-gray-500');
            button.classList.add('bg-primary', 'text-white');
        } else {
            button.classList.remove('bg-primary', 'text-white');
            button.classList.add('bg-gray-100', 'text-gray-500');
        }
    }
    
    // Add change event listeners to select elements
    startTimeSelect.addEventListener('change', function() {
        showSavingIndicator();
        updateAvailableOptions();
        validateAndSaveSettings();
    });
    
    endTimeSelect.addEventListener('change', function() {
        showSavingIndicator();
        updateAvailableOptions();
        validateAndSaveSettings();
    });
    
    cleaningsPerDaySelect.addEventListener('change', function() {
        showSavingIndicator();
        updateAvailableOptions();
        validateAndSaveSettings();
    });
    
    breakTimeSelect.addEventListener('change', function() {
        showSavingIndicator();
        updateAvailableOptions();
        validateAndSaveSettings();
    });
    
    cleaningDurationSelect.addEventListener('change', function() {
        showSavingIndicator();
        updateAvailableOptions();
        validateAndSaveSettings();
    });
    
    maxHoursSelect.addEventListener('change', function() {
        showSavingIndicator();
        updateAvailableOptions();
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
        // Get all the relevant settings values
        const startTime = new Date('2000-01-01 ' + startTimeSelect.value);
        const endTime = new Date('2000-01-01 ' + endTimeSelect.value);
        const cleaningsPerDay = parseInt(cleaningsPerDaySelect.value);
        const cleaningDuration = parseInt(cleaningDurationSelect.value);
        const breakTime = parseInt(breakTimeSelect.value);
        const maxHours = parseInt(maxHoursSelect.value);
        
        // 1. Validate that end time is after start time
        if (endTime <= startTime) {
            alert('End time must be after start time');
            return false;
        }
        
        // 2. Calculate total available minutes in the working day
        const totalAvailableMinutes = (endTime - startTime) / 60000; // Convert milliseconds to minutes
        
        // 3. Calculate total time needed for cleanings and breaks
        const totalCleaningMinutes = cleaningDuration * cleaningsPerDay;
        const totalBreakMinutes = breakTime * (cleaningsPerDay - 1); // One fewer breaks than cleanings
        const totalTimeNeeded = totalCleaningMinutes + totalBreakMinutes;
        
        console.log('Validation:', {
            totalAvailableMinutes,
            maxHours,
            totalCleaningMinutes,
            totalBreakMinutes,
            totalTimeNeeded
        });
        
        // 4. Check if the total time needed fits within the working hours
        if (totalTimeNeeded > totalAvailableMinutes) {
            // Calculate the maximum possible job duration for the current settings
            const maxPossibleJobDuration = Math.floor((totalAvailableMinutes - (breakTime * (cleaningsPerDay - 1))) / cleaningsPerDay);
            
            // Calculate the maximum possible jobs per day for the current settings
            const maxPossibleJobs = Math.floor((totalAvailableMinutes + breakTime) / (cleaningDuration + breakTime));
            
            let suggestedChanges = '';
            
            if (maxPossibleJobDuration >= 120) { // If at least 2 hours is possible
                suggestedChanges += `\n- Reduce job duration to ${Math.floor(maxPossibleJobDuration/60)} hours`;
            }
            
            if (maxPossibleJobs > 0) {
                suggestedChanges += `\n- Reduce jobs per day to ${maxPossibleJobs}`;
            }
            
            suggestedChanges += `\n- Increase working hours`;
            suggestedChanges += `\n- Reduce break time between jobs`;
            
            alert(`Your current settings won't fit in your working hours.\n\nYou've selected ${cleaningsPerDay} jobs of ${cleaningDuration/60} hours each with ${breakTime/60} hour breaks, requiring ${Math.round(totalTimeNeeded/60)} total hours, but you only have ${Math.round(totalAvailableMinutes/60)} hours available.\n\nPossible solutions:${suggestedChanges}`);
            return false;
        }
        
        // 5. Check if the total time needed exceeds the maximum working hours
        if (totalCleaningMinutes > maxHours) {
            // Calculate the maximum possible job duration for the max hours
            const maxPossibleJobDuration = Math.floor(maxHours / cleaningsPerDay);
            
            // Calculate the maximum possible jobs per day for the max hours
            const maxPossibleJobs = Math.floor(maxHours / cleaningDuration);
            
            let suggestedChanges = '';
            
            if (maxPossibleJobDuration >= 120) { // If at least 2 hours is possible
                suggestedChanges += `\n- Reduce job duration to ${Math.floor(maxPossibleJobDuration/60)} hours`;
            }
            
            if (maxPossibleJobs > 0) {
                suggestedChanges += `\n- Reduce jobs per day to ${maxPossibleJobs}`;
            }
            
            suggestedChanges += `\n- Increase maximum working hours per day`;
            
            alert(`Your cleaning time exceeds your maximum working hours.\n\nYou've selected ${cleaningsPerDay} jobs of ${cleaningDuration/60} hours each, requiring ${Math.round(totalCleaningMinutes/60)} hours of cleaning time, but your maximum is ${Math.round(maxHours/60)} hours.\n\nPossible solutions:${suggestedChanges}`);
            return false;
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
        
        // Create settings object
        const settings = {
            workingDays: workingDays,
            workingHours: {
                start: startTimeSelect.value,
                end: endTimeSelect.value
            },
            cleaningsPerDay: parseInt(cleaningsPerDaySelect.value),
            breakTime: parseInt(breakTimeSelect.value),
            cleaningDuration: parseInt(cleaningDurationSelect.value),
            maxHours: parseInt(maxHoursSelect.value),
            hourlyRate: parseFloat(hourlyRateInput.value) || 0,
            autoSendReceipts: autoSendReceiptsToggle.checked,
            calculatedTimeSlots: timeSlots,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        console.log('Saving settings:', settings);
        
        // Save to Firestore
        firebase.firestore().collection('users').doc(user.uid).set({
            settings: settings
        }, { merge: true })
            .then(() => {
                console.log('Settings saved successfully');
                hideSavingIndicator(true);
            })
            .catch((error) => {
                console.error("Error saving settings:", error);
                hideSavingIndicator(false);
            });
    }
    
    // Function to fetch user settings from Firestore
    function fetchUserSettings(userId) {
        firebase.firestore().collection('users').doc(userId).get()
            .then((doc) => {
                if (doc.exists) {
                    const data = doc.data();
                    if (data.settings) {
                        populateSettings(data.settings);
                    }
                } else {
                    console.log('No settings found for user');
                }
            })
            .catch((error) => {
                console.error('Error fetching settings:', error);
            });
    }
    
    // Function to populate settings form with user settings
    function populateSettings(settings) {
        console.log('Populating settings form with:', settings);
        
        // Populate working days
        if (settings.workingDays) {
            workingDayButtons.forEach((button, index) => {
                const isActive = settings.workingDays[index];
                workingDays[index] = isActive;
                updateDayButtonStyle(button, isActive);
            });
        }
        
        // Populate working hours
        if (settings.workingHours) {
            if (settings.workingHours.start) {
                startTimeSelect.value = settings.workingHours.start;
            }
            if (settings.workingHours.end) {
                endTimeSelect.value = settings.workingHours.end;
            }
        }
        
        // Populate cleanings per day
        if (settings.cleaningsPerDay) {
            cleaningsPerDaySelect.value = settings.cleaningsPerDay;
        }
        
        // Populate break time
        if (settings.breakTime) {
            breakTimeSelect.value = settings.breakTime;
        }
        
        // Populate cleaning duration
        if (settings.cleaningDuration) {
            cleaningDurationSelect.value = settings.cleaningDuration;
        }
        
        // Populate max hours
        if (settings.maxHours) {
            maxHoursSelect.value = settings.maxHours;
        }
        
        // Populate hourly rate
        if (settings.hourlyRate) {
            hourlyRateInput.value = settings.hourlyRate;
        }
        
        // Populate auto send receipts
        if (settings.autoSendReceipts !== undefined) {
            autoSendReceiptsToggle.checked = settings.autoSendReceipts;
            
            // Update toggle appearance
            const toggleLabel = document.querySelector('label[for="auto-send-receipts"]');
            const toggleSpan = toggleLabel.querySelector('span');
            
            if (settings.autoSendReceipts) {
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
        }
        
        // Update available options based on populated settings
        updateAvailableOptions();
    }
    
    // Function to calculate time slots based on settings
    function calculateTimeSlots() {
        const startTime = new Date('2000-01-01 ' + startTimeSelect.value);
        const endTime = new Date('2000-01-01 ' + endTimeSelect.value);
        const cleaningsPerDay = parseInt(cleaningsPerDaySelect.value);
        const cleaningDuration = parseInt(cleaningDurationSelect.value);
        const breakTime = parseInt(breakTimeSelect.value);
        
        const slots = [];
        
        // Calculate total working minutes
        const totalMinutes = (endTime - startTime) / 60000; // Convert milliseconds to minutes
        
        // Calculate time needed for each cleaning + break
        const timePerCleaning = cleaningDuration + breakTime;
        
        // Calculate start times for each cleaning
        for (let i = 0; i < cleaningsPerDay; i++) {
            const slotStart = new Date(startTime.getTime() + (i * timePerCleaning * 60000));
            const slotEnd = new Date(slotStart.getTime() + (cleaningDuration * 60000));
            
            // Only add the slot if it ends before or at the end time
            if (slotEnd <= endTime) {
                slots.push({
                    start: slotStart.toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit', 
                        hour12: true 
                    }),
                    end: slotEnd.toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit', 
                        hour12: true 
                    })
                });
            }
        }
        
        return slots;
    }
    
    // Check if user is logged in
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            console.log('User logged in:', user.uid);
            fetchUserSettings(user.uid);
        } else {
            console.log('No user logged in');
            // Initialize available options with default settings
            updateAvailableOptions();
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

    // Function to update available options based on current selections
    function updateAvailableOptions() {
        const startTime = new Date('2000-01-01 ' + startTimeSelect.value);
        const endTime = new Date('2000-01-01 ' + endTimeSelect.value);
        const cleaningsPerDay = parseInt(cleaningsPerDaySelect.value);
        const cleaningDuration = parseInt(cleaningDurationSelect.value);
        const breakTime = parseInt(breakTimeSelect.value);
        const maxHours = parseInt(maxHoursSelect.value);
        
        // Calculate total available minutes in the working day
        const totalAvailableMinutes = (endTime - startTime) / 60000; // Convert milliseconds to minutes
        
        // Update max hours options based on working hours
        const maxPossibleHours = Math.ceil(totalAvailableMinutes / 60) * 60; // Round up to nearest hour in minutes
        
        // Update cleaning duration options based on jobs per day and max hours
        const maxPossibleDuration = Math.min(
            Math.floor(maxHours / cleaningsPerDay), // Max based on max hours
            Math.floor((totalAvailableMinutes - (breakTime * (cleaningsPerDay - 1))) / cleaningsPerDay) // Max based on working hours
        );
        
        // Update jobs per day options based on cleaning duration and max hours
        const maxPossibleJobs = Math.min(
            Math.floor(maxHours / cleaningDuration), // Max based on max hours
            Math.floor((totalAvailableMinutes + breakTime) / (cleaningDuration + breakTime)) // Max based on working hours
        );
        
        // Update break time options based on jobs per day, cleaning duration, and working hours
        const maxPossibleBreak = Math.floor((totalAvailableMinutes - (cleaningDuration * cleaningsPerDay)) / (cleaningsPerDay - 1));
        
        console.log('Available options:', {
            maxPossibleHours,
            maxPossibleDuration,
            maxPossibleJobs,
            maxPossibleBreak
        });
        
        // Add visual indicators for options that won't work with current settings
        updateSelectOptions(cleaningDurationSelect, maxPossibleDuration);
        updateSelectOptions(cleaningsPerDaySelect, maxPossibleJobs);
        updateSelectOptions(breakTimeSelect, maxPossibleBreak);
    }

    // Helper function to update select options with visual indicators
    function updateSelectOptions(selectElement, maxValue) {
        // Reset all options to normal
        Array.from(selectElement.options).forEach(option => {
            option.classList.remove('text-red-500');
            option.title = '';
        });
        
        // Mark options that exceed the max value
        Array.from(selectElement.options).forEach(option => {
            const optionValue = parseInt(option.value);
            if (optionValue > maxValue) {
                option.classList.add('text-red-500');
                option.title = 'This option may not work with your current settings';
            }
        });
    }
}); 