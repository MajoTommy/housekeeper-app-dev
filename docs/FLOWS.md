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
3. Housekeeper clicks an available slot to open the booking modal.
4. **Client Selection:**
    a. `schedule.js` calls `loadClients` which fetches:
        i. Explicit clients from `/users/{housekeeperId}/clients`.
        ii. Linked homeowners from `/homeowner_profiles` where `linkedHousekeeperId` matches.
    b. Combined list is displayed.
    c. Housekeeper selects a client (either explicit or linked homeowner) or chooses to add a new client.
5. **New Client Addition (if selected):**
    a. Modal prompts for new client details (name, contact, address).
    b. On save, `schedule.js` calls `firestoreService.addClient` to add the client to `/users/{housekeeperId}/clients`.
6. Housekeeper sets frequency (one-time, recurring) and confirms details.
7. `schedule.js` calls `firestoreService.addBooking` for each booking instance (one for one-time, multiple for recurring).
8. Booking(s) are saved to `/users/{housekeeperId}/bookings` with the correct `clientId` (Homeowner UID for linked, Client Doc ID for manual).
9. Calendar view updates.

### Homeowner Linking Flow
1. Homeowner logs in and navigates to their dashboard (`/homeowner/dashboard.html`).
2. If `linkedHousekeeperId` is not set in their `/homeowner_profiles/{homeownerId}` document, an input field for an Invite Code is shown.
3. Homeowner enters the 6-character invite code provided by their housekeeper.
4. `dashboard.js` calls `firestoreService.linkHomeownerToHousekeeper(homeownerId, inviteCode)`.
5. `firestoreService` finds the housekeeper profile matching the code and updates the homeowner's profile with `linkedHousekeeperId`.
6. The homeowner dashboard UI updates to show the "Linked" state.

### Homeowner Viewing Bookings Flow
1. Homeowner logs in and navigates to their dashboard (`/homeowner/dashboard.html`).
2. `dashboard.js` checks if `linkedHousekeeperId` exists in the homeowner's profile.
3. If linked, it calls `firestoreService.getUpcomingHomeownerBookings(homeownerId, linkedHousekeeperId)`.
4. `firestoreService` queries the linked housekeeper's `/users/{housekeeperId}/bookings` subcollection for bookings where `clientId` matches the homeowner's UID and the date is in the future.
5. The upcoming bookings are returned and displayed on the homeowner's dashboard.

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

### Development: Sample Data Population Flow
1. Developer manually creates two test users (e.g., `core-home@...`, `core-keeper@...`) via the standard signup flow.
2. Developer finds the UIDs for these users in the Firebase Auth console.
3. Developer navigates to `/dev-tools.html` in the browser.
4. Developer pastes the Homeowner UID and Housekeeper UID into the input fields.
5. Developer clicks the "Populate Core Sample Data" button.
6. The script (`populate-sample-data.js`) executes:
    a. Gets the Firestore DB instance.
    b. Updates the `/users/` and profile documents (`/homeowner_profiles/`, `/housekeeper_profiles/`) for both UIDs using direct `db.collection.doc.set(..., { merge: true })`.
    c. Calls `firestoreService.addClient` to add sample manual clients for the housekeeper.
    d. Calls `firestoreService.addBooking` to add sample bookings (linked and manual) for the housekeeper.
7. Firestore is populated with a consistent, rich dataset for testing.