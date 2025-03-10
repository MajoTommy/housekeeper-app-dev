// Initialize the current week start date
let currentWeekStart = new Date();
// Set to the start of the current week (Sunday)
currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay());
currentWeekStart.setHours(0, 0, 0, 0);

document.addEventListener('DOMContentLoaded', function() {
    // Initialize Firebase Auth
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            console.log('User found after auth state change:', user.uid);
            loadUserSchedule();
        } else {
            console.log('No user found, redirecting to login');
            window.location.href = 'login.html';
        }
    });
    
    // Set up week navigation
    const prevWeekBtn = document.getElementById('prev-week');
    const nextWeekBtn = document.getElementById('next-week');
    const todayBtn = document.getElementById('today-btn');
    
    if (prevWeekBtn && nextWeekBtn && todayBtn) {
        prevWeekBtn.addEventListener('click', function() {
            navigateToPreviousWeek();
        });
        
        nextWeekBtn.addEventListener('click', function() {
            navigateToNextWeek();
        });
        
        todayBtn.addEventListener('click', function() {
            navigateToCurrentWeek();
        });
    } else {
        console.error('Week navigation buttons not found');
    }
    
    // Update navigation state initially
    updateNavigationState();

    // Firebase initialization check
    if (!firebase.apps.length) {
        console.error('Firebase not initialized');
        return;
    }

    console.log('Schedule.js loaded');

    // Set up week navigation
    const weekRangeDisplay = document.getElementById('week-range');

    // Add loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden';
    loadingIndicator.innerHTML = `
        <div class="bg-white rounded-lg p-4 flex items-center space-x-3">
            <div class="animate-spin rounded-full h-6 w-6 border-4 border-primary border-t-transparent"></div>
            <span class="text-gray-700">Loading...</span>
        </div>
    `;
    document.body.appendChild(loadingIndicator);

    // Global loading indicator functions
    function showLoading() {
        const existingOverlay = document.getElementById('loadingOverlay');
        if (existingOverlay) {
            existingOverlay.classList.remove('hidden');
        } else {
            const loadingOverlay = document.createElement('div');
            loadingOverlay.id = 'loadingOverlay';
            loadingOverlay.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center';
            loadingOverlay.innerHTML = `
                <div class="bg-white p-4 rounded-lg shadow-lg flex items-center">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
                    <p class="text-gray-700">Loading...</p>
                </div>
            `;
            document.body.appendChild(loadingOverlay);
        }
    }

    function hideLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
        }
    }

    // Check if a date is in the past (before today)
    function isInPast(date) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date < today;
    }

    // Function to update the navigation state
    function updateNavigationState() {
        const prevWeekBtn = document.getElementById('prev-week');
        if (!prevWeekBtn) {
            console.error('Previous week button not found');
            return;
        }
        
        // Check if the previous week is in the past
        const prevWeekDate = new Date(currentWeekStart);
        prevWeekDate.setDate(prevWeekDate.getDate() - 7);
        
        // Disable the previous week button if the previous week is in the past
        prevWeekBtn.disabled = isInPast(prevWeekDate);
        prevWeekBtn.classList.toggle('opacity-50', prevWeekBtn.disabled);
        prevWeekBtn.classList.toggle('cursor-not-allowed', prevWeekBtn.disabled);
        
        console.log('Navigation state updated, prev week button disabled:', prevWeekBtn.disabled);
    }

    // Function to update the week display
    function updateWeekDisplay() {
        try {
            const weekRangeElement = document.getElementById('week-range');
            if (!weekRangeElement) {
                console.error('Week range element not found');
                return;
            }
            
            // Get the start and end of the current week
            const weekStart = new Date(currentWeekStart);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            
            // Format the dates
            const options = { month: 'long', day: 'numeric', year: 'numeric' };
            const startStr = weekStart.toLocaleDateString('en-US', options);
            const endStr = weekEnd.toLocaleDateString('en-US', options);
            
            // Update the week range display
            weekRangeElement.textContent = `${startStr} - ${endStr}`;
            console.log('Week range updated:', weekRangeElement.textContent);
        } catch (error) {
            console.error('Error updating week display:', error);
        }
    }

    // Get current user and their settings
    const user = firebase.auth().currentUser;
    if (!user) {
        console.log('No user found initially, waiting for auth state change');
        firebase.auth().onAuthStateChanged(function(user) {
            if (user) {
                console.log('User found after auth state change:', user.uid);
                loadUserSchedule();
            } else {
                console.log('No user after auth state change, redirecting to login');
                window.location.href = 'login.html';
            }
        });
    } else {
        console.log('User found immediately:', user.uid);
        loadUserSchedule();
    }

    // Function to load user schedule
    function loadUserSchedule() {
        return new Promise((resolve, reject) => {
            const user = firebase.auth().currentUser;
            if (!user) {
                console.log('No user found, waiting for auth state change');
                reject(new Error('No user found'));
                return;
            }
            
            console.log('Loading schedule for user:', user.uid);
            
            // Update the week display
            updateWeekDisplay();
            
            // Get user settings from Firestore
            firebase.firestore().collection('users').doc(user.uid).get()
                .then(doc => {
                    let settings;
                    
                    if (doc.exists && doc.data().settings) {
                        settings = doc.data().settings;
                        console.log('User settings loaded:', settings);
                    } else {
                        console.log('No user settings found, using defaults');
                        settings = DEFAULT_SETTINGS;
                    }
                    
                    // Calculate time slots based on settings
                    if (!settings.calculatedTimeSlots) {
                        settings.calculatedTimeSlots = calculateAvailableTimeSlots(settings);
                    }
                    
                    console.log('User settings loaded:', settings);
                    
                    // Generate schedule with settings
                    generateSchedule(settings);
                    
                    resolve();
                })
                .catch(error => {
                    console.error('Error loading user settings:', error);
                    
                    // Use default settings if there's an error
                    const settings = DEFAULT_SETTINGS;
                    settings.calculatedTimeSlots = calculateAvailableTimeSlots(settings);
                    generateSchedule(settings);
                    
                    reject(error);
                });
        });
    }

    function generateSchedule(settings) {
        // Create or show the loading overlay
        const existingOverlay = document.getElementById('loadingOverlay');
        if (existingOverlay) {
            existingOverlay.classList.remove('hidden');
        }
        
        const container = document.querySelector('.p-4');
        container.innerHTML = '';
        
        // Get the current week's start and end dates
        const currentDate = new Date();
        const weekStart = new Date(currentWeekStart);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        console.log('Generating schedule for week:', weekStart.toDateString(), 'to', weekEnd.toDateString());
        console.log('Settings:', settings);
        
        // Load user's bookings for this week
        loadUserBookings(weekStart, weekEnd).then(bookings => {
            console.log('Loaded bookings:', bookings);
            
            // Group bookings by date
            const bookingsByDate = {};
            bookings.forEach(booking => {
                if (!bookingsByDate[booking.date]) {
                    bookingsByDate[booking.date] = [];
                }
                bookingsByDate[booking.date].push(booking);
            });
            
            console.log('Bookings by date:', bookingsByDate);
            
            // Generate schedule for each day of the week
            for (let i = 0; i < 7; i++) {
                const date = new Date(weekStart);
                date.setDate(weekStart.getDate() + i);
                
                // Skip days that are not working days AND have no bookings
                const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
                const dateString = date.toISOString().split('T')[0];
                const dateBookings = bookingsByDate[dateString] || [];
                
                if (!settings.workingDays[dayOfWeek] && dateBookings.length === 0) {
                    console.log('Skipping non-working day with no bookings:', date.toDateString());
                    continue;
                }
                
                console.log('Processing day:', date.toDateString(), 'with', dateBookings.length, 'bookings');
                
                // Add date header
                const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
                const dateText = date.toLocaleDateString('en-US', options);
                addDateHeader(container, dateText);
                
                // Check if this date is today
                const isToday = date.toDateString() === currentDate.toDateString();
                
                // Create a container for this day's cards
                const dayContainer = document.createElement('div');
                dayContainer.className = isToday ? 'bg-primary-light/70 rounded-lg p-4 mb-6' : 'space-y-4 mb-6';
                container.appendChild(dayContainer);
                
                // Sort bookings by start time
                dateBookings.sort((a, b) => {
                    return a.startTime.localeCompare(b.startTime);
                });
                
                // Track booked time slots
                const bookedSlots = new Set();
                
                // Add booking cards
                dateBookings.forEach(booking => {
                    console.log('Adding booking card for:', booking);
                    
                    // Ensure booking has all required fields
                    booking.clientAddress = booking.clientAddress || '';
                    booking.clientPhone = booking.clientPhone || '';
                    booking.accessInfo = booking.accessInfo || '';
                    booking.notes = booking.notes || '';
                    
                    bookedSlots.add(`${booking.startTime}-${booking.endTime}`);
                    addBookingCard(dayContainer, booking, isToday);
                });
                
                // Only add available time slots if it's a working day
                if (settings.workingDays[dayOfWeek]) {
                    // Add available time slots
                    // Use the time slots from settings instead of calculating them again
                    const timeSlots = settings.calculatedTimeSlots || [];
                    console.log('Available time slots for', dateText, ':', timeSlots);
                    
                    timeSlots.forEach(slot => {
                        const slotKey = `${slot.start}-${slot.end}`;
                        if (!bookedSlots.has(slotKey)) {
                            addTimeSlot(dayContainer, slot.start, slot.end, date);
                        }
                    });
                    
                    // If no slots (booked or available), show unavailable message
                    if (timeSlots.length === 0 && dateBookings.length === 0) {
                        addUnavailableMessage(dayContainer);
                    }
                }
            }
            
            // Hide the loading overlay
            if (existingOverlay) {
                existingOverlay.classList.add('hidden');
            }
        }).catch(error => {
            console.error('Error generating schedule:', error);
            
            // Hide the loading overlay
            if (existingOverlay) {
                existingOverlay.classList.add('hidden');
            }
            
            // Show error message
            container.innerHTML = `
                <div class="text-center py-8">
                    <div class="bg-red-100 text-red-700 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                        <i class="fas fa-exclamation-triangle text-2xl"></i>
                    </div>
                    <h3 class="text-xl font-bold mb-2">Error Loading Schedule</h3>
                    <p class="text-gray-600 mb-6">There was an error loading your schedule. Please try again.</p>
                    <button id="retryBtn" class="bg-primary text-white py-3 px-6 rounded-lg font-medium hover:bg-primary-dark">
                        Retry
                    </button>
                </div>
            `;
            
            document.getElementById('retryBtn').addEventListener('click', function() {
                loadUserSchedule();
            });
        });
    }

    function addDateHeader(container, dateText) {
        const dateHeader = document.createElement('div');
        dateHeader.className = 'mb-4';
        dateHeader.innerHTML = `
            <h2 class="text-lg font-medium text-gray-900">${dateText}</h2>
        `;
        container.appendChild(dateHeader);
    }

    function addUnavailableMessage(container) {
        const unavailableDiv = document.createElement('div');
        unavailableDiv.className = 'space-y-4 mb-6';
        unavailableDiv.innerHTML = `
            <div class="bg-gray-100 rounded-lg p-6 mb-4">
                <div class="flex items-center justify-center">
                    <span class="text-gray-500 font-medium">Not Available</span>
                </div>
            </div>
        `;
        container.appendChild(unavailableDiv);
    }

    // Global booking data
    let currentBookingData = {
        dateTime: null,
        client: null,
        frequency: null
    };

    // Set up modal close button
    document.getElementById('closeBookingModal').addEventListener('click', function() {
        document.getElementById('bookingModal').classList.add('hidden');
    });
    
    // Set up booking form handlers
    setupBookingHandlers();
});

