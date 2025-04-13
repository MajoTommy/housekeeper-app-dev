/**
 * Script to populate Firestore with comprehensive sample data for development and testing.
 * 
 * Instructions:
 * 1. Manually create two users via the app signup:
 *    - A homeowner (e.g., core-home@yourapp.com)
 *    - A housekeeper (e.g., core-keeper@yourapp.com)
 * 2. Find their User IDs (UIDs) in the Firebase Authentication console.
 * 3. Navigate to /dev-tools.html in your browser during development.
 * 4. Paste the UIDs into the input fields.
 * 5. Click the "Populate Core Sample Data" button.
 * 6. Check the browser console and Firestore for results.
 */

// --- Sample Data Definitions ---

// Separate base user data from profile-specific data for clarity
const coreHomeownerBaseData = {
    email: 'tim@majorinc.ca',
    role: 'homeowner'
};
const coreHomeownerProfileData = {
    firstName: 'Corey',
    lastName: 'Homeowner',
    address: '101 Home Sweet Ln, Homestead, CA 90211',
    phone: '555-111-2222',
    HomeownerInstructions: 'Please use the back door. Small dog is friendly.',
    // linkedHousekeeperId will be added in the function
};

const coreHousekeeperBaseData = {
    email: 'tim+keeper@majorinc.ca',
    role: 'housekeeper'
};
const coreHousekeeperProfileData = {
    firstName: 'Casey',
    lastName: 'Keeper',
    companyName: 'Core Cleaning Co.',
    phone: '555-333-4444',
    address: '202 Clean St',
    city: 'Workville',
    state: 'CA',
    zip: '90212',
    serviceZipCodes: ['90210', '90211', '90212', '90028'],
    workingDays: {
        monday: { available: true, startTime: '09:00', endTime: '17:00' },
        tuesday: { available: true, startTime: '09:00', endTime: '17:00' },
        wednesday: { available: true, startTime: '09:00', endTime: '17:00' },
        thursday: { available: true, startTime: '09:00', endTime: '17:00' },
        friday: { available: true, startTime: '09:00', endTime: '17:00' },
        saturday: { available: false, startTime: '10:00', endTime: '14:00' },
        sunday: { available: false, startTime: '', endTime: '' }
    },
    inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase()
};

const manualClientsData = [
    {
        // No ID needed if using addClient that generates one
        firstName: 'Manual',
        lastName: 'Clientone',
        email: 'manual1@example.com',
        phone: '555-555-0001',
        address: '789 Test Ave, Sampletown, CA 90210',
        HousekeeperInternalNote: 'Key under the mat'
    },
    {
        firstName: 'Another',
        lastName: 'Manualperson',
        email: 'manual2@example.com',
        phone: '555-555-0002',
        address: '10 Downing St, Otherplace, CA 90028',
        HousekeeperInternalNote: 'Key under the mat'
    }
];

// --- NEW: Sample Services Data ---
const sampleServicesData = (housekeeperUid) => [
    {
        serviceName: 'Standard Cleaning',
        type: 'base',
        basePrice: 120,
        description: 'Basic cleaning for homes up to 2000 sq ft. Includes dusting, vacuuming, mopping, surface cleaning in kitchen and bathrooms.',
        isActive: true,
        ownerId: housekeeperUid // Ensure ownerId is set
    },
    {
        serviceName: 'Deep Cleaning',
        type: 'base',
        basePrice: 250,
        description: 'Thorough cleaning including baseboards, inside windows, light fixtures, etc.',
        isActive: true,
        ownerId: housekeeperUid
    },
    {
        serviceName: 'Move-In/Out Cleaning',
        type: 'base',
        basePrice: 350,
        description: 'Comprehensive cleaning for empty homes.',
        isActive: false, // Example of an inactive service
        ownerId: housekeeperUid
    },
    {
        serviceName: 'Inside Refrigerator',
        type: 'addon',
        basePrice: 35,
        description: 'Clean and sanitize the interior of the refrigerator.',
        isActive: true,
        ownerId: housekeeperUid
    },
    {
        serviceName: 'Inside Oven',
        type: 'addon',
        basePrice: 45,
        description: 'Clean the interior of the oven.',
        isActive: true,
        ownerId: housekeeperUid
    },
    {
        serviceName: 'Laundry (per load)',
        type: 'addon',
        basePrice: 25,
        description: 'Wash and dry one load of laundry.',
        isActive: true,
        ownerId: housekeeperUid
    }
];
// --- END: Sample Services Data ---

