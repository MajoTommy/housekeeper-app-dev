// date-utils.js - Shared Date Utility Functions

/**
 * Gets the local timezone string (e.g., 'America/Los_Angeles').
 * @returns {string} The IANA timezone string.
 */
export function getLocalTimezone() {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (e) {
        console.warn('Could not determine local timezone, defaulting to UTC.', e);
        return 'UTC';
    }
};

/**
 * Gets the Date object for the start of the week (Monday) containing the given date.
 * Considers the local timezone of the input date.
 * @param {Date} date - The date within the target week.
 * @returns {Date} - A Date object representing Monday 00:00:00 in the local timezone of the input date.
 */
export function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to get Monday
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0); // Set to midnight in local time
    return monday;
};

/**
 * Gets the Date object for the end of the week (Sunday) containing the given date.
 * Considers the local timezone of the input date.
 * @param {Date} date - The date within the target week.
 * @returns {Date} - A Date object representing Sunday 23:59:59.999 in the local timezone of the input date.
 */
export function getEndOfWeek(date) {
    const monday = getStartOfWeek(date);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999); // Set to end of day Sunday in local time
    return sunday;
};

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
};

/**
  * Subtracts a specified number of days from a date.
  * @param {Date} date - The starting date.
  * @param {number} days - The number of days to subtract.
  * @returns {Date} - The new date.
  */
export function subtractDays(date, days) {
    return addDays(date, -days);
};

/**
 * Gets the start of the day (00:00:00.000) for a given date in its local timezone.
 * @param {Date} date - The input date.
 * @returns {Date} - A new Date object representing the start of the day.
 */
export function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
};

/**
 * Checks if two dates represent the same calendar date (ignoring time).
 * @param {Date} date1 - The first date.
 * @param {Date} date2 - The second date.
 * @returns {boolean} - True if they are the same date, false otherwise.
 */
export function isSameDate(date1, date2) {
    if (!date1 || !date2) return false;
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
};

/**
 * Formats a date object into a string based on predefined formats or Intl.DateTimeFormat options.
 * Handles timezone conversion.
 * @param {Date | string | number} dateInput - The date to format (Date object, timestamp, or ISO string).
 * @param {string | object} formatOrOptions - Predefined format string ('YYYY-MM-DD', 'short-date', 'full-date', 'month-day', 'weekday-short', 'day-of-month', 'short-numeric', 'short-weekday-numeric') OR an Intl.DateTimeFormat options object.
 * @param {string} [timeZone] - Optional IANA timezone string. Defaults to local timezone.
 * @returns {string} - The formatted date string, or "Invalid Date" on error.
 */
