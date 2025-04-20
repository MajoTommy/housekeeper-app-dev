/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const { HttpsError, onCall } = require("firebase-functions/v2/https");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const functions = require("firebase-functions");
const cors = require('cors')({origin: true}); // Import and configure CORS
const dateFnsTz = require('date-fns-tz'); // COMMONJS DEFAULT IMPORT

// --- ADD DEBUG LOG --- 
try {
    logger.info("Imported dateFnsTz object keys:", Object.keys(dateFnsTz));
} catch (e) {
    logger.error("Failed to get keys from dateFnsTz object", e);
}
// --- END DEBUG LOG --- 

// Initialize Firebase Admin SDK
try {
  if (!admin.apps.length) { // Check if already initialized
    admin.initializeApp();
  }
} catch (e) {
  logger.info("Admin SDK initialization error (might be ok if already init):", e);
}
const db = admin.firestore();

// --- Initialize Stripe Globally ---
const stripePackage = require("stripe");
let stripe = null; // Declare stripe globally
try {
    const stripeSecret = process.env.STRIPE_SECRET_KEY; 
    if (!stripeSecret) {
        // Log a serious error, as this prevents Stripe functionality
        logger.error("FATAL: Stripe secret key (STRIPE_SECRET_KEY) not found in environment. Stripe SDK NOT initialized.");
        // You might want to throw here if Stripe is absolutely essential for all functions
        // throw new Error("Stripe secret key not configured via environment variables (STRIPE_SECRET_KEY)."); 
    } else {
    stripe = stripePackage(stripeSecret);
        logger.info("Stripe SDK initialized globally using environment variable.");
    }
} catch (error) {
    logger.error("FATAL: Exception during global Stripe SDK initialization:", error);
    // Depending on requirements, you might re-throw or just log
}
// --- END Stripe Initialization ---

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

// --- Time Helper Functions (JavaScript) ---

/**
 * Converts a time string (e.g., "9:00 AM", "14:30") to minutes since midnight.
 * @param {string | null | undefined} timeStr The time string.
 * @return {number | null} Minutes since midnight or null if invalid.
 */
function timeStringToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return null;
  const time = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (!time) return null;
  let hours = parseInt(time[1], 10);
  const minutes = parseInt(time[2], 10);
  const period = time[3] ? time[3].toUpperCase() : null;

  if (period === "AM" && hours === 12) {
    hours = 0; // Midnight case
  } else if (period === "PM" && hours !== 12) {
    hours += 12; // PM case, add 12 unless it's 12 PM
  }

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      logger.warn("Invalid time components detected", { timeStr, hours, minutes });
      return null;
  }

  return hours * 60 + minutes;
}

// --- Constants ---
const DEFAULT_SETTINGS = {
  workingDays: {
    monday: { isWorking: true, startTime: "09:00", jobDurations: [120, 120], breakDurations: [60] },
    tuesday: { isWorking: true, startTime: "09:00", jobDurations: [120, 120], breakDurations: [60] },
    wednesday: { isWorking: true, startTime: "09:00", jobDurations: [120, 120], breakDurations: [60] },
    thursday: { isWorking: true, startTime: "09:00", jobDurations: [120, 120], breakDurations: [60] },
    friday: { isWorking: true, startTime: "09:00", jobDurations: [120, 120], breakDurations: [60] },
    saturday: { isWorking: false },
    sunday: { isWorking: false },
  },
  timezone: "UTC",
};
const DEFAULT_JOB_DURATION = 180; // minutes

