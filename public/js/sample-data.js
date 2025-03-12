// Sample data generator for development purposes
// This script will add sample clients to the current user's Firestore database

// Sample client data
const sampleClients = [
    {
        firstName: "John",
        lastName: "Smith",
        street: "123 Main St",
        city: "Anytown",
        state: "CA",
        zip: "90210",
        phone: "555-123-4567",
        email: "john.smith@example.com",
        accessInfo: "Has two dogs. Key under the flowerpot.",
        specialInstructions: "Prefers eco-friendly products.",
        frequency: "weekly",
        scheduleDay: "Monday",
        scheduleTime: "9:00 AM",
        propertyDetails: "3 bedroom, 2 bath house",
        price: "120"
    },
    {
        firstName: "Sarah",
        lastName: "Johnson",
        street: "456 Oak Ave",
        city: "Somewhere",
        state: "CA",
        zip: "90211",
        phone: "555-987-6543",
        email: "sarah.j@example.com",
        accessInfo: "Leave key under mat. Alarm code: 1234",
        specialInstructions: "Allergic to strong fragrances. Please use unscented products.",
        frequency: "biweekly",
        scheduleDay: "Wednesday",
        scheduleTime: "10:00 AM",
        propertyDetails: "2 bedroom apartment",
        price: "100"
    },
    {
        firstName: "Michael",
        lastName: "Brown",
        street: "789 Pine Rd",
        city: "Nowhere",
        state: "CA",
        zip: "90212",
        phone: "555-456-7890",
        email: "mbrown@example.com",
        accessInfo: "Has a cat. Door code: 5678",
        specialInstructions: "Prefers morning appointments. Please dust ceiling fans.",
        frequency: "monthly",
        scheduleDay: "Friday",
        scheduleTime: "8:00 AM",
        propertyDetails: "4 bedroom, 3 bath house",
        price: "180"
    },
    {
        firstName: "Emily",
        lastName: "Davis",
        street: "321 Elm St",
        city: "Anytown",
        state: "CA",
        zip: "90213",
        phone: "555-789-0123",
        email: "emily.davis@example.com",
        accessInfo: "Security system code: 1234. Call before arriving.",
        specialInstructions: "Please focus on kitchen and bathrooms.",
        frequency: "weekly",
        scheduleDay: "Thursday",
        scheduleTime: "1:00 PM",
        propertyDetails: "2 bedroom, 1 bath condo",
        price: "90"
    }
];

// Sample booking data - updated to use dynamic dates and time slots
function generateSampleBookings() {
    return [
        {
            clientId: null, // Will be populated dynamically
            clientFirstName: "Jennifer",
            clientLastName: "Wilson",
            clientAddress: "567 Pine Road, Anytown, CA 90214",
            clientPhone: "555-987-6543",
            accessInfo: "Lockbox code: 1234",
            date: getTodayString(),
            startTime: "8:00 AM",
            endTime: "11:00 AM",
            frequency: "weekly",
            status: "scheduled",
            notes: "Please focus on kitchen and bathrooms"
        },
        {
            clientId: null, // Will be populated dynamically
            clientFirstName: "Robert",
            clientLastName: "Taylor",
            clientAddress: "789 Maple Street, Somewhere, CA 90215",
            clientPhone: "555-234-5678",
            accessInfo: "Key under doormat",
            date: getTomorrowString(),
            startTime: "1:00 PM",
            endTime: "4:00 PM",
            frequency: "biweekly",
            status: "scheduled",
            notes: "Has a dog, please make sure gate is closed"
        },
        {
            clientId: null, // Will be populated dynamically
            clientFirstName: "Amanda",
            clientLastName: "Garcia",
            clientAddress: "123 Oak Lane, Nowhere, CA 90216",
            clientPhone: "555-345-6789",
            accessInfo: "Door code: 4321",
            date: getDateString(3),
            startTime: "9:00 AM",
            endTime: "12:00 PM",
            frequency: "monthly",
            status: "scheduled",
            notes: "Allergic to certain cleaning products, please use provided supplies"
        }
    ];
}

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

