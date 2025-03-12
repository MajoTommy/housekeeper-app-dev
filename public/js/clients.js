// Debug function to help diagnose issues
function debugFirebaseStatus() {
    console.log('=== Firebase Debug Information ===');
    
    // Check if Firebase is defined
    if (typeof firebase === 'undefined') {
        console.error('Firebase is not defined');
        return;
    }
    
    console.log('Firebase is defined');
    
    // Check if Firebase is initialized
    if (firebase.apps && firebase.apps.length > 0) {
        console.log('Firebase is initialized with', firebase.apps.length, 'app(s)');
    } else {
        console.error('Firebase is not initialized');
    }
    
    // Check if Firestore is available
    if (firebase.firestore) {
        console.log('Firestore is available');
        
        // Try to access Firestore
        try {
            const db = firebase.firestore();
            console.log('Firestore instance created');
        } catch (error) {
            console.error('Error creating Firestore instance:', error);
        }
    } else {
        console.error('Firestore is not available');
    }
    
    // Check if Auth is available
    if (firebase.auth) {
        console.log('Auth is available');
        
        // Try to get current user
        try {
            const user = firebase.auth().currentUser;
            console.log('Current user:', user ? user.uid : 'No user logged in');
        } catch (error) {
            console.error('Error getting current user:', error);
        }
    } else {
        console.error('Auth is not available');
    }
    
    console.log('=== End Firebase Debug Information ===');
}

// clients.js - Handles all client-related functionality

