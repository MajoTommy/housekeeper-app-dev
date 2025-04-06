/**
 * Gets the Date object for the start of the week (Monday) containing the given date.
 * Uses UTC internally for calculations to avoid DST/timezone shifts.
 * @param {Date} date - The date within the target week.
 * @returns {Date} - A Date object representing Monday 00:00:00 UTC of that week.
 */
export function getWeekStartDate(date) {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0); // Work with UTC date part only
    const utcDay = d.getUTCDay(); // 0 = Sunday, ..., 6 = Saturday
    const daysToSubtract = (utcDay === 0) ? 6 : (utcDay - 1); // Calculate days to reach Monday
    const mondayTimestamp = d.getTime() - (daysToSubtract * 24 * 60 * 60 * 1000);
    return new Date(mondayTimestamp);
}

/**
 * Adds a specified number of days to a date.
 * @param {Date} date - The starting date.
 * @param {number} days - The number of days to add (can be negative).
 * @returns {Date} - The new date.
 */
export function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

/**
 * Formats a date object into a YYYY-MM-DD string (UTC).
 * Useful for Firestore keys or consistent date representation.
 * @param {Date} date - The date to format.
 * @returns {string} - The date in YYYY-MM-DD format.
 */
export function formatDateToISO(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        console.error("Invalid date passed to formatDateToISO:", date);
        return "Invalid Date";
    }
    const year = date.getUTCFullYear();
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = date.getUTCDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Generates an array of 7 Date objects representing the week starting from the given date.
 * Assumes the startDate is the beginning of the week (e.g., Monday from getWeekStartDate).
 * @param {Date} startDate - The starting date of the week.
 * @returns {Date[]} - An array of 7 Date objects.
 */
export function getWeekDates(startDate) {
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
        weekDates.push(addDays(startDate, i));
    }
    return weekDates;
}


/**
 * Formats a date object for display using specified options and time zone.
 * Defaults to a short date format (e.g., "Jul 21, 2025").
 * @param {Date} date - The date to format.
 * @param {string} [timeZone='UTC'] - Optional IANA time zone string (e.g., 'America/Los_Angeles').
 * @param {object} [options={ year: 'numeric', month: 'short', day: 'numeric' }] - Optional Intl.DateTimeFormat options.
 * @returns {string} - The formatted date string.
 */
export function formatDateForDisplay(date, timeZone = 'UTC', options = {}) {
     if (!(date instanceof Date) || isNaN(date.getTime())) {
        return "Invalid Date";
     }

     // Default options if none provided
     const defaultOptions = { year: 'numeric', month: 'short', day: 'numeric' };
     const effectiveOptions = { ...defaultOptions, ...options }; 

     // Ensure timeZone is included in options
     effectiveOptions.timeZone = timeZone;
     
     try {
        // Use 'en-CA' locale for a format closer to YYYY-MM-DD if needed, or keep undefined for browser default
        return date.toLocaleDateString(undefined, effectiveOptions); 
     } catch (e) {
         console.error("Error formatting date with timezone", date, timeZone, effectiveOptions, e);
         // Fallback to basic UTC date string if formatting fails (e.g., invalid timezone)
         return date.toISOString().split('T')[0]; // Return YYYY-MM-DD part of ISO string as fallback
     }
}

/**
 * Converts a time string (e.g., "8:30 AM", "14:00") to minutes since midnight.
 * @param {string | null | undefined} timeStr - The time string.
 * @returns {number | null} - Minutes since midnight, or null if invalid.
 */
export function timeStringToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return null;
    const time = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!time) return null;

    let hours = parseInt(time[1], 10);
    const minutes = parseInt(time[2], 10);
    const period = time[3] ? time[3].toUpperCase() : null;

    if (isNaN(hours) || isNaN(minutes)) return null;
    if (hours < 0 || hours > 23 && !period) return null; // Basic 24hr validation
    if (period && (hours < 1 || hours > 12)) return null; // Basic 12hr validation
    if (minutes < 0 || minutes > 59) return null;

    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0; // Midnight case

    // Final check for validity (e.g., 24:00 is invalid)
    if (hours >= 24) return null; 

    return hours * 60 + minutes;
}

/**
 * Converts minutes since midnight to a 12-hour time string (e.g., "8:30 AM").
 * @param {number | null | undefined} totalMinutes - Minutes since midnight.
 * @returns {string} - The formatted time string, or empty string if invalid.
 */
export function minutesToTimeString(totalMinutes) {
    if (totalMinutes === null || totalMinutes === undefined || totalMinutes < 0 || totalMinutes >= 1440) { // 1440 = 24 * 60
        return ''; 
    }
    const hours24 = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
    const period = hours24 < 12 ? 'AM' : 'PM';
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// Add more utility functions here as needed...

/**
 * Gets the number of days in a given month and year.
 * Handles leap years correctly.
 * @param {number} year - The full year (e.g., 2025).
 * @param {number} month - The month (0-indexed, 0=January, 11=December).
 * @returns {number} - The number of days in the month.
 */
export function getDaysInMonth(year, month) {
    // Day 0 of the next month gives the last day of the current month
    return new Date(year, month + 1, 0).getDate();
}

/**
 * Gets the day of the week for the first day of a given month and year.
 * @param {number} year - The full year (e.g., 2025).
 * @param {number} month - The month (0-indexed, 0=January, 11=December).
 * @returns {number} - The day of the week (0=Sunday, 6=Saturday).
 */
export function getFirstDayOfMonth(year, month) {
    return new Date(year, month, 1).getDay();
}

/**
 * Formats a date object into a month/year string (e.g., "July 2025").
 * @param {Date} date - The date to format.
 * @param {string} [timeZone='UTC'] - Optional IANA time zone string.
 * @returns {string} - The formatted month/year string.
 */
export function formatMonthYear(date, timeZone = 'UTC') {
    return formatDateForDisplay(date, timeZone, { year: 'numeric', month: 'long', timeZone });
} 