// --- Main Cloud Function: getAvailableSlots (Refactored for UTC Timestamps) ---
exports.getAvailableSlots = onCall(async (request) => {
    logger.info("getAvailableSlots (UTC Refactor) called", { authUid: request.auth ? request.auth.uid : "none", data: request.data });

    // 1. Input Validation (Keep ISO strings as input)
    const { housekeeperId, startDateString, endDateString } = request.data;
    if (!housekeeperId || typeof housekeeperId !== "string" || !startDateString || !endDateString) {
        logger.error("Missing or invalid required data fields", { hasHkId: !!housekeeperId, typeHkId: typeof housekeeperId, hasStart: !!startDateString, hasEnd: !!endDateString });
        throw new HttpsError("invalid-argument", "Required data missing or invalid (housekeeperId, startDateString, endDateString).");
    }

    let startDateUTC, endDateUTC, rangeStartTimestamp, rangeEndTimestamp;
    try {
        // Parse input strings directly into Date objects (interpreted as UTC by Firestore client/Admin SDK when used in queries)
        startDateUTC = new Date(startDateString);
        endDateUTC = new Date(endDateString); 
        // Ensure times are start/end of day UTC for range query
        startDateUTC.setUTCHours(0, 0, 0, 0); 
        // For end date, we need the very end of the day for <= comparison
        endDateUTC.setUTCHours(23, 59, 59, 999); 
        
        if (isNaN(startDateUTC.getTime()) || isNaN(endDateUTC.getTime())) {
            throw new Error("Invalid date conversion.");
        }
        // Convert to Firestore Timestamps for querying
        rangeStartTimestamp = admin.firestore.Timestamp.fromDate(startDateUTC);
        rangeEndTimestamp = admin.firestore.Timestamp.fromDate(endDateUTC);
        
        logger.info(`Processing request for housekeeper: ${housekeeperId}, UTC range: ${startDateUTC.toISOString()} to ${endDateUTC.toISOString()}`);
    } catch (e) {
        logger.error("Invalid date format provided", { startDateString, endDateString, error: e.message });
        throw new HttpsError("invalid-argument", "Invalid date format. Please provide ISO 8601 strings.");
    }

    try {
        // --- NEW: Identify Requester (Homeowner) ---
        const requestingHomeownerId = request.auth ? request.auth.uid : null;
        logger.info(`Slot request initiated by homeowner: ${requestingHomeownerId || 'Anonymous/Unauthenticated'}`);
        // --- END NEW ---

        // 2. Fetch Housekeeper Profile (for blocklist) and Settings
        const housekeeperProfileRef = db.collection('users').doc(housekeeperId);
        const settingsPath = housekeeperProfileRef.collection('settings').doc('app'); // Corrected path

        const [housekeeperProfileDoc, settingsDoc] = await Promise.all([
            housekeeperProfileRef.get(),
            settingsPath.get() // <<< CORRECTED: Call .get() directly on the DocumentReference
        ]);
        
        // --- NEW: Check Blocklist --- 
        if (requestingHomeownerId && housekeeperProfileDoc.exists) {
            const housekeeperData = housekeeperProfileDoc.data();
            const blockedHomeowners = housekeeperData.blockedHomeowners || [];
            if (blockedHomeowners.includes(requestingHomeownerId)) {
                logger.info(`Access denied: Homeowner ${requestingHomeownerId} is blocked by housekeeper ${housekeeperId}. Returning empty schedule.`);
                return { schedule: {} }; // Return empty schedule if blocked
            }
        } else if (!housekeeperProfileDoc.exists) {
            logger.warn(`Housekeeper profile ${housekeeperId} not found. Cannot check blocklist.`);
            // Decide behavior: proceed or throw error? Proceeding for now.
        }
        // --- END NEW ---

        // Continue fetching settings (already fetched in Promise.all)
        let settings = DEFAULT_SETTINGS;
        if (settingsDoc.exists) {
            const fetchedSettings = settingsDoc.data();
            // Deep merge might be better, but basic merge for now
            settings = {
                ...DEFAULT_SETTINGS,
                ...fetchedSettings,
                workingDays: {
                    ...DEFAULT_SETTINGS.workingDays,
                    ...(fetchedSettings?.workingDays || {}),
                },
            };
            logger.info("Fetched settings successfully.", { housekeeperId });
        } else {
            logger.warn(`Settings not found for housekeeper ${housekeeperId}, using default settings.`);
        }

        // 3. Fetch Bookings (Querying Timestamps)
        const bookingsPath = `users/${housekeeperId}/bookings`;
        const bookingsRef = db.collection(bookingsPath);
        
        // Query based on startTimestamp falling within the range
        // Note: For full overlap check, more complex queries or client-side filtering might be needed if a booking *crosses* the start/end date boundaries.
        // Assuming bookings are contained within single days for now.
        logger.info(`Querying bookings using Timestamps: >= ${rangeStartTimestamp.toDate().toISOString()} and <= ${rangeEndTimestamp.toDate().toISOString()}`);
        const bookingsSnapshot = await bookingsRef
          .where("startTimestamp", ">=", rangeStartTimestamp) 
          .where("startTimestamp", "<=", rangeEndTimestamp) // Bookings starting within the range
          // Consider adding .where("status", "!=", "cancelled") if cancelled bookings might exist temporarily
          .get();

        const bookingsByDateStr = {};
        const profileIdsToFetch = { clients: new Set(), homeowners: new Set() };

        // Fetch profiles in parallel
        bookingsSnapshot.forEach((doc) => {
            const booking = doc.data();
            if (booking.clientId) profileIdsToFetch.clients.add(booking.clientId);
            if (booking.homeownerId) profileIdsToFetch.homeowners.add(booking.homeownerId);
        });

        // Fetch profiles in parallel
        const clientProfilePromises = Array.from(profileIdsToFetch.clients).map(clientId => 
            db.collection(`users/${housekeeperId}/clients`).doc(clientId).get()
        );
        const homeownerProfilePromises = Array.from(profileIdsToFetch.homeowners).map(homeownerId => 
            db.collection('homeowner_profiles').doc(homeownerId).get()
        );

        const [clientProfileSnapshots, homeownerProfileSnapshots] = await Promise.all([
            Promise.all(clientProfilePromises),
            Promise.all(homeownerProfilePromises)
        ]);

        // Create maps for easy lookup
        const clientProfiles = new Map();
        clientProfileSnapshots.forEach(doc => {
            if (doc.exists) clientProfiles.set(doc.id, doc.data());
        });
        const homeownerProfiles = new Map();
        homeownerProfileSnapshots.forEach(doc => {
            if (doc.exists) homeownerProfiles.set(doc.id, doc.data());
        });

        // Process bookings and store by date string (key) using UTC Timestamps
        bookingsSnapshot.forEach((doc) => {
            const booking = doc.data();
            const bookingId = doc.id;
            
            // Check for existence and validity of timestamps
            if (!booking.startTimestamp || typeof booking.startTimestamp.toDate !== 'function' || 
                !booking.endTimestamp || typeof booking.endTimestamp.toDate !== 'function') {
                logger.warn("Skipping booking: Missing or invalid Firestore Timestamps.", { bookingId });
                return; 
            }

            const startMillis = booking.startTimestamp.toMillis();
            const endMillis = booking.endTimestamp.toMillis();
            
            if(startMillis >= endMillis) {
                 logger.warn("Skipping booking: Start timestamp is not before end timestamp.", { bookingId });
                return;
            }

            // Get UTC date string key (YYYY-MM-DD)
            const startDate = booking.startTimestamp.toDate();
            const year = startDate.getUTCFullYear();
            const month = (startDate.getUTCMonth() + 1).toString().padStart(2, "0");
            const day = startDate.getUTCDate().toString().padStart(2, "0");
            const bookingDateStr = `${year}-${month}-${day}`;

            // Get client/homeowner name
            let clientName = "Unknown Client";
            if (booking.clientId && clientProfiles.has(booking.clientId)) {
                const clientData = clientProfiles.get(booking.clientId);
                clientName = `${clientData.firstName || ''} ${clientData.lastName || ''}`.trim();
            } else if (booking.homeownerId && homeownerProfiles.has(booking.homeownerId)) {
                const homeownerData = homeownerProfiles.get(booking.homeownerId);
                clientName = `${homeownerData.firstName || ''} ${homeownerData.lastName || ''}`.trim();
            } else if (booking.clientName) {
                 clientName = booking.clientName; // Fallback to potentially stored name
            }

            if (!bookingsByDateStr[bookingDateStr]) {
                bookingsByDateStr[bookingDateStr] = [];
            }
            bookingsByDateStr[bookingDateStr].push({ 
                startMillis: startMillis,
                endMillis: endMillis,
                id: bookingId, 
                status: booking.status, // Keep status (e.g., 'pending', 'confirmed')
                clientName: clientName 
            });
        });
        logger.info(`Fetched and processed ${bookingsSnapshot.size} relevant bookings.`, { housekeeperId });

        // 3b. Fetch Time Off Dates (Querying Timestamps)
        const timeOffPath = `users/${housekeeperId}/timeOffDates`; // Assuming new structure
        const timeOffRef = db.collection(timeOffPath);
        // Query for any timeOff range that overlaps with the requested range
        // Fetch docs where the timeOff START is before the requested range END
        // AND the timeOff END is after the requested range START.
        logger.info(`Querying timeOff using Timestamps: startOfDayUTC <= ${rangeEndTimestamp.toDate().toISOString()} and endOfDayUTC >= ${rangeStartTimestamp.toDate().toISOString()}`)
        const timeOffSnapshot = await timeOffRef
            .where("housekeeperId", "==", housekeeperId) // Requires index
            .where("startOfDayUTC", "<=", rangeEndTimestamp) 
            // Firestore doesn't allow range filters on multiple fields.
            // We need to fetch potentially more and filter locally:
            // .where("endOfDayUTC", ">=", rangeStartTimestamp) // CANNOT DO THIS
            .get();
            
        const timeOffRanges = []; 
        timeOffSnapshot.forEach(doc => {
             const timeOff = doc.data();
             // Local filtering for the end date
             if (timeOff.startOfDayUTC && timeOff.endOfDayUTC && 
                 timeOff.endOfDayUTC.toMillis() >= rangeStartTimestamp.toMillis()) {
                  timeOffRanges.push({
                       startMillis: timeOff.startOfDayUTC.toMillis(),
                       endMillis: timeOff.endOfDayUTC.toMillis()
                  });
             }
        });
        logger.info(`Fetched ${timeOffRanges.length} potentially relevant time off ranges.`, { housekeeperId });

        // 4. Calculate Availability Day by Day (Using UTC)
        const schedule = {};
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        let currentDateUTC = new Date(startDateUTC); // Start loop with UTC date

        while (currentDateUTC.getTime() <= endDateUTC.getTime()) { // Loop based on UTC day end
            // --- Date Setup ---
            const currentDayStartMillis = currentDateUTC.getTime(); // Already 00:00:00 UTC
            const year = currentDateUTC.getUTCFullYear();
            const month = (currentDateUTC.getUTCMonth() + 1).toString().padStart(2, "0");
            const day = currentDateUTC.getUTCDate().toString().padStart(2, "0");
            const currentDateStr = `${year}-${month}-${day}`;
            const dayOfWeekIndexUTC = currentDateUTC.getUTCDay(); 
            const dayKey = dayNames[dayOfWeekIndexUTC].toLowerCase(); 
            logger.info(` [${currentDateStr}] Processing UTC day.`);

            // --- Check for Time Off --- 
            let isTimeOffDay = false;
            for(const range of timeOffRanges) {
                 // Check if the start of the current day falls within any time-off range
                 if (currentDayStartMillis >= range.startMillis && currentDayStartMillis <= range.endMillis) {
                      isTimeOffDay = true;
                      break;
                 }
            }

            if (isTimeOffDay) {
                logger.info(`Day ${currentDateStr} marked as Time Off based on fetched ranges.`);
                schedule[currentDateStr] = {
                    date: currentDateStr,
                    dayName: dayNames[dayOfWeekIndexUTC],
                    status: 'not_working',
                    message: 'Marked as Time Off',
                    slots: [],
                };
                 // Move to the next day (UTC)
                currentDateUTC.setUTCDate(currentDateUTC.getUTCDate() + 1);
                continue; 
            }

            // --- Settings and Bookings for the Day ---
            const daySettings = settings.workingDays[dayKey] || { isWorking: false };
            const isWorkingBasedOnSettings = daySettings.isWorking === true;
            const housekeeperTimezone = settings.timezone || 'UTC'; // Get timezone from settings
            // Get bookings using the UTC date string key
            const todaysBookingsMillis = (bookingsByDateStr[currentDateStr] || []).map(b => ({ 
                startMillis: b.startMillis, 
                endMillis: b.endMillis,
                status: b.status,
                type: 'booking',
                bookingId: b.id,
                clientName: b.clientName
            }));

            logger.info(`Processing ${currentDateStr} (${dayKey}): Settings Working=${isWorkingBasedOnSettings}, Bookings=${todaysBookingsMillis.length}`);

            // --- Generate Potential Slots (Jobs & Breaks) in UTC Milliseconds ---
            let potentialSlotsMillis = [];
            if (isWorkingBasedOnSettings) {
                const startTimeSetting = daySettings.startTime || "09:00"; // e.g., "09:00 AM" or "09:00"
                
                // --- UPDATED: Calculate correct UTC start time using parse + toDate --- 
                let startMillisUTC = null;
                try {
                    // 1. Parse HH:mm AM/PM into 24-hour format
                    const timeMatch = startTimeSetting.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
                    if (!timeMatch) throw new Error(`Invalid startTime format: ${startTimeSetting}`);
                    let hours = parseInt(timeMatch[1], 10);
                    const minutes = parseInt(timeMatch[2], 10);
                    const period = timeMatch[3] ? timeMatch[3].toUpperCase() : null;
                    if (period === 'PM' && hours < 12) hours += 12;
                    if (period === 'AM' && hours === 12) hours = 0;
                    if (isNaN(hours) || hours < 0 || hours > 23 || isNaN(minutes) || minutes < 0 || minutes > 59) {
                         throw new Error(`Invalid parsed time components: H${hours} M${minutes}`);
                    }

                    // 2. Construct local date/time string in the specified format
                    const localDateTimeStr = `${currentDateStr} ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
                    
                    // 3. Convert the string to a Date object representing the correct UTC instant using toDate
                    // Pass the local time string directly, with the timezone option.
                    const startDateInZone = dateFnsTz.toDate(localDateTimeStr, { timeZone: housekeeperTimezone });
                    if (isNaN(startDateInZone.getTime())) {
                        // Throw error if toDate resulted in an invalid date
                        throw new Error(`date-fns-tz toDate failed for: ${localDateTimeStr} in ${housekeeperTimezone}`);
                        image.png}

                    // 4. Get the UTC milliseconds
                    startMillisUTC = startDateInZone.getTime();
                    logger.debug(`[${currentDateStr}] Calculated start time (using toDate): LocalStr=${localDateTimeStr}, TargetZone=${housekeeperTimezone}, Final UTC Millis=${startMillisUTC}, ZonedDateObj=${startDateInZone.toISOString()}`);

                } catch (tzError) {
                     logger.error(`[${currentDateStr}] Error calculating zoned start time (using toDate):`, { date: currentDateStr, time: startTimeSetting, timezone: housekeeperTimezone, error: tzError.message, stack: tzError.stack });
                     startMillisUTC = null; 
                }
                // --- END UPDATED --- 

                // Proceed only if we have a valid starting millisecond timestamp
                if (startMillisUTC !== null) {
                    // Calculate start time in UTC millis for the current day
                    let currentMillis = startMillisUTC; // Use the correctly calculated UTC start time
                    
                    // --- RESTORED Job/Break durations logic --- 
                    const jobDurationsInput = daySettings.jobDurations;
                    let jobDurations = [];
                    // Check if it's a valid array of positive numbers
                    if (Array.isArray(jobDurationsInput) && jobDurationsInput.length > 0 && jobDurationsInput.every(d => typeof d === "number" && d > 0)) {
                        jobDurations = jobDurationsInput;
                    } else {
                        // Fallback logic if jobDurations is missing or invalid
                        const jobsPerDayFallback = (typeof daySettings.jobsPerDay === "number" && daySettings.jobsPerDay > 0) ? daySettings.jobsPerDay : 1;
                        jobDurations = Array(jobsPerDayFallback).fill(DEFAULT_JOB_DURATION);
                        if (jobsPerDayFallback === 0) jobDurations = []; // Handle case of explicitly 0 jobs
                        logger.warn(`[${currentDateStr}] Using fallback job durations`, { count: jobsPerDayFallback, duration: DEFAULT_JOB_DURATION });
                    }

                    // Ensure breakDurations is an array of valid numbers, defaulting invalid ones to 0
                    const breakDurationsInput = daySettings.breakDurations;
                    let breakDurations = [];
                    if (Array.isArray(breakDurationsInput)) {
                        breakDurations = breakDurationsInput.map(d => typeof d === 'number' && d > 0 ? d : 0);
                    }
                    // --- END RESTORED Logic --- 

                    for (let jobIndex = 0; jobIndex < jobDurations.length; jobIndex++) {
                        const jobDurationMillis = jobDurations[jobIndex] * 60 * 1000;
                        const jobStartMillis = currentMillis;
                        const jobEndMillis = jobStartMillis + jobDurationMillis;
                        potentialSlotsMillis.push({ startMillis: jobStartMillis, endMillis: jobEndMillis, type: 'job' });
                        currentMillis = jobEndMillis;

                        if (jobIndex < jobDurations.length - 1) {
                            const breakDuration = breakDurations.length > jobIndex ? breakDurations[jobIndex] : 0;
                            if (breakDuration > 0) {
                                const breakDurationMillis = breakDuration * 60 * 1000;
                                const breakStartMillis = currentMillis;
                                const breakEndMillis = breakStartMillis + breakDurationMillis;
                                potentialSlotsMillis.push({ startMillis: breakStartMillis, endMillis: breakEndMillis, type: 'break' });
                                currentMillis = breakEndMillis;
                            }
                        }
                    }
                    logger.info(`Generated ${potentialSlotsMillis.length} potential slots (UTC millis) for ${currentDateStr}`);
                } else {
                    logger.warn(`Invalid start time in settings for ${currentDateStr}, cannot generate potential slots.`);
                }
            }

            // --- Combine Bookings and Potential Slots (Using UTC Millis) ---
            const finalSlotsMillis = [...todaysBookingsMillis]; // Start with actual bookings

            // Add potential slots if they DON'T overlap with existing bookings
            potentialSlotsMillis.forEach(potentialSlot => {
                let overlapsWithBooking = false;
                for (const bookedSlot of finalSlotsMillis) { // Check against all slots added so far of type booking
                    if (bookedSlot.type === 'booking' &&
                        Math.max(potentialSlot.startMillis, bookedSlot.startMillis) < Math.min(potentialSlot.endMillis, bookedSlot.endMillis))
                    {
                        overlapsWithBooking = true;
                        // Add debug logging here if needed
                        break;
                    }
                }

                if (!overlapsWithBooking) {
                    // Add the non-overlapping potential slot
                    finalSlotsMillis.push({
                        ...potentialSlot, 
                        status: potentialSlot.type === 'break' ? 'unavailable' : 'available',
                        bookingId: null,
                        clientName: null
                    });
                } else {
                    // Add debug logging here if needed
                }
            });

            // --- Sort by Start Time (Millis) ---
            finalSlotsMillis.sort((a, b) => a.startMillis - b.startMillis);

            // --- Determine overall status and Format Final Output ---
            let overallStatus = 'not_working'; // Default
            let statusMessage = 'Not scheduled to work';
            let availableSlotsFormatted = [];

            const hasAnyAvailableSlot = finalSlotsMillis.some(slot => slot.status === 'available');
            const isWorkingAnySlot = finalSlotsMillis.length > 0;

            // Determine overall status
            if (isTimeOffDay) { // Check Time Off first (redundant check, but safe)
                overallStatus = 'not_working';
                statusMessage = 'Marked as Time Off';
            } else if (!isWorkingBasedOnSettings && !isWorkingAnySlot) { // Not working based on settings AND no slots generated
                overallStatus = 'not_working';
                statusMessage = 'Not scheduled to work';
            } else if (isWorkingAnySlot && !hasAnyAvailableSlot) { // Slots exist, but none are available
                overallStatus = 'fully_booked';
                statusMessage = 'Fully Booked';
            } else if (hasAnyAvailableSlot) { // At least one slot is available
                overallStatus = 'available';
                statusMessage = ''; // No message needed when available
                // Filter for only available slots and format for frontend
                availableSlotsFormatted = finalSlotsMillis
                    .filter(slot => slot.status === 'available')
                    .map(slot => {
                        // Calculate duration (assuming job type)
                        const durationMillis = slot.endMillis - slot.startMillis;
                        return {
                            startTimestampMillis: slot.startMillis,
                            endTimestampMillis: slot.endMillis,
                            durationMinutes: Math.round(durationMillis / (60 * 1000)),
                            status: slot.status, // Include the status ('available', 'booked', 'pending', 'unavailable', 'break')
                            type: slot.type, // Include type ('job', 'break', 'booking')
                            bookingId: slot.bookingId || null, // Include booking ID if applicable
                            clientName: slot.clientName || null, // Include clientName if available
                        };
                    });
            } else {
                // Fallback case: If settings say working, but no slots generated (e.g., invalid start time)
                overallStatus = 'not_working';
                statusMessage = 'Configuration issue or no slots defined';
                logger.warn(`Day ${currentDateStr} considered not_working due to fallback (settings working=${isWorkingBasedOnSettings}, slots=${finalSlotsMillis.length})`);
            }

            // Format ALL final slots for the response, returning UTC Milliseconds
            const allSlotsFormatted = finalSlotsMillis.map(slot => {
                const durationMillis = slot.endMillis - slot.startMillis;
                return {
                    // RETURN TIMESTAMPS as Milliseconds (or ISO Strings)
                    startTimestampMillis: slot.startMillis, 
                    endTimestampMillis: slot.endMillis,
                    durationMinutes: Math.round(durationMillis / (60 * 1000)), // Keep calculated duration
                    status: slot.status, 
                    type: slot.type,
                    bookingId: slot.bookingId || null,
                    clientName: slot.clientName || null
                };
            });

            schedule[currentDateStr] = {
                date: currentDateStr,
                dayName: dayNames[dayOfWeekIndexUTC],
                status: overallStatus,
                message: statusMessage, // Generate based on overallStatus
                slots: allSlotsFormatted // Return the array with UTC millis
            };
            
            // Move to the next day (UTC)
            currentDateUTC.setUTCDate(currentDateUTC.getUTCDate() + 1);
        } // End daily loop

        logger.info("Finished calculating schedule successfully (UTC Refactor).");
        return { schedule };

    } catch (error) {
        logger.error("Error occurred while calculating availability:", {
            housekeeperId,
            startDateString,
            endDateString,
            error: error.message,
            stack: error.stack,
        });
        // Ensure the HttpsError includes details potentially useful on client
        throw new HttpsError(
            "internal",
            error.message || "An error occurred while calculating availability. Please try again later.", // Pass original message
            { originalErrorMessage: error.message } // Keep details separate if needed
        );
    }
});

// --- requestBooking (Refactored for UTC Timestamps) ---
exports.requestBooking = onCall(async (request) => {
    logger.info("requestBooking (UTC Refactor) called", { authUid: request.auth ? request.auth.uid : "none", data: request.data });

    // 1. Authentication and Authorization
    if (!request.auth) {
        logger.warn("Booking request rejected: User not authenticated.");
        throw new HttpsError("unauthenticated", "You must be logged in to book an appointment.");
    }
    const homeownerId = request.auth.uid;

    // 2. Input Validation (Keep dateTimeString as ISO UTC input for now)
    const { housekeeperId, dateTimeString, duration } = request.data;
    if (!housekeeperId || typeof housekeeperId !== 'string' ||
        !dateTimeString || typeof dateTimeString !== 'string' ||
        !duration || typeof duration !== 'number' || !Number.isInteger(duration) || duration <= 0) {
        logger.error("Booking request rejected: Missing or invalid required data fields.", request.data);
        throw new HttpsError("invalid-argument", "Required data missing or invalid (housekeeperId, dateTimeString, duration).");
    }
    
    let startTimestamp, endTimestamp;
    let startTimeMillis = null; // Declare outside try block
    let endTimeMillis = null;   // Declare outside try block
    try {
        const startDate = new Date(dateTimeString); // Parse ISO UTC string
        if (isNaN(startDate.getTime())) throw new Error("Invalid date conversion from dateTimeString.");
        
        startTimeMillis = startDate.getTime(); // Assign value inside
        endTimeMillis = startTimeMillis + (duration * 60 * 1000); // Assign value inside

        startTimestamp = admin.firestore.Timestamp.fromMillis(startTimeMillis);
        endTimestamp = admin.firestore.Timestamp.fromMillis(endTimeMillis);
        
        logger.info(`Parsed booking request: Start=${startTimestamp.toDate().toISOString()}, End=${endTimestamp.toDate().toISOString()}, Duration=${duration}`);

    } catch (e) {
        logger.error("Booking request rejected: Invalid dateTimeString format or calculation error.", { dateTimeString, duration, error: e.message });
        throw new HttpsError("invalid-argument", "Invalid date/time format or duration. Please provide an ISO 8601 UTC string.");
    }
    
    // Add a check here to ensure millis were calculated successfully
    if (startTimeMillis === null || endTimeMillis === null) {
        logger.error("Millisecond timestamps were not calculated due to parsing error.");
        // This state shouldn't be reached if the catch block above throws correctly, but adding belt-and-suspenders
        throw new HttpsError("internal", "Failed to process booking time.");
    }

    try {
        // 3. Conflict Check (Using Timestamps)
        const bookingsRef = db.collection(`users/${housekeeperId}/bookings`);
        
        // Find bookings that overlap with the requested time range
        // Overlap condition: existing.startTimestamp < new.endTimestamp AND existing.endTimestamp > new.startTimestamp
        const conflictQuery1 = bookingsRef
            .where("startTimestamp", "<", endTimestamp)
            .where("endTimestamp", ">", startTimestamp)
            // Optionally filter out cancelled status if applicable
            // .where("status", "!=", "cancelled") 
            .limit(1) // We only need to know if at least one exists
            .get();

        // Note: Firestore doesn't allow the exact OR condition needed for full overlap in one query.
        // The query above covers most overlaps. A booking starting exactly at the new end or ending exactly at the new start isn't strictly an overlap.
        // If exact edge cases are critical, more complex checks might be needed.

        const [conflictSnapshot1] = await Promise.all([conflictQuery1]); // Can add more queries here if needed

        if (!conflictSnapshot1.empty) {
            const conflictingDoc = conflictSnapshot1.docs[0];
                    logger.warn("Booking conflict detected", {
                requestedSlot: `${startTimestamp.toDate().toISOString()} - ${endTimestamp.toDate().toISOString()}`,
                existingBookingId: conflictingDoc.id,
                existingSlot: `${conflictingDoc.data().startTimestamp.toDate().toISOString()} - ${conflictingDoc.data().endTimestamp.toDate().toISOString()}`
            });
            throw new HttpsError("failed-precondition", "This time slot is no longer available. Please select another time.");
        }
        
        logger.info(`No conflicts found for slot starting ${startTimestamp.toDate().toISOString()}`);

        // 4. Prepare New Booking Document (Timestamp format)
    const newBookingData = {
            homeownerId: homeownerId,
            housekeeperId: housekeeperId, 
            startTimestamp: startTimestamp, 
            endTimestamp: endTimestamp,
            startTimestampMillis: startTimeMillis, // ADDED: Store milliseconds
            endTimestampMillis: endTimeMillis,     // ADDED: Store milliseconds
            status: "pending", // Initial status
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
            // Add other fields like clientName, address, notes if available/needed
            // These might need to be fetched based on homeownerId if not passed from client
        };

        // 5. Save Booking Document Directly
        const newBookingRef = await bookingsRef.add(newBookingData);
        logger.info("New booking document created successfully (Timestamp format).", { bookingId: newBookingRef.id });

        // 6. Return Success
        return { success: true, bookingId: newBookingRef.id };

    } catch (error) {
        if (error instanceof HttpsError) {
            // Re-throw HttpsErrors directly (like the conflict error)
            logger.error(`Booking failed (${error.code}): ${error.message}`, { data: request.data });
            throw error;
        } else {
            // Handle unexpected errors
            logger.error("Unexpected error occurred during booking request (UTC Refactor):", {
                housekeeperId,
                dateTimeString,
                duration,
                error: error.message,
                stack: error.stack,
            });
            throw new HttpsError("internal", "An unexpected error occurred while booking. Please try again.");
        }
    }
});

/**
 * Cloud Function to cancel a booking.
 * CHANGES:
 * - Switched to onRequest to manually handle CORS and Auth.
 * - Expects { bookingId: string, housekeeperId: string, reason?: string } in the POST body data.
 * - Manually verifies Firebase Auth token from Authorization header.
 */
exports.cancelBooking = functions.https.onRequest((req, res) => {
  // Wrap the main logic in the CORS middleware
  cors(req, res, async () => {

    // --- 0. Handle potential OPTIONS request (handled by CORS middleware) ---
    // The cors middleware automatically handles OPTIONS requests. 
    // If it's not an OPTIONS request, it proceeds here.
    
    // Log request details for debugging
    logger.info('cancelBooking (onRequest) received:', { 
        method: req.method, 
        headers: req.headers, 
        body: req.body 
    });

    // --- 1. Authentication Check (Manual) ---
    let decodedToken;
    const idToken = req.headers.authorization?.split('Bearer ')[1];

    if (!idToken) {
        logger.warn("cancelBooking rejected: No authorization token provided.");
        return res.status(401).send({ error: { message: "Unauthorized: No token provided.", status: "UNAUTHENTICATED" } });
    }

    try {
        decodedToken = await admin.auth().verifyIdToken(idToken);
        logger.info("Token verified successfully for UID:", decodedToken.uid);
    } catch (error) {
        logger.error("cancelBooking rejected: Invalid or expired token.", { error: error.message });
        return res.status(401).send({ error: { message: "Unauthorized: Invalid token.", status: "UNAUTHENTICATED" } });
    }

    const userId = decodedToken.uid; // Homeowner's UID from verified token

    // --- 2. Input Validation (from req.body.data) ---
    // onCall wraps data in a 'data' field, onRequest typically uses req.body directly or req.body.data if client sends it that way.
    // Assuming the Firebase Functions client SDK still wraps it in req.body.data
    const { bookingId, housekeeperId, reason } = req.body.data || {}; 

  if (!bookingId) {
      logger.warn('cancelBooking rejected: Missing bookingId in request body data.');
      return res.status(400).send({ error: { message: "Invalid argument: Missing 'bookingId'.", status: "INVALID_ARGUMENT" } });
    }
    if (!housekeeperId) {
      logger.warn('cancelBooking rejected: Missing housekeeperId in request body data.');
      return res.status(400).send({ error: { message: "Invalid argument: Missing 'housekeeperId'.", status: "INVALID_ARGUMENT" } });
    }

    // --- 3. Firestore Logic (largely unchanged) ---
    const bookingPath = `users/${housekeeperId}/bookings/${bookingId}`;
    const bookingRef = admin.firestore().doc(bookingPath);

  try {
    const bookingDoc = await bookingRef.get();

      // 3a. Booking Existence Check
    if (!bookingDoc.exists) {
        logger.warn(`Booking not found at path: ${bookingPath}`);
        return res.status(404).send({ error: { message: `Booking not found.`, status: "NOT_FOUND" } });
    }

    const bookingData = bookingDoc.data();

      // 3b. Authorization Check (Homeowner ID must match caller)
    if (bookingData.homeownerId !== userId) {
          logger.error("Permission denied to cancel booking.", {
              callerUid: userId,
              bookingHomeownerId: bookingData.homeownerId,
              bookingId: bookingId,
              housekeeperId: housekeeperId,
          });
          return res.status(403).send({ error: { message: "Permission denied: You cannot cancel this booking.", status: "PERMISSION_DENIED" } });
      }

      // 3c. Status Check (Allow cancelling pending or confirmed)
      if (bookingData.status !== "pending" && bookingData.status !== "confirmed") {
          logger.warn(`Attempt to cancel booking with invalid status: ${bookingData.status}`, { bookingId, housekeeperId });
          return res.status(400).send({ error: { message: `Booking cannot be cancelled from its current status (${bookingData.status}).`, status: "FAILED_PRECONDITION" } });
      }

      // 3d. Delete the Booking Document
      await bookingRef.delete();

      logger.info(`Booking ${bookingId} deleted by homeowner ${userId} from housekeeper ${housekeeperId}.`);
      
      // --- 4. Send Success Response ---
      // onCall functions expect { data: ... }, so we mimic that structure for the client
      return res.status(200).send({ data: { success: true, message: "Booking cancelled and removed successfully." } });

  } catch (error) {
      logger.error("Internal error cancelling/deleting booking:", {
          bookingId: bookingId,
          housekeeperId: housekeeperId,
          userId: userId,
          errorMessage: error.message,
          errorStack: error.stack
      });
      // Send generic internal error response
      return res.status(500).send({ error: { message: "An internal server error occurred.", status: "INTERNAL" } });
    }
  }); // End CORS wrapper
});

/**
 * Cloud Function: syncHomeownerProfileToClient (v2 Syntax)
 * Triggered when a homeowner_profile document is updated.
 * Copies relevant field changes (name, address, phone, instructions) to the corresponding
 * client document under the linked housekeeper, if one exists.
 */
exports.syncHomeownerProfileToClient = onDocumentUpdated('homeowner_profiles/{homeownerUid}', async (event) => {
    const homeownerUid = event.params.homeownerUid;
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();

    // Ensure data exists (important for safety)
    if (!beforeData || !afterData) {
        logger.warn(`Missing before or after data for homeowner profile update: ${homeownerUid}. Cannot sync.`);
        return null;
    }

    logger.info(`Homeowner profile updated for ${homeownerUid}. Checking for sync to client record (v2).`);

    // Check if housekeeper is linked in the updated data
    const linkedHousekeeperId = afterData?.linkedHousekeeperId;
    if (!linkedHousekeeperId) {
        logger.info(`Homeowner ${homeownerUid} is not linked to a housekeeper. No client record to sync.`);
        return null;
    }

    // Fields to potentially synchronize
    const fieldsToSync = [
        'firstName',
        'lastName',
        'address',
        'phone',
        'HomeownerInstructions'
    ];

    const updateData = {};
    let changed = false;

    fieldsToSync.forEach(field => {
        // Check if field exists in the new data and has changed from the old data
        // Use optional chaining on beforeData for safety
        if (afterData.hasOwnProperty(field) && beforeData?.[field] !== afterData[field]) {
            updateData[field] = afterData[field];
            changed = true;
            logger.info(`Detected change in field '${field}' for homeowner ${homeownerUid}.`);
        }
    });

    if (!changed) {
        logger.info(`No relevant fields changed for homeowner ${homeownerUid}. Sync not needed.`);
        return null;
    }

    updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    const clientDocPath = `users/${linkedHousekeeperId}/clients/${homeownerUid}`;
    const clientDocRef = db.doc(clientDocPath);

    try {
        logger.info(`Attempting to sync profile changes for ${homeownerUid} to client record at ${clientDocPath}`, { updateData });
        await clientDocRef.update(updateData);
        logger.info(`Successfully synced profile changes for homeowner ${homeownerUid} to client record.`);
        return null;
    } catch (error) {
        logger.error(`Error syncing homeowner profile ${homeownerUid} to client record ${clientDocPath}:`, error);
        return null;
    }
});

// --- NEW: Archive Client and Block Homeowner --- 
exports.archiveClientAndBlockHomeowner = onCall(async (request) => {
    logger.info("[archiveClient] Function called", { auth: request.auth, data: request.data });
     
    // 1. Authentication Check
     if (!request.auth) {
        logger.error("[archiveClient] Authentication required.");
        throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
    const housekeeperId = request.auth.uid;

    // 2. Input Validation
    const { homeownerIdToBlock } = request.data;
    if (!homeownerIdToBlock || typeof homeownerIdToBlock !== "string") {
        logger.error("[archiveClient] Invalid input: homeownerIdToBlock missing or invalid.", { input: homeownerIdToBlock });
        throw new HttpsError("invalid-argument", "Required data missing or invalid (homeownerIdToBlock).");
    }
    logger.info(`[archiveClient] Attempting to archive/block client ${homeownerIdToBlock} for housekeeper ${housekeeperId}`);

    // 3. Server-Side Check for Future Bookings
    try {
        const bookingsRef = db.collection('users').doc(housekeeperId).collection('bookings');
        const nowTimestamp = admin.firestore.Timestamp.now();

        logger.info(`[archiveClient] Checking future bookings for client ${homeownerIdToBlock} after ${nowTimestamp.toDate().toISOString()}`);
        const futureBookingsSnapshot = await bookingsRef
            .where('clientId', '==', homeownerIdToBlock) // Assuming clientId IS homeownerId
            .where('status', 'in', ['pending', 'confirmed'])
            .where('startTimestamp', '>', nowTimestamp)
            .limit(1)
            .get();

        if (!futureBookingsSnapshot.empty) {
            logger.warn(`[archiveClient] Found future bookings for client ${homeownerIdToBlock}. Archiving cancelled.`);
            throw new HttpsError("failed-precondition", "Client has upcoming bookings. Please cancel or complete them before archiving.");
        }
        logger.info(`[archiveClient] No future bookings found for client ${homeownerIdToBlock}. Proceeding with archive/block.`);

    } catch (error) {
        // Re-throw HttpsError, otherwise log and throw internal error
        if (error instanceof HttpsError) {
      throw error;
    }
        logger.error("[archiveClient] Error checking future bookings:", error);
        throw new HttpsError("internal", "Failed to check future bookings. Please try again.", { originalError: error.message });
    }

    // 4. Firestore Transaction to Archive Client and Update Blocklist
    const clientRef = db.collection('users').doc(housekeeperId).collection('clients').doc(homeownerIdToBlock);
    const housekeeperProfileRef = db.collection('users').doc(housekeeperId); // Assuming profile is the main user doc

    try {
        await db.runTransaction(async (transaction) => {
            // Read housekeeper profile first (optional, but good practice if needing conditional logic based on profile)
            // const housekeeperDoc = await transaction.get(housekeeperProfileRef);
            // if (!housekeeperDoc.exists) {
            //     throw new Error("Housekeeper profile not found.");
            // }
            
            // Update Client: Set isActive to false and add archived timestamp
            transaction.update(clientRef, {
        isActive: false,
                archivedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            logger.info(`[archiveClient] Transaction: Marked client ${homeownerIdToBlock} as inactive.`);

            // Update Housekeeper Profile: Add homeownerId to blockedHomeowners array
            transaction.update(housekeeperProfileRef, {
                blockedHomeowners: admin.firestore.FieldValue.arrayUnion(homeownerIdToBlock)
            });
            logger.info(`[archiveClient] Transaction: Added ${homeownerIdToBlock} to housekeeper ${housekeeperId}'s blocklist.`);
        });

        logger.info(`[archiveClient] Successfully archived client ${homeownerIdToBlock} and updated blocklist for housekeeper ${housekeeperId}.`);
        return { success: true, message: "Client archived and blocked successfully." };

    } catch (error) {
        logger.error("[archiveClient] Transaction failed:", error);
        // Check if clientRef simply didn't exist - this shouldn't happen if called from UI
        if (error.message?.includes("No document to update")) {
             logger.error(`[archiveClient] Client document ${homeownerIdToBlock} likely doesn't exist under housekeeper ${housekeeperId}.`);
             throw new HttpsError("not-found", "The specified client document could not be found.");
        }
        throw new HttpsError("internal", "Failed to archive client or update blocklist. Please try again.", { originalError: error.message });
    }
});

// --- NEW: Unarchive Client and Unblock Homeowner --- 
exports.unarchiveClientAndUnblockHomeowner = onCall(async (request) => {
    logger.info("[unarchiveClient] Function called", { auth: request.auth, data: request.data });
     
    // 1. Authentication Check
     if (!request.auth) {
        logger.error("[unarchiveClient] Authentication required.");
        throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
    const housekeeperId = request.auth.uid;

    // 2. Input Validation
    const { homeownerIdToUnblock } = request.data;
    if (!homeownerIdToUnblock || typeof homeownerIdToUnblock !== "string") {
        logger.error("[unarchiveClient] Invalid input: homeownerIdToUnblock missing or invalid.", { input: homeownerIdToUnblock });
        throw new HttpsError("invalid-argument", "Required data missing or invalid (homeownerIdToUnblock).");
    }
    logger.info(`[unarchiveClient] Attempting to unarchive/unblock client ${homeownerIdToUnblock} for housekeeper ${housekeeperId}`);

    // 3. Firestore Transaction to Unarchive Client and Update Blocklist
    const clientRef = db.collection('users').doc(housekeeperId).collection('clients').doc(homeownerIdToUnblock);
    const housekeeperProfileRef = db.collection('users').doc(housekeeperId);

    try {
        await db.runTransaction(async (transaction) => {
            // Update Client: Set isActive to true and remove archived timestamp (optional)
            transaction.update(clientRef, {
        isActive: true,
                archivedAt: admin.firestore.FieldValue.delete() // Remove the archived timestamp if it exists
            });
            logger.info(`[unarchiveClient] Transaction: Marked client ${homeownerIdToUnblock} as active.`);

            // Update Housekeeper Profile: Remove homeownerId from blockedHomeowners array
            transaction.update(housekeeperProfileRef, {
                blockedHomeowners: admin.firestore.FieldValue.arrayRemove(homeownerIdToUnblock)
            });
            logger.info(`[unarchiveClient] Transaction: Removed ${homeownerIdToUnblock} from housekeeper ${housekeeperId}'s blocklist.`);
        });

        logger.info(`[unarchiveClient] Successfully unarchived client ${homeownerIdToUnblock} and updated blocklist for housekeeper ${housekeeperId}.`);
        return { success: true, message: "Client unarchived successfully." };

    } catch (error) {
        logger.error("[unarchiveClient] Transaction failed:", error);
        if (error.message?.includes("No document to update")) {
             logger.error(`[unarchiveClient] Client document ${homeownerIdToUnblock} likely doesn't exist under housekeeper ${housekeeperId}.`);
             throw new HttpsError("not-found", "The specified client document could not be found.");
        }
        throw new HttpsError("internal", "Failed to unarchive client or update blocklist. Please try again.", { originalError: error.message });
    }
});
// --- END NEW --- 

// ========= NEW STRIPE CALLABLE FUNCTIONS =========

// --- Callable Function: createBillingPortalSession (V2) ---
exports.createBillingPortalSession = onCall({ cors: true }, async (request) => {
    // 1. Check Authentication
    if (!request.auth) {
        throw new HttpsError(
            "unauthenticated",
            "The function must be called while authenticated."
        );
    }
    const housekeeperUid = request.auth.uid;
    logger.info(`(V2) Creating billing portal session for housekeeper: ${housekeeperUid}`);

    // Safety check for Stripe SDK init
    if (!stripe) {
         logger.error("Stripe SDK not initialized. Cannot create portal session.");
         throw new HttpsError("internal", "Stripe configuration error.");
    }

    try {
        // 2. Get Housekeeper's Stripe Customer ID from Firestore
        const profileRef = db.collection("housekeeper_profiles").doc(housekeeperUid);
        const profileSnap = await profileRef.get();

        if (!profileSnap.exists) {
            throw new HttpsError("not-found", `Housekeeper profile not found for UID: ${housekeeperUid}`);
        }
        const profileData = profileSnap.data();
        const stripeCustomerId = profileData.stripeCustomerId;

        if (!stripeCustomerId) {
            logger.error(`Housekeeper ${housekeeperUid} does not have a stripeCustomerId.`);
            throw new HttpsError(
                "failed-precondition",
                "Subscription not set up for this user."
            );
        }

        // 3. Define the return URL
        const returnUrl = "https://housekeeper-app-dev.web.app/housekeeper/settings/account.html"; // PRODUCTION URL

        // 4. Create Stripe Billing Portal Session
        const session = await stripe.billingPortal.sessions.create({
            customer: stripeCustomerId,
            return_url: returnUrl,
        });

        logger.info(`Successfully created billing portal session for ${stripeCustomerId}`);
        // 5. Return the Session URL
        return { url: session.url };

    } catch (error) {
        logger.error(`Error creating Stripe billing portal session for ${housekeeperUid}:`, error);
        if (error instanceof HttpsError) { // Use HttpsError from v2 import
            throw error; 
        }
        throw new HttpsError("internal", "Could not create billing session.", error.message);
    }
});


// --- Callable Function: createConnectOnboardingLink (V2) ---
exports.createConnectOnboardingLink = onCall({ cors: true }, async (request) => {
    // 1. Check Authentication
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be authenticated.");
    }
    const housekeeperUid = request.auth.uid;
    logger.info(`(V2) Creating Connect onboarding link for housekeeper: ${housekeeperUid}`);

    // Check if Stripe is initialized 
    if (!stripe) {
         logger.error("Stripe SDK not initialized. Cannot create onboarding link.");
         throw new HttpsError("internal", "Stripe configuration error.");
    }

    try {
        // 2. Get/Create Stripe Connect Account ID
        const profileRef = db.collection("housekeeper_profiles").doc(housekeeperUid);
        const profileSnap = await profileRef.get();
        if (!profileSnap.exists) {
            throw new HttpsError("not-found", `Housekeeper profile not found for UID: ${housekeeperUid}`);
        }
        const profileData = profileSnap.data() || {};
        let stripeAccountId = profileData.stripeAccountId;

        // If account doesn't exist yet, create one
        if (!stripeAccountId) {
            logger.info(`No Stripe account found for ${housekeeperUid}, creating one...`);
            const userEmail = request.auth.token.email || profileData.email; 
            if (!userEmail) {
                 logger.error(`Cannot create Stripe account for ${housekeeperUid} without an email address.`);
                 throw new HttpsError("failed-precondition", "User email is required to create Stripe account.");
            }

            const account = await stripe.accounts.create({
                type: "express",
                email: userEmail,
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true },
                },
            });
            stripeAccountId = account.id;
            await profileRef.set({ 
                stripeAccountId: stripeAccountId,
                stripeAccountStatus: 'pending',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
             }, { merge: true });
            logger.info(`Created and saved Stripe Express account ${stripeAccountId} for ${housekeeperUid}`);
        } else {
             logger.info(`Using existing Stripe account ${stripeAccountId} for ${housekeeperUid}`);
        }

        // 3. Define Refresh and Return URLs
        const refreshUrl = `https://housekeeper-app-dev.web.app/housekeeper/settings/account.html`; // PRODUCTION URL
        const returnUrl = `https://housekeeper-app-dev.web.app/housekeeper/settings/account.html`; // PRODUCTION URL

        // 4. Create Account Link (Onboarding Session)
        const accountLink = await stripe.accountLinks.create({
            account: stripeAccountId,
            refresh_url: refreshUrl,
            return_url: returnUrl,
            type: "account_onboarding",
            collect: "eventually", 
        });

        logger.info(`Successfully created onboarding link for ${stripeAccountId}`);
        // 5. Return the Onboarding URL
        return { url: accountLink.url };

    } catch (error) {
        logger.error(`Error creating Stripe Connect onboarding link for ${housekeeperUid}:`, error);
         if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError("internal", "Could not create onboarding link.", error.message);
    }
});


