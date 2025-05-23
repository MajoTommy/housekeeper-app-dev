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
    // --- NEW: Stripe Fields ---
    stripeCustomerId: null // For saving payment methods
    // --- END NEW ---
};

const coreHousekeeperBaseData = {
    email: 'tim+keeper@majorinc.ca',
    role: 'housekeeper',
    referralsEnabled: true // ADDED: Enable referrals by default for sample housekeeper
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
    inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
    // --- NEW: Stripe Fields ---
    // For payouts via Stripe Connect
    stripeAccountId: null,
    stripeAccountStatus: null,
    // For platform subscriptions via Stripe Billing
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    stripeSubscriptionStatus: null,
    stripePriceId: null,
    stripeCurrentPeriodEnd: null
    // --- END NEW ---
};

const manualClientsData = [
    {
        // No ID needed if using addClient that generates one
        firstName: 'Manual',
        lastName: 'Clientone',
        email: 'manual1@example.com',
        phone: '555-555-0001',
        address: '789 Test Ave, Sampletown, CA 90210',
        HousekeeperInternalNote: 'Key under the mat',
        isActive: true
    },
    {
        firstName: 'Another',
        lastName: 'Manualperson',
        email: 'manual2@example.com',
        phone: '555-555-0002',
        address: '10 Downing St, Otherplace, CA 90028',
        HousekeeperInternalNote: 'Key under the mat',
        isActive: true
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
        ownerId: housekeeperUid, // Ensure ownerId is set
        durationMinutes: 120, // Example: 2 hours
        includedTasks: [
            'dust_surfaces', 
            'vacuum_carpets_rugs', 
            'sweep_hard_floors', 
            'mop_hard_floors', 
            'empty_trash_bins',
            'clean_kitchen_countertops',
            'clean_kitchen_sink_faucets',
            'clean_stovetop',
            'clean_microwave_interior_exterior',
            'clean_bathroom_countertops',
            'clean_bathroom_sink_faucets',
            'clean_disinfect_toilet',
            'clean_shower_tub',
            'make_beds',
            'tidy_straighten_items'
        ]
    },
    {
        serviceName: 'Deep Cleaning',
        type: 'base',
        basePrice: 250,
        description: 'Thorough cleaning including baseboards, inside windows, light fixtures, etc.',
        isActive: true,
        ownerId: housekeeperUid,
        durationMinutes: 240, // Example: 4 hours
        includedTasks: [
            'dust_surfaces', 
            'vacuum_carpets_rugs', 
            'sweep_hard_floors', 
            'mop_hard_floors', 
            'empty_trash_bins',
            'wipe_light_switches_door_knobs',
            'dust_baseboards',
            'dust_window_sills_ledges',
            'remove_cobwebs',
            'dust_ceiling_fans',
            'dust_blinds_shutters',
            'spot_clean_walls_doors',
            'clean_kitchen_countertops',
            'clean_kitchen_sink_faucets',
            'clean_exterior_kitchen_cabinets',
            'clean_exterior_refrigerator',
            'clean_exterior_oven',
            'clean_exterior_dishwasher',
            'clean_stovetop',
            'clean_microwave_interior_exterior',
            'clean_bathroom_countertops',
            'clean_bathroom_sink_faucets',
            'clean_disinfect_toilet',
            'clean_shower_tub',
            'clean_shower_doors',
            'clean_bathroom_mirrors',
            'make_beds',
            'tidy_bedroom',
            'wash_baseboards', // from addon_deep_clean
            'clean_interior_windows_thorough' // from addon_deep_clean
        ]
    },
    {
        serviceName: 'Move-In/Out Cleaning',
        type: 'base',
        basePrice: 350,
        description: 'Comprehensive cleaning for empty homes.',
        isActive: false, // Example of an inactive service
        ownerId: housekeeperUid,
        durationMinutes: 300, // Example: 5 hours
        includedTasks: [
            'dust_surfaces', 
            'vacuum_carpets_rugs', 
            'sweep_hard_floors', 
            'mop_hard_floors', 
            'empty_trash_bins',
            'wipe_light_switches_door_knobs',
            'dust_baseboards',
            'clean_windows_interior_quick',
            'dust_window_sills_ledges',
            'remove_cobwebs',
            'dust_ceiling_fans',
            'dust_blinds_shutters',
            'clean_kitchen_countertops',
            'clean_kitchen_sink_faucets',
            'clean_exterior_kitchen_cabinets',
            'clean_interior_cabinets_drawers', // from addon_deep_clean
            'clean_exterior_refrigerator',
            'clean_inside_refrigerator', // from addon_deep_clean
            'clean_exterior_oven',
            'clean_inside_oven', // from addon_deep_clean
            'clean_exterior_dishwasher',
            'clean_stovetop',
            'clean_microwave_interior_exterior',
            'clean_bathroom_countertops',
            'clean_bathroom_sink_faucets',
            'clean_disinfect_toilet',
            'clean_shower_tub',
            'clean_shower_doors',
            'clean_bathroom_mirrors',
            'wash_baseboards', // from addon_deep_clean
            'clean_interior_windows_thorough' // from addon_deep_clean
        ]
    },
    {
        serviceName: 'Inside Refrigerator',
        type: 'addon',
        basePrice: 35,
        description: 'Clean and sanitize the interior of the refrigerator.',
        isActive: true,
        ownerId: housekeeperUid,
        durationMinutes: 30, // Example: 30 minutes
        includedTasks: ['clean_inside_refrigerator'] // <<< NEW
    },
    {
        serviceName: 'Inside Oven',
        type: 'addon',
        basePrice: 45,
        description: 'Clean the interior of the oven.',
        isActive: true,
        ownerId: housekeeperUid,
        durationMinutes: 45, // Example: 45 minutes
        includedTasks: ['clean_inside_oven'] // <<< NEW
    },
    {
        serviceName: 'Laundry (per load)',
        type: 'addon',
        basePrice: 25,
        description: 'Wash and dry one load of laundry.',
        isActive: true,
        ownerId: housekeeperUid,
        durationMinutes: 60, // Example: 1 hour (including folding, perhaps)
        includedTasks: ['laundry_wash_dry_fold'] // <<< NEW
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

// --- Main Population Function ---

/**
 * Populates core data for one homeowner and one housekeeper, linking them.
 * @param {string} homeownerUid UID of the pre-created homeowner.
 * @param {string} housekeeperUid UID of the pre-created housekeeper.
 * @param {object} [options={}] Optional settings.
 * @param {boolean} [options.stripeEnabled=false] If true, adds dummy active/enabled Stripe data to the housekeeper profile.
 */
async function populateCoreData(homeownerUid, housekeeperUid, options = { stripeEnabled: false }) {
    console.log("--- Starting Core Data Population ---");
    console.log(`Homeowner UID: ${homeownerUid}`);
    console.log(`Housekeeper UID: ${housekeeperUid}`);
    console.log(`Stripe Enabled Mode: ${options.stripeEnabled}`); // <-- Log option

    const db = firebase.firestore();
    // const batch = db.batch(); // Batch for profiles will be created later
    // const timestamp = firebase.firestore.FieldValue.serverTimestamp(); // Timestamp will be created later

    // --- <<<< NEW: Delete Existing Subcollection Data First >>>> ---
    console.log("--- Clearing Existing Subcollection Data for Housekeeper ---");
    try {
        const settingsColRef = db.collection('users').doc(housekeeperUid).collection('settings');
        const servicesColRef = db.collection('users').doc(housekeeperUid).collection('services');
        const clientsColRef = db.collection('users').doc(housekeeperUid).collection('clients');
        const bookingsColRef = db.collection('users').doc(housekeeperUid).collection('bookings');
        const bookingRequestsColRef = db.collection('users').doc(housekeeperUid).collection('bookingRequests');

        console.log(`[Deletion Phase] Starting deletion for settings of housekeeper: ${housekeeperUid}`);
        await deleteCollection(settingsColRef);
        console.log(`[Deletion Phase] Starting deletion for services of housekeeper: ${housekeeperUid}`);
        await deleteCollection(servicesColRef);
        console.log(`[Deletion Phase] Starting deletion for clients of housekeeper: ${housekeeperUid}`);
        await deleteCollection(clientsColRef);
        console.log(`[Deletion Phase] Starting deletion for bookings of housekeeper: ${housekeeperUid}`);
        await deleteCollection(bookingsColRef);
        console.log(`[Deletion Phase] Starting deletion for booking requests of housekeeper: ${housekeeperUid}`);
        await deleteCollection(bookingRequestsColRef);
        
        console.log("--- Finished Clearing Subcollection Data --- ");
    } catch (error) {
        console.error("❌ Error during subcollection deletion phase:", error);
        alert("Error clearing existing subcollection data. Check console. Population halted before profile batch.");
        return; // Stop if deletion fails
    }
    // --- <<<< END NEW >>>> ---

    // --- Prepare Profile Data & Batch --- 
    const batch = db.batch(); // Create batch specifically for profile operations
    const timestamp = firebase.firestore.FieldValue.serverTimestamp(); // Get timestamp

    // 1. Housekeeper Profile
    const housekeeperProfile = {
        ...coreHousekeeperProfileData,
        createdAt: timestamp,
        updatedAt: timestamp,
    };
    
    // --- NEW: Conditionally add dummy Stripe data ---
    if (options.stripeEnabled) {
        console.log("Adding dummy Stripe data to housekeeper profile...");
        const futureDate = new Date();
        futureDate.setMonth(futureDate.getMonth() + 1); // Set subscription end date one month in the future
        const futureTimestamp = firebase.firestore.Timestamp.fromDate(futureDate);

        housekeeperProfile.stripeAccountId = "acct_dummy123456789";
        housekeeperProfile.stripeAccountStatus = "enabled";
        housekeeperProfile.stripeCustomerId = "cus_dummy123456789";
        housekeeperProfile.stripeSubscriptionId = "sub_dummy123456789";
        housekeeperProfile.stripeSubscriptionStatus = "active";
        housekeeperProfile.stripePriceId = "price_dummy_monthly"; // Example Price ID
        housekeeperProfile.stripeCurrentPeriodEnd = futureTimestamp;
    } else {
         console.log("Skipping dummy Stripe data (using defaults from object definition - nulls).");
    }
    // --- END NEW ---

    const housekeeperProfileRef = db.collection('housekeeper_profiles').doc(housekeeperUid);
    batch.set(housekeeperProfileRef, housekeeperProfile); // Use the potentially modified object

    // 2. Housekeeper Base User Doc (Set with Merge to Create/Update)
    const housekeeperUserRef = db.collection('users').doc(housekeeperUid);
    const housekeeperUserData = {
        // Include base data and profile data needed at the root user doc
        ...coreHousekeeperBaseData, // adds email and role
        firstName: coreHousekeeperProfileData.firstName,
        lastName: coreHousekeeperProfileData.lastName,
        phone: coreHousekeeperProfileData.phone,
        companyName: coreHousekeeperProfileData.companyName,
        // IMPORTANT: Add createdAt ONLY if creating, or use merge
        // Using set with merge handles both create and update safely
        createdAt: timestamp, // Add on initial set
        updatedAt: timestamp,
    };
    // Use set with merge: true to create if missing, update if exists
    batch.set(housekeeperUserRef, housekeeperUserData, { merge: true }); 

    // 3. Homeowner Profile
    const homeownerProfile = {
        ...coreHomeownerProfileData,
        linkedHousekeeperId: housekeeperUid, // Link to the housekeeper
        createdAt: timestamp,
        updatedAt: timestamp,
        // --- NEW: Conditionally add homeowner Stripe data ---
        // Only add customer ID if Stripe is generally enabled for testing
        stripeCustomerId: options.stripeEnabled ? "cus_dummy_ho_12345" : null 
        // --- END NEW ---
    };
    const homeownerProfileRef = db.collection('homeowner_profiles').doc(homeownerUid);
    batch.set(homeownerProfileRef, homeownerProfile);

    // 4. Homeowner Base User Doc (Set with Merge to Create/Update)
    const homeownerUserRef = db.collection('users').doc(homeownerUid);
    const homeownerUserData = {
        // Include base data and profile data needed at the root user doc
        ...coreHomeownerBaseData, // adds email and role
        firstName: coreHomeownerProfileData.firstName,
        lastName: coreHomeownerProfileData.lastName,
        phone: coreHomeownerProfileData.phone,
        // Using set with merge handles both create and update safely
        createdAt: timestamp, // Add on initial set
        updatedAt: timestamp,
    };
    // Use set with merge: true to create if missing, update if exists
    batch.set(homeownerUserRef, homeownerUserData, { merge: true });

    // ... (Rest of the function: clearing subcollections, adding clients, services, bookings) ...

    console.log("Prepared batch for core profiles.");

    // --- Add Manual Clients --- 
    // ... (existing manual client adding logic) ...
    // Need to capture the generated IDs if sampleBookingsData relies on them
    let manualClientOneId = null; 
    // Capture ID from the result of the addClient call (assuming it returns the ID)
    
    // --- Add Services ---
    // ... (existing service adding logic) ...

    // --- Add Bookings ---
    // ... (existing booking adding logic, ensuring manualClientOneId is passed if needed) ...

    // --- Commit Batch --- 
    try {
        await batch.commit();
        console.log("✅ Core profiles batch committed successfully!");

        // --- Add Subcollection Data (AFTER profiles are potentially created) ---
        console.log("--- Starting Subcollection Data Population ---");
        const db = firebase.firestore(); // Get instance again just in case
        const timestamp = firebase.firestore.FieldValue.serverTimestamp(); // Get timestamp again

        // 1. Add Default Settings
        const settingsRef = db.collection('users').doc(housekeeperUid).collection('settings').doc('app');
        // Define default settings (adjust as needed, use structure from DEFAULT_SETTINGS in index.js)
        const defaultAppSettings = {
            workingDays: {
                monday: { isWorking: true, startTime: "09:00", jobDurations: [120, 120], breakDurations: [60] },
                tuesday: { isWorking: true, startTime: "09:00", jobDurations: [120, 120], breakDurations: [60] },
                wednesday: { isWorking: true, startTime: "09:00", jobDurations: [120, 120], breakDurations: [60] },
                thursday: { isWorking: true, startTime: "09:00", jobDurations: [120, 120], breakDurations: [60] },
                friday: { isWorking: true, startTime: "09:00", jobDurations: [120, 120], breakDurations: [60] },
                saturday: { isWorking: false },
                sunday: { isWorking: false },
            },
            timezone: "America/Los_Angeles", // Default example timezone
            updatedAt: timestamp
        };
        try {
            await settingsRef.set(defaultAppSettings);
            console.log("   -> Step 1/4: Default settings write attempted."); // LOG Step
        } catch (e) {
            console.error("      ERROR adding settings:", e);
        }

        // 2. Add Services
        const servicesColRef = db.collection('users').doc(housekeeperUid).collection('services');
        const servicesToAdd = sampleServicesData(housekeeperUid); // Generate with correct ownerId
        let servicesAddedCount = 0;
        let createdSampleServices = []; // <<< NEW: Array to store created services with their IDs
        try {
            for (const serviceData of servicesToAdd) {
                const docRef = await servicesColRef.add({...serviceData, createdAt: timestamp, updatedAt: timestamp}); // Use add for auto-ID
                createdSampleServices.push({ id: docRef.id, ...serviceData }); // <<< NEW: Store service with its Firestore ID
                servicesAddedCount++;
            }
            console.log(`   -> Step 2/4: ${servicesAddedCount}/${servicesToAdd.length} sample services writes attempted.`); // LOG Step
        } catch (e) {
            console.error("      ERROR adding services:", e);
        }

        // 3. Add Manual Clients and Capture IDs
        const clientsColRef = db.collection('users').doc(housekeeperUid).collection('clients');
        let clientIds = [];
        let clientsAddedCount = 0;
        try {
            const clientPromises = manualClientsData.map(clientData => 
                clientsColRef.add({...clientData, createdAt: timestamp, updatedAt: timestamp})
            );
            const clientRefs = await Promise.all(clientPromises);
            clientIds = clientRefs.map(ref => ref.id);
            clientsAddedCount = clientIds.length;
            console.log(`   -> Step 3/4: ${clientsAddedCount}/${manualClientsData.length} manual clients writes attempted.`); // LOG Step
            if(clientIds.length > 0) console.log(`      (Manual Client 1 ID: ${clientIds[0]})`);
        } catch (e) {
            console.error("      ERROR adding clients:", e);
        }
        let manualClientOneId = clientIds.length > 0 ? clientIds[0] : null; // Keep for booking data

        // 4. Add Bookings (using captured client ID)
        const bookingsColRef = db.collection('users').doc(housekeeperUid).collection('bookings');
        const bookingsToAdd = sampleBookingsData(homeownerUid, manualClientOneId, housekeeperUid);
        let bookingsAddedCount = 0;
        try {
            for (const bookingData of bookingsToAdd) {
                // Ensure createdAt is set if not already
                if (!bookingData.createdAt) {
                     bookingData.createdAt = timestamp;
                }
                bookingData.updatedAt = timestamp; // Always set updatedAt
                await bookingsColRef.add(bookingData);
                bookingsAddedCount++;
            }
             console.log(`   -> Step 4/4: ${bookingsAddedCount}/${bookingsToAdd.length} sample bookings writes attempted.`); // LOG Step
        } catch (e) {
            console.error("      ERROR adding bookings:", e);
        }
        
        // --- NEW: Add Sample Booking Requests ---
        const bookingRequestsColRef = db.collection('users').doc(housekeeperUid).collection('bookingRequests');
        let requestsAddedCount = 0;

        // Helper to get a future date string in YYYY-MM-DD format
        const getFutureDateString = (daysOffset) => {
            const date = new Date();
            date.setDate(date.getDate() + daysOffset);
            return date.toISOString().split('T')[0];
        };

        // --- Helper to find a sample service by name and get its ID and price ---
        const findSampleService = (name, type) => {
            const found = createdSampleServices.find(s => s.serviceName === name && s.type === type);
            if (found) {
                return { id: found.id, name: found.serviceName, price: found.basePrice, type: found.type, durationMinutes: found.durationMinutes || 0 };
            }
            console.warn(`[Sample Data] Could not find sample service: ${name} (type: ${type})`);
            return { id: `not_found_${name.replace(/\s+/g, '').toLowerCase()}`, name: name, price: 0, type: type, durationMinutes: 0 }; // Fallback
        };

        const sampleDeepClean = findSampleService("Deep Cleaning", "base");
        const sampleOvenClean = findSampleService("Inside Oven", "addon");
        const sampleStandardClean = findSampleService("Standard Cleaning", "base");
        const sampleLaundry = findSampleService("Laundry (per load)", "addon");

        const sampleBookingRequests = [
            // Existing sample request (pending housekeeper review)
            {
                homeownerId: homeownerUid,
                homeownerName: `${coreHomeownerProfileData.firstName} ${coreHomeownerProfileData.lastName}`,
                housekeeperId: housekeeperUid,
                baseServices: [ sampleDeepClean ], // <<< MODIFIED
                addonServices: [ sampleOvenClean ], // <<< MODIFIED
                preferredDate: getFutureDateString(7), // Original request: 1 week from now
                preferredTimeWindow: "morning",
                frequency: "one-time",
                recurringEndDate: null,
                notes: "This is the first request - please make it thorough!",
                estimatedTotalPrice: sampleDeepClean.price + sampleOvenClean.price, // Calculate based on actual prices
                status: 'pending_housekeeper_review',
                requestTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
                lastUpdatedTimestamp: firebase.firestore.FieldValue.serverTimestamp()
            },
            // Sample request with a proposed alternative
            {
                homeownerId: homeownerUid,
                homeownerName: `${coreHomeownerProfileData.firstName} ${coreHomeownerProfileData.lastName}`,
                housekeeperId: housekeeperUid,
                baseServices: [ sampleStandardClean ], // <<< MODIFIED
                addonServices: [],
                preferredDate: getFutureDateString(10),
                preferredTimeWindow: "afternoon",
                frequency: "weekly",
                recurringEndDate: getFutureDateString(60), // e.g., for about 2 months
                notes: "Need a regular weekly clean.",
                estimatedTotalPrice: sampleStandardClean.price,
                status: 'housekeeper_proposed_alternative',
                requestTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
                proposal: {
                    proposedDate: getFutureDateString(11),
                    proposedTime: "13:00",
                    housekeeperNotes: "Can do, but the next day at 1 PM works better for me.",
                    proposedFrequency: "weekly",
                    proposedRecurringEndDate: getFutureDateString(61), // Housekeeper adjusted end date slightly
                    proposedPrice: sampleStandardClean.price + 5, // Example: Housekeeper proposed slightly higher price
                    proposedAt: firebase.firestore.FieldValue.serverTimestamp()
                }
            },
            // Sample request that was approved and scheduled
            {
                homeownerId: homeownerUid,
                homeownerName: `${coreHomeownerProfileData.firstName} ${coreHomeownerProfileData.lastName}`,
                housekeeperId: housekeeperUid,
                baseServices: [ findSampleService("Move-In/Out Cleaning", "base") ], // <<< MODIFIED (Note: This service is inactive by default)
                addonServices: [ sampleLaundry ], // <<< MODIFIED
                preferredDate: getFutureDateString(3),
                preferredTimeWindow: "any",
                frequency: "one-time",
                notes: "Empty apartment, needs a good clean before I move my stuff.",
                estimatedTotalPrice: findSampleService("Move-In/Out Cleaning", "base").price + sampleLaundry.price,
                status: 'approved_and_scheduled',
                requestTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
                // In a real scenario, scheduledBookingId would be populated here
                // scheduledBookingId: "actual_booking_id_from_bookings_collection"
            }
        ];

        try {
            for (const reqData of sampleBookingRequests) {
                await bookingRequestsColRef.add(reqData);
                requestsAddedCount++;
            }
            console.log(`   -> Step 5/5: ${requestsAddedCount}/${sampleBookingRequests.length} sample booking requests writes attempted.`);
        } catch (e) {
            console.error("      ERROR adding booking requests:", e);
        }
        
        // Add Time-Off Data here if needed in the future
        
        console.log("✅ All sample data operations completed.");
        alert("Core sample data populated successfully!");

    } catch (error) {
        console.error("❌ Error committing core data population batch or subsequent operations:", error);
        alert("Error populating core data. Check console.");
    }

}

// --- Event Listener Setup (Assumes button in dev-tools.html) ---
// ... (Existing event listener setup, needs modification) ...
// Example modification:
/*
document.getElementById('populate-button')?.addEventListener('click', () => {
    const homeownerUid = document.getElementById('homeowner-uid').value;
    const housekeeperUid = document.getElementById('housekeeper-uid').value;
    if (!homeownerUid || !housekeeperUid) {
        alert('Please provide both Homeowner and Housekeeper UIDs.');
        return;
    }
    populateCoreData(homeownerUid, housekeeperUid, { stripeEnabled: false }); // Call for standard population
});

document.getElementById('populate-stripe-button')?.addEventListener('click', () => { // Assumes a new button exists
    const homeownerUid = document.getElementById('homeowner-uid').value;
    const housekeeperUid = document.getElementById('housekeeper-uid').value;
    if (!homeownerUid || !housekeeperUid) {
        alert('Please provide both Homeowner and Housekeeper UIDs.');
        return;
    }
    populateCoreData(homeownerUid, housekeeperUid, { stripeEnabled: true }); // Call for Stripe-enabled population
});
*/

// ... (rest of the script) ...

// Make the function globally accessible if it isn't already via script include
if (typeof window !== 'undefined') {
    window.populateCoreData = populateCoreData;
}

console.log('populate-sample-data.js loaded. Ready to be called via dev-tools.html or console.'); 

// Add event listeners if the buttons exist (runs on dev-tools.html)
document.addEventListener('DOMContentLoaded', () => {
    // Use the IDs that actually exist in dev-tools.html
    const populateButton = document.getElementById('populateButton'); // <-- Use correct ID
    const populateStripeButton = document.getElementById('populate-stripe-data-button');
    const homeownerUidInput = document.getElementById('homeownerUid'); // <-- Use correct ID
    const housekeeperUidInput = document.getElementById('housekeeperUid'); // <-- Use correct ID

    // Listener for STANDARD population (No Stripe data)
    if (populateButton && homeownerUidInput && housekeeperUidInput) {
        populateButton.addEventListener('click', () => {
            const homeownerUid = homeownerUidInput.value.trim();
            const housekeeperUid = housekeeperUidInput.value.trim();
            if (!homeownerUid || !housekeeperUid) {
                alert('Please provide both Homeowner and Housekeeper UIDs.');
                return;
            }
            console.log('Triggering standard population...');
            // Check if function exists before calling
            if (typeof window.populateCoreData === 'function') {
                 window.populateCoreData(homeownerUid, housekeeperUid, { stripeEnabled: false });
            } else {
                console.error("populateCoreData function not found!");
                 alert("Error: Population function not found.");
            }
        });
    } else {
         // Update log messages to reflect correct IDs
         if (!populateButton) console.log('Standard populate button (#populateButton) not found.');
         if (!homeownerUidInput) console.log('Homeowner UID input (#homeownerUid) not found.');
         if (!housekeeperUidInput) console.log('Housekeeper UID input (#housekeeperUid) not found.');
    }

    // Listener for STRIPE-ENABLED population
    if (populateStripeButton && homeownerUidInput && housekeeperUidInput) {
        populateStripeButton.addEventListener('click', () => {
            const homeownerUid = homeownerUidInput.value.trim();
            const housekeeperUid = housekeeperUidInput.value.trim();
             if (!homeownerUid || !housekeeperUid) {
                alert('Please provide both Homeowner and Housekeeper UIDs.');
                return;
            }
            console.log('Triggering Stripe-enabled population...');
             // Check if function exists before calling
             if (typeof window.populateCoreData === 'function') {
                window.populateCoreData(homeownerUid, housekeeperUid, { stripeEnabled: true });
            } else {
                console.error("populateCoreData function not found!");
                 alert("Error: Population function not found.");
            }
        });
    } else {
        if (!populateStripeButton) console.log('Stripe populate button (#populate-stripe-data-button) not found.');
        // Only log input missing if stripe button *was* found, otherwise covered by above
        if (populateStripeButton && !homeownerUidInput) console.log('Homeowner UID input (#homeownerUid) not found.');
        if (populateStripeButton && !housekeeperUidInput) console.log('Housekeeper UID input (#housekeeperUid) not found.');
    }
}); 