export function formatDate(dateInput, formatOrOptions, timeZone) {
    let date;
    let effectiveTimeZone = timeZone || getLocalTimezone(); // Default to passed or local timezone

    try {
        if (typeof dateInput === 'string' && dateInput.match(/^\\d{4}-\\d{2}-\\d{2}$/)) {
            // For "YYYY-MM-DD" strings, interpret as UTC to ensure calendar date fidelity
            const parts = dateInput.split('-');
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
            const day = parseInt(parts[2], 10);
            date = new Date(Date.UTC(year, month, day));
            effectiveTimeZone = 'UTC'; // Force UTC for formatting this specific input type
        } else {
            // For other string formats or Date objects, use existing logic
            date = new Date(dateInput);
        }
        if (isNaN(date.getTime())) throw new Error('Invalid date input');
    } catch (e) {
        console.error('Invalid date input provided to formatDate:', dateInput, e);
        return "Invalid Date";
    }

    let options = {};

    if (typeof formatOrOptions === 'string') {
        switch (formatOrOptions) {
            case 'YYYY-MM-DD':
                try {
                    const yearStr = date.toLocaleDateString('en-CA', { year: 'numeric', timeZone: effectiveTimeZone });
                    const monthStr = date.toLocaleDateString('en-CA', { month: '2-digit', timeZone: effectiveTimeZone });
                    const dayStr = date.toLocaleDateString('en-CA', { day: '2-digit', timeZone: effectiveTimeZone });
                    return `${yearStr}-${monthStr}-${dayStr}`;
                } catch (e) {
                     console.error("Error formatting date to YYYY-MM-DD with timezone", date, effectiveTimeZone, e);
                     return date.toISOString().split('T')[0]; // Fallback, safe for UTC dates
                }
            case 'short-date': // e.g., Jul 21, 2025
                options = { year: 'numeric', month: 'short', day: 'numeric' };
                break;
             case 'short-numeric': // e.g., Apr 8, 2025
                options = { year: 'numeric', month: 'short', day: 'numeric' };
                break;
            case 'short-weekday-numeric': // e.g., "Mon, Apr 7"
                 options = { weekday: 'short', month: 'short', day: 'numeric' };
                 break;
            case 'full-date': // e.g., Tuesday, July 21, 2025
                options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                break;
            case 'month-day': // e.g., July 21
                options = { month: 'long', day: 'numeric' };
                break;
            case 'weekday-short': // e.g., Mon
                options = { weekday: 'short' };
                break;
             case 'ddd': // e.g., Mon (alias for weekday-short)
                 options = { weekday: 'short' };
                 break;
            case 'D': // e.g., 8 (day of month)
                options = { day: 'numeric' };
                break;
            case 'day-of-month': // e.g., 21
                options = { day: 'numeric' };
                break;
            default:
                console.warn('Unsupported format string in formatDate:', formatOrOptions);
                options = { year: 'numeric', month: 'short', day: 'numeric' }; // Default format
        }
    } else if (typeof formatOrOptions === 'object') {
        options = formatOrOptions;
    }

    options.timeZone = effectiveTimeZone; // Use the determined effectiveTimeZone

    try {
        return date.toLocaleDateString(undefined, options);
    } catch (e) {
        console.error('Error formatting date with options:', date, options, e);
        try {
            return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: effectiveTimeZone });
        } catch (fallbackError) {
            console.error('Fallback date formatting failed:', fallbackError);
            return date.toISOString().split('T')[0]; // Absolute fallback
        }
    }
};

/**
 * Formats the time portion of a date object or a time string (like "08:00" or "14:30") into a string.
 * Handles timezone conversion for Date objects.
 * @param {Date | string} timeInput - The Date object or time string (HH:MM or HH:MM AM/PM).
 * @param {string} [timeZone] - Optional IANA timezone string. Required if timeInput is a Date object.
 * @param {string | object} formatOrOptions - Predefined format string ('h:mm A', 'HH:mm') OR Intl.DateTimeFormat options.
 * @returns {string} - The formatted time string, or "Invalid Time" on error.
 */
export function formatTime(timeInput, timeZone, formatOrOptions) {
    let dateObject;
    const targetTimeZone = timeZone || getLocalTimezone();
    let options = {};

    try {
        if (timeInput instanceof Date) {
            dateObject = timeInput;
        } else if (typeof timeInput === 'string') {
            const timeParts = timeInput.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
            if (timeParts) {
                let hours = parseInt(timeParts[1], 10);
                const minutes = parseInt(timeParts[2], 10);
                const period = timeParts[3] ? timeParts[3].toUpperCase() : null;
                if (period === 'PM' && hours < 12) hours += 12;
                if (period === 'AM' && hours === 12) hours = 0;
                dateObject = new Date();
                dateObject.setHours(hours, minutes, 0, 0);
            } else {
                throw new Error('Invalid time string format');
            }
        } else {
            throw new Error('Invalid time input type');
        }
        if (isNaN(dateObject.getTime())) throw new Error('Parsed date is invalid');
    } catch (e) {
        console.error('Invalid time input provided to formatTime:', timeInput, e);
        return "Invalid Time";
    }

    if (typeof formatOrOptions === 'string') {
        switch (formatOrOptions) {
            case 'h:mm A': options = { hour: 'numeric', minute: '2-digit', hour12: true }; break;
            case 'HH:mm': options = { hour: '2-digit', minute: '2-digit', hour12: false }; break;
            default: options = { hour: 'numeric', minute: '2-digit', hour12: true };
        }
    } else if (typeof formatOrOptions === 'object') {
        options = formatOrOptions;
    }

    options.timeZone = targetTimeZone;

    try {
        return dateObject.toLocaleTimeString(undefined, options);
    } catch (e) {
        console.error('Error formatting time:', dateObject, options, e);
        try {
            return dateObject.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: targetTimeZone });
        } catch (fallbackError) {
            console.error('Fallback time formatting failed:', fallbackError);
            return "Invalid Time";
        }
    }
};