// Global loading indicator functions
function showLoading(message = 'Loading...') {
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
                <p class="text-gray-700">${message}</p>
            </div>
        `;
        document.body.appendChild(loadingOverlay);
    }
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.remove();
    }
}

// Show success message
function showSuccessMessage(message, duration = 5000) {
    // Create success container if it doesn't exist
    let successContainer = document.getElementById('success-container');
    if (!successContainer) {
        successContainer = document.createElement('div');
        successContainer.id = 'success-container';
        successContainer.className = 'p-4 m-4 bg-green-100 border border-green-400 text-green-700 rounded';
        
        // Insert at the top of the body or after the header
        const header = document.querySelector('.sticky');
        if (header && header.nextSibling) {
            document.body.insertBefore(successContainer, header.nextSibling);
        } else {
            document.body.prepend(successContainer);
        }
    }
    
    // Make sure the container is visible
    successContainer.classList.remove('hidden');
    
    successContainer.innerHTML = `
        <div class="flex items-center">
            <svg class="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
            </svg>
            <p>${message}</p>
        </div>
    `;
    
    // Auto-hide after duration
    setTimeout(() => {
        successContainer.classList.add('hidden');
    }, duration);
}

// Show error message
function showErrorMessage(message, duration = 5000) {
    // Create error container if it doesn't exist
    let errorContainer = document.getElementById('error-container');
    if (!errorContainer) {
        errorContainer = document.createElement('div');
        errorContainer.id = 'error-container';
        errorContainer.className = 'p-4 m-4 bg-red-100 border border-red-400 text-red-700 rounded';
        
        // Insert at the top of the body or after the header
        const header = document.querySelector('.sticky');
        if (header && header.nextSibling) {
            document.body.insertBefore(errorContainer, header.nextSibling);
        } else {
            document.body.prepend(errorContainer);
        }
    }
    
    // Make sure the container is visible
    errorContainer.classList.remove('hidden');
    
    errorContainer.innerHTML = `
        <div class="flex items-center">
            <svg class="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
            </svg>
            <p>${message}</p>
        </div>
    `;
    
    // Auto-hide after duration
    setTimeout(() => {
        errorContainer.classList.add('hidden');
    }, duration);
}

// Main function to load all clients
async function loadAllClients() {
    console.log('Loading all clients...');
    
    // Get the client list container
    const clientListContainer = document.getElementById('client-list');
    if (!clientListContainer) {
        console.error('Client list container not found');
        return;
    }
    
    // Show loading state
    clientListContainer.innerHTML = `
        <div class="p-4 text-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p class="mt-2 text-gray-500">Loading clients...</p>
        </div>
    `;
    
    try {
        // Check if user is logged in
        const user = firebase.auth().currentUser;
        if (!user) {
            console.error('No user logged in');
            clientListContainer.innerHTML = `
                <div class="p-4 text-center">
                    <p class="text-red-500">You must be logged in to view clients</p>
                    <a href="../login.html" class="mt-4 inline-block px-4 py-2 bg-primary text-white rounded">
                        Log In
                    </a>
                </div>
            `;
            return;
        }
        
        // Get clients from Firestore
        const db = firebase.firestore();
        const clientsRef = db.collection('users').doc(user.uid).collection('clients');
        const snapshot = await clientsRef.get();
        
        // Clear the loading indicator
        clientListContainer.innerHTML = '';
        
        if (snapshot.empty) {
            // No clients found
            clientListContainer.innerHTML = `
                <div class="p-4 text-center">
                    <p class="text-gray-500">No clients found</p>
                    <a href="add-client.html" class="mt-4 inline-block px-4 py-2 bg-primary text-white rounded">
                        Add Your First Client
                    </a>
                </div>
            `;
            return;
        }
        
        // Display clients
        snapshot.forEach(doc => {
            const client = doc.data();
            const clientElement = createClientListItem(doc.id, client);
            clientListContainer.appendChild(clientElement);
        });
        
        // Add a button to add more clients
        const addMoreButton = document.createElement('div');
        addMoreButton.className = 'p-4 text-center';
        addMoreButton.innerHTML = `
            <a href="add-client.html" class="inline-block px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark">
                Add New Client
            </a>
        `;
        clientListContainer.appendChild(addMoreButton);
        
    } catch (error) {
        console.error('Error loading clients:', error);
        clientListContainer.innerHTML = `
            <div class="p-4 text-center">
                <p class="text-red-500">Error loading clients: ${error.message}</p>
                <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-primary text-white rounded">
                    Retry
                </button>
            </div>
        `;
    }
}

// Create a client list item element
function createClientListItem(clientId, client) {
    const clientElement = document.createElement('a');
    clientElement.href = `client-details.html?id=${clientId}`;
    clientElement.className = 'block p-4 hover:bg-gray-50 border-b border-gray-200';
    
    // Get client properties with fallbacks
    const firstName = client.firstName || '';
    const lastName = client.lastName || '';
    const fullName = firstName && lastName ? `${lastName}, ${firstName}` : (firstName || lastName || 'Unnamed Client');
    
    const phone = client.phone || 'No phone';
    const email = client.email || 'No email';
    
    // Format the address
    let address = 'No address';
    if (client.street) {
        const parts = [];
        if (client.street) parts.push(client.street);
        
        const cityState = [];
        if (client.city) cityState.push(client.city);
        if (client.state) cityState.push(client.state);
        if (cityState.length > 0) parts.push(cityState.join(', '));
        
        if (client.zip) parts.push(client.zip);
        
        address = parts.join(', ');
    }
    
    // Create the HTML for the client item
    clientElement.innerHTML = `
        <div class="flex justify-between items-center">
            <div>
                <h3 class="text-lg font-medium text-gray-900">${fullName}</h3>
                <p class="text-sm text-gray-500">${phone} | ${email}</p>
                <p class="text-sm text-gray-500">${address}</p>
            </div>
            <i class="fas fa-chevron-right text-gray-400"></i>
        </div>
    `;
    
    return clientElement;
}

// Initialize search functionality
function initSearchFunctionality() {
    const searchInput = document.getElementById('client-search');
    if (!searchInput) {
        console.log('Search input not found');
        return;
    }
    
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const clientElements = document.querySelectorAll('#client-list a');
        
        clientElements.forEach(element => {
            const clientName = element.querySelector('h3').textContent.toLowerCase();
            const clientInfo = element.querySelectorAll('p');
            let matchFound = clientName.includes(searchTerm);
            
            // Also search in other client info
            clientInfo.forEach(info => {
                if (info.textContent.toLowerCase().includes(searchTerm)) {
                    matchFound = true;
                }
            });
            
            element.style.display = matchFound ? '' : 'none';
        });
    });
}

// Create a sample client
async function createSampleClient() {
    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            console.error('No user logged in');
            showErrorMessage('You must be logged in to create a sample client');
            return false;
        }
        
        const db = firebase.firestore();
        const clientsRef = db.collection('users').doc(user.uid).collection('clients');
        
        const sampleClient = {
            firstName: 'John',
            lastName: 'Doe',
            phone: '555-123-4567',
            email: 'john.doe@example.com',
            street: '123 Main St',
            city: 'Anytown',
            state: 'CA',
            zip: '12345',
            accessInfo: 'Key under the mat',
            specialInstructions: 'Please clean the windows thoroughly',
            frequency: 'weekly',
            scheduleDay: 'Monday',
            scheduleTime: '10:00 AM',
            propertyDetails: '3 bedroom, 2 bath house',
            price: '150',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        const docRef = await clientsRef.add(sampleClient);
        console.log('Sample client created with ID:', docRef.id);
        showSuccessMessage('Sample client created successfully!');
        return true;
    } catch (error) {
        console.error('Error creating sample client:', error);
        showErrorMessage('Error creating sample client: ' + error.message);
        return false;
    }
}

// Function to create sample bookings for a client
async function createSampleBookingsForClient(userId, clientId, clientData) {
    try {
        const db = firebase.firestore();
        const bookingsRef = db.collection('users').doc(userId).collection('bookings');
        
        // Create 3 future bookings for this client
        const today = new Date();
        const bookings = [];
        
        // Based on client's schedule preferences
        const scheduleDay = clientData.scheduleDay || 'Monday';
        const scheduleTime = clientData.scheduleTime || '10:00 AM';
        
        // Create next 3 occurrences of their preferred day
        for(let i = 0; i < 3; i++) {
            const nextDate = getNextDayOccurrence(scheduleDay, i);
            const [hours, minutes, period] = scheduleTime.match(/(\d+):(\d+)\s*(AM|PM)/).slice(1);
            nextDate.setHours(
                (period === 'PM' ? (parseInt(hours) % 12) + 12 : parseInt(hours) % 12),
                parseInt(minutes),
                0,
                0
            );
            
            const booking = {
                clientId: clientId,
                date: firebase.firestore.Timestamp.fromDate(nextDate),
                status: 'scheduled',
                startTime: scheduleTime,
                endTime: addHours(scheduleTime, 2), // 2-hour cleaning by default
                frequency: clientData.frequency || 'weekly',
                price: clientData.price || '150',
                address: `${clientData.street}, ${clientData.city}, ${clientData.state} ${clientData.zip}`,
                clientName: `${clientData.firstName} ${clientData.lastName}`,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            bookings.push(booking);
        }
        
        // Add all bookings in a batch
        const batch = db.batch();
        bookings.forEach(booking => {
            const newBookingRef = bookingsRef.doc();
            batch.set(newBookingRef, booking);
        });
        
        await batch.commit();
        console.log(`Created ${bookings.length} sample bookings for client ${clientId}`);
        return true;
    } catch (error) {
        console.error('Error creating sample bookings:', error);
        return false;
    }
}

// Helper function to get next occurrence of a day
function getNextDayOccurrence(dayName, skipWeeks = 0) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = new Date();
    const targetDay = days.indexOf(dayName.toLowerCase());
    const todayDay = today.getDay();
    
    let daysUntilTarget = targetDay - todayDay;
    if (daysUntilTarget <= 0) {
        daysUntilTarget += 7;
    }
    
    const result = new Date(today);
    result.setDate(today.getDate() + daysUntilTarget + (skipWeeks * 7));
    return result;
}

// Helper function to add hours to a time string
function addHours(timeStr, hoursToAdd) {
    const [hours, minutes, period] = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/).slice(1);
    let totalHours = parseInt(hours);
    if (period === 'PM' && totalHours !== 12) totalHours += 12;
    if (period === 'AM' && totalHours === 12) totalHours = 0;
    
    totalHours += hoursToAdd;
    const newPeriod = totalHours >= 12 ? 'PM' : 'AM';
    const newHours = totalHours % 12 || 12;
    
    return `${newHours}:${minutes} ${newPeriod}`;
}

// Add function to load client details
async function loadClientDetails(clientId) {
    console.log('Loading client details for:', clientId);
    
    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            console.error('No user logged in');
            showErrorMessage('You must be logged in to view client details');
            return;
        }
        
        const db = firebase.firestore();
        const clientDoc = await db.collection('users').doc(user.uid)
            .collection('clients').doc(clientId).get();
        
        if (!clientDoc.exists) {
            console.error('Client not found');
            showErrorMessage('Client not found');
            return;
        }
        
        const client = clientDoc.data();
        
        // Update basic client info
        document.querySelector('h2').textContent = `${client.lastName}, ${client.firstName}`;
        document.querySelector('p.text-gray-600').textContent = 
            `${client.street}, ${client.city}, ${client.state} ${client.zip}`;
        
        const phoneLink = document.querySelector('a[href^="tel:"]');
        if (phoneLink) {
            phoneLink.href = `tel:${client.phone}`;
            phoneLink.innerHTML = `<i class="fas fa-phone"></i> ${client.phone}`;
        }
        
        const emailLink = document.querySelector('a[href^="mailto:"]');
        if (emailLink) {
            emailLink.href = `mailto:${client.email}`;
            emailLink.innerHTML = `<i class="fas fa-envelope"></i> ${client.email}`;
        }
        
        // Update cleaning schedule section
        const scheduleSection = document.querySelector('.client-card:nth-child(2) .p-4');
        if (scheduleSection) {
            const frequencyBadge = scheduleSection.querySelector('.rounded-full');
            const scheduleText = scheduleSection.querySelector('.text-gray-700');
            const propertyDetails = scheduleSection.querySelector('p.text-gray-600');
            const priceText = scheduleSection.querySelectorAll('p.text-gray-600')[1];
            
            frequencyBadge.textContent = client.frequency || 'Not set';
            scheduleText.textContent = client.scheduleDay && client.scheduleTime ? 
                `Every ${client.scheduleDay} at ${client.scheduleTime}` : 'Schedule not set';
            propertyDetails.textContent = client.propertyDetails || 'No property details';
            priceText.textContent = client.price ? `$${client.price} per cleaning` : 'Price not set';
        }
        
        // Load upcoming cleanings
        const upcomingSection = document.querySelector('.client-card:nth-child(3) .p-4');
        if (upcomingSection) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const bookingsSnapshot = await db.collection('users').doc(user.uid)
                .collection('bookings')
                .where('clientId', '==', clientId)
                .where('date', '>=', today)
                .where('status', '==', 'scheduled')
                .orderBy('date')
                .limit(3)
                .get();
            
            if (bookingsSnapshot.empty) {
                upcomingSection.innerHTML = `
                    <h3 class="text-lg font-semibold text-gray-900 mb-2">Upcoming Cleanings</h3>
                    <p class="text-gray-500">No upcoming cleanings scheduled</p>
                    <a href="../schedule/new-cleaning.html?clientId=${clientId}" 
                       class="mt-4 block text-center text-primary hover:text-primary-dark">
                        <i class="fas fa-plus-circle mr-1"></i> Schedule New Cleaning
                    </a>
                `;
            } else {
                let bookingsHTML = `
                    <h3 class="text-lg font-semibold text-gray-900 mb-2">Upcoming Cleanings</h3>
                `;
                
                bookingsSnapshot.forEach(doc => {
                    const booking = doc.data();
                    const date = booking.date.toDate();
                    const formattedDate = date.toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric'
                    });
                    
                    bookingsHTML += `
                        <div class="border-l-4 border-primary pl-3 py-2 mb-3">
                            <div class="flex justify-between items-center">
                                <div>
                                    <p class="font-medium">${formattedDate}</p>
                                    <p class="text-sm text-gray-600">${booking.startTime} - ${booking.endTime}</p>
                                </div>
                                <a href="../schedule/cleaning-details.html?id=${doc.id}" 
                                   class="text-primary hover:text-primary-dark">
                                    <i class="fas fa-chevron-right"></i>
                                </a>
                            </div>
                        </div>
                    `;
                });
                
                upcomingSection.innerHTML = bookingsHTML;
            }
        }
        
        // Update access information
        const accessSection = document.querySelector('.client-card:nth-child(4) .p-4');
        if (accessSection) {
            const accessInfo = client.accessInfo || 'No access information provided';
            accessSection.innerHTML = `
                <h3 class="text-lg font-semibold text-gray-900 mb-2">Access Information</h3>
                <div class="space-y-2">
                    <p class="text-gray-700">${accessInfo}</p>
                </div>
            `;
        }
        
        // Update special instructions
        const instructionsSection = document.querySelector('.client-card:nth-child(5) .p-4');
        if (instructionsSection) {
            const instructions = client.specialInstructions || 'No special instructions provided';
            instructionsSection.innerHTML = `
                <h3 class="text-lg font-semibold text-gray-900 mb-2">Special Instructions</h3>
                <div class="space-y-2">
                    <p class="text-gray-700">${instructions}</p>
                </div>
            `;
        }
        
    } catch (error) {
        console.error('Error loading client details:', error);
        showErrorMessage('Error loading client details: ' + error.message);
    }
}

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Clients.js loaded');
    
    // Check if user is logged in
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            console.log('User is logged in:', user.uid);
            
            // Check if we're on the client details page
            if (window.location.pathname.includes('client-details.html')) {
                const urlParams = new URLSearchParams(window.location.search);
                const clientId = urlParams.get('id');
                if (clientId) {
                    loadClientDetails(clientId);
                } else {
                    showErrorMessage('No client ID provided');
                }
            } else {
                // We're on the main clients page
                loadAllClients();
                initSearchFunctionality();
            }
        } else {
            console.log('User is not logged in, redirecting to login');
            window.location.href = '../login.html';
        }
    });
}); 