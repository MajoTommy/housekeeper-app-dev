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
  - **Payments:** Stripe (Connect for payouts, Billing for subscriptions)
- **Frontend:** Vanilla JavaScript (direct DOM manipulation, no major framework), Stripe.js (for Checkout)
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
- **Schedule** (calendar icon) - Allows homeowners to request new services from their linked housekeeper and view their past/pending requests.
- **Account** (user icon) - Placeholder/Future: Manage account settings, payments, etc.

## File Structure

### Root / Common Files
- `public/index.html` - Landing/Login page. Redirects logged-in users.
- `public/signup.html` - New user registration with role selection.
- `public/forgot-password.html` - Password recovery.
- `public/404.html` - Custom 404 page.
- `public/dev-tools.html` - Developer utility page (not for production). Used to trigger sample data population.
- `public/common/js/` - Directory for JavaScript modules shared between roles.
    - `firebase-config.js`: Initializes Firebase SDKs.
    - `firestore-service.js`: Centralized functions for Firestore interactions (CRUD operations for users, profiles, clients, bookings, booking requests, settings, time-off).
    - `auth.js`: Handles user login, logout, signup, password reset logic.
    - `auth-router.js`: Manages role-based redirects after authentication state changes.
    - `date-utils.js`: Utility functions for date/time formatting and manipulation.
    - `sample-data.js`: **DEPRECATED.** Core sample data population is now handled by `/public/js/populate-sample-data.js` via `dev-tools.html`.
    - `cleaning-tasks-config.js`: Defines a predefined list of cleaning tasks used for service definitions and AI suggestions.

### Housekeeper Section (`public/housekeeper/`)
- `public/housekeeper/schedule/`
    - `schedule.html`: Main schedule view.
    - `schedule.js`: UI logic for displaying schedule, handling booking modal (including client and service selection, one-time booking confirmation), reviewing incoming service requests (including AI price/time suggestions), approving requests (which converts them to bookings), proposing alternatives, or declining requests.
- `public/housekeeper/clients/`
    - `clients.html`: Client list and management view.
    - `clients.js`: UI logic for displaying clients (filtering active/archived via toggle), search, add/edit modals, archive/unarchive logic.
- `public/housekeeper/settings/`
    - `index.html`: Main settings navigation page (card layout).
    - `profile.html`: Displays housekeeper profile, invite code; includes edit modal.
    - `profile.js`: Logic for displaying profile, handling edit modal.
    - `work-schedule.html`: UI for configuring default weekly work schedule.
    - `work-schedule.js`: Logic for managing work schedule UI and saving settings.
    - `time-off.html`: UI for viewing/managing single-day time off via calendar.
    - `time-off.js`: Logic for time-off calendar interaction and saving.
    - `account.html`: UI for setting timezone. **NEW:** UI for managing platform subscription (via Stripe Billing) and payout account status/setup (via Stripe Connect).
    - `account.js`: Logic for account settings page. **NEW:** Handles fetching Stripe status, displaying UI states, initializing Stripe.js, and calling Cloud Functions to interact with Stripe Billing Portal, Connect Onboarding/Dashboard, and Checkout.
    - `services-pricing.html`: UI for viewing/managing base and add-on services.
    - `services-pricing.js`: Logic for loading, displaying, adding, editing, and deleting services.

### Homeowner Section (`public/homeowner/`)
- `public/homeowner/dashboard/`
    - `dashboard.html`: Unified main dashboard view.
    - `dashboard.js`: UI logic for the dashboard, displaying data, handling profile/location edit modals.
- `public/homeowner/schedule/`
    - `schedule.html`: Allows homeowners to request new services from their linked housekeeper and view their past/pending requests.
    - `schedule.js`: Handles fetching housekeeper services, building the request form (base services, add-ons, date/time, notes), calculating estimates, submitting requests, and displaying 'My Requests'.
- `public/homeowner/account/` (Future/Placeholder)
    - `account.html`: Potential future view for homeowner account settings.
    - `account.js`

## JavaScript Structure

### Common Scripts (`public/common/js/`)
- `firebase-config.js`
- `firestore-service.js`: Centralized Firestore CRUD operations (users, profiles, clients, bookings, settings, time-off, properties).
- `auth.js`
- `auth-router.js`: Handles redirects based on role and login state, using clean URLs.
- `date-utils.js`: Date/time formatting (UTC-aware).
- `sample-data.js`: **DEPRECATED/REMOVE?**

### Housekeeper Scripts (`public/housekeeper/.../*.js`)
- Each page generally has a corresponding JS file for its specific UI logic.
- They interact with `firestore-service.js` for data and `auth.js` for auth state.
- `schedule.js` may call Cloud Functions directly if needed for complex logic like availability checks (though ideally proxied via `firestore-service` if possible).

### Homeowner Scripts (`public/homeowner/.../*.js`)
- `dashboard.js` is the primary script, handling multiple pieces of functionality.
- Interacts heavily with `firestore-service.js`.

### Authentication Scripts
- `public/js/signup.js`: Handles signup form submission, calls `auth.js`.

### Developer Tools Scripts
- `public/js/populate-sample-data.js`: Logic run by `dev-tools.html`.

