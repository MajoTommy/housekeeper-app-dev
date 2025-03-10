// Sample data generator for development purposes
// This script will add sample clients to the current user's Firestore database

// Sample client data
const sampleClients = [
    {
        name: "John Smith",
        address: "123 Main St, Anytown, CA 90210",
        phone: "555-123-4567",
        email: "john.smith@example.com",
        notes: "Has two dogs. Prefers eco-friendly products."
    },
    {
        name: "Sarah Johnson",
        address: "456 Oak Ave, Somewhere, CA 90211",
        phone: "555-987-6543",
        email: "sarah.j@example.com",
        notes: "Allergic to strong fragrances. Leave key under mat."
    },
    {
        name: "Michael Brown",
        address: "789 Pine Rd, Nowhere, CA 90212",
        phone: "555-456-7890",
        email: "mbrown@example.com",
        notes: "Has a cat. Prefers morning appointments."
    },
    {
        name: "Emily Davis",
        address: "321 Elm St, Anytown, CA 90213",
        phone: "555-789-0123",
        email: "emily.davis@example.com",
        notes: "Security system code: 1234. Call before arriving."
    }
];

// Sample booking data
const sampleBookings = [
    {
        clientName: "Jennifer Wilson",
        clientAddress: "567 Pine Road, Anytown, CA 90214",
        clientPhone: "555-987-6543",
        accessInfo: "Lockbox code: 1234",
        date: getTodayString(),
        startTime: "10:00 AM",
        endTime: "12:00 PM",
        frequency: "weekly",
        status: "scheduled",
        notes: "Please focus on kitchen and bathrooms"
    },
    {
        clientName: "Michael Brown",
        clientAddress: "789 Pine Rd, Nowhere, CA 90212",
        clientPhone: "555-456-7890",
        accessInfo: "Client will be home",
        date: getTomorrowString(),
        startTime: "2:00 PM",
        endTime: "4:00 PM",
        frequency: "biweekly",
        status: "scheduled",
        notes: "Has a cat. Prefers morning appointments."
    },
    {
        clientName: "David Wilson",
        clientAddress: "456 Oak Avenue, Somewhere, CA 90211",
        clientPhone: "555-789-0123",
        accessInfo: "Key under doormat",
        date: getTodayString(),
        startTime: "10:15 AM",
        endTime: "12:15 PM",
        frequency: "weekly",
        status: "completed",
        notes: "Allergic to strong fragrances"
    },
    {
        clientName: "Bob Smith",
        clientAddress: "123 Elm Street, Anytown, CA 90210",
        clientPhone: "555-321-7654",
        accessInfo: "Garage code: 5678",
        date: getTodayString(),
        startTime: "10:15 AM",
        endTime: "12:15 PM",
        frequency: "weekly",
        status: "completed",
        notes: "Has a dog. Use pet-friendly products."
    }
];

// Function to get today's date as YYYY-MM-DD
function getTodayString() {
    const today = new Date();
    return today.toISOString().split('T')[0];
}

// Function to get tomorrow's date as YYYY-MM-DD
function getTomorrowString() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
}

