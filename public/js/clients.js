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

// Reset and populate clients with sample data
async function resetAndPopulateClients() {
    try {
        showLoading('Resetting client data...');
        
        const user = firebase.auth().currentUser;
        if (!user) {
            console.error('No user logged in');
            hideLoading();
            showErrorMessage('You must be logged in to reset client data');
            return;
        }
        
        const db = firebase.firestore();
        const clientsRef = db.collection('users').doc(user.uid).collection('clients');
        
        // Delete all existing clients
        const snapshot = await clientsRef.get();
        
        const batch = db.batch();
        snapshot.forEach(doc => {
            batch.delete(clientsRef.doc(doc.id));
        });
        
        await batch.commit();
        console.log('All clients deleted');
        
        // Create sample clients
        const sampleClients = [
            {
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
            },
            {
                firstName: 'Jane',
                lastName: 'Smith',
                phone: '555-987-6543',
                email: 'jane.smith@example.com',
                street: '456 Oak Ave',
                city: 'Somewhere',
                state: 'CA',
                zip: '54321',
                accessInfo: 'Door code: 1234',
                specialInstructions: 'Please use unscented products',
                frequency: 'biweekly',
                scheduleDay: 'Wednesday',
                scheduleTime: '1:00 PM',
                propertyDetails: '2 bedroom apartment',
                price: '100',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            },
            {
                firstName: 'Robert',
                lastName: 'Johnson',
                phone: '555-456-7890',
                email: 'robert.j@example.com',
                street: '789 Pine Rd',
                city: 'Nowhere',
                state: 'CA',
                zip: '67890',
                accessInfo: 'Key in lockbox: code 5678',
                specialInstructions: 'Focus on kitchen and bathrooms',
                frequency: 'monthly',
                scheduleDay: 'Friday',
                scheduleTime: '9:00 AM',
                propertyDetails: '4 bedroom, 3 bath house',
                price: '200',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }
        ];
        
        // Add sample clients
        const newBatch = db.batch();
        sampleClients.forEach(client => {
            const newClientRef = clientsRef.doc();
            newBatch.set(newClientRef, client);
        });
        
        await newBatch.commit();
        console.log('Sample clients created successfully');
        
        hideLoading();
        showSuccessMessage('Client data has been reset and sample clients have been created');
        
        // Reload the page after a short delay
        setTimeout(() => {
            window.location.reload();
        }, 2000);
        
    } catch (error) {
        console.error('Error resetting client data:', error);
        hideLoading();
        showErrorMessage('Failed to reset client data: ' + error.message);
    }
}

// Get client ID from URL query parameter
function getClientIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Load client details for the client details page
async function loadClientDetails(clientId) {
    console.log('Loading client details for ID:', clientId);
    showLoading('Loading client details...');
    
    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            console.error('User not logged in');
            hideLoading();
            showErrorMessage('You must be logged in to view client details');
            return;
        }
        
        const db = firebase.firestore();
        const clientDoc = await db.collection('users').doc(user.uid)
            .collection('clients').doc(clientId).get();
        
        if (!clientDoc.exists) {
            console.error('Client not found');
            hideLoading();
            showErrorMessage('Client not found. The client may have been deleted.');
            return;
        }
        
        const client = clientDoc.data();
        client.id = clientId; // Add the ID to the client object for reference
        
        console.log('Client data loaded:', client);
        
        // Update client info section
        updateClientInfoSection(client);
        
        // Update cleaning schedule section
        updateCleaningScheduleSection(client);
        
        // Load upcoming cleanings
        loadUpcomingCleanings(user.uid, clientId);
        
        // Update access information section
        updateAccessInfoSection(client);
        
        // Update special instructions section
        updateSpecialInstructionsSection(client);
        
        // Update edit link
        const editLink = document.querySelector('a[href="edit-client.html"]');
        if (editLink) {
            editLink.href = `edit-client.html?id=${clientId}`;
        }
        
        // Update reschedule link
        const rescheduleLink = document.querySelector('a[href="../schedule/reschedule-choice.html"]');
        if (rescheduleLink) {
            rescheduleLink.href = `../schedule/reschedule-choice.html?clientId=${clientId}`;
        }
        
        hideLoading();
    } catch (error) {
        console.error('Error loading client details:', error);
        hideLoading();
        showErrorMessage('Failed to load client details: ' + error.message);
    }
}

