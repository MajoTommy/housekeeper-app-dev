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
- `public/housekeeper/dashboard.html` - Main schedule view
- `public/housekeeper/clients/clients.html` - Client management
- `public/housekeeper/settings/settings.html` - Schedule configuration

### Homeowner Pages
- `public/homeowner/dashboard.html` - Unified main dashboard.
- `public/homeowner/settings/settings.html` - Separate settings page (may be refactored into dashboard modals later).

## JavaScript Structure

### Common Scripts (shared between roles)
- `public/common/js/firebase-config.js` - Firebase configuration
- `public/common/js/firestore-service.js` - Centralized database service for CRUD operations.
   Provides functions like `getHomeownerProfile`, `updateHomeownerProfile`, `updateHomeownerLocation`, `getHousekeeperProfile`, `linkHomeownerToHousekeeper`, `unlinkHomeownerFromHousekeeper`, `addBooking`, `getUpcomingHomeownerBookings`, `getPastHomeownerBookings`, etc.
- `public/common/js/auth.js` - Authentication functionality (login, logout, password reset).
- `public/common/js/auth-router.js` - Role-based routing logic after login.
- `public/common/js/defaults.js` - Default app settings (may not be fully utilized).
- `public/common/js/sample-data.js` - **DEPRECATED / Signup Support:** Contains logic to create the *initial minimal profile* for a user immediately after signup. (Previously used for broader sample data).
- `public/common/js/maps-config.js` - **DO NOT COMMIT KEY:** Holds the Google Maps API Key. Must be added to `.gitignore`. (Currently loaded via inline script in HTML due to loading issues).


### Housekeeper Scripts
- `public/housekeeper/js/schedule.js` - Schedule functionality, including booking creation and loading clients (now includes linked homeowners).
- `public/housekeeper/js/clients.js` - Client management functionality.
- `public/housekeeper/js/settings.js` - Settings functionality, using `firestore-service.js` as single source of truth.

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
        -   **Purpose:** Calculates the actual availability slots for a specific housekeeper within a given date range, intended for display to homeowners.
        -   **Why:** This function is crucial because calculating availability requires combining two dynamic data sources: the housekeeper's default working pattern/preferences (from `/users/{hkId}/settings/app`) and their existing commitments (from `/users/{hkId}/bookings`). Performing this complex calculation on the client-side would be inefficient, difficult to maintain, and potentially expose sensitive logic. This function centralizes the logic, ensures consistency, and provides a clean interface for the homeowner frontend (`homeowner/js/schedule.js`) to fetch accurate availability data. It handles merging default availability with actual booked times, ensuring homeowners only see slots that are truly open.
-   `package.json`: Node.js dependencies for functions (`firebase-admin`, `firebase-functions`).
-   `.eslintrc.js`: ESLint configuration for code quality.

## Key Files & Responsibilities

