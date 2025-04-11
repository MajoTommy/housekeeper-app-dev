/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const { HttpsError, onCall } = require("firebase-functions/v2/https");
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
        // 2. Fetch Settings
        const settingsPath = `users/${housekeeperId}/settings/app`;
        const settingsDoc = await db.doc(settingsPath).get();
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