// Update the client info section on the details page
function updateClientInfoSection(client) {
    const nameElement = document.querySelector('.client-card h2');
    if (nameElement) {
        const firstName = client.firstName || '';
        const lastName = client.lastName || '';
        const fullName = firstName && lastName ? `${lastName}, ${firstName}` : (firstName || lastName || 'Unnamed Client');
        nameElement.textContent = fullName;
    }
    
    const addressElements = document.querySelectorAll('.client-card p.text-gray-600');
    if (addressElements.length >= 2) {
        // Format the address
        if (client.street) {
            addressElements[0].textContent = client.street;
            
            const cityStateZip = [];
            if (client.city) cityStateZip.push(client.city);
            if (client.state) cityStateZip.push(client.state);
            if (client.zip) cityStateZip.push(client.zip);
            
            addressElements[1].textContent = cityStateZip.join(', ');
        } else {
            addressElements[0].textContent = 'No address provided';
            addressElements[1].textContent = '';
        }
    }
    
    const phoneLink = document.querySelector('a[href^="tel:"]');
    if (phoneLink && client.phone) {
        phoneLink.href = `tel:${client.phone.replace(/\D/g, '')}`;
        phoneLink.innerHTML = `<i class="fas fa-phone"></i> ${client.phone}`;
    } else if (phoneLink) {
        phoneLink.href = '#';
        phoneLink.innerHTML = `<i class="fas fa-phone"></i> No phone number`;
    }
    
    const emailLink = document.querySelector('a[href^="mailto:"]');
    if (emailLink && client.email) {
        emailLink.href = `mailto:${client.email}`;
        emailLink.innerHTML = `<i class="fas fa-envelope"></i> ${client.email}`;
    } else if (emailLink) {
        emailLink.href = '#';
        emailLink.innerHTML = `<i class="fas fa-envelope"></i> No email address`;
    }
}

// Update the cleaning schedule section on the details page
function updateCleaningScheduleSection(client) {
    const scheduleSection = document.querySelector('.client-card:nth-child(2) .p-4');
    if (!scheduleSection) return;
    
    // Format the frequency
    const frequencyLabels = {
        'weekly': { bg: 'bg-green-100', text: 'text-green-800', label: 'Weekly' },
        'biweekly': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Bi-weekly' },
        'monthly': { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Monthly' },
        'one-time': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'One-time' }
    };
    
    const frequency = client.frequency || 'one-time';
    const frequencyStyle = frequencyLabels[frequency] || frequencyLabels['one-time'];
    
    // Format the schedule time
    const scheduleDay = client.scheduleDay || '';
    const scheduleTime = client.scheduleTime || '';
    const scheduleText = scheduleDay && scheduleTime ? `Every ${scheduleDay} at ${scheduleTime}` : 'Not scheduled';
    
    // Format the property details
    const propertyDetails = client.propertyDetails || 'No property details provided';
    
    // Format the price
    const price = client.price ? `$${client.price} per cleaning` : 'Price not set';
    
    scheduleSection.innerHTML = `
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Cleaning Schedule</h3>
        <div class="flex items-center gap-2 mb-1">
            <span class="inline-flex items-center rounded-full ${frequencyStyle.bg} px-2.5 py-0.5 text-xs font-medium ${frequencyStyle.text}">
                ${frequencyStyle.label}
            </span>
            <span class="text-gray-700">${scheduleText}</span>
        </div>
        <p class="text-gray-600 text-sm">${propertyDetails}</p>
        <p class="text-gray-600 text-sm">${price}</p>
        <div class="mt-3">
            <a href="../schedule/reschedule-choice.html?clientId=${client.id}" class="block w-full bg-white border border-gray-300 rounded-lg py-3 px-4 text-center text-gray-700 font-medium hover:bg-gray-50">
                Reschedule
            </a>
        </div>
    `;
}

// Load upcoming cleanings for a client
async function loadUpcomingCleanings(userId, clientId) {
    try {
        const upcomingSection = document.querySelector('.client-card:nth-child(3) .p-4');
        if (!upcomingSection) return;
        
        // Get today's date at midnight
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Query for upcoming bookings for this client
        const db = firebase.firestore();
        const bookingsRef = db.collection('users').doc(userId)
            .collection('bookings');
        
        const snapshot = await bookingsRef
            .where('clientId', '==', clientId)
            .where('date', '>=', today)
            .where('status', '!=', 'cancelled')
            .orderBy('date')
            .limit(3)
            .get();
        
        if (snapshot.empty) {
            upcomingSection.innerHTML = `
                <h3 class="text-lg font-semibold text-gray-900 mb-2">Upcoming Cleanings</h3>
                <p class="text-gray-600">No upcoming cleanings scheduled</p>
                <div class="mt-3">
                    <a href="../schedule/new-cleaning.html?clientId=${clientId}" class="block w-full bg-white border border-gray-300 rounded-lg py-3 px-4 text-center text-gray-700 font-medium hover:bg-gray-50">
                        Schedule Cleaning
                    </a>
                </div>
            `;
            return;
        }
        
        let upcomingHTML = `<h3 class="text-lg font-semibold text-gray-900 mb-2">Upcoming Cleanings</h3>`;
        
        snapshot.forEach(doc => {
            const booking = doc.data();
            const date = booking.date.toDate();
            
            // Format the date
            const formattedDate = date.toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
            });
            
            // Format the time
            const startTime = booking.startTime || '9:00 AM';
            const endTime = booking.endTime || '11:00 AM';
            
            upcomingHTML += `
                <div class="border-l-4 border-green-500 pl-3 py-2 mb-3">
                    <div class="flex justify-between">
                        <div>
                            <p class="font-medium">${formattedDate}</p>
                            <p class="text-sm text-gray-600">${startTime} - ${endTime}</p>
                        </div>
                        <a href="../schedule/cleaning-details.html?id=${doc.id}" class="text-primary">
                            <i class="fas fa-chevron-right"></i>
                        </a>
                    </div>
                </div>
            `;
        });
        
        upcomingHTML += `
            <div class="mt-3">
                <a href="../schedule/new-cleaning.html?clientId=${clientId}" class="block w-full bg-white border border-gray-300 rounded-lg py-3 px-4 text-center text-gray-700 font-medium hover:bg-gray-50">
                    Schedule Another Cleaning
                </a>
            </div>
        `;
        
        upcomingSection.innerHTML = upcomingHTML;
    } catch (error) {
        console.error('Error loading upcoming cleanings:', error);
        const upcomingSection = document.querySelector('.client-card:nth-child(3) .p-4');
        if (upcomingSection) {
            upcomingSection.innerHTML = `
                <h3 class="text-lg font-semibold text-gray-900 mb-2">Upcoming Cleanings</h3>
                <p class="text-gray-600">Error loading cleanings: ${error.message}</p>
                <div class="mt-3">
                    <a href="../schedule/new-cleaning.html?clientId=${clientId}" class="block w-full bg-white border border-gray-300 rounded-lg py-3 px-4 text-center text-gray-700 font-medium hover:bg-gray-50">
                        Schedule Cleaning
                    </a>
                </div>
            `;
        }
    }
}