function setupBookingHandlers() {
    // New client button
    document.getElementById('newClientBtn').addEventListener('click', function() {
        // Show new client form
        showNewClientForm();
    });
    
    // Frequency options
    document.querySelectorAll('.frequency-option').forEach(button => {
        button.addEventListener('click', function() {
            const frequency = this.getAttribute('data-frequency');
            selectFrequency(frequency);
        });
    });
    
    // Confirm booking button
    document.getElementById('confirmBookingBtn').addEventListener('click', function() {
        saveBooking();
    });
}

function showBookingStep(stepId) {
    // Hide all steps
    document.querySelectorAll('.booking-step').forEach(step => {
        step.classList.add('hidden');
    });
    
    // Show the requested step
    document.getElementById(stepId).classList.remove('hidden');
}

function selectFrequency(frequency) {
    currentBookingData.frequency = frequency;
    updateBookingDateTime();
    showBookingStep('confirmationStep');
}

function updateBookingDateTime() {
    const dateTimeEl = document.getElementById('bookingDateTime');
    if (currentBookingData.dateTime) {
        const { date, startTime, endTime } = currentBookingData.dateTime;
        const formattedDate = new Date(date).toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        dateTimeEl.innerHTML = `
            <p class="font-medium">${formattedDate}</p>
            <p class="text-lg font-bold">${startTime} - ${endTime}</p>
        `;
    }
    
    // Update confirmation details
    const confirmationEl = document.getElementById('confirmationDetails');
    if (currentBookingData.dateTime && currentBookingData.frequency) {
        const { date, startTime, endTime } = currentBookingData.dateTime;
        const formattedDate = new Date(date).toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        let frequencyText = '';
        switch(currentBookingData.frequency) {
            case 'one-time': frequencyText = 'One-time cleaning'; break;
            case 'weekly': frequencyText = 'Weekly cleaning'; break;
            case 'biweekly': frequencyText = 'Bi-weekly cleaning'; break;
            case 'monthly': frequencyText = 'Monthly cleaning'; break;
        }
        
        confirmationEl.innerHTML = `
            <p class="font-medium">${formattedDate}</p>
            <p class="text-lg font-bold">${startTime} - ${endTime}</p>
            <p class="mt-2">${frequencyText}</p>
            <p class="mt-2">Client: ${currentBookingData.client?.name || 'New Client'}</p>
        `;
    }
}