// --- Callable Function: createExpressDashboardLink (V2) ---
exports.createExpressDashboardLink = onCall({ cors: true }, async (request) => {
    // 1. Check Authentication
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be authenticated.");
    }
    const housekeeperUid = request.auth.uid;
    logger.info(`(V2) Creating Express Dashboard link for housekeeper: ${housekeeperUid}`);

    // Check if Stripe is initialized
    if (!stripe) {
         logger.error("Stripe SDK not initialized. Cannot create dashboard link.");
         throw new HttpsError("internal", "Stripe configuration error.");
    }

    try {
        // 2. Get Housekeeper's Stripe Account ID
        const profileRef = db.collection("housekeeper_profiles").doc(housekeeperUid);
        const profileSnap = await profileRef.get();

        if (!profileSnap.exists) {
            throw new HttpsError("not-found", `Housekeeper profile not found for UID: ${housekeeperUid}`);
        }
        const profileData = profileSnap.data();
        const stripeAccountId = profileData.stripeAccountId;
        // const stripeAccountStatus = profileData.stripeAccountStatus; // Keep if needed for checks

        if (!stripeAccountId) {
             logger.error(`Housekeeper ${housekeeperUid} does not have a stripeAccountId.`);
            throw new HttpsError(
                "failed-precondition",
                "Payouts not set up for this user."
            );
        }

        // Optional Check: Ensure account is enabled
        // if (stripeAccountStatus !== 'enabled') { ... }

        // 3. Create Login Link for Express Dashboard
        const loginLink = await stripe.accounts.createLoginLink(stripeAccountId, {
             redirect_url: 'https://housekeeper-app-dev.web.app/housekeeper/settings/account.html' // PRODUCTION URL
        });

        logger.info(`Successfully created Express dashboard link for ${stripeAccountId}`);
        // 4. Return the Dashboard URL
        return { url: loginLink.url };

    } catch (error) {
        logger.error(`Error creating Stripe Express dashboard link for ${housekeeperUid}:`, error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError("internal", "Could not create dashboard link.", error.message);
    }
});

