## Application Flow

### Authentication Flow
1. User navigates to `login.html` or `signup.html`.
2. For signup (`signup.js`):
    a. User provides email, password, and selects role (homeowner/housekeeper).
    b. `firebase.auth().createUserWithEmailAndPassword` is called.
    c. On success, `sample-data.js` logic is triggered to create minimal user and profile documents in Firestore.
3. For login (`auth.js`):
    a. User provides email and password.
    b. `firebase.auth().signInWithEmailAndPassword` is called.
4. On successful authentication (login or signup), `auth-router.js` checks the user's role from `/users/{userId}`.
5. User is redirected to the appropriate dashboard (`/homeowner/dashboard.html` or `/housekeeper/dashboard.html`).

### Housekeeper Settings Management Flow
1. Housekeeper accesses settings page (`/housekeeper/settings/settings.html` controlled by `settings.js`).
2. Settings are loaded from `/users/{housekeeperId}/settings/app` via `firestore-service.js`.
3. For each day of the week, user configures:
   - Working status (toggle)
   - Start time, break details, job durations etc.
4. Changes are validated and saved back to the settings document via `firestore-service.js`.
5. Housekeeper profile settings (e.g., Company Name, Invite Code) might also be managed here or on a separate profile page.

### Housekeeper Schedule & Booking Flow
1. Housekeeper navigates to the schedule view (`/housekeeper/dashboard.html` controlled by `schedule.js`).
2. Schedule view calculates available time slots based on housekeeper settings.
3. Housekeeper clicks an available slot to open the booking modal for **manual booking**.
4. **Client Selection (for manual booking):**
    a. `schedule.js` calls `loadClients` which fetches:
        i. Explicit clients from `/users/{housekeeperId}/clients`.
        ii. Linked homeowners from `/homeowner_profiles` where `linkedHousekeeperId` matches.
    b. Combined list is displayed.
    c. Housekeeper selects a client (either explicit or linked homeowner) or chooses to add a new client.
5. **New Client Addition (if selected for manual booking):**
    a. Modal prompts for new client details (name, contact, address).
    b. On save, `schedule.js` calls `firestoreService.addClient` to add the client to `/users/{housekeeperId}/clients`.
6. Housekeeper sets frequency (one-time, recurring) and confirms details for the **manual booking**.
7. `schedule.js` calls `firestoreService.addBooking` for each booking instance.
8. Booking(s) are saved to `/users/{housekeeperId}/bookings` with the correct `clientId` (Homeowner UID for linked, Client Doc ID for manual) and a `source` field (e.g., "manual_booking").
9. Calendar view updates.
10. (See also: "Housekeeper Managing Service Requests Flow" for creating bookings from approved requests).

### Homeowner Linking Flow
1. Homeowner logs in and navigates to their dashboard (`/homeowner/dashboard.html`).
2. If `linkedHousekeeperId` is not set in their `/homeowner_profiles/{homeownerId}` document, an input field for an Invite Code is shown.
3. Homeowner enters the 6-character invite code provided by their housekeeper.
4. `dashboard.js` calls `firestoreService.linkHomeownerToHousekeeper(homeownerId, inviteCode)`.
5. `firestoreService` finds the housekeeper profile matching the code and updates the homeowner's profile with `linkedHousekeeperId`.
6. The homeowner dashboard UI updates to show the "Linked" state.

### Homeowner Viewing Bookings Flow
1. Homeowner logs in and navigates to their dashboard (`/homeowner/dashboard.html`) or schedule page (`/homeowner/schedule/schedule.html`).
2. `dashboard.js` or `schedule.js` checks if `linkedHousekeeperId` exists in the homeowner's profile.
3. If linked, it calls `firestoreService.getUpcomingHomeownerBookings(homeownerId, linkedHousekeeperId)` or a similar function to retrieve bookings.
4. `firestoreService` queries the linked housekeeper's `/users/{housekeeperId}/bookings` subcollection for bookings where `clientId` matches the homeowner's UID.
5. The upcoming bookings are returned and displayed.
6. Homeowners can also view their service requests (pending, approved, etc.) on their schedule page (`/homeowner/schedule/schedule.html` via the "My Requests" tab).

### Client Management Flow (Housekeeper)
1. Housekeeper accesses client management page (`/housekeeper/clients/clients.html` controlled by `clients.js`).
2. List of clients is loaded from `/users/{housekeeperId}/clients`.
3. Housekeeper can add new clients (calling `firestoreService.addClient`).
4. Existing clients can be edited or deleted (requires corresponding `updateClient`, `deleteClient` functions in `firestoreService`).

### Payments Flow
*(No changes based on recent work, flow remains conceptual)*
1. Completed appointments can have payments recorded.
2. Payment status is tracked (paid, pending).
3. Receipts can be sent automatically if enabled in settings.
4. Firestore is populated with a consistent, rich dataset for testing.

---
## New Service-Driven Request Model Flows