async function loadClients() {
    const user = firebase.auth().currentUser;
    if (!user) return;
    
    const clientsContainer = document.getElementById('existingClients');
    clientsContainer.innerHTML = '<p class="text-gray-600 mb-2">Loading clients...</p>';
    
    try {
        const clientsRef = firebase.firestore().collection('users').doc(user.uid).collection('clients');
        const snapshot = await clientsRef.get();
        
        if (snapshot.empty) {
            clientsContainer.innerHTML = '<p class="text-gray-600 mb-2">No existing clients</p>';
            return;
        }
        
        clientsContainer.innerHTML = '<p class="text-gray-600 mb-2">Your clients:</p>';
        
        snapshot.forEach(doc => {
            const client = doc.data();
            const clientEl = document.createElement('button');
            clientEl.className = 'w-full p-3 bg-gray-100 rounded-lg text-left mb-2 hover:bg-gray-200';
            clientEl.innerHTML = `
                <div class="flex items-center">
                    <div class="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center mr-3">
                        <i class="fas fa-user"></i>
                    </div>
                    <span>${client.name}</span>
                </div>
            `;
            
            clientEl.addEventListener('click', function() {
                selectClient(doc.id, client.name);
            });
            
            clientsContainer.appendChild(clientEl);
        });
    } catch (error) {
        console.error('Error loading clients:', error);
        clientsContainer.innerHTML = '<p class="text-red-500">Error loading clients</p>';
    }
}

function selectClient(clientId, clientName) {
    currentBookingData.client = {
        id: clientId,
        name: clientName
    };
    showBookingStep('frequencySelection');
}