// --- Callable Function: createSubscriptionCheckoutSession (V2) ---
exports.createSubscriptionCheckoutSession = onCall({ cors: true }, async (request) => {
    // Wrap the main logic in the cors handler (KEEP CORS WRAPPER if using onCall v1 style with cors:true)
    // For pure v2 onCall, CORS is handled differently (usually via Cloud Run settings or manually if needed)
    // Assuming the Promise/cors wrapper is still needed from previous structure:
    return new Promise((resolve, reject) => {
        cors(request.rawRequest, request.rawRequest.res, async (err) => { // Use request.rawRequest if available
            if (err) {
                logger.error("CORS error:", err);
                return reject(new HttpsError("internal", "CORS error", err));
            }

            // --- REMOVED LAZY INITIALIZATION OF STRIPE ---
            // Check if global initialization failed
            if (!stripe) {
                logger.error("createSubscriptionCheckoutSession: Stripe SDK was not initialized globally. Aborting.");
                return reject(new HttpsError("internal", "Server configuration error regarding Stripe."));
            }
            // --- END REMOVED --- 

            // 1. Check Authentication (Now inside cors handler)
    if (!request.auth) {
                return reject(new HttpsError(
                    "unauthenticated", 
                    "User must be authenticated."
                ));
    }
    const housekeeperUid = request.auth.uid;
    const priceId = request.data.priceId; // Get priceId from request.data

    if (!priceId) {
                 return reject(new HttpsError("invalid-argument", "The function must be called with a 'priceId'."));
    }
    logger.info(`(V2) Creating subscription checkout session for housekeeper: ${housekeeperUid}, priceId: ${priceId}`);

    try {
        // 2. Get/Create Stripe Customer ID
        const profileRef = db.collection("housekeeper_profiles").doc(housekeeperUid);
        const profileSnap = await profileRef.get();

        if (!profileSnap.exists) {
            throw new HttpsError("not-found", `Housekeeper profile not found for UID: ${housekeeperUid}`);
        }
        const profileData = profileSnap.data() || {};
        let stripeCustomerId = profileData.stripeCustomerId;

        // If customer ID doesn't exist, create a new Stripe Customer
        if (!stripeCustomerId) {
            logger.info(`No Stripe Customer ID found for ${housekeeperUid}, creating one...`);
            const userEmail = request.auth.token.email || profileData.email;
            const userName = `${profileData.firstName || ''} ${profileData.lastName || ''}`.trim();
            if (!userEmail) {
                 logger.error(`Cannot create Stripe customer for ${housekeeperUid} without an email address.`);
                 throw new HttpsError("failed-precondition", "User email is required to create Stripe customer.");
            }

            const customer = await stripe.customers.create({
                email: userEmail,
                name: userName || undefined,
                metadata: {
                    firebaseUID: housekeeperUid,
                },
            });
            stripeCustomerId = customer.id;
            logger.info(`Created Stripe Customer ${stripeCustomerId} for ${housekeeperUid}`);

            // Save the new customer ID back to the profile
            await profileRef.set({ 
                stripeCustomerId: stripeCustomerId,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
             }, { merge: true });
            logger.info(`Saved Stripe Customer ID ${stripeCustomerId} to profile ${housekeeperUid}`);
        } else {
             logger.info(`Using existing Stripe Customer ID ${stripeCustomerId} for ${housekeeperUid}`);
        }

        // 3. Define Success and Cancel URLs (Using deployed app URL)
        const successUrl = `https://housekeeper-app-dev.web.app/housekeeper/settings/account.html?subscription_success=true`;
        const cancelUrl = `https://housekeeper-app-dev.web.app/housekeeper/settings/account.html?subscription_cancelled=true`;

        // 4. Create Stripe Checkout Session for Subscription
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'subscription',
            customer: stripeCustomerId,
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            success_url: successUrl,
            cancel_url: cancelUrl,
        });

        logger.info(`Successfully created Checkout Session ${session.id} for ${stripeCustomerId}`);
        // 5. Return the Session ID
                resolve({ sessionId: session.id }); // Resolve the promise on success

    } catch (error) {
        logger.error(`Error creating Stripe Checkout session for ${housekeeperUid}:`, error);
         if (error instanceof HttpsError) {
                     reject(error); // Reject with HttpsError if it's already one
                } else {
                    reject(new HttpsError("internal", "Could not create checkout session.", error.message)); // Reject with a new HttpsError
        }
    }
        }); // End cors handler
    }); // End Promise wrapper
});