// Function to get a date N days from today as YYYY-MM-DD
function getDateString(daysFromToday) {
    const date = new Date();
    date.setDate(date.getDate() + daysFromToday);
    return date.toISOString().split('T')[0];
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
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
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
        
        // Get client IDs to associate with bookings
        const clientsRef = firebase.firestore().collection('users').doc(user.uid).collection('clients');
        const clientsSnapshot = await clientsRef.get();
        
        if (clientsSnapshot.empty) {
            console.log('No clients found. Adding sample clients first...');
            await addSampleClients();
            
            // Fetch clients again
            const newClientsSnapshot = await clientsRef.get();
            if (newClientsSnapshot.empty) {
                console.error('Failed to add sample clients. Cannot add bookings without clients.');
                return;
            }
        }
        
        // Get all client IDs and data
        const clients = [];
        clientsSnapshot.forEach(doc => {
            clients.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        if (clients.length === 0) {
            console.error('No clients found after attempting to add them. Cannot add bookings.');
            return;
        }
        
        // Generate sample bookings with current dates
        const sampleBookings = generateSampleBookings();
        
        // Assign client IDs to bookings
        sampleBookings.forEach((booking, index) => {
            // Use existing clients if available, otherwise use the first client for all bookings
            const clientIndex = index < clients.length ? index : 0;
            const client = clients[clientIndex];
            
            booking.clientId = client.id;
            booking.clientFirstName = client.firstName;
            booking.clientLastName = client.lastName;
            booking.clientAddress = `${client.street}, ${client.city}, ${client.state} ${client.zip}`;
            booking.clientPhone = client.phone;
            booking.accessInfo = client.accessInfo || booking.accessInfo;
        });
        
        // Add each sample booking
        const batch = firebase.firestore().batch();
        
        sampleBookings.forEach(booking => {
            const newBookingRef = bookingsRef.doc();
            batch.set(newBookingRef, {
                ...booking,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        });
        
        await batch.commit();
        console.log('Successfully added sample bookings!');
        
    } catch (error) {
        console.error('Error adding sample bookings:', error);
    }
}

// Function to add sample settings to Firestore
async function addSampleSettings() {
    const user = firebase.auth().currentUser;
    
    if (!user) {
        console.error('No user logged in. Please log in to add sample data.');
        return;
    }
    
    console.log('Adding sample settings for user:', user.uid);
    
    try {
        const userRef = firebase.firestore().collection('users').doc(user.uid);
        
        // Create day-specific settings
        const workingDays = {
            sunday: { isWorking: false },
            monday: { 
                isWorking: true,
                startTime: "8:00 AM",
                endTime: "5:00 PM",
                jobsPerDay: 2,
                cleaningDuration: 180,
                breakTime: 90,
                maxHours: 420
            },
            tuesday: { 
                isWorking: true,
                startTime: "8:00 AM",
                endTime: "5:00 PM",
                jobsPerDay: 2,
                cleaningDuration: 180,
                breakTime: 90,
                maxHours: 420
            },
            wednesday: { 
                isWorking: true,
                startTime: "8:00 AM",
                endTime: "5:00 PM",
                jobsPerDay: 2,
                cleaningDuration: 180,
                breakTime: 90,
                maxHours: 420
            },
            thursday: { 
                isWorking: true,
                startTime: "8:00 AM",
                endTime: "5:00 PM",
                jobsPerDay: 2,
                cleaningDuration: 180,
                breakTime: 90,
                maxHours: 420
            },
            friday: { 
                isWorking: true,
                startTime: "8:00 AM",
                endTime: "5:00 PM",
                jobsPerDay: 2,
                cleaningDuration: 180,
                breakTime: 90,
                maxHours: 420
            },
            saturday: { isWorking: false }
        };
        
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
        
        // Calculate time slots for each day
        const formattedTimeSlots = [];
        
        Object.entries(workingDays).forEach(([dayName, settings]) => {
            if (!settings.isWorking) return;
            
            const daySlots = [];
            const startTime = new Date('2000-01-01 ' + settings.startTime);
            const cleaningsPerDay = settings.jobsPerDay || 2;
            const cleaningDuration = settings.cleaningDuration || 180;
            const breakTime = settings.breakTime || 90;
            
            let currentTime = new Date(startTime);
            
            for (let i = 0; i < cleaningsPerDay; i++) {
                // Add the cleaning slot
                const slotEnd = new Date(currentTime.getTime() + cleaningDuration * 60000);
                const slotObj = {
                    start: currentTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }),
                    end: slotEnd.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }),
                    durationMinutes: cleaningDuration
                };
                
                daySlots.push(slotObj);
                
                // Add break time if not the last cleaning
                if (i < cleaningsPerDay - 1) {
                    currentTime = new Date(slotEnd.getTime() + breakTime * 60000);
                }
            }
            
            if (daySlots.length > 0) {
                formattedTimeSlots.push({
                    day: dayMapping[dayName],
                    slots: daySlots
                });
            }
        });
        
        // Create settings object
        const settings = {
            workingDays: workingDays,
            workingDaysCompat: compatWorkingDays,
            workingHours: {
                start: workingDays.monday.startTime,
                end: workingDays.monday.endTime
            },
            cleaningsPerDay: 2,
            breakTime: 90,
            cleaningDuration: 180,
            maxHours: 420,
            hourlyRate: 30,
            autoSendReceipts: true,
            calculatedTimeSlots: formattedTimeSlots,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Save to Firestore
        await userRef.set({ settings }, { merge: true });
        console.log('Successfully added sample settings!');
        
    } catch (error) {
        console.error('Error adding sample settings:', error);
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
        
        // Add sample settings
        await addSampleSettings();
        
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