## CSS and Images
- Tailwind CSS is used via CDN.
- FontAwesome is used via CDN.
- Minimal custom CSS if any.
- `public/images/` - App images/icons.

## Developer Tools
- `public/dev-tools.html`: Developer utility page (not for production). Used to trigger sample data population.

## Core Features

### Housekeeper Features

#### Schedule (`/housekeeper/schedule`)
- View weekly schedule (fetches data, potentially via Cloud Function).
- Manually book new *one-time* cleanings (modal workflow: select client, select base/add-on services, confirm).
- Manage existing appointments (view details, cancel - which deletes the booking).
- Review incoming service requests (view details, approve, decline, or propose alternatives).

#### Clients (`/housekeeper/clients`)
- View/search client list.
- Toggle view between Active and Archived clients.
- Add/Edit clients (modal workflow).
- Archive/Unarchive clients via detail modal (conditionally shown button). Archiving also blocks the linked homeowner.

#### Settings (`/housekeeper/settings`)
- Main navigation via cards.
- **My Profile (`.../profile`):** View name, email, invite code. Edit details (name, phone, company) via modal.
- **Work Schedule (`.../work-schedule`):** Configure default weekly work hours, start time, jobs/day, breaks. Saves via footer button.
- **Time Off (`.../time-off`):** Toggle individual days off on a calendar. Saves via footer button.
- **Account & App (`.../account`):** Set timezone, other app preferences. Saves via footer button.
- **Services & Pricing (`.../services-pricing`):** Add, view, edit, activate/deactivate, and delete base and add-on services with prices.
- Potentially others for triggers (e.g., updating denormalized data).
- `archiveClientAndBlockHomeowner`: Sets client `isActive=false` and adds homeowner to housekeeper's blocklist (HTTPS Callable).
- `unarchiveClientAndUnblockHomeowner`: Sets client `isActive=true` and removes homeowner from housekeeper's blocklist (HTTPS Callable).

### Homeowner Features

#### Dashboard (`/homeowner/dashboard`)
- View linked housekeeper info.
- View next/past cleanings.
- Edit profile (modal).
- Edit location (modal).
- Link/Unlink housekeeper.

## Database Integration
- Primarily through `firestore-service.js`.
- Cloud Functions may be called directly for complex backend logic (e.g., `getAvailableSlots`).
- Booking data is stored under `/users/{housekeeperId}/bookings` and read directly by linked homeowners (using security rules).

## Authentication & Routing
- Role selected at signup.
- `auth-router.js` handles redirects to correct sections (`/housekeeper/schedule` or `/homeowner/dashboard`) using clean URLs.

## Cloud Functions (`/functions`)
- `getAvailableSlots`: Calculates availability (HTTPS Callable).
- `requestBooking`: Handles booking requests (HTTPS Callable).
- `cancelBooking`: Handles booking cancellations (HTTPS Callable).
- Potentially others for triggers (e.g., updating denormalized data).
- `archiveClientAndBlockHomeowner`: Sets client `isActive=false` and adds homeowner to housekeeper's blocklist (HTTPS Callable).
- `unarchiveClientAndUnblockHomeowner`: Sets client `isActive=true` and removes homeowner from housekeeper's blocklist (HTTPS Callable).
- **Stripe Functions (HTTPS Callable V2 Syntax):**
    - `createSubscriptionCheckoutSession`: Creates a Stripe Customer (if needed) and a Stripe Checkout session for initiating a new subscription.
    - `createBillingPortalSession`: Creates a Stripe Billing Portal session for managing an existing subscription.
    - `createConnectOnboardingLink`: Creates a Stripe Connect onboarding link for setting up a payout account.
    - `createExpressDashboardLink`: Creates a link to the Stripe Express Dashboard for managing an existing payout account.
- `getAIPriceAndTimeSuggestion`: Provides price and time estimations for service requests using OpenAI, considering service tasks, property details, and housekeeper preferences (HTTPS Callable).
- **Stripe Webhook Handler (`stripeWebhookHandler` - Planned):** A standard HTTP function (not callable) needed to receive events from Stripe (e.g., subscription updates, account updates) and update Firestore accordingly (requires webhook secret).
- Potential Trigger Functions (e.g., `syncHomeownerProfileToClient`).

## Testing and Deployment
- Use Firebase Local Emulator Suite.
- Deploy Hosting: `firebase deploy --only hosting`
- Deploy Functions: `firebase deploy --only functions`

## Date/Time Handling Standard (UTC-Based)
- **Storage:** Use Firestore `Timestamp` for points in time. Store UTC milliseconds alongside (e.g., `startTimestampMillis`).
- **Calculation:** Perform using UTC (Timestamps or milliseconds).
- **Display:** Format milliseconds using `date-utils.js` and the appropriate timezone (usually housekeeper's setting).
- **Input:** Send unambiguous UTC representations (ISO string) to backend functions.

## Potential Improvements
- Refactor homeowner settings into dashboard modals.
- Implement notification system (e.g., for booking confirmations).
- Add payment integration.
- Enhance error handling and user feedback.
- Replace Tailwind CDN with a build step (e.g., using PostCSS CLI) for production.
- Improve date/time handling robustness, potentially using a dedicated library like `date-fns` or `dayjs`.