// Helper function specifically for generating Timestamps in this script
// Assumes input reflects intended LOCAL time for the sample data, converts to UTC Timestamp
// WARNING: This is a simplistic conversion for sample data only. Relies on browser parsing.
function createTimestampForSample(dateStr, timeStr) {
    // Combine date and time
    const dateTimeString = `${dateStr} ${timeStr}`;
    try {
        const dateObject = new Date(dateTimeString); // Browser *might* parse this correctly based on its locale
        if (isNaN(dateObject.getTime())) {
            console.warn(`[SampleDataHelper] Invalid date/time for Timestamp: ${dateTimeString}`);
            return null; 
        }
        // Convert the potentially local Date object to a Firestore Timestamp (which stores UTC)
        return firebase.firestore.Timestamp.fromDate(dateObject); 
    } catch (e) {
        console.error(`[SampleDataHelper] Error creating Timestamp for ${dateTimeString}:`, e);
        return null;
    }
}

const sampleBookingsData = (
    homeownerUid, // Pass the actual homeowner UID
    manualClientOneId, // Pass the actual Firestore-generated ID for manual client 1
    housekeeperUid // Pass housekeeper ID for context
) => {
    // Create timestamps - adjust dates/times as needed for sample scenario
    const booking1Start = createTimestampForSample('2025-08-15', '10:00');
    const booking1End = createTimestampForSample('2025-08-15', '12:00');
    const booking1StartMillis = booking1Start ? booking1Start.toMillis() : null;
    const booking1EndMillis = booking1End ? booking1End.toMillis() : null;

    const booking2Start = createTimestampForSample('2024-07-10', '14:00');
    const booking2End = createTimestampForSample('2024-07-10', '16:00');
    const booking2StartMillis = booking2Start ? booking2Start.toMillis() : null;
    const booking2EndMillis = booking2End ? booking2End.toMillis() : null;

    const booking3Start = createTimestampForSample('2025-08-22', '09:00');
    const booking3End = createTimestampForSample('2025-08-22', '11:00');
    const booking3StartMillis = booking3Start ? booking3Start.toMillis() : null;
    const booking3EndMillis = booking3End ? booking3End.toMillis() : null;

    return [
        // Booking for the linked core homeowner (Future)
        {
            clientId: homeownerUid,
            housekeeperId: housekeeperUid, // Add housekeeperId
            clientName: `${coreHomeownerProfileData.firstName} ${coreHomeownerProfileData.lastName}`,
            startTimestamp: booking1Start,
            endTimestamp: booking1End,
            startTimestampMillis: booking1StartMillis,
            endTimestampMillis: booking1EndMillis,
            status: 'confirmed', // Use 'confirmed' or 'pending' based on new model
            frequency: 'one-time',
            BookingNote: 'First cleaning for Corey.',
            address: coreHomeownerProfileData.address, // Store address at booking time
            createdAt: firebase.firestore.FieldValue.serverTimestamp() // Add timestamp
        },
        // Booking for the linked core homeowner (Past)
        {
            clientId: homeownerUid,
            housekeeperId: housekeeperUid,
            clientName: `${coreHomeownerProfileData.firstName} ${coreHomeownerProfileData.lastName}`,
            startTimestamp: booking2Start,
            endTimestamp: booking2End,
            startTimestampMillis: booking2StartMillis,
            endTimestampMillis: booking2EndMillis,
            status: 'completed',
            frequency: 'one-time',
            BookingNote: 'Completed cleaning.',
            address: coreHomeownerProfileData.address,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        },
        // Booking for a manual client (Future)
        {
            clientId: manualClientOneId,
            housekeeperId: housekeeperUid,
            clientName: `${manualClientsData[0].firstName} ${manualClientsData[0].lastName}`,
            startTimestamp: booking3Start,
            endTimestamp: booking3End,
            startTimestampMillis: booking3StartMillis,
            endTimestampMillis: booking3EndMillis,
            status: 'pending', // Example pending booking
            frequency: 'one-time',
            BookingNote: 'Regular cleaning for Manual Client 1.',
            address: manualClientsData[0].address,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }
    ].filter(booking => booking.startTimestamp && booking.endTimestamp); // Filter out any with failed timestamp creation
};

