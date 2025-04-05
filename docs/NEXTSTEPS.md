# Next Steps & Known Issues

This document tracks planned enhancements and known issues.

## Planned Enhancements

1.  **Implement Settings Overrides:**
    -   **Goal:** Allow housekeepers to define exceptions (vacations, specific blocked times, extra working days) to their default weekly schedule.
    -   **Approach:** Introduce a new `/users/{hkId}/availabilityOverrides` subcollection (see `Database-structure.md`). Update the housekeeper settings UI (potentially adding a calendar view) to manage these overrides. Refactor the `getAvailableSlots` Cloud Function to check for overrides for a given date *before* falling back to default `workingDays` settings.
    -   **Status:** Design proposed, implementation pending.

2.  **Booking Modification UI (Reschedule/Cancel):**
    -   **Goal:** Allow housekeepers (and potentially homeowners) to easily reschedule or cancel existing bookings.
    -   **Approach:** Implement UI modals/flows triggered by the "Reschedule" and "Cancel" buttons on booking cards. Update booking status in Firestore.
    -   **Status:** Basic status updates exist (`handleMarkBookingDone`, `handleCancelBooking`), but full reschedule flow is pending.

3.  **Homeowner Booking Confirmation/Details:**
    -   **Goal:** Provide a confirmation step and detailed view when a homeowner selects an available slot.
    -   **Approach:** Implement a modal or separate page after slot selection for confirmation. Save booking details to `/users/{hkId}/bookings`.
    -   **Status:** Placeholder `alert()` exists, full implementation pending.

4.  **Tailwind CSS Build Process:**
    -   **Goal:** Switch from CDN to a local build process for Tailwind CSS for performance and purging.
    -   **Approach:** Set up `npm`, `tailwindcss`, `postcss`, `autoprefixer`. Configure `tailwind.config.js` and build scripts.
    -   **Status:** Pending.

5.  **Client Profile Updates -> Booking Denormalization:**
    -   **Goal:** When a housekeeper updates a client's details (e.g., address, phone), automatically update the denormalized fields in that client's *future* booking documents.
    -   **Approach:** Use a Cloud Function triggered by updates to `/users/{hkId}/clients/{clientId}` to query and update relevant future bookings.
    -   **Status:** Pending.

## Known Issues / Bugs

1.  **(Potentially Fixed - Verify)** **Homeowner Schedule Incorrectly Shows "Not scheduled to work today":**
    -   **Symptom:** The homeowner view sometimes shows "Not scheduled to work today" for a specific day, even when the housekeeper has a booking on that day (e.g., Thursday, April 3rd example).
    -   **Cause:** Previously, the `getAvailableSlots` Cloud Function incorrectly handled days marked as non-working in settings or failed to fetch/process bookings correctly due to date format issues (Timestamp vs. String).
    -   **Fix Attempts:** Deployed multiple updates to `getAvailableSlots` to handle string dates and correctly merge settings with bookings, prioritizing bookings.
    -   **Status:** Requires verification after the latest deployment. If still occurring, further investigation of Cloud Function logs and logic is needed.

2.  **(Minor)** **Tailwind CDN Warning:** The browser console shows a warning about using the Tailwind CDN in production. This will be resolved when switching to the local build process.

*(Add more items as they are identified)* 