// Function to add sample clients to Firestore
async function addSampleClients() {
    const user = firebase.auth().currentUser;
    
    if (!user) {
        console.error('No user logged in. Please log in to add sample data.');
        return;
    }
    
    console.log('Adding sample clients for user:', user.uid);
    
    try {
        const clientsRef = firebase.firestore().collection('users').doc(user.uid).collection('clients');
        
        // Check if clients already exist
        const snapshot = await clientsRef.get();
        if (!snapshot.empty) {
            console.log('Clients already exist. Skipping sample data creation.');
            return;
        }
        
        // Add each sample client
        const batch = firebase.firestore().batch();
        
        sampleClients.forEach(client => {
            const newClientRef = clientsRef.doc();
            batch.set(newClientRef, {
                ...client,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        });
        
        await batch.commit();
        console.log('Successfully added sample clients!');
        
    } catch (error) {
        console.error('Error adding sample clients:', error);
    }
}

// Function to add sample bookings to Firestore
async function addSampleBookings() {
    const user = firebase.auth().currentUser;
    
    if (!user) {
        console.error('No user logged in. Please log in to add sample data.');
        return;
    }
    
    console.log('Adding sample bookings for user:', user.uid);
    
    try {
        const bookingsRef = firebase.firestore().collection('users').doc(user.uid).collection('bookings');
        
        // Check if bookings already exist
        const snapshot = await bookingsRef.get();
        if (!snapshot.empty) {
            console.log('Bookings already exist. Skipping sample data creation.');
            return;
        }
        
        // Add each sample booking
        const batch = firebase.firestore().batch();
        
        sampleBookings.forEach(booking => {
            const newBookingRef = bookingsRef.doc();
            batch.set(newBookingRef, {
                ...booking,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        });
        
        await batch.commit();
        console.log('Successfully added sample bookings!');
        
    } catch (error) {
        console.error('Error adding sample bookings:', error);
    }
}

// Function to reset the database and repopulate with sample data
async function resetAndPopulateDatabase() {
    const user = firebase.auth().currentUser;
    
    if (!user) {
        console.error('No user logged in. Please log in to reset data.');
        return;
    }
    
    // Show loading indicator
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center';
    loadingOverlay.innerHTML = `
        <div class="bg-white p-4 rounded-lg shadow-lg flex flex-col items-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3"></div>
            <p class="text-gray-700 mb-2">Resetting database...</p>
            <p class="text-gray-500 text-sm">This may take a moment</p>
        </div>
    `;
    document.body.appendChild(loadingOverlay);
    
    try {
        console.log('Resetting database for user:', user.uid);
        
        // Delete all clients
        const clientsRef = firebase.firestore().collection('users').doc(user.uid).collection('clients');
        const clientsSnapshot = await clientsRef.get();
        
        const clientDeleteBatch = firebase.firestore().batch();
        clientsSnapshot.forEach(doc => {
            clientDeleteBatch.delete(clientsRef.doc(doc.id));
        });
        
        await clientDeleteBatch.commit();
        console.log('All clients deleted');
        
        // Delete all bookings
        const bookingsRef = firebase.firestore().collection('users').doc(user.uid).collection('bookings');
        const bookingsSnapshot = await bookingsRef.get();
        
        const bookingDeleteBatch = firebase.firestore().batch();
        bookingsSnapshot.forEach(doc => {
            bookingDeleteBatch.delete(bookingsRef.doc(doc.id));
        });
        
        await bookingDeleteBatch.commit();
        console.log('All bookings deleted');
        
        // Add sample clients
        await addSampleClients();
        
        // Add sample bookings
        await addSampleBookings();
        
        console.log('Database reset and repopulated successfully');
        
        // Show success message
        loadingOverlay.innerHTML = `
            <div class="bg-white p-4 rounded-lg shadow-lg flex flex-col items-center">
                <div class="bg-green-100 text-green-700 rounded-full w-16 h-16 flex items-center justify-center mb-3">
                    <i class="fas fa-check text-2xl"></i>
                </div>
                <p class="text-gray-700 font-medium mb-2">Database Reset Complete</p>
                <p class="text-gray-500 text-sm mb-4">Sample data has been added</p>
                <button id="closeResetBtn" class="bg-primary text-white py-2 px-4 rounded-lg font-medium hover:bg-primary-dark">
                    Reload Schedule
                </button>
            </div>
        `;
        
        document.getElementById('closeResetBtn').addEventListener('click', function() {
            loadingOverlay.remove();
            window.location.reload();
        });
        
    } catch (error) {
        console.error('Error resetting database:', error);
        
        // Show error message
        loadingOverlay.innerHTML = `
            <div class="bg-white p-4 rounded-lg shadow-lg flex flex-col items-center">
                <div class="bg-red-100 text-red-700 rounded-full w-16 h-16 flex items-center justify-center mb-3">
                    <i class="fas fa-exclamation-triangle text-2xl"></i>
                </div>
                <p class="text-gray-700 font-medium mb-2">Error Resetting Database</p>
                <p class="text-red-500 text-sm mb-4">${error.message || 'Unknown error'}</p>
                <button id="closeErrorBtn" class="bg-primary text-white py-2 px-4 rounded-lg font-medium hover:bg-primary-dark">
                    Close
                </button>
            </div>
        `;
        
        document.getElementById('closeErrorBtn').addEventListener('click', function() {
            loadingOverlay.remove();
        });
    }
}

// Add a button to trigger database reset
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the index page
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/')) {
        // Create a reset button in the bottom right corner
        const resetButton = document.createElement('button');
        resetButton.className = 'fixed bottom-20 right-4 bg-red-500 text-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg z-40';
        resetButton.innerHTML = '<i class="fas fa-redo-alt"></i>';
        resetButton.title = 'Reset Database';
        resetButton.addEventListener('click', function() {
            if (confirm('Are you sure you want to reset the database? This will delete all your data and replace it with sample data.')) {
                resetAndPopulateDatabase();
            }
        });
        
        // Add the button after the page has loaded
        setTimeout(() => {
            document.body.appendChild(resetButton);
        }, 1000);
    }
}); 