async function saveBooking() {
    const user = firebase.auth().currentUser;
    if (!user) return;
    
    const confirmBtn = document.getElementById('confirmBookingBtn');
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Saving...';
    
    try {
        console.log('Saving booking with data:', currentBookingData);
        
        // Get client details if a client was selected
        let clientDetails = {};
        if (currentBookingData.client?.id) {
            console.log('Fetching client details for ID:', currentBookingData.client.id);
            const clientDoc = await firebase.firestore().collection('users').doc(user.uid)
                .collection('clients').doc(currentBookingData.client.id).get();
            
            if (clientDoc.exists) {
                const clientData = clientDoc.data();
                clientDetails = {
                    clientAddress: clientData.address || '',
                    clientPhone: clientData.phone || '',
                    accessInfo: clientData.accessInfo || clientData.notes || '',
                    notes: clientData.notes || '',
                    price: clientData.price || null
                };
                console.log('Retrieved client details:', clientDetails);
            } else {
                console.log('Client document does not exist');
            }
        }
        
        const bookingRef = firebase.firestore().collection('users').doc(user.uid).collection('bookings').doc();
        
        // Determine if the booking is for today
        const bookingDate = new Date(currentBookingData.dateTime.date);
        const today = new Date();
        const isToday = bookingDate.toDateString() === today.toDateString();
        
        // Determine initial status based on date and time
        let initialStatus = 'scheduled';
        if (isToday) {
            const now = new Date();
            const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} ${now.getHours() >= 12 ? 'PM' : 'AM'}`;
            
            if (currentBookingData.dateTime.startTime <= currentTime && currentTime <= currentBookingData.dateTime.endTime) {
                initialStatus = 'in-progress';
            }
        }
        
        // Ensure the date is in the correct format (YYYY-MM-DD)
        const bookingData = {
            date: currentBookingData.dateTime.date,
            startTime: currentBookingData.dateTime.startTime,
            endTime: currentBookingData.dateTime.endTime,
            clientId: currentBookingData.client?.id || null,
            clientName: currentBookingData.client?.name || 'New Client',
            frequency: currentBookingData.frequency,
            status: initialStatus,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            ...clientDetails
        };
        
        console.log('Saving booking with data:', bookingData);
        await bookingRef.set(bookingData);
        console.log('Booking saved successfully with ID:', bookingRef.id);
        
        // Show success message
        document.getElementById('bookingContent').innerHTML = `
            <div class="text-center py-8">
                <div class="bg-green-100 text-green-700 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <i class="fas fa-check text-2xl"></i>
                </div>
                <h3 class="text-xl font-bold mb-2">Booking Confirmed!</h3>
                <p class="text-gray-600 mb-6">Your cleaning has been scheduled successfully.</p>
                <button id="closeSuccessBtn" class="bg-primary text-white py-3 px-6 rounded-lg font-medium hover:bg-primary-dark">
                    Back to Schedule
                </button>
            </div>
        `;
        
        document.getElementById('closeSuccessBtn').addEventListener('click', function() {
            document.getElementById('bookingModal').classList.add('hidden');
            // Reload the schedule to show the new booking
            loadUserSchedule();
        });
        
    } catch (error) {
        console.error('Error saving booking:', error);
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = 'Confirm Booking';
        alert('Error saving booking. Please try again.');
    }
}

function addTimeSlot(container, startTime, endTime, date) {
    const timeSlot = document.createElement('button');
    const formattedDate = date.toISOString().split('T')[0];
    
    timeSlot.className = 'block w-full bg-primary-light/40 rounded-lg border-2 border-dashed border-primary/30 p-6 hover:bg-primary-light/60 transition-all mb-4';
    timeSlot.innerHTML = `
            <div class="flex items-center justify-between">
                <div>
                <span class="text-xl font-bold text-gray-900">${startTime} - ${endTime}</span>
                    <p class="text-primary font-medium mt-1">Available</p>
                </div>
                <div class="bg-primary text-white rounded-full w-10 h-10 flex items-center justify-center">
                    <i class="fas fa-plus"></i>
                </div>
            </div>
        `;

    // Add click handler to show modal
    timeSlot.addEventListener('click', () => {
        const user = firebase.auth().currentUser;
        console.log('Time slot clicked, current user:', user?.uid);
        
        if (!user) {
            console.log('No user found, redirecting to login');
            window.location.href = 'login.html';
            return;
        }

        // Set booking data
        currentBookingData = {
            dateTime: {
                date: formattedDate,
                startTime: startTime,
                endTime: endTime
            },
            client: null,
            frequency: null
        };
        
        // Update booking date/time display
        updateBookingDateTime();
        
        // Load clients
        loadClients();
        
        // Show client selection step
        showBookingStep('clientSelection');
        
        // Show modal
        document.getElementById('bookingModal').classList.remove('hidden');
    });
    
    container.appendChild(timeSlot);
}

// Function to show the new client form
function showNewClientForm() {
    // Create the new client step if it doesn't exist
    if (!document.getElementById('newClientStep')) {
        const newClientStep = document.createElement('div');
        newClientStep.id = 'newClientStep';
        newClientStep.className = 'booking-step hidden';
        newClientStep.innerHTML = `
            <div class="flex items-center mb-4">
                <button id="backToClientSelection" class="text-gray-500 hover:text-gray-700 mr-2">
                    <i class="fas fa-arrow-left"></i>
                </button>
                <h3 class="text-lg font-bold">Add New Client</h3>
            </div>
            
            <div class="space-y-6">
                <!-- Client Information -->
                <div class="bg-white rounded-lg shadow-sm p-4">
                    <h2 class="text-lg font-medium text-gray-900 mb-4">Client Information</h2>
                    <div class="space-y-4">
                        <div>
                            <input type="text" id="clientName" placeholder="Client Name" required
                                class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary-light">
                        </div>
                        <div>
                            <input type="tel" id="clientPhone" placeholder="Phone Number" required
                                class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary-light">
                        </div>
                        <div>
                            <input type="email" id="clientEmail" placeholder="Email (optional)"
                                class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary-light">
                        </div>
                        <div>
                            <input type="text" id="clientAddress" placeholder="Address" required
                                class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary-light">
                        </div>
                    </div>
                </div>

                <!-- Price per Cleaning -->
                <div class="bg-white rounded-lg shadow-sm p-4">
                    <h2 class="text-lg font-medium text-gray-900 mb-3">Price per Cleaning</h2>
                    <div class="relative">
                        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span class="text-gray-500">$</span>
                        </div>
                        <input type="number" id="cleaningPrice" placeholder="50" 
                            class="w-full pl-8 pr-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary-light">
                    </div>
                </div>

                <!-- Special Instructions -->
                <div class="bg-white rounded-lg shadow-sm p-4">
                    <h2 class="text-lg font-medium text-gray-900 mb-3">Special Instructions</h2>
                    <div>
                        <textarea id="clientNotes" rows="3" class="block w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-primary focus:ring-2 focus:ring-primary-light" 
                            placeholder="Enter any special instructions or notes (products to use, pets, entry instructions, etc.)"></textarea>
                    </div>
                </div>

                <!-- Access Information -->
                <div class="bg-white rounded-lg shadow-sm p-4">
                    <h2 class="text-lg font-medium text-gray-900 mb-3">Access Information</h2>
                    <div>
                        <textarea id="accessInfo" rows="3" class="block w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-primary focus:ring-2 focus:ring-primary-light" 
                            placeholder="Key location, door codes, alarm information, etc."></textarea>
                    </div>
                </div>

                <!-- Save Button -->
                <div class="mt-8">
                    <button type="button" id="saveClientBtn" class="block w-full bg-green-500 hover:bg-green-600 text-white font-medium py-4 px-4 rounded-lg flex items-center justify-center gap-2">
                        <i class="fas fa-check"></i>
                        Save Client & Continue
                    </button>
                    
                    <button type="button" id="cancelClientBtn" class="block w-full text-center text-gray-600 py-4">
                        Cancel
                    </button>
                </div>
            </div>
        `;
        
        document.getElementById('bookingSteps').appendChild(newClientStep);
        
        // Add back button handler
        document.getElementById('backToClientSelection').addEventListener('click', function() {
            showBookingStep('clientSelection');
        });
        
        // Add cancel button handler
        document.getElementById('cancelClientBtn').addEventListener('click', function() {
            showBookingStep('clientSelection');
        });
        
        // Add save button handler
        document.getElementById('saveClientBtn').addEventListener('click', function() {
            saveNewClient();
        });
    }
    
    // Show the new client step
    showBookingStep('newClientStep');
}

// Function to save a new client
async function saveNewClient() {
    const user = firebase.auth().currentUser;
    if (!user) return;
    
    const nameInput = document.getElementById('clientName');
    const phoneInput = document.getElementById('clientPhone');
    const emailInput = document.getElementById('clientEmail');
    const addressInput = document.getElementById('clientAddress');
    const notesInput = document.getElementById('clientNotes');
    const accessInfoInput = document.getElementById('accessInfo');
    const priceInput = document.getElementById('cleaningPrice');
    
    // Basic validation
    if (!nameInput.value.trim() || !phoneInput.value.trim() || !addressInput.value.trim()) {
        alert('Please fill in all required fields');
        return;
    }
    
    // Disable the save button and show loading state
    const saveBtn = document.getElementById('saveClientBtn');
    const originalBtnText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Saving...';
    
    try {
        // Save the client to Firestore
        const clientsRef = firebase.firestore().collection('users').doc(user.uid).collection('clients');
        const newClientRef = await clientsRef.add({
            name: nameInput.value.trim(),
            phone: phoneInput.value.trim(),
            email: emailInput.value.trim() || null,
            address: addressInput.value.trim(),
            notes: notesInput.value.trim() || null,
            accessInfo: accessInfoInput.value.trim() || null,
            price: priceInput.value ? Number(priceInput.value) : null,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Select the newly created client
        selectClient(newClientRef.id, nameInput.value.trim());
        
        // Move to frequency selection
        showBookingStep('frequencySelection');
        
    } catch (error) {
        console.error('Error saving new client:', error);
        alert('Error saving client. Please try again.');
        // Stay on the new client form
        return;
    } finally {
        // Restore the button state
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalBtnText;
    }
}

// Function to load user's bookings from Firestore
async function loadUserBookings(startDate, endDate) {
    const user = firebase.auth().currentUser;
    if (!user) {
        console.log('No user found, cannot load bookings');
        return [];
    }
    
    // Format dates for Firestore query
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    console.log('Loading bookings from', startDateStr, 'to', endDateStr);
    
    try {
        const bookingsRef = firebase.firestore().collection('users').doc(user.uid).collection('bookings');
        
        // First, try to get all bookings and filter client-side
        // This is more reliable than using where() with dates which can be tricky
        const snapshot = await bookingsRef.get();
        
        const bookings = [];
        snapshot.forEach(doc => {
            const booking = {
                id: doc.id,
                ...doc.data()
            };
            
            // Only include bookings within the date range
            if (booking.date >= startDateStr && booking.date <= endDateStr) {
                bookings.push(booking);
            }
        });
        
        console.log('Found', bookings.length, 'bookings in date range');
        return bookings;
    } catch (error) {
        console.error('Error loading bookings:', error);
        return [];
    }
}

// Function to add a booking card to the schedule
function addBookingCard(container, booking, isToday) {
    console.log('Adding booking card for:', booking);
    
    const card = document.createElement('div');
    card.className = 'bg-white rounded-lg shadow-sm mb-4';
    
    // Determine status based on booking status in database
    let status = 'Upcoming';
    let statusClass = 'bg-gray-100 text-gray-800';
    
    // Map database status to display status
    switch(booking.status) {
        case 'in-progress':
            status = 'In Progress';
            statusClass = 'bg-blue-100 text-blue-800';
            break;
        case 'completed':
            status = 'Done';
            statusClass = 'bg-green-100 text-green-800';
            break;
        case 'paid':
            status = 'Done & Paid';
            statusClass = 'bg-green-100 text-green-800';
            break;
        case 'cancelled':
            status = 'Cancelled';
            statusClass = 'bg-red-100 text-red-800';
            break;
        default: // 'scheduled' or any other status
            // If it's today and the current time is between start and end time, mark as "In Progress"
            if (isToday) {
                const now = new Date();
                const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
                
                if (booking.startTime <= currentTime && currentTime <= booking.endTime) {
                    status = 'In Progress';
                    statusClass = 'bg-blue-100 text-blue-800';
                } else if (currentTime > booking.endTime) {
                    status = 'Done';
                    statusClass = 'bg-green-100 text-green-800';
                }
            }
            break;
    }
    
    // Create the card HTML with consistent format
    let cardHTML = `
        <div class="p-6">
            <!-- Time and Status -->
            <div class="flex justify-between items-center mb-4">
                <div class="flex items-center gap-x-2">
                    <span class="text-xl font-bold text-gray-900">${booking.startTime} - ${booking.endTime}</span>
                </div>
                <!-- Status Button -->
                <button class="px-3 py-2 text-sm font-medium rounded-lg ${statusClass}">
                    ${status}
                </button>
            </div>
            
            <!-- Client Name -->
            <h3 class="font-medium text-gray-900">${booking.clientName}</h3>
    `;
    
    // Add address if available
    if (booking.clientAddress) {
        cardHTML += `
            <div class="flex items-center text-gray-600 text-sm mt-1">
                <i class="fas fa-map-marker-alt mr-2 text-gray-500"></i>
                <a href="https://maps.google.com/?q=${encodeURIComponent(booking.clientAddress)}" target="_blank">
                    ${booking.clientAddress}
                </a>
            </div>
        `;
    }
    
    // Add notes if available
    if (booking.notes) {
        cardHTML += `
            <div class="flex items-center text-gray-600 text-sm mt-1">
                <i class="fas fa-info-circle mr-2 text-gray-500"></i>
                ${booking.notes}
            </div>
        `;
    }
    
    // Add access info if available and different from notes
    if (booking.accessInfo && booking.accessInfo !== booking.notes) {
        cardHTML += `
            <div class="flex items-center text-gray-600 text-sm mt-1">
                <i class="fas fa-key mr-2 text-gray-500"></i>
                ${booking.accessInfo}
            </div>
        `;
    }
    
    // Add phone if available
    if (booking.clientPhone) {
        cardHTML += `
            <div class="flex items-center text-primary text-sm mt-1">
                <i class="fas fa-phone-alt mr-2"></i>
                <a href="tel:${booking.clientPhone}">
                    ${booking.clientPhone}
                </a>
            </div>
        `;
    }
    
    // Add action buttons
    cardHTML += `
            <!-- Action Buttons -->
            <div class="flex gap-2 mt-4">
                <button class="flex-1 py-2 px-4 bg-gray-100 rounded-lg text-center text-gray-700 text-sm font-medium view-details" data-booking-id="${booking.id}">
                    View Details
                </button>
                <button class="flex-1 py-2 px-4 bg-primary-light rounded-lg text-center text-primary text-sm font-medium reschedule" data-booking-id="${booking.id}">
                    Reschedule
                </button>
            </div>
        </div>
    `;
    
    card.innerHTML = cardHTML;
    
    // Add to container
    container.appendChild(card);
    
    // Add event listeners for the action buttons
    const viewDetailsBtn = card.querySelector('.view-details');
    const rescheduleBtn = card.querySelector('.reschedule');
    
    viewDetailsBtn.addEventListener('click', () => {
        showBookingDetails(booking);
    });
    
    rescheduleBtn.addEventListener('click', () => {
        showRescheduleOptions(booking);
    });
}

// Function to show booking details
function showBookingDetails(booking) {
    // Create a modal to show booking details
    const modal = document.createElement('div');
    modal.id = 'bookingDetailsModal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center';
    
    // Format the date for display
    const formattedDate = new Date(booking.date).toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    // Determine if the booking is in the past
    const isPastBooking = new Date(booking.date + 'T' + booking.endTime.replace(' PM', ':00 PM').replace(' AM', ':00 AM')) < new Date();
    
    // Determine if the booking is cancelled
    const isCancelled = booking.status === 'cancelled';
    
    // Determine the current status
    const currentStatus = booking.status || 'scheduled';
    
    modal.innerHTML = `
        <div class="bg-white rounded-lg w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div class="p-4 border-b border-gray-200 flex justify-between items-center">
                <h2 class="text-xl font-bold text-gray-900">Booking Details</h2>
                <button class="text-gray-500 hover:text-gray-700 close-modal">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="p-4">
                <!-- Time and Date -->
                <div class="mb-4 p-4 bg-primary-light/30 rounded-lg">
                    <div class="text-2xl font-bold text-primary">${booking.startTime} - ${booking.endTime}</div>
                    <p class="font-medium text-gray-700">${formattedDate}</p>
                </div>
                
                <!-- Status Toggle -->
                <div class="bg-white rounded-lg shadow-sm p-4 mb-4">
                    <h3 class="text-sm font-medium text-gray-500 mb-3">Status</h3>
                    <div class="grid grid-cols-4 gap-1 rounded-lg bg-gray-100 p-1">
                        <button type="button" class="py-2.5 text-xs font-medium ${currentStatus === 'scheduled' ? 'text-white bg-primary' : 'text-gray-900'} rounded-md status-btn" data-status="scheduled">
                            Upcoming
                        </button>
                        <button type="button" class="py-2.5 text-xs font-medium ${currentStatus === 'in-progress' ? 'text-white bg-primary' : 'text-gray-900'} rounded-md status-btn" data-status="in-progress">
                            In Progress
                        </button>
                        <button type="button" class="py-2.5 text-xs font-medium ${currentStatus === 'completed' ? 'text-white bg-primary' : 'text-gray-900'} rounded-md status-btn" data-status="completed">
                            Done
                        </button>
                        <button type="button" class="py-2.5 text-xs font-medium ${currentStatus === 'paid' ? 'text-white bg-primary' : 'text-gray-900'} rounded-md status-btn" data-status="paid">
                            Done & Paid
                        </button>
                    </div>
                </div>
                
                <!-- Client Information -->
                <div class="bg-white rounded-lg shadow-sm p-4 mb-4">
                    <h3 class="text-sm font-medium text-gray-500 mb-3">Client Information</h3>
                    <div class="space-y-4">
                        <div>
                            <div class="text-sm text-gray-500">Name</div>
                            <div class="text-base font-medium text-gray-900">${booking.clientName}</div>
                        </div>
                        ${booking.clientAddress ? `
                        <div>
                            <div class="text-sm text-gray-500">Address</div>
                            <div class="text-base font-medium text-gray-900">
                                <a href="https://maps.google.com/?q=${encodeURIComponent(booking.clientAddress)}" target="_blank" class="text-primary hover:underline flex items-center">
                                    <i class="fas fa-map-marker-alt mr-1"></i>
                                    ${booking.clientAddress}
                                </a>
                            </div>
                        </div>
                        ` : ''}
                        ${booking.clientPhone ? `
                        <div>
                            <div class="text-sm text-gray-500">Phone</div>
                            <div class="text-base font-medium text-gray-900">
                                <a href="tel:${booking.clientPhone}" class="text-primary hover:underline flex items-center">
                                    <i class="fas fa-phone-alt mr-1"></i>
                                    ${booking.clientPhone}
                                </a>
                            </div>
                        </div>
                        ` : ''}
                        ${booking.clientEmail ? `
                        <div>
                            <div class="text-sm text-gray-500">Email</div>
                            <div class="text-base font-medium text-gray-900">
                                <a href="mailto:${booking.clientEmail}" class="text-primary hover:underline flex items-center">
                                    <i class="fas fa-envelope mr-1"></i>
                                    ${booking.clientEmail}
                                </a>
                            </div>
                        </div>
                        ` : ''}
                    </div>
                </div>
                
                <!-- Cleaning Details -->
                <div class="bg-white rounded-lg shadow-sm p-4 mb-4">
                    <h3 class="text-sm font-medium text-gray-500 mb-3">Cleaning Details</h3>
                    <div class="space-y-4">
                        <div>
                            <div class="text-sm text-gray-500">Type</div>
                            <div class="text-base font-medium text-gray-900">Regular Cleaning</div>
                        </div>
                        <div>
                            <div class="text-sm text-gray-500">Frequency</div>
                            <div class="text-base font-medium text-gray-900">${booking.frequency.charAt(0).toUpperCase() + booking.frequency.slice(1)}</div>
                        </div>
                        ${booking.notes ? `
                        <div>
                            <div class="text-sm text-gray-500">Special Instructions</div>
                            <div class="text-base text-gray-900 bg-gray-50 rounded-md p-3 mt-1">
                                <i class="fas fa-info-circle text-primary mr-1"></i>
                                ${booking.notes}
                            </div>
                        </div>
                        ` : ''}
                        ${booking.accessInfo ? `
                        <div>
                            <div class="text-sm text-gray-500">Access Information</div>
                            <div class="text-base text-gray-900 bg-gray-50 rounded-md p-3 mt-1">
                                <i class="fas fa-key text-primary mr-1"></i>
                                ${booking.accessInfo}
                            </div>
                        </div>
                        ` : ''}
                        ${booking.price ? `
                        <div>
                            <div class="text-sm text-gray-500">Price</div>
                            <div class="text-base font-medium text-gray-900">
                                <i class="fas fa-dollar-sign text-primary mr-1"></i>
                                $${booking.price}
                            </div>
                        </div>
                        ` : ''}
                    </div>
                </div>
                
                <!-- Action Buttons -->
                <div class="flex gap-2 mt-6">
                    ${!isCancelled && !isPastBooking ? `
                    <button class="flex-1 py-3 px-4 bg-red-100 rounded-lg text-center text-red-700 text-sm font-medium cancel-booking" data-booking-id="${booking.id}">
                        <i class="fas fa-ban mr-1"></i> Cancel Booking
                    </button>
                    ` : ''}
                    <button class="flex-1 py-3 px-4 bg-primary rounded-lg text-center text-white text-sm font-medium close-modal">
                        <i class="fas fa-check mr-1"></i> Close
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners for the close buttons
    const closeButtons = modal.querySelectorAll('.close-modal');
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            modal.remove();
        });
    });
    
    // Add event listener for the cancel booking button
    const cancelButton = modal.querySelector('.cancel-booking');
    if (cancelButton) {
        cancelButton.addEventListener('click', () => {
            // Show a confirmation dialog
            const confirmCancel = confirm('Are you sure you want to cancel this booking? This action cannot be undone.');
            if (confirmCancel) {
                modal.remove(); // Close the modal first
                cancelBooking(booking.id);
            }
        });
    }
    
    // Add event listeners for status buttons
    const statusButtons = modal.querySelectorAll('.status-btn');
    statusButtons.forEach(button => {
        button.addEventListener('click', () => {
            const newStatus = button.getAttribute('data-status');
            console.log('Status button clicked:', newStatus);
            
            // Update UI immediately to provide feedback
            statusButtons.forEach(btn => {
                if (btn === button) {
                    btn.classList.remove('text-gray-900');
                    btn.classList.add('text-white', 'bg-primary');
                } else {
                    btn.classList.remove('text-white', 'bg-primary');
                    btn.classList.add('text-gray-900');
                }
            });
            
            // Create and show a loading overlay
            const loadingOverlay = document.createElement('div');
            loadingOverlay.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center';
            loadingOverlay.innerHTML = `
                <div class="bg-white p-4 rounded-lg shadow-lg flex items-center">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
                    <p class="text-gray-700">Updating status...</p>
                </div>
            `;
            document.body.appendChild(loadingOverlay);
            
            // Get a reference to the booking document
            const user = firebase.auth().currentUser;
            if (!user) {
                loadingOverlay.remove();
                alert('You must be logged in to update a booking');
                return;
            }
            
            console.log('Current user ID:', user.uid);
            console.log('Booking ID:', booking.id);
            
            try {
                const bookingRef = firebase.firestore().collection('users').doc(user.uid).collection('bookings').doc(booking.id);
                
                // Create the update data
                const updateData = {
                    status: newStatus,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                console.log('Updating booking with data:', updateData);
                
                // Update the booking status directly
                bookingRef.update(updateData)
                    .then(() => {
                        console.log('Booking status updated successfully');
                        
                        // Update the booking object to reflect the new status
                        booking.status = newStatus;
                        
                        // Remove loading overlay
                        loadingOverlay.remove();
                        
                        // Show a brief success message
                        const successMessage = document.createElement('div');
                        successMessage.className = 'fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-green-100 text-green-800 px-4 py-2 rounded-lg shadow-lg z-50';
                        
                        // Format the status for display
                        let displayStatus = newStatus.replace(/-/g, ' ');
                        displayStatus = displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1);
                        
                        successMessage.innerHTML = `<i class="fas fa-check-circle mr-1"></i> Status updated to ${displayStatus}`;
                        document.body.appendChild(successMessage);
                        
                        // Remove the success message after 3 seconds
                        setTimeout(() => {
                            successMessage.remove();
                        }, 3000);
                        
                        // Update the card in the schedule view without closing the modal
                        const cards = document.querySelectorAll('.bg-white.rounded-lg.shadow-sm.mb-4');
                        cards.forEach(card => {
                            // Find the card that matches this booking
                            const timeText = card.querySelector('.text-xl.font-bold.text-gray-900')?.textContent;
                            const nameText = card.querySelector('h3.font-medium.text-gray-900')?.textContent;
                            
                            if (timeText === `${booking.startTime} - ${booking.endTime}` && 
                                nameText === booking.clientName) {
                                
                                // Update the status button in the card
                                const statusBtn = card.querySelector('button.px-3.py-2.text-sm.font-medium.rounded-lg');
                                if (statusBtn) {
                                    // Determine status display and class
                                    let statusDisplay = 'Upcoming';
                                    let statusClass = 'bg-gray-100 text-gray-800';
                                    
                                    switch(newStatus) {
                                        case 'in-progress':
                                            statusDisplay = 'In Progress';
                                            statusClass = 'bg-blue-100 text-blue-800';
                                            break;
                                        case 'completed':
                                            statusDisplay = 'Done';
                                            statusClass = 'bg-green-100 text-green-800';
                                            break;
                                        case 'paid':
                                            statusDisplay = 'Done & Paid';
                                            statusClass = 'bg-green-100 text-green-800';
                                            break;
                                        case 'cancelled':
                                            statusDisplay = 'Cancelled';
                                            statusClass = 'bg-red-100 text-red-800';
                                            break;
                                    }
                                    
                                    // Update the button text and class
                                    statusBtn.textContent = statusDisplay;
                                    statusBtn.className = `px-3 py-2 text-sm font-medium rounded-lg ${statusClass}`;
                                    
                                    console.log('Updated card status to:', statusDisplay);
                                }
                            }
                        });
                    })
                    .catch(error => {
                        console.error('Error updating booking status:', error);
                        
                        // Remove loading overlay
                        loadingOverlay.remove();
                        
                        // Show detailed error message
                        alert(`Error updating booking status: ${error.message || 'Unknown error'}`);
                        
                        // Revert UI changes if there was an error
                        bookingRef.get().then(doc => {
                            if (doc.exists) {
                                const currentStatus = doc.data().status || 'scheduled';
                                statusButtons.forEach(btn => {
                                    const status = btn.getAttribute('data-status');
                                    if (status === currentStatus) {
                                        btn.classList.remove('text-gray-900');
                                        btn.classList.add('text-white', 'bg-primary');
                                    } else {
                                        btn.classList.remove('text-white', 'bg-primary');
                                        btn.classList.add('text-gray-900');
                                    }
                                });
                            }
                        }).catch(err => {
                            console.error('Error getting current booking status:', err);
                        });
                    });
            } catch (error) {
                console.error('Exception in update process:', error);
                loadingOverlay.remove();
                alert(`Error in update process: ${error.message || 'Unknown error'}`);
            }
        });
    });
}

