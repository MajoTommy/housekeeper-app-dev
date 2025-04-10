# APP STRUCTURE

## Overview
The Housekeeping App has two main user interfaces based on user roles:

1. **Housekeeper Interface**
   - **Schedule** - Managing appointments and cleanings
   - **Clients** - Managing client information
   - **Settings** - Configuring work schedule and preferences

2. **Homeowner Interface**
   - **Dashboard** - Unified view showing linked housekeeper, next cleaning, recent history, and providing access to profile/location editing.

## Technology Stack
- **Core Language:** JavaScript (ES6+)
- **Backend Platform:** Firebase
  - **Database:** Firestore (NoSQL, document-based)
  - **Authentication:** Firebase Authentication (Email/Password)
- **Frontend:** Vanilla JavaScript (direct DOM manipulation, no major framework like React/Vue/Angular)
- **Styling:** Tailwind CSS (v3 via CDN - *confirm version if different*)
- **Development Server:** Assumed local server (e.g., live-server, http-server) serving the `public` directory.
- **Mapping/Places:** Google Maps Platform (Places API for Autocomplete)

## App Navigation
Each role has a consistent footer navigation menu:

### Housekeeper Navigation
- Schedule (calendar icon)
- Clients (users icon)
- Settings (cog icon)

### Homeowner Navigation
- **Dashboard** (home icon) - Main view.
- **Schedule** (calendar icon) - Placeholder/Future: View detailed schedule or request bookings.
- **Account** (user icon) - Placeholder/Future: Manage account settings, payments, etc.

## File Structure

### Authentication Pages (Common)
- `public/login.html` - User login
- `public/signup.html` - New user registration with role selection
- `public/forgot-password.html` - Password recovery
- `public/404.html` - Error page
- `public/index.html` - Landing page that redirects based on role

### Housekeeper Pages
- `public/housekeeper/schedule/schedule.html` - Main schedule view (formerly dashboard.html)
- `public/housekeeper/clients/clients.html` - Client management
- `public/housekeeper/settings/settings.html` - Schedule configuration and time off management

### Homeowner Pages
- `public/homeowner/dashboard.html` - Unified main dashboard.
- `public/homeowner/settings/settings.html` - Separate settings page (may be refactored into dashboard modals later).

## JavaScript Structure

### Common Scripts (shared between roles)
- `public/common/js/firebase-config.js` - Firebase configuration
- `public/common/js/firestore-service.js` - Centralized database service for Firestore CRUD operations. Provides functions for managing user profiles, clients, settings, and bookings (e.g., `getHomeownerProfile`, `updateHomeownerProfile`, `updateHomeownerLocation`, `getHousekeeperProfile`, `getUserSettings`, `updateUserSettings`, `linkHomeownerToHousekeeper`, `unlinkHomeownerFromHousekeeper`, `addClient`, `getClients`, `addBooking`, `getBookingsForHousekeeperInRange`, `getUpcomingHomeownerBookings`, `getPastHomeownerBookings`, etc.). It does *not* handle complex availability calculations (see `getAvailableSlots` Cloud Function).
- `public/common/js/auth.js` - Authentication functionality (login, logout, password reset).
- `public/common/js/auth-router.js` - Role-based routing logic after login.
- `public/common/js/defaults.js` - Default app settings (may not be fully utilized).
- `public/common/js/sample-data.js` - **DEPRECATED / Signup Support:** Contains logic to create the *initial minimal profile* for a user immediately after signup. (Previously used for broader sample data).
- `public/common/js/maps-config.js` - **DO NOT COMMIT KEY:** Holds the Google Maps API Key. Must be added to `.gitignore`. (Currently loaded via inline script in HTML due to loading issues).


### Housekeeper Scripts
- `public/housekeeper/schedule/schedule.js` - Handles the housekeeper's schedule view UI. Fetches availability data by calling the `getAvailableSlots` Cloud Function directly. Manages the booking modal workflow (client selection, frequency, confirmation) and calls `firestore-service.js` to save bookings.
- `public/housekeeper/clients/clients.js` - Client management functionality.
- `public/housekeeper/settings/settings.js` - Settings functionality (work schedule, time off, invite code), using `firestore-service.js` as single source of truth.

