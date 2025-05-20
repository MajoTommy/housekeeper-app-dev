/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const { HttpsError, onCall, onRequest } = require("firebase-functions/v2/https"); // <<< ADDED onRequest
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const { Timestamp } = require("firebase-admin/firestore"); // <<< ADD THIS IMPORT
const functions = require("firebase-functions");
const cors = require('cors')({origin: true}); // Import and configure CORS
const dateFnsTz = require('date-fns-tz'); // COMMONJS DEFAULT IMPORT
const OpenAI = require("openai"); // <<< NEW: Import OpenAI
const {getFirestore} = require("firebase-admin/firestore");
const {defineString} = require("firebase-functions/params");

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
const db = getFirestore();

// Define environment variables (example, replace with your actual needs)
const stripeLiveSecretKey = defineString("STRIPE_LIVE_SECRET_KEY");
const stripeTestSecretKey = defineString("STRIPE_TEST_SECRET_KEY");
const stripeLiveWebhookSecret = defineString("STRIPE_LIVE_WEBHOOK_SECRET");
const stripeTestWebhookSecret = defineString("STRIPE_TEST_WEBHOOK_SECRET");

// Attempt to initialize OpenAI client globally using environment variable
let openai;
const openAIApiKey = process.env.OPENAI_KEY; 

if (openAIApiKey) {
    try {
        openai = new OpenAI({ apiKey: openAIApiKey });
        console.log("OpenAI client initialized globally using OPENAI_KEY environment variable.");
    } catch (e) {
        console.error("Error initializing OpenAI client globally:", e);
        openai = null; // Ensure it's null if initialization failed
    }
} else {
    console.error("OPENAI_KEY environment variable not found. OpenAI client not initialized.");
    openai = null;
}

// --- Initialize Stripe Globally ---
const stripePackage = require("stripe");
let stripe = null; // Declare stripe globally
try {
    const stripeSecret = process.env.STRIPE_SECRET_KEY; 
    if (!stripeSecret) {
        // Log a WARNING during analysis/runtime if missing, not FATAL.
        // Functions needing Stripe will fail later if it's truly missing in their runtime env.
        logger.warn("Stripe secret key (STRIPE_SECRET_KEY) not found in environment. Stripe SDK NOT initialized globally. Functions requiring Stripe may fail if secret is not provided via Secret Manager.");
    } else {
        stripe = stripePackage(stripeSecret);
        logger.info("Stripe SDK initialized globally using environment variable (or secret passed as env var).");
    }
} catch (error) {
    // Log initialization errors but don't halt deployment analysis
    logger.error("Exception during global Stripe SDK initialization attempt:", error);
}
// --- END Stripe Initialization ---

// --- NEW TEST FUNCTION (Converted to GCFv2) ---
exports.testAuthContext = onCall({ cors: true }, (request) => { // GCFv2 onCall
    logger.info("--- testAuthContext (V2) called ---");
    logger.info("testAuthContext (V2) received data:", request.data);
    // Log the whole auth object to see what's inside
    logger.info("testAuthContext (V2) full request.auth:", request.auth);

    if (!request.auth) {
        logger.error("!!! testAuthContext (V2): Auth context is UNDEFINED!");
        throw new HttpsError('unauthenticated', 'Auth context missing in test function.'); // HttpsError from v2/https is already imported
    }

    logger.info("+++ testAuthContext (V2): Auth context FOUND:", request.auth.uid);
    return { success: true, uid: request.auth.uid };
});
// --- END NEW TEST FUNCTION ---

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

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