// Function to cancel a booking
async function cancelBooking(bookingId) {
    const user = firebase.auth().currentUser;
    if (!user) {
        alert('You must be logged in to cancel a booking');
        return;
    }
    
    showLoading();
    
    try {
        console.log('Attempting to cancel booking with ID:', bookingId);
        
        // Get the booking document first to verify it exists
        const bookingRef = firebase.firestore().collection('users').doc(user.uid).collection('bookings').doc(bookingId);
        const bookingDoc = await bookingRef.get();
        
        if (!bookingDoc.exists) {
            console.error('Booking not found:', bookingId);
            hideLoading();
            alert('Booking not found. It may have been already deleted.');
            return;
        }
        
        // Update the booking status to cancelled
        await bookingRef.update({
            status: 'cancelled',
            cancelledAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('Booking cancelled successfully:', bookingId);
        hideLoading();
        
        // Show success message
        alert('Booking cancelled successfully');
        
        // Reload the schedule to reflect the changes
        loadUserSchedule();
    } catch (error) {
        console.error('Error cancelling booking:', error);
        hideLoading();
        
        // Show a more user-friendly error message
        let errorMessage = 'Error cancelling booking. Please try again.';
        if (error.code === 'permission-denied') {
            errorMessage = 'You do not have permission to cancel this booking.';
        } else if (error.code === 'not-found') {
            errorMessage = 'Booking not found. It may have been already deleted.';
        }
        
        alert(errorMessage);
    }
}

// Function to show reschedule options
function showRescheduleOptions(booking) {
    // For now, just show an alert
    alert('Reschedule functionality will be implemented in a future update.');
}

// Function to navigate to the previous week
function navigateToPreviousWeek() {
    console.log('Navigating to previous week');
    
    try {
        const prevWeekDate = new Date(currentWeekStart);
        prevWeekDate.setDate(prevWeekDate.getDate() - 7);
        
        if (!isInPast(prevWeekDate)) {
            // Create and show a loading overlay
            const loadingOverlay = document.createElement('div');
            loadingOverlay.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center';
            loadingOverlay.innerHTML = `
                <div class="bg-white p-4 rounded-lg shadow-lg flex items-center">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
                    <p class="text-gray-700">Loading previous week...</p>
                </div>
            `;
            document.body.appendChild(loadingOverlay);
            
            // Update the current week start date
            currentWeekStart = new Date(prevWeekDate);
            console.log('New week start date:', currentWeekStart.toDateString());
            
            // Update the week display in the UI
            const weekRangeElement = document.getElementById('week-range');
            if (weekRangeElement) {
                const weekStart = new Date(currentWeekStart);
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                
                // Format the dates
                const options = { month: 'long', day: 'numeric', year: 'numeric' };
                const startStr = weekStart.toLocaleDateString('en-US', options);
                const endStr = weekEnd.toLocaleDateString('en-US', options);
                
                // Update the week range display
                weekRangeElement.textContent = `${startStr} - ${endStr}`;
                console.log('Week range updated:', weekRangeElement.textContent);
            }
            
            // Update navigation state
            const prevWeekBtn = document.getElementById('prev-week');
            if (prevWeekBtn) {
                const newPrevWeekDate = new Date(currentWeekStart);
                newPrevWeekDate.setDate(newPrevWeekDate.getDate() - 7);
                
                prevWeekBtn.disabled = isInPast(newPrevWeekDate);
                prevWeekBtn.classList.toggle('opacity-50', prevWeekBtn.disabled);
                prevWeekBtn.classList.toggle('cursor-not-allowed', prevWeekBtn.disabled);
            }
            
            // Load the user schedule for the new week
            const user = firebase.auth().currentUser;
            if (!user) {
                console.log('No user found, cannot load schedule');
                loadingOverlay.remove();
                return;
            }
            
            console.log('Loading schedule for user:', user.uid);
            
            // Get user settings from Firestore
            firebase.firestore().collection('users').doc(user.uid).get()
                .then(doc => {
                    let settings;
                    
                    if (doc.exists && doc.data().settings) {
                        settings = doc.data().settings;
                        console.log('User settings loaded:', settings);
                    } else {
                        console.log('No user settings found, using defaults');
                        settings = DEFAULT_SETTINGS;
                    }
                    
                    // Calculate time slots based on settings
                    if (!settings.calculatedTimeSlots) {
                        settings.calculatedTimeSlots = calculateAvailableTimeSlots(settings);
                    }
                    
                    // Generate schedule with settings
                    generateSchedule(settings);
                    
                    // Remove loading overlay
                    loadingOverlay.remove();
                })
                .catch(error => {
                    console.error('Error loading user settings:', error);
                    
                    // Use default settings if there's an error
                    const settings = DEFAULT_SETTINGS;
                    settings.calculatedTimeSlots = calculateAvailableTimeSlots(settings);
                    generateSchedule(settings);
                    
                    // Remove loading overlay
                    loadingOverlay.remove();
                });
        } else {
            console.log('Cannot navigate to past week');
        }
    } catch (error) {
        console.error('Error navigating to previous week:', error);
        
        // Remove any existing loading overlay
        const existingOverlay = document.querySelector('.fixed.inset-0.bg-black.bg-opacity-50.z-50');
        if (existingOverlay) {
            existingOverlay.remove();
        }
    }
}

// Function to navigate to the next week
function navigateToNextWeek() {
    console.log('Navigating to next week');
    
    try {
        // Create and show a loading overlay
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center';
        loadingOverlay.innerHTML = `
            <div class="bg-white p-4 rounded-lg shadow-lg flex items-center">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
                <p class="text-gray-700">Loading next week...</p>
            </div>
        `;
        document.body.appendChild(loadingOverlay);
        
        // Calculate the next week's start date
        const nextWeekDate = new Date(currentWeekStart);
        nextWeekDate.setDate(nextWeekDate.getDate() + 7);
        currentWeekStart = nextWeekDate;
        
        console.log('New week start date:', currentWeekStart.toDateString());
        
        // Update the week display in the UI
        const weekRangeElement = document.getElementById('week-range');
        if (weekRangeElement) {
            const weekStart = new Date(currentWeekStart);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            
            // Format the dates
            const options = { month: 'long', day: 'numeric', year: 'numeric' };
            const startStr = weekStart.toLocaleDateString('en-US', options);
            const endStr = weekEnd.toLocaleDateString('en-US', options);
            
            // Update the week range display
            weekRangeElement.textContent = `${startStr} - ${endStr}`;
            console.log('Week range updated:', weekRangeElement.textContent);
        }
        
        // Update navigation state
        const prevWeekBtn = document.getElementById('prev-week');
        if (prevWeekBtn) {
            const prevWeekDate = new Date(currentWeekStart);
            prevWeekDate.setDate(prevWeekDate.getDate() - 7);
            
            prevWeekBtn.disabled = isInPast(prevWeekDate);
            prevWeekBtn.classList.toggle('opacity-50', prevWeekBtn.disabled);
            prevWeekBtn.classList.toggle('cursor-not-allowed', prevWeekBtn.disabled);
        }
        
        // Load the user schedule for the new week
        const user = firebase.auth().currentUser;
        if (!user) {
            console.log('No user found, cannot load schedule');
            loadingOverlay.remove();
            return;
        }
        
        console.log('Loading schedule for user:', user.uid);
        
        // Get user settings from Firestore
        firebase.firestore().collection('users').doc(user.uid).get()
            .then(doc => {
                let settings;
                
                if (doc.exists && doc.data().settings) {
                    settings = doc.data().settings;
                    console.log('User settings loaded:', settings);
                } else {
                    console.log('No user settings found, using defaults');
                    settings = DEFAULT_SETTINGS;
                }
                
                // Calculate time slots based on settings
                if (!settings.calculatedTimeSlots) {
                    settings.calculatedTimeSlots = calculateAvailableTimeSlots(settings);
                }
                
                // Generate schedule with settings
                generateSchedule(settings);
                
                // Remove loading overlay
                loadingOverlay.remove();
            })
            .catch(error => {
                console.error('Error loading user settings:', error);
                
                // Use default settings if there's an error
                const settings = DEFAULT_SETTINGS;
                settings.calculatedTimeSlots = calculateAvailableTimeSlots(settings);
                generateSchedule(settings);
                
                // Remove loading overlay
                loadingOverlay.remove();
            });
    } catch (error) {
        console.error('Error navigating to next week:', error);
        
        // Remove any existing loading overlay
        const existingOverlay = document.querySelector('.fixed.inset-0.bg-black.bg-opacity-50.z-50');
        if (existingOverlay) {
            existingOverlay.remove();
        }
    }
}

// Function to navigate to the current week
function navigateToCurrentWeek() {
    console.log('Navigating to current week');
    
    try {
        // Create and show a loading overlay
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center';
        loadingOverlay.innerHTML = `
            <div class="bg-white p-4 rounded-lg shadow-lg flex items-center">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
                <p class="text-gray-700">Loading current week...</p>
            </div>
        `;
        document.body.appendChild(loadingOverlay);
        
        // Set current week start date to the beginning of the current week
        const today = new Date();
        currentWeekStart = new Date(today);
        currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay());
        currentWeekStart.setHours(0, 0, 0, 0);
        console.log('New week start date:', currentWeekStart.toDateString());
        
        // Update the week display in the UI
        const weekRangeElement = document.getElementById('week-range');
        if (weekRangeElement) {
            const weekStart = new Date(currentWeekStart);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            
            // Format the dates
            const options = { month: 'long', day: 'numeric', year: 'numeric' };
            const startStr = weekStart.toLocaleDateString('en-US', options);
            const endStr = weekEnd.toLocaleDateString('en-US', options);
            
            // Update the week range display
            weekRangeElement.textContent = `${startStr} - ${endStr}`;
            console.log('Week range updated:', weekRangeElement.textContent);
        }
        
        // Update navigation state
        const prevWeekBtn = document.getElementById('prev-week');
        if (prevWeekBtn) {
            const prevWeekDate = new Date(currentWeekStart);
            prevWeekDate.setDate(prevWeekDate.getDate() - 7);
            
            prevWeekBtn.disabled = isInPast(prevWeekDate);
            prevWeekBtn.classList.toggle('opacity-50', prevWeekBtn.disabled);
            prevWeekBtn.classList.toggle('cursor-not-allowed', prevWeekBtn.disabled);
        }
        
        // Load the user schedule for the current week
        const user = firebase.auth().currentUser;
        if (!user) {
            console.log('No user found, cannot load schedule');
            loadingOverlay.remove();
            return;
        }
        
        console.log('Loading schedule for user:', user.uid);
        
        // Get user settings from Firestore
        firebase.firestore().collection('users').doc(user.uid).get()
            .then(doc => {
                let settings;
                
                if (doc.exists && doc.data().settings) {
                    settings = doc.data().settings;
                    console.log('User settings loaded:', settings);
                } else {
                    console.log('No user settings found, using defaults');
                    settings = DEFAULT_SETTINGS;
                }
                
                // Calculate time slots based on settings
                if (!settings.calculatedTimeSlots) {
                    settings.calculatedTimeSlots = calculateAvailableTimeSlots(settings);
                }
                
                // Generate schedule with settings
                generateSchedule(settings);
                
                // Remove loading overlay
                loadingOverlay.remove();
            })
            .catch(error => {
                console.error('Error loading user settings:', error);
                
                // Use default settings if there's an error
                const settings = DEFAULT_SETTINGS;
                settings.calculatedTimeSlots = calculateAvailableTimeSlots(settings);
                generateSchedule(settings);
                
                // Remove loading overlay
                loadingOverlay.remove();
            });
    } catch (error) {
        console.error('Error navigating to current week:', error);
        
        // Remove any existing loading overlay
        const existingOverlay = document.querySelector('.fixed.inset-0.bg-black.bg-opacity-50.z-50');
        if (existingOverlay) {
            existingOverlay.remove();
        }
    }
}