### Homeowner Scripts
- `public/homeowner/js/dashboard.js` - Handles the entire unified dashboard UI. Fetches homeowner profile, linked housekeeper info, upcoming/past bookings. Displays data. Handles modals for "Edit Profile" and "Edit Location" (including Google Places Autocomplete integration). Manages linking/unlinking actions.
- `public/homeowner/js/settings.js` - Logic for the separate settings page (if still used).

### Authentication Scripts
- `public/js/signup.js` - Signup logic with role selection, calls logic in `sample-data.js` upon success.

### Developer Tools Scripts (Not for production)
- `public/js/populate-sample-data.js` - Contains logic and comprehensive sample data structures (users, profiles, clients, bookings) for populating Firestore for development testing. Intended to be run via `dev-tools.html`.

## CSS and Images
- `public/css/` - Contains common stylesheet files
- `public/images/` - Contains app images and icons

## Developer Tools
- `public/dev-tools.html` - A standalone HTML page accessible only during development (e.g., at `/dev-tools.html`). Provides a UI (input fields for UIDs, button) to trigger the data population script (`populate-sample-data.js`) for setting up consistent test data scenarios.

## Core Features

### Housekeeper Features

#### Schedule
- View weekly schedule
- Book new cleanings
- Manage existing appointments
- Navigate between weeks
- View daily time slots

#### Clients
- View and search client list
- Add new clients
- Edit client details
- View client booking history

#### Settings
- Configure working days
- Set up schedule preferences (start times, job durations)
- Adjust break times
- Configure number of jobs per day

### Homeowner Features

#### Dashboard
- **Linked View:**
  - View linked housekeeper's name and company.
  - View next upcoming cleaning details (date, time, service).
  - View list of recent past cleanings.
  - Edit profile information (name, phone, instructions) via modal.
  - Edit location details (address, city, state, zip) via modal with Google Places Autocomplete validation.
  - Unlink from the current housekeeper.
- **Not Linked View:**
  - Enter an invite code to link with a housekeeper.

#### Settings (Separate Page - Potential Refactor)
- Manage notification preferences (future).
- Manage payment settings (future).
- Account management (future).

## Database Integration
All pages use the Firestore database through the `firestore-service.js`, which provides:
- User-specific data fetching
- Role-based access control
- Real-time updates for schedule and bookings
- Centralized functions for adding/updating users, profiles, clients, bookings, and settings.

## Authentication & Routing
The application implements role-based authentication:
- New users select their role (housekeeper or homeowner) during signup
- `auth-router.js` redirects users to the appropriate interface based on their role
- Each interface only shows functionality relevant to that user role

## Cloud Functions (`/functions`)

Backend logic running in Firebase Cloud Functions, providing server-side capabilities and secure access to data.

-   `index.js`: Main entry point for Cloud Functions.
    -   **`getAvailableSlots`**: 
        -   **Type:** HTTPS Callable Function.
        -   **Purpose:** Calculates the actual availability status and slots for a specific housekeeper within a given date range. It is the **single source of truth** for schedule availability, used by **both** the homeowner and housekeeper schedule views.
        -   **Why:** Centralizes the complex logic of combining default settings (`/users/{hkId}/settings/app`), existing bookings (`/users/{hkId}/bookings`), and time off (`/users/{hkId}/timeOffDates`) to determine true availability. This avoids client-side complexity and ensures consistency.
        -   **Usage:** Called directly via `firebase.functions().httpsCallable('getAvailableSlots')` from both `public/homeowner/js/schedule.js` and `public/housekeeper/js/schedule.js`.
        -   **Output Structure:** Returns an object like `{ schedule: { "YYYY-MM-DD": { status: "available|fully_booked|not_working", message: "...", slots: [...] } } }`. When `status` is `"available"`, the `slots` array contains objects like `{ startTime: "HH:mm AM/PM", endTime: "HH:mm AM/PM", durationMinutes: number }`.
    -   **`requestBooking`**: 
        -   **Type:** HTTPS Callable Function.
        -   **Purpose:** Handles a homeowner's request to book a specific time slot.
        -   **Why:** Provides a secure backend endpoint to validate the request (is the user authenticated? is the slot still available?), create the booking document in Firestore with a `pending` status, and prevent conflicts.
        -   **Usage:** Called via `firebase.functions().httpsCallable('requestBooking')` from `public/homeowner/js/schedule.js` when the homeowner confirms the booking in the drawer modal.
        -   **Output Structure:** Returns `{ success: true, bookingId: "..." }` on success or throws an `HttpsError` on failure (e.g., conflict, invalid input).