### Homeowner Service Request Flow
1.  Homeowner navigates to their schedule page (`public/homeowner/schedule/schedule.html`, controlled by `schedule.js`).
2.  UI displays two tabs: "Request New Service" and "My Requests".
3.  **Request New Service Tab:**
    a.  If a housekeeper is linked, their information is displayed.
    b.  `schedule.js` fetches the linked housekeeper's *active* services from `/users/{linkedHousekeeperId}/services` (where `isActive: true`).
    c.  Services (base and add-ons) are displayed with checkboxes, including `durationMinutes` and `price`.
    d.  Homeowner selects at least one base service and optionally add-on services.
    e.  Homeowner selects a preferred date (using Flatpickr) and a time window.
    f.  Homeowner can add notes.
    g.  An estimated total price is calculated and displayed based on selected services.
    h.  Homeowner clicks "Review and Send Request".
4.  **Confirmation Modal (`confirm-request-modal`):**
    a.  Displays all selected services, preferred date/time, notes, and total.
    b.  Homeowner clicks "Send Request".
5.  **Request Submission:**
    a.  `schedule.js` constructs `requestData` including:
        i.  `homeownerId`, `housekeeperId`
        ii. Selected services (full objects with `id`, `name`, `price`, `type`, `durationMinutes`)
        iii. `preferredDate`, `preferredTimeWindow`, `notes`, `totalPrice`
        iv. Initial `status: 'pending_housekeeper_review'`
    b.  The request is saved to `/users/{linkedHousekeeperId}/bookingRequests/{newRequestId}` via `firestoreService.createBookingRequest()`.
    c.  A success toast notification is shown.
    d.  The UI automatically switches to the "My Requests" tab.
6.  **My Requests Tab:**
    a.  `schedule.js` loads and displays service requests for the current homeowner from the linked housekeeper's `/users/{linkedHousekeeperId}/bookingRequests` subcollection where `homeownerId` matches.
    b.  Requests show status (e.g., "Pending Housekeeper Review", "Approved & Scheduled", "Declined", "Housekeeper Proposed Alternative").
    c.  Homeowner can view details of proposals and potentially accept/decline them (future enhancement).

### Housekeeper Managing Service Requests Flow
1.  Housekeeper navigates to their schedule page (`public/housekeeper/schedule/schedule.html`, controlled by `schedule.js`).
2.  An "Incoming Requests" button in the header displays a badge with the count of pending requests (`status: 'pending_housekeeper_review'`).
    a.  `schedule.js` calls `fetchPendingRequests()` which queries `/users/{housekeeperId}/bookingRequests`.
3.  Clicking "Incoming Requests" displays a list of pending requests in `incoming-requests-container`.
    a.  Each request shows homeowner name, formatted date, service summary, total, and status.
4.  Housekeeper clicks on a request to open the `booking-detail-modal` (repurposed for request review).
    a.  `openRequestReviewModal()` populates the modal with request details.
    b.  `setupRequestActionButtons()` adds "Approve," "Propose Alternative," "Decline," and "Close" buttons.
5.  **Approve Request:**
    a.  Housekeeper clicks "Approve".
    b.  `handleApproveRequest()` is called:
        i.  The review modal closes.
        ii. Total `durationMinutes` is calculated from the request's services.
        iii. `prefillData` is constructed (client info, service details including `durationMinutes`, `originalRequestId`).
        iv. `openBookingModal(preferredDateForModal, totalDurationMinutes, prefillData)` is called.
    c.  `openBookingModal()` (modified for approval flow):
        i.  `currentBookingData` is set with prefilled info.
        ii. Preferred date and total duration are shown.
        iii. **A manual time input (`manualStartTimeInput`) is shown** for the housekeeper to set a specific start time.
        iv. Client/service selection steps are hidden.
    d.  Housekeeper enters the start time and clicks "Review Booking".
    e.  Confirmation step: Details are shown. Housekeeper clicks "Confirm Booking".
    f.  `confirmBookingBtn` listener (modified):
        i.  New booking is saved to `/users/{housekeeperId}/bookings/` with:
            -   `durationMinutes` for all services.
            -   `source: 'service_request'`.
            -   `originalRequestId` linking to the request.
        ii. `firestoreService.updateBookingRequestStatus()` updates the original request in `/bookingRequests` to `approved_and_scheduled` and adds `scheduledBookingId`.
        iii. Pending request count/list is refreshed.
        iv. View switches back to the main schedule.
6.  **Decline Request:**
    a.  Housekeeper clicks "Decline".
    b.  `handleDeclineRequest()` is called:
        i.  `firestoreService.updateBookingRequestStatus()` updates the request status to `declined_by_housekeeper`.
        ii. Toast notification is shown.
        iii. Review modal closes, pending requests list/badge refreshes.
7.  **Propose Alternative:**
    a.  Housekeeper clicks "Propose Alternative".
    b.  `handleProposeAlternative()` is called:
        i.  A form (`propose-alternative-form`) is shown within the `booking-detail-modal`.
        ii. Housekeeper inputs an alternative date (Flatpickr), time, and notes.
    c.  Housekeeper clicks "Send Proposal".
    d.  `handleSendProposal()` is called:
        i.  `firestoreService.updateBookingRequestStatus()` updates the original booking request to `housekeeper_proposed_alternative` and stores the proposed details (`proposedDate`, `proposedTime`, `proposalNotes`, `proposalSentAt`).
        ii. Toast notification is shown.
        iii. Review modal closes, pending requests list/badge refreshes.
        iv. The request will now appear in the Homeowner's "My Requests" tab with the new status and details.