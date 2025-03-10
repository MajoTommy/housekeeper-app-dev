document.addEventListener('DOMContentLoaded', function() {
    // Firebase initialization check
    if (!firebase.apps.length) {
        console.error('Firebase not initialized');
        return;
    }

    console.log('Settings.js loaded');

    // References to form elements
    const workingDayButtons = document.querySelectorAll('.flex.gap-2.mt-4 button');
    const startTimeSelect = document.getElementById('start-time');
    const endTimeSelect = document.getElementById('end-time');
    const cleaningsPerDaySelect = document.getElementById('cleanings-per-day');
    const hourlyRateInput = document.getElementById('hourly-rate');
    const autoSendReceiptsToggle = document.getElementById('auto-send-receipts');
    
    // Working days state (initially M-F selected)
    const workingDays = {
        'M': true,
        'T': true,
        'W': true,
        'T': true,
        'F': true,
        'S': false,
        'S': false
    };

    // Add click event listeners to day buttons
    workingDayButtons.forEach((button) => {
        button.addEventListener('click', function() {
            const day = button.textContent;
            console.log('Day button clicked:', day);
            
            // Toggle active state
            workingDays[day] = !workingDays[day];
            updateDayButtonStyle(button, workingDays[day]);
            
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

    // Add input validation for hourly rate
    hourlyRateInput.addEventListener('input', function() {
        const value = parseFloat(this.value);
        if (value < 0) {
            this.value = 0;
        }
        if (value > 1000) {
            this.value = 1000;
        }
    });
    
    // Add change event listeners with saving indicator
    const settingsInputs = [startTimeSelect, endTimeSelect, cleaningsPerDaySelect, hourlyRateInput, autoSendReceiptsToggle];
    settingsInputs.forEach(input => {
        input.addEventListener('change', () => {
            showSavingIndicator();
            validateAndSaveSettings();
        });
    });

    // Function to show saving indicator
    function showSavingIndicator() {
        const header = document.querySelector('.sticky.top-0');
        let indicator = document.getElementById('saving-indicator');
        
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'saving-indicator';
            indicator.className = 'absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500';
            header.style.position = 'relative';
            header.appendChild(indicator);
        }
        
        indicator.textContent = 'Saving...';
        indicator.style.opacity = '1';
    }

    // Function to hide saving indicator with success
    function hideSavingIndicator(success = true) {
        const indicator = document.getElementById('saving-indicator');
        if (indicator) {
            indicator.textContent = success ? 'Saved!' : 'Error saving';
            indicator.className = `absolute right-4 top-1/2 -translate-y-1/2 text-sm ${success ? 'text-green-500' : 'text-red-500'}`;
            setTimeout(() => {
                indicator.style.opacity = '0';
                setTimeout(() => indicator.textContent = '', 300);
            }, 1500);
        }
    }
    
    // Function to validate time slots
    function validateTimeSlots() {
        const startTime = startTimeSelect.value;
        const endTime = endTimeSelect.value;
        const cleaningsPerDay = parseInt(cleaningsPerDaySelect.value);
        
        console.log('Validating time slots:', { startTime, endTime, cleaningsPerDay });
        
        // Convert times to minutes since midnight for comparison
        const startMinutes = convertTimeToMinutes(startTime);
        const endMinutes = convertTimeToMinutes(endTime);
        
        // Check if end time is after start time
        if (endMinutes <= startMinutes) {
            alert('End time must be after start time');
            return false;
        }
        
        // Calculate available minutes
        const totalMinutes = endMinutes - startMinutes;
        
        // Assume each cleaning takes 2 hours (120 minutes)
        const requiredMinutes = cleaningsPerDay * 120;
        
        // Check if there's enough time for all cleanings
        if (totalMinutes < requiredMinutes) {
            alert('Not enough time in working hours for selected number of cleanings. Each cleaning requires 2 hours.');
            return false;
        }
        
        return true;
    }
    
    // Helper function to convert time string to minutes
    function convertTimeToMinutes(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    }
    
    // Function to calculate available time slots
    function calculateTimeSlots() {
        const startTime = startTimeSelect.value;
        const endTime = endTimeSelect.value;
        const cleaningsPerDay = parseInt(cleaningsPerDaySelect.value);
        
        const startMinutes = convertTimeToMinutes(startTime);
        const endMinutes = convertTimeToMinutes(endTime);
        const totalMinutes = endMinutes - startMinutes;
        
        // Each cleaning is 2 hours (120 minutes)
        const cleaningDuration = 120;
        const slots = [];
        
        // Calculate evenly distributed slots
        const gap = (totalMinutes - (cleaningDuration * cleaningsPerDay)) / (cleaningsPerDay + 1);
        let currentTime = startMinutes;
        
        for (let i = 0; i < cleaningsPerDay; i++) {
            currentTime += gap; // Add gap before slot
            const slotStart = currentTime;
            const slotEnd = currentTime + cleaningDuration;
            slots.push({
                start: minutesToTimeString(slotStart),
                end: minutesToTimeString(slotEnd)
            });
            currentTime += cleaningDuration;
        }
        
        return slots;
    }
    
    // Helper function to convert minutes to time string
    function minutesToTimeString(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
        return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
    }
    
    // Modified save settings function
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
            hourlyRate: parseFloat(hourlyRateInput.value) || 0,
            autoSendReceipts: autoSendReceiptsToggle.checked,
            calculatedTimeSlots: timeSlots,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        console.log('Saving settings:', settings);
        
        // Save to Firestore
        firebase.firestore().collection('users').doc(user.uid).set(settings, { merge: true })
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
                    
                    // Update working days buttons
                    if (data.workingDays) {
                        workingDayButtons.forEach((button) => {
                            const day = button.textContent;
                            workingDays[day] = data.workingDays[day];
                            updateDayButtonStyle(button, workingDays[day]);
                        });
                    } else {
                        // Use default settings for new users
                        const defaultSettings = DEFAULT_SETTINGS;
                        firebase.firestore().collection('users').doc(userId).set(defaultSettings)
                            .then(() => {
                                console.log('Default settings saved for new user');
                                // Update UI with default settings
                                workingDayButtons.forEach((button) => {
                                    const day = button.textContent;
                                    updateDayButtonStyle(button, defaultSettings.workingDays[day]);
                                });
                            })
                            .catch(error => console.error('Error saving default settings:', error));
                    }
                    
                    // Update time selects
                    if (data.workingHours) {
                        if (data.workingHours.start) {
                            startTimeSelect.value = data.workingHours.start;
                        }
                        
                        if (data.workingHours.end) {
                            endTimeSelect.value = data.workingHours.end;
                        }
                    }
                    
                    // Update cleanings per day
                    if (data.cleaningsPerDay) {
                        cleaningsPerDaySelect.value = data.cleaningsPerDay;
                    }
                    
                    // Update hourly rate
                    if (data.hourlyRate !== undefined) {
                        hourlyRateInput.value = data.hourlyRate;
                    }
                    
                    // Update auto-send receipts toggle
                    if (data.autoSendReceipts !== undefined) {
                        autoSendReceiptsToggle.checked = data.autoSendReceipts;
                        const label = autoSendReceiptsToggle.nextElementSibling;
                        const toggleDot = label.querySelector('span');
                        
                        if (data.autoSendReceipts) {
                            toggleDot.classList.remove('translate-x-1');
                            toggleDot.classList.add('translate-x-7');
                            label.classList.remove('bg-gray-300');
                            label.classList.add('bg-primary');
                        } else {
                            toggleDot.classList.remove('translate-x-7');
                            toggleDot.classList.add('translate-x-1');
                            label.classList.remove('bg-primary');
                            label.classList.add('bg-gray-300');
                        }
                    }
                }
            })
            .catch((error) => {
                console.error("Error getting user settings:", error);
            });
    }
    
    // Load user settings on page load
    loadUserSettings();
    
    // Function to load user settings
    function loadUserSettings() {
        const user = firebase.auth().currentUser;
        
        if (!user) {
            // Check if user is logged in via auth state change
            firebase.auth().onAuthStateChanged(function(user) {
                if (user) {
                    fetchUserSettings(user.uid);
                } else {
                    // Redirect to login if not logged in
                    window.location.href = '../login.html';
                }
            });
        } else {
            fetchUserSettings(user.uid);
        }
    }
}); 