-   `package.json`: Defines dependencies for the Cloud Functions.
    -   **Key Dependencies (Ensure these are installed in `/functions` before deployment):**
        -   `firebase-admin`: Required for interacting with Firebase services (Firestore, Auth) from the backend.
        -   `firebase-functions`: Core SDK for writing Cloud Functions.
        -   `firebase-functions/logger`: For structured logging within functions.
        -   *(Optional but Recommended)* `cors`: Middleware for handling Cross-Origin Resource Sharing, especially if using `onRequest` triggers or encountering CORS issues with `onCall`.
    -   **Installation:** Run `npm install` within the `/functions` directory.

## Testing and Deployment
- **Testing:** Use the Firebase Local Emulator Suite to test functions, Firestore interactions, and Auth locally.
- **Deployment:**
  - `firebase deploy` - Deploys all Firebase features (Hosting, Firestore rules, Functions).
  - `firebase deploy --only hosting` - Deploys only the web app (HTML, JS, CSS).
  - `firebase deploy --only functions` - Deploys only Cloud Functions.

## Potential Improvements
- Refactor homeowner settings into dashboard modals.
- Implement notification system (e.g., for booking confirmations).
- Add payment integration.
- Enhance error handling and user feedback.
- Replace Tailwind CDN with a build step (e.g., using PostCSS CLI) for production.
- Improve date/time handling robustness, potentially using a dedicated library like `date-fns` or `dayjs`.

## Date/Time Handling Standard (UTC-Based)

To ensure consistency and avoid timezone-related bugs, the application follows a UTC-based standard for handling dates and times:

1.  **Storage (Firestore):**
    *   Points in time (e.g., start/end of bookings, time-off boundaries) **MUST** be stored using Firestore's native `Timestamp` type.
    *   Avoid storing dates and times as separate strings (`YYYY-MM-DD`, `HH:mm`).
    *   Configuration values like default start times in settings may still be stored as strings (e.g., "09:00") if they represent time-of-day independent of a specific date, but they **MUST** be converted to UTC for calculations.

2.  **Calculation (Cloud Functions):**
    *   All date/time arithmetic, comparisons, availability logic, and conflict checks **MUST** be performed using UTC representations (Firestore Timestamps, UTC milliseconds, or UTC minutes-since-midnight).
    *   Avoid performing calculations based on local time strings or browser-dependent `Date` objects.
    *   **Use `date-fns-tz` library (specifically `require('date-fns-tz')` with CommonJS default import) within Cloud Functions for reliable conversion between local time representations (from settings) and UTC timestamps.** The `zonedTimeToUtc` function is used for this purpose in `getAvailableSlots`. 

3.  **Data Transfer (Backend <-> Frontend):**
    *   Data transferred between Cloud Functions and the frontend client **MUST** represent dates/times unambiguously in UTC. Preferred formats include:
        *   Firestore Timestamps (if the client SDK handles them correctly).
        *   ISO 8601 formatted strings with the UTC 'Z' designator (e.g., `"2025-04-10T14:30:00.000Z"`).
        *   UTC milliseconds since the epoch (Number). (Currently used by `getAvailableSlots` -> `startTimestampMillis`, `endTimestampMillis`).
    *   Avoid transferring simple date or time strings without timezone context.

4.  **Display (Frontend):**
    *   UTC date/time values received from the backend **MUST** be formatted into the target user's relevant timezone (usually the housekeeper's configured timezone) only at the point of display in the UI.
    *   Use reliable mechanisms for timezone conversion and formatting, such as:
        *   The browser's built-in `Intl.DateTimeFormat` API with the `timeZone` option. (Used via `formatMillisForDisplay` in `date-utils.js`).
        *   A robust date/time library with timezone support (e.g., `date-fns-tz`). (We use this on the backend).
    *   Do **NOT** rely on the browser's default `Date.prototype.toString()` or similar methods which use the user's local timezone.

5.  **User Input / Data Sending (Frontend -> Backend):**
    *   When sending a date/time value to the backend (e.g., for booking requests), the frontend **MUST** construct and send an unambiguous UTC representation (ISO string, milliseconds) based on UTC calculations, *not* based on parsing user-facing display strings.