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

// Function to create bookings for a client based on their preferred schedule
async function createBookingsForClient(db, userId, clientId, clientData) {
    try {
        // Skip if no schedule day or time is set
        if (!clientData.scheduleDay || !clientData.scheduleTime) {
            console.log('No schedule set for client, skipping booking creation');
            return;
        }
        
        const bookingsRef = db.collection('users').doc(userId).collection('bookings');
        const frequency = clientData.frequency || 'weekly';
        
        // Determine number of bookings to create based on frequency
        let occurrences = 1;
        if (frequency === 'weekly') {
            occurrences = 4; // 4 weeks
        } else if (frequency === 'biweekly' || frequency === 'bi-weekly') {
            occurrences = 3; // 6 weeks (3 bi-weekly occurrences)
        } else if (frequency === 'monthly') {
            occurrences = 2; // 2 months
        }
        
        // Generate a series ID for recurring bookings
        const seriesId = `series-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
        
        // Create bookings for each occurrence
        for (let i = 0; i < occurrences; i++) {
            // Calculate the date for this occurrence
            const nextDate = getNextDayOccurrence(clientData.scheduleDay, i);
            const formattedDate = nextDate.toISOString().split('T')[0];
            
            // Format the time properly
            const startTime = clientData.scheduleTime;
            // Ensure startTime is properly formatted
            const startTimeMatch = startTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
            if (!startTimeMatch) {
                console.error('Invalid time format:', startTime);
                continue;
            }
            
            let hours = parseInt(startTimeMatch[1]);
            const minutes = startTimeMatch[2];
            const period = startTimeMatch[3].toUpperCase();
            
            // Ensure hours is in 12-hour format
            const formattedHours = hours === 0 ? '12' : 
                                  hours > 12 ? (hours - 12).toString() : 
                                  hours.toString();
            
            // Format the start time properly
            const formattedStartTime = `${formattedHours.padStart(2, '0')}:${minutes} ${period}`;
            
            // Calculate end time (2 hours after start)
            const endTime = addHours(formattedStartTime, 2);
            
            // Create the booking
            const bookingData = {
                clientId: clientId,
                clientFirstName: clientData.firstName,
                clientLastName: clientData.lastName,
                clientAddress: `${clientData.street}, ${clientData.city}, ${clientData.state} ${clientData.zip}`,
                clientPhone: clientData.phone,
                clientEmail: clientData.email,
                date: formattedDate,
                startTime: formattedStartTime,
                endTime: endTime,
                frequency: frequency,
                status: 'scheduled',
                seriesId: seriesId,
                occurrenceNumber: i + 1,
                totalOccurrences: occurrences,
                accessInfo: clientData.accessInfo || '',
                specialInstructions: clientData.specialInstructions || '',
                propertyDetails: clientData.propertyDetails || '',
                price: clientData.price || null,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            await bookingsRef.add(bookingData);
            console.log(`Created booking for ${clientData.firstName} ${clientData.lastName} on ${formattedDate} at ${formattedStartTime}`);
        }
    } catch (error) {
        console.error('Error creating bookings for client:', error);
    }
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
        
        // Create day-specific settings with properly formatted times
        const workingDays = {
            sunday: { isWorking: false },
            monday: { 
                isWorking: true,
                startTime: "08:00 AM",
                endTime: "05:00 PM",
                jobsPerDay: 2,
                cleaningDuration: 180,
                breakTime: 90,
                maxHours: 420
            },
            tuesday: { 
                isWorking: true,
                startTime: "08:00 AM",
                endTime: "05:00 PM",
                jobsPerDay: 2,
                cleaningDuration: 180,
                breakTime: 90,
                maxHours: 420
            },
            wednesday: { 
                isWorking: true,
                startTime: "08:00 AM",
                endTime: "05:00 PM",
                jobsPerDay: 2,
                cleaningDuration: 180,
                breakTime: 90,
                maxHours: 420
            },
            thursday: { 
                isWorking: true,
                startTime: "08:00 AM",
                endTime: "05:00 PM",
                jobsPerDay: 2,
                cleaningDuration: 180,
                breakTime: 90,
                maxHours: 420
            },
            friday: { 
                isWorking: true,
                startTime: "08:00 AM",
                endTime: "05:00 PM",
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
    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            throw new Error('You must be logged in to reset the database');
        }
        
        const db = firebase.firestore();
        
        // Get references to all collections we need to reset
        const collectionsToReset = [
            'clients',
            'bookings',
            'payments',
            'settings'
        ];
        
        // Delete all documents in each collection
        const deletePromises = collectionsToReset.map(async collectionName => {
            const collectionRef = db.collection('users').doc(user.uid).collection(collectionName);
            const snapshot = await collectionRef.get();
            
            const batch = db.batch();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            await batch.commit();
            console.log(`Deleted all documents in ${collectionName}`);
        });
        
        await Promise.all(deletePromises);
        
        // Create new clients with timestamps
        const clientPromises = sampleClients.map(async clientData => {
            const clientRef = db.collection('users').doc(user.uid).collection('clients').doc();
            
            const clientWithTimestamps = {
                ...clientData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            await clientRef.set(clientWithTimestamps);
            await createBookingsForClient(db, user.uid, clientRef.id, clientData);
            
            return clientRef.id;
        });
        
        await Promise.all(clientPromises);
        
        // Create default user settings if needed
        const settingsRef = db.collection('users').doc(user.uid).collection('settings').doc('preferences');
        await settingsRef.set({
            workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
            workingHours: {
                start: '9:00 AM',
                end: '5:00 PM'
            },
            defaultCleaningDuration: 120, // 2 hours in minutes
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('Database reset and populated successfully');
        return true;
    } catch (error) {
        console.error('Error resetting database:', error);
        throw error;
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