// ========= END NEW STRIPE CALLABLE FUNCTIONS =========

// --- Potentially Needed: Stripe Webhook Handler (Skeleton) ---
// You will likely need a separate HTTP function (v1 functions.https.onRequest)
// to handle webhooks from Stripe and ensure Firestore data stays in sync.
// This requires signature verification using a webhook secret.

// Uncomment the function definition
/* REMOVE THIS LINE
const STRIPE_WEBHOOK_SECRET = functions.config().stripe.webhook_secret; // Configure this!
*/ // REMOVE THIS LINE

// Use v1 onRequest for webhooks as they don't typically use callable context/auth
exports.stripeWebhookHandler = functions.https.onRequest(async (req, res) => {
    // Read the secret from environment variables (needs to be set via Secret Manager)
    const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    // Basic logging and secret check
    logger.info("Stripe Webhook Handler received request.");
    if (!stripeWebhookSecret) {
        logger.error("FATAL: Stripe webhook secret (STRIPE_WEBHOOK_SECRET) is not configured in environment.");
        return res.status(500).send("Webhook configuration error.");
    }
    logger.info("Stripe webhook secret found in environment.");

    // --- Signature Verification ---
    const stripeSignature = req.headers['stripe-signature'];
    let event;

    try {
        // IMPORTANT: Stripe requires the raw request body for verification.
        // Firebase Functions v1 automatically parses JSON, but stores the raw body
        // in req.rawBody. Use this for verification.
        event = stripe.webhooks.constructEvent(req.rawBody, stripeSignature, stripeWebhookSecret);
        logger.info(`Webhook signature verified. Event ID: ${event.id}, Type: ${event.type}`);
    } catch (err) {
        logger.error('Webhook signature verification failed.', { error: err.message });
        // Return a 400 error if signature verification fails
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    // --- End Signature Verification ---

    // --- Handle the specific event type ---
    const dataObject = event.data.object; // The Stripe object related to the event

    try {
        switch (event.type) {
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted':
                const subscription = dataObject;
                const customerId = subscription.customer;
                const status = subscription.status;
                const subscriptionItem = subscription.items.data[0]; // Get the first item
                const priceId = subscriptionItem?.price.id;
                const priceNickname = subscriptionItem?.price.nickname; // <<< GET NICKNAME
                
                // Convert period end from seconds to Firestore Timestamp
                const currentPeriodEnd = subscription.current_period_end 
                    ? admin.firestore.Timestamp.fromMillis(subscription.current_period_end * 1000) 
                    : null;
                
                logger.info(`Processing subscription event: ${event.type} for customer ${customerId}, Status: ${status}, Nickname: ${priceNickname}`);
                
                // Find user profile by stripeCustomerId
                const userQuery = await db.collection('housekeeper_profiles')
                                          .where('stripeCustomerId', '==', customerId)
                                          .limit(1)
                                          .get();
                
                if (!userQuery.empty) {
                    const userDoc = userQuery.docs[0];
                    logger.info(`Found user profile ${userDoc.id}. Updating subscription status...`);
                    
                    // Prepare update data
                    const updateData = {
                        stripeSubscriptionStatus: status,
                        stripeSubscriptionId: subscription.id,
                        stripePriceId: priceId || admin.firestore.FieldValue.delete(),
                        stripePlanName: priceNickname || admin.firestore.FieldValue.delete(), // <<< ADD NICKNAME
                        stripeCurrentPeriodEnd: currentPeriodEnd || admin.firestore.FieldValue.delete(),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    };

                    // Update Firestore document
                    await userDoc.ref.update(updateData);
                    logger.info(`Successfully updated subscription status for user ${userDoc.id}.`);
                } else {
                    logger.warn(`Webhook received for unknown Stripe customer ID: ${customerId}. No profile found to update.`);
                }
                break;

            case 'account.updated': // Handle Stripe Connect account status changes
                const account = dataObject;
                const accountId = account.id;
                const chargesEnabled = account.charges_enabled;
                const payoutsEnabled = account.payouts_enabled;
                const detailsSubmitted = account.details_submitted;
                
                // Determine a simplified status based on capabilities
                let accountStatus = 'pending'; // Default
                if (detailsSubmitted && chargesEnabled && payoutsEnabled) {
                    accountStatus = 'enabled'; // Fully active
                } else if (detailsSubmitted) {
                    accountStatus = 'restricted'; // Submitted, but something isn't active
                } else {
                    accountStatus = 'pending'; // Not fully submitted
                }
                
                logger.info(`Processing account.updated event for account ${accountId}, Determined Status: ${accountStatus}`);

                // Find user profile by stripeAccountId
                const accountUserQuery = await db.collection('housekeeper_profiles')
                                                 .where('stripeAccountId', '==', accountId)
                                                 .limit(1)
                                                 .get();
                
                if (!accountUserQuery.empty) {
                    const userDoc = accountUserQuery.docs[0];
                    logger.info(`Found user profile ${userDoc.id}. Updating Stripe Connect account status...`);
                    await userDoc.ref.update({
                        stripeAccountStatus: accountStatus,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                     logger.info(`Successfully updated Stripe Connect status for user ${userDoc.id}.`);
                } else {
                     logger.warn(`Webhook received for unknown Stripe Account ID: ${accountId}. No profile found to update.`);
                }
                break;

            // TODO: Add cases for other events like 'invoice.payment_failed'
            case 'invoice.payment_failed':
                 logger.warn(`Unhandled event type (invoice.payment_failed): ${event.type}. Consider adding logic.`);
                 // Potential logic: Notify user, update subscription status if needed.
                 break;

            default:
                logger.warn(`Unhandled webhook event type: ${event.type}`);
        }

        // Return a 200 response to acknowledge receipt of the event
        res.json({received: true});

    } catch (error) {
         logger.error("Error processing webhook event:", { eventType: event.type, error: error.message, stack: error.stack });
         // Send 500 on internal processing errors
         res.status(500).send("Internal Server Error processing webhook.");
    }
});

/* // REMOVE THIS LINE
    // Use cors middleware if needed, though webhooks shouldn't typically trigger preflight
    // cors(req, res, async () => { ... });

    if (!STRIPE_WEBHOOK_SECRET) {
        logger.error("Stripe webhook secret is not configured.");
        return res.status(500).send("Webhook configuration error.");
    }

    const stripeSignature = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.rawBody, stripeSignature, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        logger.error('Webhook signature verification failed.', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    logger.info(`Received Stripe webhook event: ${event.type}`);
    const dataObject = event.data.object;

    try {
        switch (event.type) {
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted':
            case 'customer.subscription.created':
                const subscription = dataObject;
                const customerId = subscription.customer;
                const status = subscription.status;
                const priceId = subscription.items.data[0]?.price.id;
                const currentPeriodEnd = subscription.current_period_end ? admin.firestore.Timestamp.fromMillis(subscription.current_period_end * 1000) : null;
                // Find user by stripeCustomerId
                const userQuery = await db.collection('housekeeper_profiles').where('stripeCustomerId', '==', customerId).limit(1).get();
                if (!userQuery.empty) {
                    const userDoc = userQuery.docs[0];
                    logger.info(`Updating subscription status for ${userDoc.id} to ${status}`);
                    await userDoc.ref.update({
                        stripeSubscriptionStatus: status,
                        stripePriceId: priceId,
                        stripeSubscriptionId: subscription.id,
                        stripeCurrentPeriodEnd: currentPeriodEnd,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                }
                break;
            case 'account.updated':
                const account = dataObject;
                const accountId = account.id;
                const chargesEnabled = account.charges_enabled;
                const payoutsEnabled = account.payouts_enabled;
                const detailsSubmitted = account.details_submitted;
                let accountStatus = 'pending'; // Default
                if (detailsSubmitted && chargesEnabled && payoutsEnabled) {
                    accountStatus = 'enabled';
                } else if (!detailsSubmitted) {
                     accountStatus = 'pending';
                } else {
                    accountStatus = 'restricted'; // If details submitted but something is not enabled
                }
                // Find user by stripeAccountId
                const accountUserQuery = await db.collection('housekeeper_profiles').where('stripeAccountId', '==', accountId).limit(1).get();
                if (!accountUserQuery.empty) {
                    const userDoc = accountUserQuery.docs[0];
                     logger.info(`Updating account status for ${userDoc.id} (${accountId}) to ${accountStatus}`);
                    await userDoc.ref.update({
                        stripeAccountStatus: accountStatus,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                }
                break;
            // ... handle other necessary event types (e.g., invoice.payment_failed)
            default:
                logger.info(`Unhandled webhook event type ${event.type}`);
        }
        // Return a response to acknowledge receipt of the event
        res.json({received: true});

    } catch (error) {
         logger.error("Error processing webhook event:", { eventType: event.type, error: error.message });
         res.status(500).send("Internal Server Error processing webhook.");
    }
});
*/ // REMOVE THIS LINE

// ========= END STRIPE WEBHOOK HANDLER (Skeleton) =========