// --- Helper Function to Delete Subcollections ---

/**
 * Deletes all documents within a given collection or subcollection.
 * @param {firebase.firestore.CollectionReference} collectionRef - The reference to the collection to delete.
 */
async function deleteCollection(collectionRef) {
    const snapshot = await collectionRef.get();
    if (snapshot.empty) {
        console.log(`   -> Subcollection ${collectionRef.path} is already empty.`);
        return 0; // Return count of deleted docs
    }
    console.log(`   -> Deleting ${snapshot.size} documents from ${collectionRef.path}...`);
    // Use Firestore batched writes for efficiency and atomicity (up to 500 ops per batch)
    const batchSize = 499; // Firestore batch limit is 500 operations
    let deletedCount = 0;
    for (let i = 0; i < snapshot.docs.length; i += batchSize) {
        const batch = collectionRef.firestore.batch();
        const chunk = snapshot.docs.slice(i, i + batchSize);
        console.log(`      Processing batch ${Math.floor(i/batchSize) + 1} (size: ${chunk.length})`);
        chunk.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        deletedCount += chunk.length;
    }
    console.log(`   -> Finished deleting ${deletedCount} documents from ${collectionRef.path}.`);
    return deletedCount;
}

// --- Population Function ---

async function populateCoreData(homeownerUid, housekeeperUid) {
    // Get the firestoreService *inside* the function
    const fsService = window.firestoreService;
    // Get the Firestore DB instance directly
    const db = firebase.firestore(); 

    if (typeof fsService === 'undefined' || !fsService) {
        console.error('Firestore service (window.firestoreService) not found or not initialized...');
        alert('Firestore service not found...');
        return;
    }
    // Check if db is available
    if (typeof db === 'undefined' || !db) {
         console.error('Firestore DB instance not available. Ensure Firebase is initialized correctly.');
         alert('Firestore DB instance not available. Cannot populate data.');
         return;
    }

    if (!homeownerUid || !housekeeperUid) {
        alert('Please provide both homeowner and housekeeper UIDs in the input fields.');
        console.error('Missing UIDs');
        return;
    }

    console.log(`--- Starting Sample Data Population ---`);
    console.log(`Homeowner UID: ${homeownerUid}`);
    console.log(`Housekeeper UID: ${housekeeperUid}`);
    alert('Starting sample data population (will delete existing sample data first)...');

    try {
        // --- Phase 0: Delete Existing Sample Data ---
        console.log('--- Starting Deletion Phase ---');
        
        // 0a. Delete Housekeeper Subcollections
        console.log(`Deleting subcollections for housekeeper ${housekeeperUid}...`);
        const housekeeperUserRef = db.collection('users').doc(housekeeperUid);
        await deleteCollection(housekeeperUserRef.collection('bookings'));
        await deleteCollection(housekeeperUserRef.collection('clients'));
        await deleteCollection(housekeeperUserRef.collection('timeOffDates'));
        await deleteCollection(housekeeperUserRef.collection('settings')); // Deletes settings/app etc.
        await deleteCollection(housekeeperUserRef.collection('services')); // <-- ADDED: Delete existing services
        console.log(' -> Housekeeper subcollections deleted.');

        // 0b. Delete Housekeeper Profile
        console.log(`Deleting housekeeper profile document (${housekeeperUid})...`);
        await db.collection('housekeeper_profiles').doc(housekeeperUid).delete();
        console.log(' -> Housekeeper profile deleted.');

        // 0c. Delete Homeowner Profile
        console.log(`Deleting homeowner profile document (${homeownerUid})...`);
        await db.collection('homeowner_profiles').doc(homeownerUid).delete();
        console.log(' -> Homeowner profile deleted.');

        // 0d. Unlink Homeowner from Housekeeper (Update homeowner user doc)
        console.log(`Unlinking homeowner ${homeownerUid} by removing linkedHousekeeperId...`);
        await db.collection('users').doc(homeownerUid).update({
            linkedHousekeeperId: firebase.firestore.FieldValue.delete() // Remove the field
        });
        console.log(' -> Homeowner unlinked.');

        console.log('--- Finished Deletion Phase ---');
        // --- End Deletion Phase ---

        // --- Phase 1: Populate New Data ---
        console.log('--- Starting Population Phase ---');

        // 1. Update Core Homeowner Base and Profile
        console.log(`Creating/Updating homeowner user and profile for ${homeownerUid}...`);
        const homeownerProfileUpdateData = {
            ...coreHomeownerProfileData,
            linkedHousekeeperId: housekeeperUid, // Link to the core housekeeper
            updatedAt: firebase.firestore.FieldValue.serverTimestamp() // Add timestamp
        };
        const homeownerBaseUpdateData = {
            ...coreHomeownerBaseData,
            // Add any other base fields you want from coreHomeownerProfileData if needed
            firstName: coreHomeownerProfileData.firstName,
            lastName: coreHomeownerProfileData.lastName,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp() // Add timestamp
        };
        await db.collection('users').doc(homeownerUid).set(homeownerBaseUpdateData, { merge: true });
        // Explicitly remove the legacy working_hours field if it exists for homeowner too
        await db.collection('users').doc(homeownerUid).update({
            working_hours: firebase.firestore.FieldValue.delete()
        });
        await db.collection('homeowner_profiles').doc(homeownerUid).set(homeownerProfileUpdateData, { merge: true });
        console.log(` -> Homeowner user updated and legacy working_hours removed.`);

        // 2. Update Core Housekeeper Base and Profile
        console.log(`Updating housekeeper user and profile for ${housekeeperUid}...`);
        const housekeeperProfileUpdateData = {
            ...coreHousekeeperProfileData,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp() // Add timestamp
        };
         const housekeeperBaseUpdateData = {
            ...coreHousekeeperBaseData,
            // Add any other base fields you want from coreHousekeeperProfileData if needed
            firstName: coreHousekeeperProfileData.firstName,
            lastName: coreHousekeeperProfileData.lastName,
             companyName: coreHousekeeperProfileData.companyName, // Example if base user needs it
            updatedAt: firebase.firestore.FieldValue.serverTimestamp() // Add timestamp
        };
        await db.collection('users').doc(housekeeperUid).set(housekeeperBaseUpdateData, { merge: true });
        // Explicitly remove the legacy working_hours field if it exists
        await db.collection('users').doc(housekeeperUid).update({
            working_hours: firebase.firestore.FieldValue.delete()
        });
        console.log(` -> Housekeeper user updated and legacy working_hours removed.`);
        await db.collection('housekeeper_profiles').doc(housekeeperUid).set(housekeeperProfileUpdateData, { merge: true });
        console.log(` -> Housekeeper user and profile updated.`);

        // <<< NEW: Add Linked Homeowner to Housekeeper's Client List >>>
        console.log(`Adding linked homeowner (${homeownerUid}) to housekeeper's (${housekeeperUid}) client list...`);
        const linkedClientData = {
            firstName: coreHomeownerProfileData.firstName,
            lastName: coreHomeownerProfileData.lastName,
            email: coreHomeownerBaseData.email,
            phone: coreHomeownerProfileData.phone, // Assuming phone is in profile
            address: coreHomeownerProfileData.address, // Use the single address field
            isLinked: true, // <<< The important flag
            linkedHomeownerId: homeownerUid, // Optional: Store the homeowner ID here too for reference
            HomeownerInstructions: coreHomeownerProfileData.HomeownerInstructions,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            // Note: We DON'T copy HousekeeperInternalNote here, that stays on the client record only
        };
        // Use the homeowner's UID as the document ID in the housekeeper's client list
        // This makes it easy to find the corresponding client doc if you know the homeowner UID
        const linkedClientRef = db.collection('users').doc(housekeeperUid).collection('clients').doc(homeownerUid);
        await linkedClientRef.set(linkedClientData); // Use set() to ensure the doc ID is the homeownerUid
        console.log(` -> Linked homeowner added to client list with ID: ${homeownerUid}`);
        // <<< END NEW >>>

        // 3. Add Manual Clients
        console.log(`Adding manual clients for housekeeper ${housekeeperUid}...`);
        const addedClientIds = [];
        for (const clientData of manualClientsData) {
            console.log(`  -> Adding client: ${clientData.firstName} ${clientData.lastName}`);
            try {
                // Augment the base client data with linking status and timestamps
                const fullClientData = {
                    ...clientData,
                    isLinked: false,
                    linkedHomeownerId: null,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };

                // Use addClient function if available, passing the augmented data
                if (typeof fsService.addClient === 'function') {
                     const newClientId = await fsService.addClient(housekeeperUid, fullClientData); // Assumes it returns the new ID
                     if (newClientId) {
                         addedClientIds.push(newClientId);
                         console.log(`     Added via addClient with ID: ${newClientId}`);
                     } else {
                         console.warn(`     addClient function did not return an ID for ${clientData.firstName}. Attempting direct add...`);
                         // Fallback if addClient doesn't return ID
                         const clientsRef = firebase.firestore().collection('users').doc(housekeeperUid).collection('clients');
                         const docRef = await clientsRef.add(fullClientData);
                         addedClientIds.push(docRef.id);
                          console.log(`     Added directly with ID: ${docRef.id}`);
                     }
                } else {
                    // Fallback to direct Firestore add if service function doesn't exist
                    console.warn('firestoreService.addClient function not found. Using direct Firestore add.')
                    const clientsRef = firebase.firestore().collection('users').doc(housekeeperUid).collection('clients');
                    const docRef = await clientsRef.add(fullClientData);
                    addedClientIds.push(docRef.id);
                    console.log(`     Added directly with ID: ${docRef.id}`);
                }
            } catch (clientError) {
                console.error(`     Error adding client ${clientData.firstName}:`, clientError);
                addedClientIds.push(null); // Indicate failure
            }
        }
        // Get the actual ID of the first manual client for sample bookings
        const manualClientOneActualId = addedClientIds[0];
        if (!manualClientOneActualId) {
             console.warn('Could not determine ID for the first manual client. Bookings for them might fail or have incorrect clientId.');
        }

        // 4. Add Sample Bookings
        console.log(`Adding sample bookings for housekeeper ${housekeeperUid}...`);
        const bookingsToAdd = sampleBookingsData(homeownerUid, manualClientOneActualId || 'MANUAL_CLIENT_ID_UNKNOWN', housekeeperUid);
        for (const booking of bookingsToAdd) {
            // Only add booking if the clientId is known (especially for manual client)
            if (booking.clientId && booking.clientId !== 'MANUAL_CLIENT_ID_UNKNOWN') {
                console.log(`  -> Adding booking for client ${booking.clientName} (ID: ${booking.clientId}) on ${booking.startTimestamp}`);
                try {
                    const bookingId = await fsService.addBooking(housekeeperUid, booking);
                    if (bookingId) {
                        console.log(`     Booking added with ID: ${bookingId}`);
                    } else {
                        console.error('     addBooking did not return an ID or failed.');
                    }
                } catch (bookingError) {
                    console.error(`     Error adding booking for ${booking.clientName}:`, bookingError);
                }
            } else {
                console.warn(`  -> Skipping booking for ${booking.clientName} due to unknown clientId.`);
            }
        }
        console.log('Finished adding bookings.');

        // 5. Add Sample Settings (Assuming settings need manual setup or separate update)
        // Consider adding/updating the /users/{housekeeperUid}/settings/app document here
        // if you want specific default settings applied during population.
        // For example:
        console.log(`Setting default settings for housekeeper ${housekeeperUid}...`);
        const defaultHousekeeperSettings = {
             workingDays: {
                 monday: { isWorking: true, startTime: "08:00 AM", jobsPerDay: 2, jobDurations: [210, 210], breakDurations: [60] },
                 tuesday: { isWorking: true, startTime: "08:00 AM", jobsPerDay: 2, jobDurations: [210, 210], breakDurations: [60] },
                 wednesday: { isWorking: true, startTime: "08:00 AM", jobsPerDay: 1, jobDurations: [240], breakDurations: [] },
                 thursday: { isWorking: false }, // Example: Initially off
                 friday: { isWorking: true, startTime: "09:00 AM", jobsPerDay: 2, jobDurations: [180, 180], breakDurations: [90] },
                 saturday: { isWorking: false },
                 sunday: { isWorking: false }
             },
             timezone: "America/Los_Angeles", // Example timezone
             updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        await db.collection('users').doc(housekeeperUid).collection('settings').doc('app').set(defaultHousekeeperSettings, { merge: true });
        console.log(' -> Default settings applied.');
        
        // 6. Add Sample Time Off Dates (Using YYYY-MM-DD as ID)
        console.log(`Adding sample time off dates for housekeeper ${housekeeperUid}...`);
        const timeOffCollectionRef = db.collection('users').doc(housekeeperUid).collection('timeOffDates');
        const today = new Date();
        const sampleDates = [
            new Date(today.getFullYear(), today.getMonth() + 1, 10), // 10th of next month
            new Date(today.getFullYear(), today.getMonth() + 1, 11)  // 11th of next month
        ];

        for (const date of sampleDates) {
            const dateString = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
            const timeOffDocRef = timeOffCollectionRef.doc(dateString); // Use date string as ID
            try {
                await timeOffDocRef.set({
                    isTimeOff: true,
                    addedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log(` -> Added time off for ${dateString}`);
            } catch (timeOffError) {
                 console.error(` -> Error adding time off for ${dateString}:`, timeOffError);
            }
        }

        // --- Phase 4: Create Sample Services for Housekeeper --- <-- NEW PHASE
        console.log('--- Starting Service Creation Phase ---');
        const serviceBatch = db.batch();
        const services = sampleServicesData(housekeeperUid); // Get sample data with correct ownerId

        services.forEach((service, index) => {
            const serviceRef = db.collection('users').doc(housekeeperUid).collection('services').doc(); // Auto-generate ID
            serviceBatch.set(serviceRef, service);
            console.log(`   -> Prepared set operation for service ${index + 1}: ${service.serviceName}`);
        });

        await serviceBatch.commit();
        console.log('--- Service Creation Phase Complete ---');

        console.log(`--- Sample Data Population COMPLETE ---`);
        alert('Sample data population finished! Check console for details.');

    } catch (error) {
        console.error('--- Sample Data Population FAILED ---:', error);
        alert(`Sample data population FAILED: ${error.message}`);
    }
}

// Make the function globally accessible if it isn't already via script include
if (typeof window !== 'undefined') {
    window.populateCoreData = populateCoreData;
}

console.log('populate-sample-data.js loaded. Ready to be called via dev-tools.html or console.'); 

// Add event listener if the button exists (runs on dev-tools.html)
document.addEventListener('DOMContentLoaded', () => {
    const populateButton = document.getElementById('populate-sample-data-button');
    if (populateButton) {
        populateButton.addEventListener('click', () => {
            const homeownerUidInput = document.getElementById('homeowner-uid-input');
            const housekeeperUidInput = document.getElementById('housekeeper-uid-input');
            const homeownerUid = homeownerUidInput ? homeownerUidInput.value.trim() : null;
            const housekeeperUid = housekeeperUidInput ? housekeeperUidInput.value.trim() : null;
            populateCoreData(homeownerUid, housekeeperUid);
        });
    } else {
        // console.log('Not on dev-tools page, skipping populate button listener.');
    }
}); 