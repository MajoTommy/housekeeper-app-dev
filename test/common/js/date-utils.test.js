import * as dateUtils from '../../../public/common/js/date-utils.js';

describe('Date Utility Functions', () => {

  describe('formatDate', () => {

    /**
     * WHAT: Tests formatting a specific UTC date instant into the standard YYYY-MM-DD format.
     * WHY: This format is crucial for backend API calls (like getAvailableSlots) which 
     *      often require unambiguous date strings, typically based on UTC for consistency.
     */
    test('should format date as YYYY-MM-DD in UTC', () => {
      const date = new Date(Date.UTC(2024, 5, 15, 10, 30, 0)); // June 15, 2024 10:30:00 UTC
      const expected = '2024-06-15';
      const actual = dateUtils.formatDate(date, 'YYYY-MM-DD', 'UTC');
      expect(actual).toBe(expected);
    });

    /**
     * WHAT: Tests formatting the same UTC date instant into YYYY-MM-DD format, but using 
     *       a specific timezone (America/New_York).
     * WHY: Ensures the function correctly determines the calendar date *in that timezone* 
     *      for the given instant. For YYYY-MM-DD format, the date should remain the same 
     *      as the UTC date in this case, verifying the function handles timezone context correctly.
     */
    test('should format date as YYYY-MM-DD in America/New_York timezone', () => {
      const date = new Date(Date.UTC(2024, 5, 15, 10, 30, 0)); // June 15, 2024 10:30:00 UTC
      const expected = '2024-06-15'; // Date remains the same for this specific instant/format
      const actual = dateUtils.formatDate(date, 'YYYY-MM-DD', 'America/New_York');
      expect(actual).toBe(expected);
    });

    // Add more tests for formatDate here...
    // - Different formats ('short-date', etc.)
    // - Different timezones
    // - Edge cases (start/end of year/month)
    // - Invalid inputs

  });

  // Add describe blocks for other functions (formatTime, getStartOfWeek, etc.) here...

}); 