/**
 * Parses a date string and a time string into a Date object in the specified timezone.
 * @param {Date | string} dateInput - The date part (Date object, YYYY-MM-DD string).
 * @param {string} timeString - The time part (e.g., "9:00 AM", "14:30").
 * @param {string} timeZone - The target IANA timezone.
 * @returns {Date | null} - A Date object representing the combined date and time in the target timezone, or null on error.
 */
export function parseDateTime(dateInput, timeString, timeZone) {
    let year, month, day;
    try {
        if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
            // Extract components based on UTC to avoid local offsets initially
            year = dateInput.getUTCFullYear();
            month = dateInput.getUTCMonth(); // 0-indexed
            day = dateInput.getUTCDate();
        } else if (typeof dateInput === 'string') {
            const dateParts = dateInput.split('-');
            if (dateParts.length !== 3) throw new Error('Invalid date string format');
            year = parseInt(dateParts[0], 10);
            month = parseInt(dateParts[1], 10) - 1; // Adjust month to be 0-indexed
            day = parseInt(dateParts[2], 10);
        } else {
             throw new Error('Invalid date input type');
        }

        if (!timeString || typeof timeString !== 'string') throw new Error('Invalid time string input');
        const timeMatch = timeString.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
        if (!timeMatch) throw new Error('Invalid time string format');

        let hours = parseInt(timeMatch[1], 10);
        const minutes = parseInt(timeMatch[2], 10);
        const period = timeMatch[3] ? timeMatch[3].toUpperCase() : null;

        if (period === 'PM' && hours < 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0; // Midnight case

        if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hours) || isNaN(minutes)) {
            throw new Error('Parsed NaN from date/time components');
        }

        // Construct an ISO-like string *without* timezone offset initially
        // Pad month and day manually for safety
        const isoString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;

        // Now, parse this string *as if it were in the target timezone*.
        // This is tricky. A library like date-fns-tz is better for this.
        // Manual approach (less reliable across DST changes):
        // 1. Create a UTC date
        const utcDate = new Date(Date.UTC(year, month, day, hours, minutes));
        // 2. Format it into a string that *looks like* the target timezone time (using the target timezone)
        const formatter = new Intl.DateTimeFormat('en-CA', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
            timeZone: timeZone
        });
        const parts = formatter.formatToParts(utcDate);
        const tzDateParts = {};
        parts.forEach(({type, value}) => { tzDateParts[type] = value; });
        
        // Construct a new date object from these timezone-specific parts
        // This aims to represent the actual instant in time corresponding to that wall-clock time in that zone
        // Note: Creating a date from parts like this assumes the local system's handling aligns, which isn't guaranteed.
        const finalDate = new Date(`${tzDateParts.year}-${tzDateParts.month}-${tzDateParts.day}T${tzDateParts.hour}:${tzDateParts.minute}:${tzDateParts.second}`);
        
         if (isNaN(finalDate.getTime())) {
             // Fallback: try creating date directly, assuming local machine timezone handling is acceptable
              console.warn("Fallback used in parseDateTime for ", isoString, timeZone);
              const fallbackDate = new Date(isoString); // This will parse in local time
              if(isNaN(fallbackDate.getTime())) throw new Error('Final date parsing failed');
              return fallbackDate;
         }

        return finalDate;

    } catch (error) {
        console.error('Error parsing date/time:', { dateInput, timeString, timeZone }, error);
        return null;
    }
};

