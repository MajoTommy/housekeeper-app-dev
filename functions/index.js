/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onCall, HttpsError} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

// --- Time Helper Functions ---

/**
 * Converts a time string (e.g., "9:00 AM", "14:30") to minutes since midnight.
 * @param {string} timeStr The time string.
 * @return {number|null} Minutes since midnight or null if invalid.
 */
function timeStringToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return null;
    const time = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (!time) return null;
    let hours = parseInt(time[1], 10);
    const minutes = parseInt(time[2], 10);
    const period = time[3] ? time[3].toUpperCase() : null;
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
}

/**
 * Converts minutes since midnight to a 12-hour time string (e.g., "9:00 AM").
 * @param {number} totalMinutes Minutes since midnight.
 * @return {string} Formatted time string.
 */
function minutesToTimeString(totalMinutes) {
    if (totalMinutes === null || totalMinutes === undefined || totalMinutes < 0) return '';
    const hours24 = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
    const period = hours24 < 12 ? 'AM' : 'PM';
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// --- Main Cloud Function: getAvailableSlots ---
exports.getAvailableSlots = onCall(async (request) => {
    logger.info("getAvailableSlots called", { authUid: request.auth ? request.auth.uid : "none" });

    // 1. Authentication Check (Optional based on Firestore rules)
    // if (!request.auth) {
    //     logger.warn("Unauthenticated access attempt to getAvailableSlots");
    //     throw new HttpsError(
    //         "unauthenticated",
    //         "The function must be called while authenticated.",
    //     );
    // }
    // const homeownerId = request.auth.uid; // Use if needed for permissions

    // 2. Input Validation
    const { housekeeperId, startDateString, endDateString } = request.data;
    if (!housekeeperId || !startDateString || !endDateString) {
        logger.error("Missing required data fields", {
            hasHousekeeperId: !!housekeeperId,
            hasStartDate: !!startDateString,
            hasEndDate: !!endDateString,
        });
        throw new HttpsError(
            "invalid-argument",
            "Required data missing (housekeeperId, startDateString, endDateString).",
        );
    }

    let startDate, endDate;
    try {
        // Parse dates explicitly assuming UTC interpretation might be needed
        // Simplest is often ensuring the input string is unambiguous (like ISO with Z)
        startDate = new Date(startDateString);
        endDate = new Date(endDateString);
        
        // Set time to UTC midnight to avoid timezone shifts affecting the date part
        startDate.setUTCHours(0, 0, 0, 0);
        endDate.setUTCHours(0, 0, 0, 0);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            throw new Error("Invalid date format provided.");
        }
        logger.info(`Processing request for housekeeper: ${housekeeperId}, UTC range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    } catch (e) {
        logger.error("Invalid date format provided", {
            startDateString,
            endDateString,
            error: e.message,
        });
        throw new HttpsError(
            "invalid-argument",
            "Invalid date format. Please provide ISO 8601 strings.",
        );
    }

    try {
        // 3. Fetch Housekeeper Settings
        const settingsPath = `users/${housekeeperId}/settings/app`;
        const settingsDoc = await db.doc(settingsPath).get();

        if (!settingsDoc.exists) {
            logger.error(`Settings not found for housekeeper ${housekeeperId}`);
            // Return defined structure even if settings are missing
            return { schedule: {}, message: "Housekeeper settings not found." };
        }
        const settings = settingsDoc.data();
        
        logger.info("Fetched settings successfully.", { housekeeperId });

        // 4. Fetch Bookings for the range
        const bookingsPath = `users/${housekeeperId}/bookings`;
        const bookingsRef = db.collection(bookingsPath);
        const startTimestamp = admin.firestore.Timestamp.fromDate(startDate);
        // Calculate end timestamp carefully to include the *entire* end date
        const dayAfterEndDate = new Date(endDate);
        dayAfterEndDate.setDate(endDate.getDate() + 1); // Move to the next day
        dayAfterEndDate.setHours(0, 0, 0, 0); // Set to midnight UTC
        const endTimestamp = admin.firestore.Timestamp.fromDate(dayAfterEndDate);

        const bookingsSnapshot = await bookingsRef
            .where("date", ">=", startTimestamp)
            .where("date", "<", endTimestamp) // Use '<' with start of *next* day
            // Ordering might be useful for debugging but not strictly needed for logic
            // .orderBy("date")
            .get();

        const bookings = [];
        bookingsSnapshot.forEach((doc) => {
            bookings.push({ id: doc.id, ...doc.data() });
        });
        logger.info(`Fetched ${bookings.length} bookings in range.`, { housekeeperId });

        // 5. Calculate Availability
        const schedule = {}; // Stores availability by YYYY-MM-DD
        const DEFAULT_JOB_DURATION = 180; // minutes
        const DEFAULT_BREAK_DURATION = 0; // minutes
        const dayNames = [
            "Sunday", "Monday", "Tuesday", "Wednesday",
            "Thursday", "Friday", "Saturday",
        ]; // Index matches getDay()

        // Pre-process bookings for efficient lookup by date string
        const bookingsByDate = {};
        bookings.forEach((booking) => {
            // Basic validation of booking structure
            if (!booking.date || !booking.startTime || !booking.endTime) {
                logger.warn("Skipping booking with missing fields", { bookingId: booking.id });
                return; // Skip this booking
            }
            let bookingDateStr;
            // Handle Firestore Timestamp or potentially a string date
            if (booking.date.toDate) {
                // Ensure consistency: Use UTC date string YYYY-MM-DD
                bookingDateStr = booking.date.toDate().toISOString().split("T")[0];
            } else if (typeof booking.date === "string") {
                // Assuming string is already YYYY-MM-DD
                bookingDateStr = booking.date.split("T")[0];
            } else {
                logger.warn("Skipping booking with invalid date format", { bookingId: booking.id });
                return; // Skip invalid date format
            }

            if (!bookingsByDate[bookingDateStr]) {
                bookingsByDate[bookingDateStr] = [];
            }
            const startMinutes = timeStringToMinutes(booking.startTime);
            const endMinutes = timeStringToMinutes(booking.endTime);
            // Ensure times converted correctly
            if (startMinutes !== null && endMinutes !== null) {
                bookingsByDate[bookingDateStr].push({ startMinutes, endMinutes });
            } else {
                logger.warn("Skipping booking with invalid time format", {
                    bookingId: booking.id,
                    startTime: booking.startTime,
                    endTime: booking.endTime,
                });
            }
        });

        // Loop through each date in the requested range using UTC
        let currentDateLoop = new Date(startDate); // Start with the UTC midnight startDate

        while (currentDateLoop.getTime() <= endDate.getTime()) {
            // Format date string based on UTC values
            const year = currentDateLoop.getUTCFullYear();
            const month = (currentDateLoop.getUTCMonth() + 1).toString().padStart(2, '0'); // getUTCMonth is 0-indexed
            const day = currentDateLoop.getUTCDate().toString().padStart(2, '0');
            const currentDateStr = `${year}-${month}-${day}`; // YYYY-MM-DD using UTC components
            
            const dayOfWeekIndex = currentDateLoop.getUTCDay(); // 0 = Sunday (UTC), ..., 6 = Saturday (UTC)
            const dayKey = dayNames[dayOfWeekIndex].toLowerCase(); // e.g., "monday"

            // Get settings for the specific day, defaulting to non-working
            const daySettings = (settings.workingDays && settings.workingDays[dayKey]) ?
                settings.workingDays[dayKey] : { isWorking: false };
            const isWorking = daySettings.isWorking === true;

            // Initialize schedule entry for the day
            schedule[currentDateStr] = {
                date: currentDateStr,
                dayName: dayNames[dayOfWeekIndex],
                isWorking: isWorking,
                slots: [], // Array to hold available/booked/unavailable slots
            };

            if (isWorking) {
                // Determine job durations, providing robust fallback
                let actualJobDurations = [];
                if (Array.isArray(daySettings.jobDurations) &&
                    daySettings.jobDurations.length > 0 &&
                    // Ensure all elements are positive numbers
                    daySettings.jobDurations.every((d) => typeof d === "number" && d > 0)) {
                    actualJobDurations = daySettings.jobDurations;
                } else {
                    // Fallback logic: Use jobsPerDay or default to 1 job
                    const jobsPerDayFallback = (typeof daySettings.jobsPerDay === "number" &&
                        daySettings.jobsPerDay > 0) ?
                        daySettings.jobsPerDay : 1;
                    actualJobDurations =
                        Array(jobsPerDayFallback).fill(DEFAULT_JOB_DURATION);
                    if (actualJobDurations.length === 0) {
                        logger.warn(`No valid job durations found for working day: ${currentDateStr}`);
                    }
                }

                // Get break durations, defaulting to empty array
                const breakDurations = Array.isArray(daySettings.breakDurations) ?
                    daySettings.breakDurations : [];
                // Get start time, defaulting to 9:00 AM
                const startTimeMinutes = timeStringToMinutes(daySettings.startTime || "09:00");

                // *** RE-ADDED LOGGING (WARN): Check durations fetched ***
                logger.warn(`[${dayKey}] Durations fetched from settings:`, {
                    jobs: JSON.stringify(actualJobDurations),
                    breaks: JSON.stringify(breakDurations)
                });
                // *** END LOGGING ***

                if (startTimeMinutes !== null) {
                    let currentTimeMinutes = startTimeMinutes;
                    const todaysBookings = bookingsByDate[currentDateStr] || [];

                    // Iterate through each job configured for the day
                    for (let jobIndex = 0; jobIndex < actualJobDurations.length; jobIndex++) {
                        const jobDuration = actualJobDurations[jobIndex];
                        const slotStartMinutes = currentTimeMinutes;
                        const slotEndMinutes = slotStartMinutes + jobDuration;

                        // *** RE-ADDED LOGGING (WARN): Check job duration used ***
                        logger.warn(`[${dayKey}] Job ${jobIndex}: Using jobDuration=${jobDuration}. Slot: ${minutesToTimeString(slotStartMinutes)} - ${minutesToTimeString(slotEndMinutes)}`);
                        // *** END LOGGING ***

                        // Check if this calculated slot overlaps with any existing booking
                        let isBooked = false;
                        for (const booking of todaysBookings) {
                            // Standard overlap check:
                            // Slot starts before booking ends AND Slot ends after booking starts
                            if (slotStartMinutes < booking.endMinutes &&
                                slotEndMinutes > booking.startMinutes) {
                                isBooked = true;
                                break; // Found overlap, no need to check other bookings
                            }
                        }

                        // Add the calculated job slot to the schedule
                        schedule[currentDateStr].slots.push({
                            startTime: minutesToTimeString(slotStartMinutes),
                            endTime: minutesToTimeString(slotEndMinutes),
                            status: isBooked ? "booked" : "available",
                        });

                        // Advance current time past the job slot
                        currentTimeMinutes = slotEndMinutes;

                        // Add break time if configured after this job
                        if (jobIndex < breakDurations.length) {
                            const breakDuration = (typeof breakDurations[jobIndex] === "number" &&
                                breakDurations[jobIndex] >= 0) ?
                                breakDurations[jobIndex] : DEFAULT_BREAK_DURATION;
                            
                            // *** RE-ADDED LOGGING (WARN): Check break duration used ***
                            logger.warn(`[${dayKey}] Break ${jobIndex}: Using breakDuration=${breakDuration}.`);
                            // *** END LOGGING ***

                            if (breakDuration > 0) {
                                const breakStartMinutes = currentTimeMinutes;
                                const breakEndMinutes = breakStartMinutes + breakDuration;
                                // Add break as an 'unavailable' block
                                schedule[currentDateStr].slots.push({
                                    startTime: minutesToTimeString(breakStartMinutes),
                                    endTime: minutesToTimeString(breakEndMinutes),
                                    status: "unavailable", // Explicitly mark breaks
                                });
                                // Advance current time past the break
                                currentTimeMinutes = breakEndMinutes;
                            }
                        }
                    } // End loop through jobs for the day
                } else {
                    logger.warn(`Invalid start time "${daySettings.startTime}" ` +
                        `for day ${currentDateStr}, skipping slot generation.`);
                }
            } // End if(isWorking)

            // Move to the next day using UTC
            currentDateLoop.setUTCDate(currentDateLoop.getUTCDate() + 1);
        }

        logger.info("Finished calculating schedule.", { housekeeperId });
        // 6. Return Results
        return { schedule }; // Return the calculated schedule object
    } catch (error) {
        logger.error("Error processing getAvailableSlots:", {
            error: error.message,
            stack: error.stack, // Log stack trace for debugging
            housekeeperId, // Include relevant context
        });
        // Throw a generic internal error to the client
        throw new HttpsError(
            "internal",
            "An error occurred while calculating availability. Please try again later.",
            // Avoid leaking detailed error messages to the client
        );
    }
});
