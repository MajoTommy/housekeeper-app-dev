// Sample data generator for development purposes
// This script will add sample data to the current user's Firestore database

// Sample client data (will be migrated to properties for homeowners)
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

// New sample property data for homeowners
const sampleProperties = [
    {
        name: "Main Residence",
        address: {
            street: "123 Main St",
            city: "Anytown",
            state: "CA",
            zip: "90210"
        },
        size: 2200,
        bedrooms: 3,
        bathrooms: 2,
        specialInstructions: "Prefers eco-friendly products.",
        accessInformation: "Has two dogs. Key under the flowerpot.",
        photos: [],
        preferredHousekeeperId: null // Will be populated if needed
    },
    {
        name: "Vacation Home",
        address: {
            street: "456 Oak Ave",
            city: "Somewhere",
            state: "CA",
            zip: "90211"
        },
        size: 1800,
        bedrooms: 2,
        bathrooms: 2,
        specialInstructions: "Allergic to strong fragrances. Please use unscented products.",
        accessInformation: "Leave key under mat. Alarm code: 1234",
        photos: [],
        preferredHousekeeperId: null
    },
    {
        name: "Rental Property",
        address: {
            street: "789 Pine Rd",
            city: "Nowhere",
            state: "CA",
            zip: "90212"
        },
        size: 2800,
        bedrooms: 4,
        bathrooms: 3,
        specialInstructions: "Please focus on kitchen and bathrooms.",
        accessInformation: "Has a cat. Door code: 5678",
        photos: [],
        preferredHousekeeperId: null
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

// Function to add sample settings for a user based on their role
async function addSampleSettings() {
    const user = firebase.auth().currentUser;
    if (!user) {
        console.error('User must be logged in to add sample settings');
        return;
    }
    
    console.log('Adding sample settings for user:', user.uid);
    
    try {
        const userRef = firebase.firestore().collection('users').doc(user.uid);
        
        // Check if user already has a role
        const userDoc = await userRef.get();
        const userData = userDoc.data() || {};
        
        // If no role is set, default to housekeeper for backward compatibility
        const userRole = userData.role || 'housekeeper';
        
        // If role isn't set, update it now
        if (!userData.role) {
            await userRef.update({
                role: userRole,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        // DEFAULT VALUES matching those in settings.js
        const DEFAULT_JOBS_PER_DAY = 2;
        const DEFAULT_BREAK_TIME = 90;
        const DEFAULT_START_TIME = '8:00 AM';
        const DEFAULT_JOB_DURATION = 180;
        
        if (userRole === 'housekeeper') {
            // Create working day settings with proper structure for housekeepers
            const workingDays = {
                sunday: { 
                    isWorking: false,
                    jobsPerDay: null,
                    startTime: null,
                    breakTime: null,
                    jobDurations: [],
                    breakDurations: []
                },
                monday: { 
                    isWorking: true,
                    startTime: DEFAULT_START_TIME,
                    jobsPerDay: DEFAULT_JOBS_PER_DAY,
                    breakTime: DEFAULT_BREAK_TIME,
                    jobDurations: [DEFAULT_JOB_DURATION, DEFAULT_JOB_DURATION],
                    breakDurations: [DEFAULT_BREAK_TIME]
                },
                tuesday: { 
                    isWorking: true,
                    startTime: DEFAULT_START_TIME,
                    jobsPerDay: DEFAULT_JOBS_PER_DAY,
                    breakTime: DEFAULT_BREAK_TIME,
                    jobDurations: [DEFAULT_JOB_DURATION, DEFAULT_JOB_DURATION],
                    breakDurations: [DEFAULT_BREAK_TIME]
                },
                wednesday: { 
                    isWorking: false,
                    jobsPerDay: null,
                    startTime: null,
                    breakTime: null,
                    jobDurations: [],
                    breakDurations: []
                },
                thursday: { 
                    isWorking: true,
                    startTime: DEFAULT_START_TIME,
                    jobsPerDay: DEFAULT_JOBS_PER_DAY,
                    breakTime: DEFAULT_BREAK_TIME,
                    jobDurations: [DEFAULT_JOB_DURATION, DEFAULT_JOB_DURATION],
                    breakDurations: [DEFAULT_BREAK_TIME]
                },
                friday: { 
                    isWorking: true,
                    startTime: DEFAULT_START_TIME,
                    jobsPerDay: DEFAULT_JOBS_PER_DAY,
                    breakTime: DEFAULT_BREAK_TIME,
                    jobDurations: [DEFAULT_JOB_DURATION, DEFAULT_JOB_DURATION],
                    breakDurations: [DEFAULT_BREAK_TIME]
                },
                saturday: { 
                    isWorking: false,
                    jobsPerDay: null,
                    startTime: null,
                    breakTime: null,
                    jobDurations: [],
                    breakDurations: []
                }
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
            
            // Create settings object with properly structured data for housekeepers
            const settings = {
                workingDays: workingDays,
                workingDaysCompat: compatWorkingDays,
                autoSendReceipts: false,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            console.log('Saving housekeeper settings with proper structure:', settings);
            
            // Save to settings collection
            await userRef.collection('settings').doc('app').set(settings);
            
            // Create housekeeper profile if it doesn't exist yet
            const housekeeperProfileRef = firebase.firestore().collection('housekeeper_profiles').doc(user.uid);
            const housekeeperProfile = await housekeeperProfileRef.get();
            
            if (!housekeeperProfile.exists) {
                await housekeeperProfileRef.set({
                    businessName: userData.name ? `${userData.name}'s Cleaning Service` : "Professional Cleaning",
                    serviceAreas: ["Downtown", "Suburbs", "Beach Area"],
                    servicesOffered: ["Regular Cleaning", "Deep Cleaning", "Move-in/Move-out"],
                    pricing: {
                        hourlyRate: 35,
                        minimumHours: 2
                    },
                    bio: "Professional and reliable cleaning service with attention to detail.",
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            
            console.log('Successfully added sample housekeeper settings!');
        } 
        else if (userRole === 'homeowner') {
            // Create homeowner settings
            const homeownerSettings = {
                notificationPreferences: {
                    bookingConfirmations: true,
                    reminderAlerts: true,
                    specialOffers: true
                },
                defaultPropertyId: null, // Will be set after creating properties
                paymentSettings: {
                    autoCharge: true,
                    preferredMethod: "credit_card"
                },
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            console.log('Saving homeowner settings:', homeownerSettings);
            
            // Save to settings collection
            await userRef.collection('settings').doc('app').set(homeownerSettings);
            
            // Create homeowner profile if it doesn't exist yet
            const homeownerProfileRef = firebase.firestore().collection('homeowner_profiles').doc(user.uid);
            const homeownerProfile = await homeownerProfileRef.get();
            
            if (!homeownerProfile.exists) {
                await homeownerProfileRef.set({
                    preferredContactMethod: "email",
                    paymentMethods: ["credit_card"],
                    defaultInstructions: "Please use eco-friendly products when possible.",
                    communicationPreferences: {
                        sendReminders: true,
                        reminderHours: 24
                    },
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            
            // Create sample properties for the homeowner
            const createdPropertyIds = [];
            for (const propertyData of sampleProperties) {
                const propertyRef = firebase.firestore().collection('properties').doc();
                
                await propertyRef.set({
                    ...propertyData,
                    ownerId: user.uid,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                createdPropertyIds.push(propertyRef.id);
            }
            
            // Update the homeowner's default property ID if properties were created
            if (createdPropertyIds.length > 0) {
                await userRef.collection('settings').doc('app').update({
                    defaultPropertyId: createdPropertyIds[0]
                });
            }
            
            console.log('Successfully added sample homeowner settings and properties!');
        }
        
        // Force reload to apply the new settings
        setTimeout(() => {
            window.location.reload();
        }, 1000);
        
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
        
        // Get user data to determine role
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data() || {};
        const userRole = userData.role || 'housekeeper'; // Default to housekeeper for backward compatibility
        
        // Collections common to both user types
        const commonCollections = [
            'settings'
        ];
        
        // Role-specific collections
        const housekeeperCollections = [
            'clients',
            'bookings',
            'payments'
        ];
        
        const homeownerCollections = [];
        
        // Determine which collections to reset based on user role
        let collectionsToReset = [...commonCollections];
        if (userRole === 'housekeeper') {
            collectionsToReset = [...collectionsToReset, ...housekeeperCollections];
        } else if (userRole === 'homeowner') {
            collectionsToReset = [...collectionsToReset, ...homeownerCollections];
        }
        
        // Delete all documents in each collection for the user
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
        
        // Delete user profile collections based on role
        if (userRole === 'housekeeper') {
            // Delete housekeeper profile
            const housekeeperProfileRef = db.collection('housekeeper_profiles').doc(user.uid);
            await housekeeperProfileRef.delete();
            console.log('Deleted housekeeper profile');
        } else if (userRole === 'homeowner') {
            // Delete homeowner profile and properties
            const homeownerProfileRef = db.collection('homeowner_profiles').doc(user.uid);
            await homeownerProfileRef.delete();
            console.log('Deleted homeowner profile');
            
            // Delete all properties owned by this homeowner
            const propertiesSnapshot = await db.collection('properties')
                .where('ownerId', '==', user.uid)
                .get();
            
            const propertyBatch = db.batch();
            propertiesSnapshot.docs.forEach(doc => {
                propertyBatch.delete(doc.ref);
            });
            
            await propertyBatch.commit();
            console.log('Deleted all properties owned by this homeowner');
        }
        
        // Explicitly delete the legacy 'settings' field from the user document
        const userDocRef = db.collection('users').doc(user.uid);
        
        // Check if the user document exists before trying to update it
        const userDocExists = (await userDocRef.get()).exists;
        if (userDocExists) {
            await userDocRef.update({
                settings: firebase.firestore.FieldValue.delete()
            });
            console.log('Deleted legacy settings field from user document');
        } else {
            // Create the user document if it doesn't exist
            await userDocRef.set({
                email: user.email,
                role: userRole,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('Created new user document');
        }
        
        await Promise.all(deletePromises);
        
        // For housekeepers, create clients and bookings
        if (userRole === 'housekeeper') {
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
        }
        
        // Call addSampleSettings to create properly formatted settings based on role
        await addSampleSettings();
        console.log(`Added sample settings for ${userRole} role`);
        
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

// Expose the reset function globally for console access
window.resetDB = resetAndPopulateDatabase;

// Create a more robust reset function that handles common errors
window.initializeDB = async function() {
    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            console.error('No user logged in. Please log in first.');
            alert('Please log in before initializing the database.');
            return;
        }
        
        console.log('Starting database initialization...');
        const db = firebase.firestore();
        
        // Check if user document exists
        const userRef = db.collection('users').doc(user.uid);
        const userDoc = await userRef.get();
        
        // Create user document if it doesn't exist
        if (!userDoc.exists) {
            console.log('Creating new user document...');
            await userRef.set({
                email: user.email,
                name: '',
                phone: '',
                role: 'housekeeper', // Default role
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('User document created successfully.');
        }
        
        // Create settings document if it doesn't exist
        const settingsRef = userRef.collection('settings').doc('app');
        const settingsDoc = await settingsRef.get();
        
        if (!settingsDoc.exists) {
            console.log('Creating settings document...');
            await addSampleSettings();
        } else {
            console.log('Settings document already exists, proceeding with reset...');
            await resetAndPopulateDatabase();
        }
        
        console.log('Database initialization completed successfully!');
        return true;
    } catch (error) {
        console.error('Error initializing database:', error);
        alert('There was an error initializing the database. See console for details.');
        return false;
    }
};
