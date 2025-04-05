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

/**
 * Converts minutes since midnight to a 12-hour time string (e.g., "9:00 AM").
 * @param {number | null | undefined} totalMinutes Minutes since midnight.
 * @return {string} Formatted time string.
 */
function minutesToTimeString(totalMinutes) {
  if (totalMinutes === null || totalMinutes === undefined || totalMinutes < 0) return "";
  const totalMinutesValid = Math.round(totalMinutes);
  const hours24 = Math.floor(totalMinutesValid / 60) % 24;
  const minutes = totalMinutesValid % 60;
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const period = hours24 < 12 ? "AM" : "PM";
  return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
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

// --- Main Cloud Function: getAvailableSlots ---
exports.getAvailableSlots = onCall(async (request) => {
    logger.info("getAvailableSlots (JS v2) called", { authUid: request.auth ? request.auth.uid : "none", data: request.data });

    // 1. Input Validation
    const { housekeeperId, startDateString, endDateString } = request.data;
    if (!housekeeperId || typeof housekeeperId !== "string" || !startDateString || !endDateString) {
        logger.error("Missing or invalid required data fields", { hasHkId: !!housekeeperId, typeHkId: typeof housekeeperId, hasStart: !!startDateString, hasEnd: !!endDateString });
        throw new HttpsError("invalid-argument", "Required data missing or invalid (housekeeperId, startDateString, endDateString).");
    }

    let startDate, endDate;
    try {
        startDate = new Date(startDateString);
        endDate = new Date(endDateString);
        startDate.setUTCHours(0, 0, 0, 0);
        endDate.setUTCHours(0, 0, 0, 0);
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            throw new Error("Invalid date conversion.");
        }
        logger.info(`Processing request for housekeeper: ${housekeeperId}, UTC range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
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

        // 3. Fetch Bookings
        const bookingsPath = `users/${housekeeperId}/bookings`;
        const bookingsRef = db.collection(bookingsPath);
        
        // --- Query using STRINGS (YYYY-MM-DD format assumed in DB) ---
        const startDateStrQuery = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
        // For the end date, we still want to include the full endDate.
        // String comparison "2025-04-07" >= "2025-04-07" works.
        // We need dates less than or equal to the endDate string.
        const endDateStrQuery = endDate.toISOString().split('T')[0]; // YYYY-MM-DD
        logger.info(`Querying bookings using date strings: >= ${startDateStrQuery} and <= ${endDateStrQuery}`);

        const bookingsSnapshot = await bookingsRef
          .where("date", ">=", startDateStrQuery)
          .where("date", "<=", endDateStrQuery) // Use string comparison
          .get();
        // Note: Ordering might be less reliable with string dates vs Timestamps if format varies.

        const bookingsByDate = {};
        bookingsSnapshot.forEach((doc) => {
          const booking = doc.data();
          const bookingId = doc.id;
          
          // --- Process assuming date is a STRING (with logging) --- 
          const bookingDateField = booking.date;
          // Log with quotes to see potential whitespace
          logger.info(`Processing booking ${bookingId} - Date field type: ${typeof bookingDateField}, value: '${bookingDateField}'`); 
          
          let bookingDateStr = null;
          // Check 1: Is it the expected string?
          if (typeof bookingDateField === 'string') { 
               // Trim whitespace just in case
               const trimmedDate = bookingDateField.trim();
               const matchResult = trimmedDate.match(/^\d{4}-\d{2}-\d{2}$/);
               // Log the match result explicitly
               logger.info(`Regex match result for ${bookingId} on trimmed date '${trimmedDate}':`, matchResult);
               
               if (matchResult) { 
                   bookingDateStr = trimmedDate; // Use trimmed string if match is successful
               }
          }
          
          // Check 2: Is it a Timestamp (if string check failed)?
          if (bookingDateStr === null && bookingDateField && typeof bookingDateField.toDate === 'function') {
              logger.warn(`Booking ${bookingId} has Timestamp date, converting to string.`);
              const bookingDate = bookingDateField.toDate();
              const year = bookingDate.getUTCFullYear();
              const month = (bookingDate.getUTCMonth() + 1).toString().padStart(2, "0");
              const day = bookingDate.getUTCDate().toString().padStart(2, "0");
              bookingDateStr = `${year}-${month}-${day}`;
          }
          
          // Check 3: If neither worked...
          if (bookingDateStr === null) {
            logger.warn("Skipping booking: Date field did not match expected string format OR Timestamp.", { bookingId, dateValue: bookingDateField });
            return; // Skip
          }
          
          // Log the final string that will be used as the key
          logger.info(`Using date string key for booking ${bookingId}: ${bookingDateStr}`);

          // Only consider bookings that aren't explicitly cancelled
          if (booking.status === 'cancelled') {
              logger.info("Skipping cancelled booking", { bookingId });
              return;
          }

          const startMinutes = timeStringToMinutes(booking.startTime);
          const endMinutes = timeStringToMinutes(booking.endTime);
          if (startMinutes === null || endMinutes === null || startMinutes >= endMinutes) {
              logger.warn("Skipping booking with invalid/missing time or start>=end", { bookingId, start: booking.startTime, end: booking.endTime });
              return;
          }

          if (!bookingsByDate[bookingDateStr]) {
              bookingsByDate[bookingDateStr] = [];
          }
          bookingsByDate[bookingDateStr].push({ startMinutes, endMinutes, id: bookingId, status: booking.status });
        });
        logger.info(`Fetched and processed ${bookingsSnapshot.size} relevant bookings.`, { housekeeperId });

        // 4. Calculate Availability Day by Day
        const schedule = {};
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        let currentDateLoop = new Date(startDate);

        while (currentDateLoop.getTime() <= endDate.getTime()) {
            // --- Date Setup ---
            const year = currentDateLoop.getUTCFullYear();
            const month = (currentDateLoop.getUTCMonth() + 1).toString().padStart(2, "0");
            const day = currentDateLoop.getUTCDate().toString().padStart(2, "0");
            const currentDateStr = `${year}-${month}-${day}`;
            const dayOfWeekIndex = currentDateLoop.getUTCDay();
            const dayKey = dayNames[dayOfWeekIndex].toLowerCase();

            // --- Settings and Bookings for the Day ---
            const daySettings = settings.workingDays[dayKey] || { isWorking: false };
            const isWorkingBasedOnSettings = daySettings.isWorking === true;
            const todaysBookings = bookingsByDate[currentDateStr] || [];

            logger.info(`Processing ${currentDateStr} (${dayKey}): Settings Working=${isWorkingBasedOnSettings}, Bookings=${todaysBookings.length}`);

            // --- Generate Potential Slots (Jobs & Breaks) from Settings ---
            let potentialSlotsMinutes = [];
            if (isWorkingBasedOnSettings) {
                const startTimeMinutes = timeStringToMinutes(daySettings.startTime || "09:00");
                if (startTimeMinutes !== null) {
                    let currentTimeMinutes = startTimeMinutes;
                    // Ensure jobDurations is an array of valid numbers
                    const jobDurationsInput = daySettings.jobDurations;
                    let jobDurations = [];
                    if (Array.isArray(jobDurationsInput) && jobDurationsInput.length > 0 && jobDurationsInput.every(d => typeof d === "number" && d > 0)) {
                        jobDurations = jobDurationsInput;
                    } else {
                        const jobsPerDayFallback = (typeof daySettings.jobsPerDay === "number" && daySettings.jobsPerDay > 0) ? daySettings.jobsPerDay : 1;
                        jobDurations = Array(jobsPerDayFallback).fill(DEFAULT_JOB_DURATION);
                        if(jobsPerDayFallback === 0) jobDurations = []; // Handle case of explicitly 0 jobs
                        logger.warn(`Using fallback job durations for ${currentDateStr}`, {count: jobsPerDayFallback, duration: DEFAULT_JOB_DURATION});
                    }

                    // Ensure breakDurations is an array of valid numbers
                    const breakDurationsInput = daySettings.breakDurations;
                    let breakDurations = [];
                    if (Array.isArray(breakDurationsInput)) {
                        breakDurations = breakDurationsInput.map(d => typeof d === 'number' && d > 0 ? d : 0);
                    }

                    for (let jobIndex = 0; jobIndex < jobDurations.length; jobIndex++) {
                        const jobDuration = jobDurations[jobIndex];
                        const jobStart = currentTimeMinutes;
                        const jobEnd = jobStart + jobDuration;
                        potentialSlotsMinutes.push({ startMinutes: jobStart, endMinutes: jobEnd, type: 'job' });
                        currentTimeMinutes = jobEnd;

                        // Add break *after* job if applicable
                        if (jobIndex < jobDurations.length - 1) {
                            const breakDuration = breakDurations.length > jobIndex ? breakDurations[jobIndex] : 0;
                            if (breakDuration > 0) {
                                const breakStart = currentTimeMinutes;
                                const breakEnd = breakStart + breakDuration;
                                potentialSlotsMinutes.push({ startMinutes: breakStart, endMinutes: breakEnd, type: 'break' });
                                currentTimeMinutes = breakEnd;
                            }
                        }
                    }
                    logger.info(`Generated ${potentialSlotsMinutes.length} potential slots based on settings for ${currentDateStr}`);
                } else {
                    logger.warn(`Invalid start time in settings for ${currentDateStr}, cannot generate potential slots.`);
                }
            }

            // --- Combine Bookings and Potential Slots ---
            const finalSlotsMinutes = [];

            // 1. Add all bookings for the day first
            todaysBookings.forEach(booking => {
                if (booking.startMinutes !== null && booking.endMinutes !== null) {
                    finalSlotsMinutes.push({
                        startMinutes: booking.startMinutes,
                        endMinutes: booking.endMinutes,
                        status: 'booked',
                        type: 'booking' // Keep track of the source
                    });
                }
            });

            // 2. Add potential slots if they DON'T overlap with existing bookings
            potentialSlotsMinutes.forEach(potentialSlot => {
                let overlapsWithBooking = false;
                for (const bookedSlot of finalSlotsMinutes) { // Check only against slots already marked as 'booking'
                    if (bookedSlot.type === 'booking' &&
                        Math.max(potentialSlot.startMinutes, bookedSlot.startMinutes) < Math.min(potentialSlot.endMinutes, bookedSlot.endMinutes))
                    {
                        overlapsWithBooking = true;
                        break;
                    }
                }

                if (!overlapsWithBooking) {
                    // Add the non-overlapping potential slot
                    finalSlotsMinutes.push({
                        ...potentialSlot, // Includes start/end minutes and type ('job' or 'break')
                        status: potentialSlot.type === 'break' ? 'unavailable' : 'available' // Assign status based on type
                    });
                } else {
                    logger.info(`Potential slot ${minutesToTimeString(potentialSlot.startMinutes)}-${minutesToTimeString(potentialSlot.endMinutes)} (${potentialSlot.type}) overlaps with booking on ${currentDateStr}, discarding.`);
                }
            });

            // --- Sort and Finalize ---
            finalSlotsMinutes.sort((a, b) => a.startMinutes - b.startMinutes);

            // Determine overall working status for display
            const isWorkingForDisplay = finalSlotsMinutes.length > 0;

            // Convert minutes back to time strings
            const finalSlotsStrings = finalSlotsMinutes.map(slot => ({
                startTime: minutesToTimeString(slot.startMinutes),
                endTime: minutesToTimeString(slot.endMinutes),
                status: slot.status,
            }));

            // Add to the main schedule object
            schedule[currentDateStr] = {
                date: currentDateStr,
                dayName: dayNames[dayOfWeekIndex],
                isWorking: isWorkingForDisplay,
                slots: finalSlotsStrings,
            };

            // *** ADD DIAGNOSTIC LOG ***
            if (currentDateStr === '2025-04-03') {
                 logger.warn("DIAGNOSTIC - Final data for 2025-04-03:", {
                     isWorkingBasedOnSettings,
                     todaysBookingsCount: todaysBookings.length,
                     potentialSlotsCount: potentialSlotsMinutes.length,
                     finalSlotsMinutesCount: finalSlotsMinutes.length,
                     isWorkingForDisplay,
                     // Log first few slots if they exist for inspection
                     finalSlotsStringsSample: finalSlotsStrings.slice(0, 3), 
                     scheduleEntry: JSON.stringify(schedule[currentDateStr]) // Log the final object stringified
                 });
            }
            // *** END DIAGNOSTIC LOG ***

            // Move to the next day
            currentDateLoop.setUTCDate(currentDateLoop.getUTCDate() + 1);
        } // End daily loop

        logger.info("Finished calculating schedule successfully.", { housekeeperId });
        return { schedule };

    } catch (error) {
        logger.error("Error occurred while calculating availability:", {
            housekeeperId,
            startDateString,
            endDateString,
            error: error.message,
            stack: error.stack,
        });
        throw new HttpsError(
            "internal",
            "An error occurred while calculating availability. Please try again later.",
            { originalErrorMessage: error.message },
        );
    }
});