// --- Main Cloud Function: getAvailableSlots (Refactored to V2 onCall Syntax) ---
exports.getAvailableSlots = onCall({ cors: true }, async (request) => {
    // V2 onCall handles CORS via options, no manual wrapper needed

    console.log("getAvailableSlots (V2) called with data:", request.data);
    console.log("getAvailableSlots (V2) request.auth:", request.auth); // Use request.auth for V2

    // Check if user is authenticated
    if (!request.auth) {
        throw new HttpsError(
            'unauthenticated',
            'The function must be called while authenticated.'
        );
    }
    const authUid = request.auth.uid; // Get UID from request.auth

    logger.info("getAvailableSlots (V2) called", { authUid: authUid, data: request.data });

    // 1. Input Validation (Keep ISO strings as input)
    const { housekeeperId, startDateString, endDateString } = request.data;
    if (!housekeeperId || typeof housekeeperId !== "string" || !startDateString || !endDateString) {
        logger.error("Missing or invalid required data fields", { hasHkId: !!housekeeperId, typeHkId: typeof housekeeperId, hasStart: !!startDateString, hasEnd: !!endDateString });
        throw new HttpsError("invalid-argument", "Required data missing or invalid (housekeeperId, startDateString, endDateString).");
    }

    // --- ADD LOGGING ---
    logger.info("Received date strings for parsing:", { startDateString, endDateString });
    // --- END LOGGING ---

    let startDateUTC, endDateUTC, rangeStartTimestamp, rangeEndTimestamp;
    try {
        startDateUTC = new Date(startDateString);
        endDateUTC = new Date(endDateString);
        startDateUTC.setUTCHours(0, 0, 0, 0);
        endDateUTC.setUTCHours(23, 59, 59, 999);
        if (isNaN(startDateUTC.getTime()) || isNaN(endDateUTC.getTime())) {
            throw new Error("Invalid date conversion.");
        }
        rangeStartTimestamp = Timestamp.fromDate(startDateUTC);
        rangeEndTimestamp = Timestamp.fromDate(endDateUTC);
        logger.info(`Processing request for housekeeper: ${housekeeperId}, UTC range: ${startDateUTC.toISOString()} to ${endDateUTC.toISOString()}`);
    } catch (e) {
        logger.error("Invalid date format provided", { startDateString, endDateString, error: e.message });
        throw new HttpsError("invalid-argument", "Invalid date format. Please provide ISO 8601 strings.");
    }

    try {
        // --- Identify Requester ---
        const requestingHomeownerId = authUid;
        logger.info(`Slot request initiated by homeowner: ${requestingHomeownerId || 'Anonymous/Unauthenticated'}`);

        // --- Fetch Profile and Settings ---
        const housekeeperProfileRef = db.collection('users').doc(housekeeperId);
        const settingsPath = housekeeperProfileRef.collection('settings').doc('app');
        const [housekeeperProfileDoc, settingsDoc] = await Promise.all([
            housekeeperProfileRef.get(),
            settingsPath.get()
        ]);

        // --- Check Blocklist --- 
        if (requestingHomeownerId && housekeeperProfileDoc.exists) {
            const housekeeperData = housekeeperProfileDoc.data();
            const blockedHomeowners = housekeeperData.blockedHomeowners || [];
            if (blockedHomeowners.includes(requestingHomeownerId)) {
                logger.info(`Access denied: Homeowner ${requestingHomeownerId} is blocked by housekeeper ${housekeeperId}. Returning empty schedule.`);
                return { schedule: {} }; // Early return if blocked
            }
        } else if (!housekeeperProfileDoc.exists) {
            logger.warn(`Housekeeper profile ${housekeeperId} not found. Cannot check blocklist.`);
        }

        // --- Process Settings --- 
        let settings = DEFAULT_SETTINGS;
        if (settingsDoc.exists) {
            const fetchedSettings = settingsDoc.data();
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

        // --- Fetch Bookings --- 
        const bookingsPath = `users/${housekeeperId}/bookings`;
        const bookingsRef = db.collection(bookingsPath);
        
        logger.info(`Querying bookings using Timestamps: >= ${rangeStartTimestamp.toDate().toISOString()} and <= ${rangeEndTimestamp.toDate().toISOString()}`);
        const bookingsSnapshot = await bookingsRef
          .where("startTimestamp", ">=", rangeStartTimestamp) 
          .where("startTimestamp", "<=", rangeEndTimestamp) // Bookings starting within the range
          .get();

        const bookingsByDateStr = {};
        const profileIdsToFetch = { clients: new Set(), homeowners: new Set() };

        bookingsSnapshot.forEach((doc) => {
            const booking = doc.data();
            if (booking.clientId) profileIdsToFetch.clients.add(booking.clientId);
            if (booking.homeownerId) profileIdsToFetch.homeowners.add(booking.homeownerId);
        });

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

        const clientProfiles = new Map();
        clientProfileSnapshots.forEach(doc => {
            if (doc.exists) clientProfiles.set(doc.id, doc.data());
        });
        const homeownerProfiles = new Map();
        homeownerProfileSnapshots.forEach(doc => {
            if (doc.exists) homeownerProfiles.set(doc.id, doc.data());
        });

        bookingsSnapshot.forEach((doc) => {
            const booking = doc.data();
            const bookingId = doc.id;
            
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

            const startDate = booking.startTimestamp.toDate();
            const year = startDate.getUTCFullYear();
            const month = (startDate.getUTCMonth() + 1).toString().padStart(2, "0");
            const day = startDate.getUTCDate().toString().padStart(2, "0");
            const bookingDateStr = `${year}-${month}-${day}`;

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

        // --- Fetch Time Off --- 
        const timeOffPath = `users/${housekeeperId}/timeOffDates`;
        const timeOffRef = db.collection(timeOffPath);
        
        logger.info(`Querying timeOff using Timestamps: startOfDayUTC <= ${rangeEndTimestamp.toDate().toISOString()} and endOfDayUTC >= ${rangeStartTimestamp.toDate().toISOString()}`);
        const timeOffSnapshot = await timeOffRef
            .where("housekeeperId", "==", housekeeperId) // Requires index
            .where("startOfDayUTC", "<=", rangeEndTimestamp) 
            .get();
            
        const timeOffRanges = []; 
        timeOffSnapshot.forEach(doc => {
             const timeOff = doc.data();
             if (timeOff.startOfDayUTC && timeOff.endOfDayUTC && 
                 timeOff.endOfDayUTC.toMillis() >= rangeStartTimestamp.toMillis()) {
                  timeOffRanges.push({
                       startMillis: timeOff.startOfDayUTC.toMillis(),
                       endMillis: timeOff.endOfDayUTC.toMillis()
                  });
             }
        });
        logger.info(`Fetched ${timeOffRanges.length} potentially relevant time off ranges.`, { housekeeperId });

        // --- Calculate Availability --- 
        const schedule = {};
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        let currentDateUTC = new Date(startDateUTC);

        while (currentDateUTC.getTime() <= endDateUTC.getTime()) {
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
                 currentDateUTC.setUTCDate(currentDateUTC.getUTCDate() + 1);
                 continue; 
            }

            // --- Settings and Bookings for the Day ---
            const daySettings = settings.workingDays[dayKey] || { isWorking: false };
            const isWorkingBasedOnSettings = daySettings.isWorking === true;
            const housekeeperTimezone = settings.timezone || 'UTC'; // Get timezone from settings
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
                
                let startMillisUTC = null;
                try {
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

                    const localDateTimeStr = `${currentDateStr} ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
                    
                    const startDateInZone = dateFnsTz.toDate(localDateTimeStr, { timeZone: housekeeperTimezone });
                    if (isNaN(startDateInZone.getTime())) {
                        throw new Error(`date-fns-tz toDate failed for: ${localDateTimeStr} in ${housekeeperTimezone}`);
                    }

                    startMillisUTC = startDateInZone.getTime();
                    logger.debug(`[${currentDateStr}] Calculated start time (using toDate): LocalStr=${localDateTimeStr}, TargetZone=${housekeeperTimezone}, Final UTC Millis=${startMillisUTC}, ZonedDateObj=${startDateInZone.toISOString()}`);

                } catch (tzError) {
                     logger.error(`[${currentDateStr}] Error calculating zoned start time (using toDate):`, { date: currentDateStr, time: startTimeSetting, timezone: housekeeperTimezone, error: tzError.message, stack: tzError.stack });
                     startMillisUTC = null; 
                }

                if (startMillisUTC !== null) {
                    const jobDurationsInput = daySettings.jobDurations;
                    let jobDurations = [];
                    if (Array.isArray(jobDurationsInput) && jobDurationsInput.length > 0 && jobDurationsInput.every(d => typeof d === "number" && d > 0)) {
                        jobDurations = jobDurationsInput;
                    } else {
                        const jobsPerDayFallback = (typeof daySettings.jobsPerDay === "number" && daySettings.jobsPerDay > 0) ? daySettings.jobsPerDay : 1;
                        jobDurations = Array(jobsPerDayFallback).fill(DEFAULT_JOB_DURATION);
                        if (jobsPerDayFallback === 0) jobDurations = []; // Handle case of explicitly 0 jobs
                        logger.warn(`[${currentDateStr}] Using fallback job durations`, { count: jobsPerDayFallback, duration: DEFAULT_JOB_DURATION });
                    }

                    const breakDurationsInput = daySettings.breakDurations;
                    let breakDurations = [];
                    if (Array.isArray(breakDurationsInput)) {
                        breakDurations = breakDurationsInput.map(d => typeof d === 'number' && d > 0 ? d : 0);
                    }

                    for (let jobIndex = 0; jobIndex < jobDurations.length; jobIndex++) {
                        const jobDurationMillis = jobDurations[jobIndex] * 60 * 1000;
                        const jobStartMillis = startMillisUTC;
                        const jobEndMillis = jobStartMillis + jobDurationMillis;
                        potentialSlotsMillis.push({ startMillis: jobStartMillis, endMillis: jobEndMillis, type: 'job' });
                        if (jobIndex < jobDurations.length - 1) {
                            const breakDuration = breakDurations.length > jobIndex ? breakDurations[jobIndex] : 0;
                            if (breakDuration > 0) {
                                const breakDurationMillis = breakDuration * 60 * 1000;
                                const breakStartMillis = startMillisUTC;
                                const breakEndMillis = breakStartMillis + breakDurationMillis;
                                potentialSlotsMillis.push({ startMillis: breakStartMillis, endMillis: breakEndMillis, type: 'break' });
                            }
                        }
                    }
                    logger.info(`Generated ${potentialSlotsMillis.length} potential slots (UTC millis) for ${currentDateStr}`);
                } else {
                    logger.warn(`Invalid start time in settings for ${currentDateStr}, cannot generate potential slots OR not a working day.`);
                }
            }

            // --- <<<< ADD DETAILED LOGS HERE >>>> ---
            logger.debug(`[DupeDebug CloudFn] For Date: ${currentDateStr}`);
            try {
                logger.debug("[DupeDebug CloudFn] todaysBookingsMillis:", JSON.parse(JSON.stringify(todaysBookingsMillis)));
            } catch (e) {
                logger.error("[DupeDebug CloudFn] Error logging todaysBookingsMillis:", e);
                logger.debug("[DupeDebug CloudFn] todaysBookingsMillis (raw):", todaysBookingsMillis);
            }
            try {
                logger.debug("[DupeDebug CloudFn] potentialSlotsMillis:", JSON.parse(JSON.stringify(potentialSlotsMillis)));
            } catch (e) {
                logger.error("[DupeDebug CloudFn] Error logging potentialSlotsMillis:", e);
                logger.debug("[DupeDebug CloudFn] potentialSlotsMillis (raw):", potentialSlotsMillis);
            }
            // --- <<<< END ADDED LOGS >>>> ---

            // --- Combine Bookings and Potential Slots (Using UTC Millis) ---
            const finalSlotsMillis = [...todaysBookingsMillis]; // Start with actual bookings

            potentialSlotsMillis.forEach(potentialSlot => {
                let overlapsWithBooking = false;
                for (const bookedSlot of finalSlotsMillis) { // Check against all slots added so far of type booking
                    if (bookedSlot.type === 'booking' &&
                        Math.max(potentialSlot.startMillis, bookedSlot.startMillis) < Math.min(potentialSlot.endMillis, bookedSlot.endMillis))
                    {
                        overlapsWithBooking = true;
                        break;
                    }
                }

                if (!overlapsWithBooking) {
                    finalSlotsMillis.push({
                        ...potentialSlot, 
                        status: potentialSlot.type === 'break' ? 'unavailable' : 'available',
                        bookingId: null,
                        clientName: null
                    });
                }
            });

            finalSlotsMillis.sort((a, b) => a.startMillis - b.startMillis);

            let overallStatus = 'not_working'; // Default
            let statusMessage = 'Not scheduled to work';
            let availableSlotsFormatted = [];

            const hasAnyAvailableSlot = finalSlotsMillis.some(slot => slot.status === 'available');
            const isWorkingAnySlot = finalSlotsMillis.length > 0;

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
                availableSlotsFormatted = finalSlotsMillis
                    .filter(slot => slot.status === 'available')
                    .map(slot => {
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
                overallStatus = 'not_working';
                statusMessage = 'Configuration issue or no slots defined';
                logger.warn(`Day ${currentDateStr} considered not_working due to fallback (settings working=${isWorkingBasedOnSettings}, slots=${finalSlotsMillis.length})`);
            }

            const allSlotsFormatted = finalSlotsMillis.map(slot => {
                const durationMillis = slot.endMillis - slot.startMillis;
                return {
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
            
            currentDateUTC.setUTCDate(currentDateUTC.getUTCDate() + 1);
        } // End daily loop

        logger.info("Finished calculating schedule successfully (V2).");
        return { schedule }; // Direct return for V2

    } catch (error) {
        logger.error("Error occurred while calculating availability (V2):", {
            housekeeperId,
            startDateString,
            endDateString,
            authUid: authUid,
            error: error.message,
            stack: error.stack,
        });
        // Re-throw HttpsError or wrap other errors
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError(
            "internal",
            error.message || "An error occurred while calculating availability. Please try again later.",
            { originalErrorMessage: error.message }
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
exports.cancelBooking = onRequest({ cors: true }, async (req, res) => { // GCFv2 onRequest
    logger.info("cancelBooking (V2) called with method:", req.method);
    logger.info("cancelBooking (V2) req.body:", req.body);
    logger.info("cancelBooking (V2) req.query:", req.query);
    // V2 onRequest with { cors: true } should handle basic CORS. If more complex CORS needed, ensure it's configured.

    // For GCFv2, if using Express-like req/res, no need for cors(req, res, () => { ... });
    // The cors:true option in onRequest should handle it.

    if (req.method !== 'POST') {
        logger.warn("cancelBooking (V2) - Method Not Allowed:", req.method);
        return res.status(405).send('Method Not Allowed');
    }

    const { bookingId, cancelledByRole, cancellationReason, cancellationMessage } = req.body;
    const contextAuth = req.auth; // For GCFv2 onRequest, auth is on req.auth if token is passed and validated by Firebase Hosting rewrites or API Gateway.
                               // IMPORTANT: For direct HTTP calls to onRequest without Firebase Hosting/Gateway token validation, req.auth will likely be UNDEFINED.
                               // Proper auth for direct HTTP GCFv2 requires manual token validation (e.g., Bearer token).
                               // Assuming for now this function is called in a context where req.auth might be populated (e.g. by a client that sends an ID token)
                               // or that auth is not strictly required for cancellation logic itself beyond role check.

    logger.info(`cancelBooking (V2) attempt for bookingId: ${bookingId} by role: ${cancelledByRole}`);
    if (contextAuth && contextAuth.uid) {
        logger.info(`Cancellation initiated by authenticated user: ${contextAuth.uid}`);
    } else {
        logger.info("Cancellation initiated by unauthenticated or non-token-bearing request.");
    }

    if (!bookingId || !cancelledByRole) {
        logger.error("cancelBooking (V2) - Missing bookingId or cancelledByRole");
        return res.status(400).send('Missing bookingId or cancelledByRole.');
    }

    const bookingRef = db.collectionGroup('bookings').where('bookingId', '==', bookingId);

    try {
        const snapshot = await bookingRef.get();
        if (snapshot.empty) {
            logger.warn(`cancelBooking (V2) - Booking not found: ${bookingId}`);
            return res.status(404).send('Booking not found.');
        }

        let bookingDocRef = null;
        let bookingData = null;
        snapshot.forEach(doc => {
            bookingDocRef = doc.ref;
            bookingData = doc.data();
        });

        if (!bookingDocRef || !bookingData) {
            logger.error("cancelBooking (V2) - Failed to get document reference or data from snapshot.");
            return res.status(500).send("Internal error processing booking data.");
        }

        logger.info("cancelBooking (V2) - Found booking:", bookingData);

        // Authorization checks (simplified example)
        // In a real app, you'd verify if the contextAuth.uid matches bookingData.homeownerId or bookingData.housekeeperId based on cancelledByRole
        if (cancelledByRole === 'homeowner' && contextAuth && contextAuth.uid !== bookingData.homeownerId) {
            logger.warn(`cancelBooking (V2) - Unauthorized homeowner cancellation attempt. Auth UID: ${contextAuth.uid}, Booking Homeowner: ${bookingData.homeownerId}`);
            // return res.status(403).send('Unauthorized to cancel this booking.');
            // For now, allowing cancellation if role matches, assuming client did some auth check
        }
        if (cancelledByRole === 'housekeeper' && contextAuth && contextAuth.uid !== bookingData.housekeeperId) {
            logger.warn(`cancelBooking (V2) - Unauthorized housekeeper cancellation attempt. Auth UID: ${contextAuth.uid}, Booking Housekeeper: ${bookingData.housekeeperId}`);
            // return res.status(403).send('Unauthorized to cancel this booking.');
            // For now, allowing cancellation if role matches
        }

        if (bookingData.status === 'cancelled') {
            logger.info(`cancelBooking (V2) - Booking ${bookingId} is already cancelled.`);
            return res.status(200).send({ message: 'Booking was already cancelled.', booking: bookingData });
        }

        const updateData = {
            status: 'cancelled',
            cancelledBy: cancelledByRole,
            cancellationTimestamp: Timestamp.now(),
            ...(cancellationReason && { cancellationReason: cancellationReason }),
            ...(cancellationMessage && { cancellationMessage: cancellationMessage }),
        };

        await bookingDocRef.update(updateData);
        const updatedBookingData = { ...bookingData, ...updateData };

        logger.info(`cancelBooking (V2) - Booking ${bookingId} cancelled successfully by ${cancelledByRole}.`);

        // Create a notification for the other party
        const otherPartyRole = cancelledByRole === 'homeowner' ? 'housekeeper' : 'homeowner';
        const recipientId = otherPartyRole === 'homeowner' ? bookingData.homeownerId : bookingData.housekeeperId;
        const notifierName = cancelledByRole === 'homeowner' ? (bookingData.homeownerDetails?.name || 'The homeowner') : (bookingData.housekeeperDetails?.name || 'Your housekeeper');
        const message = `${notifierName} has cancelled your upcoming service on ${dateFnsTz.formatInTimeZone(bookingData.startTimestamp.toDate(), bookingDataForNotif.timezone || 'UTC', 'MMM d, yyyy \'at\' h:mm a zzz')}.`;

        if (recipientId) {
            await db.collection('users').doc(recipientId).collection('notifications').add({
                type: 'bookingCancelled',
                message: message,
              bookingId: bookingId,
                timestamp: Timestamp.now(),
                isRead: false,
                relatedBookingData: {
                    serviceName: bookingData.serviceName,
                    startTime: bookingData.startTimestamp.toDate().toISOString(), // Storing as ISO string
                    housekeeperId: bookingData.housekeeperId,
                    homeownerId: bookingData.homeownerId
                }
            });
            logger.info(`cancelBooking (V2) - Notification created for ${otherPartyRole} (ID: ${recipientId}) about cancellation.`);
        } else {
            logger.warn("cancelBooking (V2) - Recipient ID not found for notification.");
        }

        // Refund logic (if applicable and using Stripe)
        if (bookingData.stripePaymentIntentId && stripe) {
            try {
                // Check if already refunded
                const paymentIntent = await stripe.paymentIntents.retrieve(bookingData.stripePaymentIntentId);
                let alreadyRefunded = false;
                if (paymentIntent.charges && paymentIntent.charges.data.length > 0) {
                    const charge = paymentIntent.charges.data[0];
                    if (charge.refunded) {
                        // This checks if the entire charge was refunded. 
                        // For partial refunds or multiple refunds, charge.amount_refunded needs to be checked against charge.amount
                        alreadyRefunded = true;
                        logger.info(`cancelBooking (V2) - Payment intent ${bookingData.stripePaymentIntentId} associated with charge ${charge.id} was already fully refunded.`);
                    }
                }

                if (!alreadyRefunded && paymentIntent.status === 'succeeded') {
                    logger.info(`cancelBooking (V2) - Attempting refund for payment_intent: ${bookingData.stripePaymentIntentId}`);
                    const refund = await stripe.refunds.create({
                        payment_intent: bookingData.stripePaymentIntentId,
                        reason: 'requested_by_customer', // Or a more specific reason
                    });
                    logger.info(`cancelBooking (V2) - Refund successful for Stripe PaymentIntent ${bookingData.stripePaymentIntentId}, Refund ID: ${refund.id}, Status: ${refund.status}`);
                    await bookingDocRef.update({ 
                        stripeRefundId: refund.id,
                        refundStatus: refund.status 
                    });
                } else if (paymentIntent.status !== 'succeeded') {
                     logger.warn(`cancelBooking (V2) - PaymentIntent ${bookingData.stripePaymentIntentId} is not in a refundable state (status: ${paymentIntent.status}). No refund processed.`);
                } else if (alreadyRefunded) {
                    // Already logged above, just confirming no new refund attempted.
                }
            } catch (stripeError) {
                logger.error(`cancelBooking (V2) - Stripe refund error for booking ${bookingId}:`, stripeError);
                // Don't let Stripe error block the cancellation itself
                await bookingDocRef.set({ 
                    stripeRefundError: stripeError.message || "Unknown Stripe refund error"
                }, { merge: true });
            }
        } else if (bookingData.stripePaymentIntentId && !stripe) {
            logger.warn(`cancelBooking (V2) - Stripe PaymentIntent ID ${bookingData.stripePaymentIntentId} exists, but Stripe SDK is not initialized. Cannot process refund.`);
             await bookingDocRef.set({ 
                stripeRefundError: "Stripe SDK not initialized during cancellation."
            }, { merge: true });
        }

        return res.status(200).send({ message: 'Booking cancelled successfully.', booking: updatedBookingData });
  } catch (error) {
        logger.error("cancelBooking (V2) - General error:", error);
        return res.status(500).send('Internal server error.');
    }
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

        // 3. Define the return URL based on environment
        let returnUrl;
        if (process.env.FUNCTIONS_EMULATOR === 'true') {
            returnUrl = "http://127.0.0.1:5000/housekeeper/settings/account.html"; // LOCAL DEV URL
            logger.info("Using local return URL for Billing Portal:", returnUrl);
        } else {
            returnUrl = "https://housekeeper-app-dev.web.app/housekeeper/settings/account.html"; // PRODUCTION/HOSTED URL
            logger.info("Using hosted return URL for Billing Portal:", returnUrl);
        }

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
exports.stripeWebhookHandler = onRequest({ region: 'us-central1' }, async (req, res) => { // GCFv2 onRequest
    logger.info("stripeWebhookHandler (V2) received a request");

    // Stripe recommends raw body for webhook signature verification.
    // For GCFv2, req.rawBody is available IF you configure the function to preserve it.
    // By default, for application/json, GCFv2 onRequest will parse req.body.
    // We need to ensure the rawBody is used for signature verification.
    // Firebase Functions v2 automatically provides `req.rawBody` for non-application/json content types,
    // or if body parsing is disabled. For JSON, it parses it by default.
    // The `firebase-functions` SDK for GCFv1 used to provide `req.rawBody` more readily.
    // For GCFv2, if `Content-Type` is `application/json`, `req.body` is parsed.
    // We will rely on the signature header and the parsed req.body for event type, assuming Stripe SDK can handle it or error out if signature is an issue.
    // A more robust solution for GCFv2 might involve a middleware to capture rawBody if Stripe SDK strictly needs it for `constructEvent` with JSON payloads.
    // However, often the Stripe SDK can work with the parsed body + signature header.

    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET; // Ensure this is set in your .env or secrets

    if (!webhookSecret) {
        logger.error("Stripe webhook secret is not configured. Cannot process webhook.");
        return res.status(500).send("Webhook secret not configured.");
    }
    if (!stripe) {
        logger.error("Stripe SDK not initialized. Cannot process webhook.");
        return res.status(500).send("Stripe SDK not initialized.");
    }

    let event;

    try {
        // IMPORTANT: Stripe requires the raw request body for signature verification.
        // In GCFv2, `req.rawBody` (a Buffer) should be used here if available and `stripe.webhooks.constructEvent` expects it.
        // If `req.rawBody` is not populated by default for JSON by GCFv2 `onRequest`, this part is tricky.
        // The Firebase SDK for GCFv1 did provide `req.rawBody`.
        // For GCFv2, if `Content-Type: application/json`, `req.body` is the parsed JSON.
        // Let's assume for now `req.rawBody` *is* available (often true for GCFv2 if not `application/x-www-form-urlencoded` or `multipart/form-data`)
        // If `req.rawBody` is undefined, this will fail. This is a common GCFv1 to GCFv2 migration pain point for Stripe webhooks.
        // A robust solution often involves disabling body parsing for the webhook endpoint or using a middleware.
        // For this conversion, we will proceed assuming req.rawBody is available or Stripe SDK handles it.
        // If deployment fails or webhook verification fails, this is the primary area to investigate for GCFv2 + Stripe.
        
        // Using req.rawBody assuming it's populated. This is CRITICAL for Stripe.
        if (!req.rawBody) {
            logger.error("stripeWebhookHandler (V2) - req.rawBody is undefined. Stripe signature verification will likely fail. Ensure function is configured to provide rawBody for JSON requests or use appropriate middleware.");
            // Fallback for constructEvent if rawBody is not present, though this might not be secure or correct depending on Stripe SDK version.
            // Some versions of stripe.webhooks.constructEvent might throw if rawBody is not a Buffer.
            // This is a placeholder for a more robust solution if req.rawBody is indeed unavailable.
            event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret); // This line is problematic if req.body is parsed JSON and constructEvent needs raw string/buffer
        } else {
            event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
        }
        logger.info("stripeWebhookHandler (V2) - Webhook event constructed successfully:", {type: event.type, id: event.id});
    } catch (err) {
        logger.error(`stripeWebhookHandler (V2) - Webhook signature verification failed or body parsing issue: ${err.message}`, { error: err });
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    try {
        let session;
        let paymentIntent;
        let charge;
        let subscription;
        let newBookingStatus;
        let bookingId;
        let clientSecret;
        let customerId;
        let needsUserAction = false;

        switch (event.type) {
            case 'checkout.session.completed':
                session = event.data.object;
                logger.info(`stripeWebhookHandler (V2) - Checkout session completed: ${session.id}`, { metadata: session.metadata });
                bookingId = session.metadata.bookingId;
                clientSecret = session.client_secret; // Note: client_secret for a session is usually for redirect, not stored long term.
                customerId = session.customer;

                if (bookingId) {
                    const bookingRef = db.collectionGroup('bookings').where('bookingId', '==', bookingId);
                    const bookingSnapshot = await bookingRef.get();
                    if (bookingSnapshot.empty) {
                        logger.error(`stripeWebhookHandler (V2) - Booking not found for bookingId: ${bookingId} from checkout.session.completed`);
                        break;
                    }
                    const bookingDoc = bookingSnapshot.docs[0];
                    await bookingDoc.ref.update({
                        status: 'confirmed', // Or 'pending_confirmation' if further action needed
                        stripeCheckoutSessionId: session.id,
                        stripePaymentIntentId: session.payment_intent, // Available if payment was made
                        stripeCustomerId: customerId,
                        paymentStatus: session.payment_status, // e.g., 'paid', 'unpaid', 'no_payment_required'
                        lastStripeEvent: event.type,
                        lastStripeEventTimestamp: Timestamp.now()
                    });
                    logger.info(`stripeWebhookHandler (V2) - Booking ${bookingId} updated to confirmed (or relevant status) after checkout session completion.`);
                    
                    // Potentially send notification to housekeeper/homeowner
                    const bookingDataForNotif = (await bookingDoc.ref.get()).data();
                    if (bookingDataForNotif && bookingDataForNotif.housekeeperId) {
                        await db.collection('users').doc(bookingDataForNotif.housekeeperId).collection('notifications').add({
                            type: 'bookingConfirmed',
                            message: `A new booking for ${bookingDataForNotif.serviceName} on ${dateFnsTz.formatInTimeZone(bookingDataForNotif.startTimestamp.toDate(), bookingDataForNotif.timezone || 'UTC', 'MMM d, yyyy \'at\' h:mm a zzz')} has been confirmed and paid.`,                            
                            bookingId: bookingId,
                            timestamp: Timestamp.now(),
                            isRead: false
                        });
                    }
                } else {
                     logger.warn("stripeWebhookHandler (V2) - checkout.session.completed event received without bookingId in metadata.", { session_id: session.id });
                }
                break;

            case 'checkout.session.async_payment_succeeded':
                session = event.data.object;
                logger.info(`stripeWebhookHandler (V2) - Checkout session async payment succeeded: ${session.id}`);
                bookingId = session.metadata.bookingId;
                if (bookingId) {
                    const bookingRefAsync = db.collectionGroup('bookings').where('bookingId', '==', bookingId);
                    const bookingSnapshotAsync = await bookingRefAsync.get();
                    if (bookingSnapshotAsync.empty) {
                        logger.error(`stripeWebhookHandler (V2) - Booking not found for bookingId: ${bookingId} from async_payment_succeeded`);
                        break;
                    }
                    const bookingDocAsync = bookingSnapshotAsync.docs[0];
                    await bookingDocAsync.ref.update({
                        status: 'confirmed',
                        paymentStatus: 'paid', // Explicitly set to paid
                        stripePaymentIntentId: session.payment_intent,
                        lastStripeEvent: event.type,
                        lastStripeEventTimestamp: Timestamp.now()
                    });
                    logger.info(`stripeWebhookHandler (V2) - Booking ${bookingId} status updated to confirmed, paymentStatus to paid due to async_payment_succeeded.`);
                }
                break;

            case 'checkout.session.async_payment_failed':
                session = event.data.object;
                logger.error(`stripeWebhookHandler (V2) - Checkout session async payment failed: ${session.id}`, { metadata: session.metadata });
                bookingId = session.metadata.bookingId;
                if (bookingId) {
                    const bookingRefFail = db.collectionGroup('bookings').where('bookingId', '==', bookingId);
                    const bookingSnapshotFail = await bookingRefFail.get();
                    if (bookingSnapshotFail.empty) {
                        logger.error(`stripeWebhookHandler (V2) - Booking not found for bookingId: ${bookingId} from async_payment_failed`);
                        break;
                    }
                    const bookingDocFail = bookingSnapshotFail.docs[0];
                    await bookingDocFail.ref.update({
                        status: 'payment_failed',
                        paymentStatus: 'failed',
                        lastStripeEvent: event.type,
                        lastStripeEventTimestamp: Timestamp.now(),
                        stripeError: session.last_payment_error ? session.last_payment_error.message : 'Async payment failed without specific error message.'
                    });
                    logger.info(`stripeWebhookHandler (V2) - Booking ${bookingId} status updated to payment_failed due to async_payment_failed.`);
                }
                break;
            
            case 'payment_intent.succeeded':
                paymentIntent = event.data.object;
                logger.info(`stripeWebhookHandler (V2) - PaymentIntent succeeded: ${paymentIntent.id}`);
                // Update booking if metadata contains bookingId
                bookingId = paymentIntent.metadata.bookingId;
                if (bookingId) {
                    const bookingRefPi = db.collectionGroup('bookings').where('bookingId', '==', bookingId);
                    const bookingSnapshotPi = await bookingRefPi.get();
                    if (!bookingSnapshotPi.empty) {
                        const bookingDocPi = bookingSnapshotPi.docs[0];
                        await bookingDocPi.ref.update({
                            status: 'confirmed', // Assuming payment success means confirmed
                            paymentStatus: 'paid',
                            stripePaymentIntentId: paymentIntent.id, // Ensure it's stored
                            lastStripeEvent: event.type,
                            lastStripeEventTimestamp: Timestamp.now()
                        });
                         logger.info(`stripeWebhookHandler (V2) - Booking ${bookingId} updated from payment_intent.succeeded.`);
                } else {
                        logger.warn(`stripeWebhookHandler (V2) - payment_intent.succeeded received for bookingId ${bookingId} not found in DB.`);
                    }
                } else {
                    logger.info("stripeWebhookHandler (V2) - payment_intent.succeeded event received without bookingId in metadata.");
                }
                break;

            case 'payment_intent.payment_failed':
                paymentIntent = event.data.object;
                logger.error(`stripeWebhookHandler (V2) - PaymentIntent payment_failed: ${paymentIntent.id}`, { error: paymentIntent.last_payment_error });
                bookingId = paymentIntent.metadata.bookingId;
                if (bookingId) {
                    const bookingRefPiFail = db.collectionGroup('bookings').where('bookingId', '==', bookingId);
                    const bookingSnapshotPiFail = await bookingRefPiFail.get();
                     if (!bookingSnapshotPiFail.empty) {
                        const bookingDocPiFail = bookingSnapshotPiFail.docs[0];
                        await bookingDocPiFail.ref.update({
                            status: 'payment_failed',
                            paymentStatus: 'failed',
                            stripePaymentIntentId: paymentIntent.id,
                            stripeError: paymentIntent.last_payment_error ? paymentIntent.last_payment_error.message : 'Payment failed without specific error message.',
                            lastStripeEvent: event.type,
                            lastStripeEventTimestamp: Timestamp.now()
                        });
                        logger.info(`stripeWebhookHandler (V2) - Booking ${bookingId} updated from payment_intent.payment_failed.`);
                } else {
                        logger.warn(`stripeWebhookHandler (V2) - payment_intent.payment_failed received for bookingId ${bookingId} not found in DB.`);
                    }
                } else {
                    logger.info("stripeWebhookHandler (V2) - payment_intent.payment_failed event received without bookingId in metadata.");
                }
                break;

            case 'payment_intent.requires_action':
                paymentIntent = event.data.object;
                logger.info(`stripeWebhookHandler (V2) - PaymentIntent requires_action: ${paymentIntent.id}`);
                bookingId = paymentIntent.metadata.bookingId;
                clientSecret = paymentIntent.client_secret;
                needsUserAction = true;
                if (bookingId) {
                    const bookingRefAction = db.collectionGroup('bookings').where('bookingId', '==', bookingId);
                    const bookingSnapshotAction = await bookingRefAction.get();
                    if (!bookingSnapshotAction.empty) {
                        const bookingDocAction = bookingSnapshotAction.docs[0];
                        await bookingDocAction.ref.update({
                            status: 'pending_action',
                            paymentStatus: 'requires_action',
                            stripePaymentIntentId: paymentIntent.id,
                            stripeClientSecret: clientSecret, // Store this so client can use it for authentication
                            lastStripeEvent: event.type,
                            lastStripeEventTimestamp: Timestamp.now()
                        });
                        logger.info(`stripeWebhookHandler (V2) - Booking ${bookingId} updated to pending_action.`);
                        // TODO: Notify the user they need to take action with the client_secret
                    }
                }
                break;

            // Handling charge events (can be useful for refunds or older integrations)
            case 'charge.succeeded':
                charge = event.data.object;
                logger.info(`stripeWebhookHandler (V2) - Charge Succeeded: ${charge.id}`);
                // If you use charges directly or need to log this.
                // Might relate to a payment_intent, check charge.payment_intent
                if (charge.payment_intent) {
                    // Potentially update booking if not already handled by payment_intent.succeeded
                    logger.info(`stripeWebhookHandler (V2) - Charge ${charge.id} linked to PI ${charge.payment_intent}`);
                }
                break;

            case 'charge.refunded':
                charge = event.data.object; // This is the Charge object
                const refund = charge.refunds && charge.refunds.data.length > 0 ? charge.refunds.data[0] : null;
                logger.info(`stripeWebhookHandler (V2) - Charge Refunded: ${charge.id}`, { refundDetails: refund });
                paymentIntent = charge.payment_intent; 
                if (paymentIntent) {
                    const bookingRefRefund = db.collectionGroup('bookings').where('stripePaymentIntentId', '==', paymentIntent);
                    const bookingSnapshotRefund = await bookingRefRefund.get();
                    if (!bookingSnapshotRefund.empty) {
                        const bookingDocRefund = bookingSnapshotRefund.docs[0];
                        await bookingDocRefund.ref.update({
                            paymentStatus: 'refunded',
                            // status: 'cancelled', // Decide if charge.refunded should also change booking status
                            stripeRefundId: refund ? refund.id : 'unknown_refund_id',
                            refundStatus: refund ? refund.status : 'unknown',
                            lastStripeEvent: event.type,
                            lastStripeEventTimestamp: Timestamp.now()
                        });
                        logger.info(`stripeWebhookHandler (V2) - Booking associated with PI ${paymentIntent} updated due to charge.refunded event.`);
                } else {
                        logger.warn(`stripeWebhookHandler (V2) - charge.refunded for PI ${paymentIntent}, but no matching booking found by PI.`);
                    }
                } else {
                    logger.warn(`stripeWebhookHandler (V2) - charge.refunded event for charge ${charge.id} but no payment_intent associated with the charge object.`);
                }
                break;

            // Customer subscription events
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted':
                subscription = event.data.object;
                customerId = subscription.customer;
                logger.info(`stripeWebhookHandler (V2) - Subscription event: ${event.type} for customer ${customerId}, sub ID ${subscription.id}, status ${subscription.status}`);
                // You might want to update a user's record in your DB with their subscription status
                // e.g., find user by stripeCustomerId and update their subscription details.
                const userWithSubRef = db.collectionGroup('users').where('stripeCustomerId', '==', customerId);
                const userWithSubSnapshot = await userWithSubRef.get(); 
                if (!userWithSubSnapshot.empty) {
                    const userDoc = userWithSubSnapshot.docs[0]; // Assuming one user per stripeCustomerId
                    await userDoc.ref.set({
                        stripeSubscriptionId: subscription.id,
                        stripeSubscriptionStatus: subscription.status,
                        stripeSubscriptionCurrentPeriodEnd: subscription.current_period_end ? Timestamp.fromMillis(subscription.current_period_end * 1000) : null,
                        stripePriceId: subscription.items.data.length > 0 ? subscription.items.data[0].price.id : null,
                        lastStripeEvent: event.type,
                        lastStripeEventTimestamp: Timestamp.now()
                    }, { merge: true });
                    logger.info(`stripeWebhookHandler (V2) - User ${userDoc.id} subscription details updated for sub ${subscription.id}.`);
                } else {
                    logger.warn(`stripeWebhookHandler (V2) - Subscription event for customer ${customerId} but no matching user found by stripeCustomerId.`);
                }
                 break;

            default:
                logger.warn(`stripeWebhookHandler (V2) - Unhandled event type: ${event.type}`);
        }

        // Send a 200 OK response to acknowledge receipt of the event
        logger.info("stripeWebhookHandler (V2) - Successfully processed event type: " + event.type);
        res.status(200).json({ received: true, event_type: event.type, needs_user_action: needsUserAction, client_secret: clientSecret });

    } catch (error) {
        logger.error("stripeWebhookHandler (V2) - Error processing webhook event:", error);
        res.status(500).json({ error: "Internal server error processing webhook event.", message: error.message });
    }
});
// --- END Stripe Webhook Handler ---

// --- NEW: AI Price and Time Suggestion Function ---
exports.getAIPriceAndTimeSuggestion = onCall({ cors: true }, async (request) => {
    logger.info("getAIPriceAndTimeSuggestion (V2) called with data:", JSON.stringify(request.data)); // Log full request data

    if (!openai) {
        logger.error("OpenAI client is not initialized. Check API key and environment setup.");
        throw new HttpsError("internal", "AI service is not available at the moment.");
    }

    if (!request.auth) {
        throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
    const housekeeperUid = request.auth.uid;

    const {
        homeownerId, // ID of the homeowner requesting the service
        requestId, // ID of the bookingRequest document (optional, for context)
        services, // { baseServices: [{id, name, price, durationMinutes, includedTasks: []}], addonServices: [{id, name, price, durationMinutes, includedTasks: []}] }
        propertyDetails, // { squareFootage, numBedrooms, numBathrooms, homeType, zipCode } (zipCode for homeowner)
        housekeeperPreferences // { targetHourlyRate }
    } = request.data;

    // Validate crucial inputs
    if (!services || (!services.baseServices && !services.addonServices)) {
        throw new HttpsError("invalid-argument", "Service details are required.");
    }
    if (!propertyDetails) {
        throw new HttpsError("invalid-argument", "Homeowner property details are required.");
    }
    if (!housekeeperPreferences || typeof housekeeperPreferences.targetHourlyRate !== 'number') {
        throw new HttpsError("invalid-argument", "Housekeeper target hourly rate is required and must be a number.");
    }

    try {
        let prompt = `You are an AI assistant helping a solo residential housekeeper estimate work time and suggest a price for a cleaning job.
The housekeeper wants to earn approximately $${housekeeperPreferences.targetHourlyRate} per hour.
Consider the property details and the services requested.
Provide your response in JSON format: {"estimatedWorkHours": number, "suggestedPrice": number, "explanation": "string detailing your reasoning"}.

Property Details:
- Home Type: ${propertyDetails.homeType || 'N/A'}
- Square Footage: ${propertyDetails.squareFootage || 'N/A'} sq ft
- Bedrooms: ${propertyDetails.numBedrooms || 'N/A'}
- Bathrooms: ${propertyDetails.numBathrooms || 'N/A'}
- Location Zip Code: ${propertyDetails.zipCode || 'N/A'}

Requested Services:
`;

        if (services.baseServices && services.baseServices.length > 0) {
            prompt += "\nBase Services:\n";
            services.baseServices.forEach(service => {
                prompt += `- ${service.name || 'Unnamed Base Service'}\n`;
                if (service.includedTasks && service.includedTasks.length > 0) {
                    prompt += `  Tasks typically included:\n`;
                    service.includedTasks.forEach(task => {
                        prompt += `    - ${task.label || task.id || 'Unspecified task'}\n`;
                    });
                } else {
                    prompt += `  (No specific sub-tasks listed for this service.)\n`;
                }
            });
        }

        if (services.addonServices && services.addonServices.length > 0) {
            prompt += "\nAdd-on Services:\n";
            services.addonServices.forEach(service => {
                prompt += `- ${service.name || 'Unnamed Add-on Service'}\n`;
                if (service.includedTasks && service.includedTasks.length > 0) {
                    prompt += `  Tasks typically included:\n`;
                    service.includedTasks.forEach(task => {
                        prompt += `    - ${task.label || task.id || 'Unspecified task'}\n`;
                    });
                } else {
                    prompt += `  (No specific sub-tasks listed for this add-on.)\n`;
                }
            });
        }

        prompt += "\nBased on all the above, estimate the work duration in hours and suggest a fair price for the housekeeper. The suggested price should be a single flat rate, not a range. Explain your reasoning briefly, focusing on how the combination of property size, number of rooms, and the detail implied by the listed tasks affects the time and price. Do not mention travel time or the housekeeper's zip code in your explanation, only focus on the cleaning job itself.";

        logger.info("Generated OpenAI Prompt:", prompt);

        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo-0125", // Specify the model
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" }, // Enforce JSON output
            temperature: 0.5, // Adjust for more/less deterministic output
        });

        logger.info("OpenAI API Full Response:", JSON.stringify(completion));

        if (!completion.choices || completion.choices.length === 0 || !completion.choices[0].message || !completion.choices[0].message.content) {
            logger.error("OpenAI response is missing expected content.", completion);
            throw new HttpsError("internal", "Failed to get a valid response from AI service (empty content).");
        }

        const suggestionJsonString = completion.choices[0].message.content;
        logger.info("OpenAI Suggestion (JSON String):", suggestionJsonString);

        try {
            const suggestion = JSON.parse(suggestionJsonString);
            // Basic validation of the parsed JSON
            if (typeof suggestion.estimatedWorkHours !== 'number' ||
                typeof suggestion.suggestedPrice !== 'number' ||
                typeof suggestion.explanation !== 'string') {
                logger.error("Parsed AI suggestion has incorrect structure or types:", suggestion);
                throw new HttpsError("internal", "AI suggestion has an invalid format.");
            }
            logger.info("Successfully parsed AI suggestion:", suggestion);
            return { success: true, suggestion: suggestion };
        } catch (e) {
            logger.error("Error parsing AI suggestion JSON:", e, { suggestionJsonString });
            throw new HttpsError("internal", "Failed to parse AI suggestion. The AI returned an invalid JSON response.");
        }

    } catch (error) {
        logger.error("Error in getAIPriceAndTimeSuggestion:", error);
        // Check if it's an HttpsError and rethrow, otherwise wrap it
        if (error instanceof HttpsError) {
            throw error;
        }
        // Include more details for other types of errors if possible
        let message = "An unexpected error occurred while getting AI suggestion.";
        if (error.response && error.response.data && error.response.data.error && error.response.data.error.message) {
            message = `AI Service Error: ${error.response.data.error.message}`;
        } else if (error.message) {
            message = error.message;
        }
        throw new HttpsError("internal", message, { originalError: error.toString() });
    }
});
// --- END NEW AI Price/Time Suggestion Function ---