/**
 * Gets an array of Date objects for each day of the week starting from the given start date (Monday).
 * @param {Date} weekStartDate - The Date object for the Monday of the week.
 * @returns {Date[]} - An array of 7 Date objects, Monday to Sunday.
 */
export function getWeekDates(weekStartDate) {
    const dates = [];
    let current = new Date(weekStartDate);
    current.setHours(0, 0, 0, 0); // Ensure start of day
    for (let i = 0; i < 7; i++) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }
    return dates;
};

/**
 * Formats a date for display, attempting common formats.
 * @param {Date | string | number} dateInput - The date to format.
 * @param {string} [timeZone] - Optional target timezone.
 * @param {object} [options] - Optional Intl.DateTimeFormat options.
 * @returns {string} Formatted date string.
 */
export function formatDateForDisplay(dateInput, timeZone, options) {
    const defaultOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    return formatDate(dateInput, options || defaultOptions, timeZone);
};

/**
 * Converts minutes since midnight to a simple HH:MM AM/PM string.
 * @param {number} minutesSinceMidnight - Total minutes from midnight.
 * @returns {string} Formatted time string (e.g., "8:00 AM").
 */
export function minutesToTimeString(minutesSinceMidnight) {
    if (minutesSinceMidnight === null || minutesSinceMidnight === undefined || isNaN(minutesSinceMidnight)) {
        console.warn('Invalid input to minutesToTimeString:', minutesSinceMidnight);
        return "Invalid Time";
    }
    const hours24 = Math.floor(minutesSinceMidnight / 60) % 24;
    const minutes = Math.round(minutesSinceMidnight % 60);
    const period = hours24 >= 12 ? 'PM' : 'AM';
    let hours12 = hours24 % 12;
    if (hours12 === 0) hours12 = 12; // Adjust 0 hours to 12 for AM/PM format

    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

/**
 * Formats a UTC millisecond timestamp into a string in the specified timezone.
 * Uses Intl.DateTimeFormat for robust timezone handling.
 * @param {number} millisUTC - UTC milliseconds since the epoch.
 * @param {string} timeZone - IANA timezone string (e.g., 'America/Los_Angeles').
 * @param {object} options - Intl.DateTimeFormat options (e.g., { hour: 'numeric', minute: '2-digit' }).
 * @returns {string} Formatted date/time string, or "Invalid Date" on error.
 */
export function formatMillisForDisplay(millisUTC, timeZone, options) {
    if (typeof millisUTC !== 'number' || isNaN(millisUTC)) {
        console.error('Invalid millisUTC input to formatMillisForDisplay:', millisUTC);
        return "Invalid Date";
    }
    if (!timeZone) {
         console.warn('Missing timeZone in formatMillisForDisplay, using local.');
         timeZone = getLocalTimezone();
    }
    if (!options) {
         console.warn('Missing options in formatMillisForDisplay, using default time format.');
         options = { hour: 'numeric', minute: '2-digit', hour12: true };
    }

    try {
        const dateObject = new Date(millisUTC); // Create Date object from UTC millis
        if (isNaN(dateObject.getTime())) throw new Error('Could not create Date object from millis');

        const formatterOptions = {
            ...options,
            timeZone: timeZone // Apply the target timezone
        };

        // Use Intl.DateTimeFormat for reliable formatting
        const formatter = new Intl.DateTimeFormat(undefined, formatterOptions);
        return formatter.format(dateObject);

    } catch (e) {
        console.error('Error in formatMillisForDisplay:', { millisUTC, timeZone, options }, e);
        return "Invalid Date";
    }
} 