# APP STRUCTURE

## Overview
The Housekeeping App has two main user interfaces based on user roles:

1. **Housekeeper Interface**
   - **Schedule** - Managing appointments and cleanings
   - **Clients** - Managing client information
   - **Settings** - Configuring work schedule and preferences

2. **Homeowner Interface**
   - **Bookings** - Managing cleaning appointments
   - **Properties** - Managing property information
   - **Settings** - Configuring preferences and notifications

## Technology Stack
- **Core Language:** JavaScript (ES6+)
- **Backend Platform:** Firebase
  - **Database:** Firestore (NoSQL, document-based)
  - **Authentication:** Firebase Authentication (Email/Password)
- **Frontend:** Vanilla JavaScript (direct DOM manipulation, no major framework like React/Vue/Angular)
- **Styling:** Tailwind CSS (v2 via CDN)
- **Development Server:** Assumed local server (e.g., live-server, http-server) serving the `public` directory.

## App Navigation
Each role has a consistent footer navigation menu:

### Housekeeper Navigation
- Schedule (calendar icon)
- Clients (users icon)
- Settings (cog icon)

### Homeowner Navigation
- Bookings (calendar icon)
- Properties (home icon)
- Settings (cog icon)

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
- `public/homeowner/dashboard.html` - Main bookings view
- `public/homeowner/properties/properties.html` - Property management
- `public/homeowner/bookings/bookings.html` - Booking details
- `public/homeowner/settings/settings.html` - Preferences configuration

## JavaScript Structure

### Common Scripts (shared between roles)
- `public/common/js/firebase-config.js` - Firebase configuration
- `public/common/js/firestore-service.js` - Centralized database service for CRUD operations.
- `public/common/js/auth.js` - Authentication functionality (login, logout, password reset).
- `public/common/js/auth-router.js` - Role-based routing logic after login.
- `public/common/js/defaults.js` - Default app settings (may not be fully utilized).
- `public/common/js/sample-data.js` - **DEPRECATED / Signup Support:** Contains logic to create the *initial minimal profile* for a user immediately after signup. (Previously used for broader sample data).

### Housekeeper Scripts
- `public/housekeeper/js/schedule.js` - Schedule functionality, including booking creation and loading clients (now includes linked homeowners).
- `public/housekeeper/js/clients.js` - Client management functionality.
- `public/housekeeper/js/settings.js` - Settings functionality, using `firestore-service.js` as single source of truth.

### Homeowner Scripts
- `public/homeowner/js/dashboard.js` - Main homeowner dashboard logic, including linking to housekeeper and displaying upcoming bookings.
- `public/homeowner/js/properties.js` - Property management functionality.
- `public/homeowner/js/bookings.js` - Booking management functionality (may be partially replaced by dashboard).
- `public/homeowner/js/settings.js` - Settings functionality.

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

#### Bookings
- Schedule new cleanings
- View booking history
- Cancel or reschedule appointments
- Select frequency (one-time, weekly, bi-weekly)

#### Properties
- Add and manage multiple properties
- Set access information
- Special cleaning instructions
- Property details (bedrooms, bathrooms, etc.)

#### Settings
- Notification preferences
- Payment settings
- Default property selection

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