// Update the access information section on the details page
function updateAccessInfoSection(client) {
    const accessSection = document.querySelector('.client-card:nth-child(4) .p-4');
    if (!accessSection) return;
    
    const accessInfo = client.accessInfo || 'No access information provided';
    
    // Split by line breaks if it's a multi-line string
    const accessLines = accessInfo.split('\n').filter(line => line.trim() !== '');
    
    let accessHTML = `<h3 class="text-lg font-semibold text-gray-900 mb-2">Access Information</h3>`;
    
    if (accessLines.length > 0) {
        accessHTML += `<div class="space-y-2">`;
        accessLines.forEach(line => {
            accessHTML += `<p class="text-gray-700">${line}</p>`;
        });
        accessHTML += `</div>`;
    } else {
        accessHTML += `<p class="text-gray-700">${accessInfo}</p>`;
    }
    
    accessSection.innerHTML = accessHTML;
}

// Update the special instructions section on the details page
function updateSpecialInstructionsSection(client) {
    const instructionsSection = document.querySelector('.client-card:nth-child(5) .p-4');
    if (!instructionsSection) return;
    
    const instructions = client.specialInstructions || 'No special instructions provided';
    
    // Split by line breaks if it's a multi-line string
    const instructionLines = instructions.split('\n').filter(line => line.trim() !== '');
    
    let instructionsHTML = `<h3 class="text-lg font-semibold text-gray-900 mb-2">Special Instructions</h3>`;
    
    if (instructionLines.length > 0) {
        instructionsHTML += `<div class="space-y-2">`;
        instructionLines.forEach(line => {
            instructionsHTML += `<p class="text-gray-700">${line}</p>`;
        });
        instructionsHTML += `</div>`;
    } else {
        instructionsHTML += `<p class="text-gray-700">${instructions}</p>`;
    }
    
    instructionsSection.innerHTML = instructionsHTML;
}

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Clients.js loaded');
    
    // Check if user is logged in
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            console.log('User is logged in:', user.uid);
            
            // Check which page we're on
            const currentPath = window.location.pathname;
            
            if (currentPath.includes('client-details.html')) {
                // We're on the client details page
                const clientId = getClientIdFromUrl();
                if (clientId) {
                    loadClientDetails(clientId);
                } else {
                    console.error('No client ID found in URL');
                    showErrorMessage('Client not found. Please go back to the clients list.');
                }
            } else if (currentPath.includes('clients.html')) {
                // We're on the main clients list page
                loadAllClients();
                initSearchFunctionality();
                
                // Set up the debug button
                const debugButton = document.getElementById('debug-create-client');
                if (debugButton) {
                    debugButton.addEventListener('click', async function() {
                        showLoading('Creating sample client...');
                        await createSampleClient();
                        hideLoading();
                        setTimeout(() => {
                            window.location.reload();
                        }, 2000);
                    });
                }
                
                // Set up the reset sample data button
                const resetButton = document.getElementById('reset-sample-data');
                if (resetButton) {
                    resetButton.addEventListener('click', function() {
                        if (confirm('Are you sure you want to reset all client data? This will delete all existing clients and create sample ones.')) {
                            resetAndPopulateClients();
                        }
                    });
                }
            }
            // Add more page checks as needed (edit-client.html, add-client.html, etc.)
            
        } else {
            console.log('User is not logged in, redirecting to login');
            window.location.href = '../login.html';
        }
    });
}); 