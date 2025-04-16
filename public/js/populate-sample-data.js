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
    const batch = db.batch();
    const timestamp = firebase.firestore.FieldValue.serverTimestamp();

    // --- Prepare Data --- 

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

    // 2. Housekeeper Base User Doc (Update existing)
    const housekeeperUserRef = db.collection('users').doc(housekeeperUid);
    const housekeeperUserUpdate = {
        firstName: coreHousekeeperProfileData.firstName,
        lastName: coreHousekeeperProfileData.lastName,
        phone: coreHousekeeperProfileData.phone,
        companyName: coreHousekeeperProfileData.companyName,
        updatedAt: timestamp,
        // Note: Ensure role was set correctly during signup
    };
    batch.update(housekeeperUserRef, housekeeperUserUpdate);

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

    // 4. Homeowner Base User Doc (Update existing)
    const homeownerUserRef = db.collection('users').doc(homeownerUid);
    const homeownerUserUpdate = {
        firstName: coreHomeownerProfileData.firstName,
        lastName: coreHomeownerProfileData.lastName,
        phone: coreHomeownerProfileData.phone,
        updatedAt: timestamp,
        // Note: Ensure role was set correctly during signup
    };
    batch.update(homeownerUserRef, homeownerUserUpdate);

    // ... (Rest of the function: clearing subcollections, adding clients, services, bookings) ...

    console.log("Prepared batch for core profiles.");

    // --- Clear existing subcollections before adding new sample data ---
    // ... (existing subcollection clearing logic) ...

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
        console.log("✅ Core data population batch committed successfully!");
        // Add subsequent operations (like adding clients/bookings needing separate calls) here
        // ... add manual clients ...
        // ... add services ...
        // ... add bookings ...
        console.log("✅ All sample data operations completed.");
        alert("Core sample data populated successfully!");

    } catch (error) {
        console.error("❌ Error committing core data population batch:", error);
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