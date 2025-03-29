# Housekeeping App Technical Documentation

## Overview
This application is a comprehensive management system for housekeeping service providers to efficiently manage their cleaning business. It allows users to configure their working schedule, manage clients, book appointments, track payments, and handle communications like receipts. The application is designed to be mobile-friendly and to handle the entire workflow of a cleaning business.

## Tech Stack
- **Frontend**:
  - HTML5
  - CSS with Tailwind CSS for styling (extensive use of utility classes like `bg-blue-100`, `hidden`)
  - Vanilla JavaScript for DOM manipulation, business logic, and application flow
  - Font Awesome for icons (`fas fa-*` classes)
- **Backend**:
  - Firebase Authentication for user management
  - Firebase Firestore for data storage (users, settings, clients, appointments, payments)
  - Firebase Hosting for deployment
- **Third-Party Libraries**:
  - Tailwind CSS (loaded from CDN: cdn.tailwindcss.com)
  - Font Awesome (loaded from CDN: cdnjs.cloudflare.com)

## Database Structure
The application uses Firebase Firestore with the following collection structure:

### Users Collection
- **Path**: `/users/{userId}`
- **Fields**:
  - `name`: User's name
  - `email`: User's email address
  - `phone`: User's phone number
  - `hourly_rate`: Hourly billing rate
  - `service_area`: Geographic service area
  - `working_hours`: Working hours object
  - `profile_picture`: URL to profile image
  - `createdAt`: Timestamp
  - `settings`: Object containing user settings
    - `workingDays`: Object with day-specific configurations
    - `workingDaysCompat`: Numeric index based day configuration (legacy)
    - `calculatedTimeSlots`: Array of time slots
    - `hourlyRate`: Hourly rate
    - `autoSendReceipts`: Boolean toggle for automatic receipt sending

### Working Days Configuration
```javascript
workingDays: {
  monday: {
    isWorking: true,
    jobsPerDay: 2,
    startTime: "8:00 AM",
    breakTime: 90, // minutes
    cleaningDuration: 180, // minutes
    jobDurations: [180, 180], // durations for each job
    breakDurations: [90], // durations for breaks between jobs
    maxHours: 420 // maximum working minutes per day
  },
  // Same structure for other days of the week
}
```

### Clients Collection
- **Path**: `/users/{userId}/clients/{clientId}`
- **Fields**:
  - `name`: Client's name
  - `email`: Client's email
  - `phone`: Client's phone number
  - `address`: Client's address
  - `property_details`: Details about the property
  - `notes`: General notes
  - `cleaning_preferences`: Specific cleaning preferences
  - `key_information`: Access information
  - `createdAt`: Timestamp

### Appointments Collection
- **Path**: `/users/{userId}/appointments/{appointmentId}`
- **Fields**:
  - `client_id`: Reference to client
  - `client_name`: Client's name
  - `date`: Appointment date
  - `start_time`: Start time
  - `end_time`: End time
  - `status`: Appointment status (scheduled, completed, canceled)
  - `notes`: Appointment-specific notes
  - `payment_status`: Payment status
  - `payment_amount`: Amount to be paid
  - `frequency`: Frequency of recurring appointments
  - `createdAt`: Timestamp

### Payments Collection
- **Path**: `/users/{userId}/payments/{paymentId}`
- **Fields**:
  - `client_id`: Reference to client
  - `client_name`: Client's name
  - `appointment_id`: Reference to appointment
  - `amount`: Payment amount
  - `date`: Payment date
  - `status`: Payment status
  - `payment_method`: Method of payment
  - `notes`: Payment-specific notes
  - `createdAt`: Timestamp

## Application Flow

### Authentication Flow
1. User signs up or logs in through Firebase Authentication
2. On successful authentication, user is redirected to the main application
3. If it's a new user, default settings are created and saved to Firestore
4. For existing users, settings are loaded from Firestore

### Settings Management Flow
1. User accesses settings page to configure their work schedule
2. For each day of the week, user can:
   - Toggle working/non-working status
   - Set number of jobs per day (1-3)
   - Configure start time
   - Set break duration between jobs
   - View a schedule preview showing job slots and breaks
3. Changes are validated and saved to Firestore in real-time
4. Settings are used to calculate available time slots for bookings

### Schedule Calculation Flow
1. Based on working days and hours configuration, the system calculates:
   - Available days for bookings
   - Time slots available on each working day
   - Duration of each cleaning job
   - Break times between jobs
2. These calculations provide the framework for booking appointments

### Booking Flow
1. User navigates to the schedule view to see weekly calendar
2. Available time slots are displayed based on configured settings
3. User can click on an available slot to create a new booking
4. User selects an existing client or creates a new one
5. User sets frequency (one-time, weekly, bi-weekly, monthly)
6. System creates the booking and updates the calendar

### Client Management Flow
1. User can add new clients with detailed information
2. Existing clients can be edited or deleted
3. Client information is linked to appointments and payments

### Payments Flow
1. Completed appointments can have payments recorded
2. Payment status is tracked (paid, pending)
3. Receipts can be sent automatically if enabled in settings

## Key Files and Components

### Core Application Files
- **public/index.html**: Main application entry point and schedule view
- **public/login.html**: User authentication page
- **public/signup.html**: New user registration page
- **public/clients/clients.html**: Client management interface

### JavaScript Core
- **public/js/firebase-config.js**: Firebase configuration and initialization
- **public/js/firestore-service.js**: Firestore service for database operations
- **public/js/auth.js**: Authentication service handling login/logout
- **public/js/schedule.js**: Schedule management (core application functionality)
- **public/js/clients.js**: Client management functionality
- **public/js/settings.js**: Settings management and working day configuration
- **public/js/booking.js**: Appointment booking functionality
- **public/js/defaults.js**: Default settings and time slot calculations

### Settings Interface
- **public/settings/settings.html**: Working day configuration interface

### Booking Flow
- **public/schedule/new-cleaning.html**: New appointment creation
- **public/schedule/select-customer.html**: Client selection for appointments
- **public/schedule/select-frequency.html**: Frequency selection for appointments
- **public/schedule/confirm-booking.html**: Booking confirmation

### Rescheduling Flow
- **public/schedule/reschedule-choice.html**: Options for rescheduling
- **public/schedule/reschedule-cleaning.html**: Interface for rescheduling
- **public/schedule/confirm-reschedule.html**: Confirmation for rescheduled appointments

### Mobile Navigation
All pages include the mobile footer navigation with three main sections:
- Schedule (calendar icon)
- Clients (users icon)
- Payments (dollar sign icon with notification badge)

## HTML Structure

### Settings Page (public/settings/settings.html)
- Day cards for each day of the week
- Toggle switches for working/non-working days
- Job count configuration (1-3 jobs per day)
- Start time selection
- Break duration configuration
- Schedule preview visualization

### Schedule Page (public/index.html)
- Weekly calendar view
- Navigation between weeks
- Time slot display for each day
- Booking cards for scheduled appointments
- Modal for creating/editing bookings

### Clients Page (public/clients/clients.html)
- Client list with search functionality
- Client details modal (shown as bottom sheet on mobile)
- Client creation/editing interface

## Critical Functionality

### Working Day Panel Visibility
The application has sophisticated logic to ensure working day panels are properly displayed:
- Multiple visibility checks at different points in the application lifecycle
- Use of setTimeout with staggered delays to ensure proper rendering
- Console logging for debugging visibility issues

### Content Generation
Schedule previews are generated dynamically based on settings:
- Job count determines number of job slots
- Start time and break duration affect scheduling
- Multiple approaches for content generation to ensure reliability

### Settings Migration
The application supports both legacy and current database structures:
- Compatibility layer for numeric-indexed working days (`workingDaysCompat`)
- Named day-based configuration (`workingDays`)
- Fallback patterns to ensure older data formats are supported

### Default Settings Creation
For new users, the application creates comprehensive default settings:
- All days initially handled according to standard configuration
- Default values stored in database to maintain single source of truth
- Reasonable job counts and break times pre-configured

### Null-Value Approach for Settings
The application uses a null-value approach for settings to avoid conflicts:
- Initial working day objects start with null/empty values instead of hardcoded defaults
- When settings are loaded from the database, the application applies reasonable defaults only for missing fields
- This prevents conflicts between hardcoded defaults and database values
- Ensures consistent behavior when toggling days from non-working to working and back

### Sample Data Management
- **Reset Functionality**: The app includes a reset button (red circular button at bottom-right corner of main screen)
- **public/js/sample-data.js**: Contains functions to generate sample data with null values
- Reset process:
  1. Clears all existing user settings from the database
  2. Creates minimal working day objects with only isWorking property set
  3. Leaves all other fields as null to be populated by the application's default logic
  4. Forces a page reload to apply the new settings

## Known Issues and Fixes

### Day Panel Visibility Issues
- Sometimes panels for days toggled from non-working to working don't display correctly after page refresh
- Fixed with multiple visibility checks and content generation approaches:
  - Checking both class-based and inline style hiding
  - Force showing panels for working days
  - Generating content after panel is made visible

### Content Generation Issues
- Schedule previews sometimes remain empty after settings changes
- Solutions implemented:
  - Clicking job count buttons programmatically
  - Using direct `setJobCount` function when available
  - Force-updating visual indicators
  - Adding delays to allow UI to update

### Toggle Event Handling
- Special handling for day toggle events to ensure proper UI updates
- Double-checking visibility and content after a short delay
- Using multiple approaches to generate content reliably

### Default Values Conflicts
- Previously, hardcoded defaults in the code could conflict with database values
- Fixed by implementing a "null-value" approach:
  - Initialize objects with minimal structure and null values
  - Apply defaults only when needed
  - Use database as single source of truth
  - Generate appropriate content based on isWorking status

## Best Practices Implemented

### Data Management
- Database as single source of truth for all settings
- Initial default settings created once and stored in database
- Comprehensive validation before saving to database
- Null-value approach to avoid conflicts between code and database

### UI Reliability
- Multiple visibility checks for UI elements
- Redundant content generation approaches
- Staggered timeouts to ensure proper rendering sequence

### Error Handling and Debugging
- Detailed console logging throughout the application
- Debugging functions for working days and time slots
- Clear error messages for authentication and data operations

### User Experience
- Mobile-friendly design with responsive layouts
- Loading indicators during data operations
- Confirmation dialogs for important actions
- Error notifications for failed operations
- Sample data reset functionality for testing

## Future Enhancements
- Integration with payment processing
- Email and SMS notifications
- Calendar synchronization with external calendars
- Advanced reporting and analytics
- Mobile app versions
- Improved default value management
- Progressive Web App (PWA) capabilities

This comprehensive documentation provides a solid foundation for understanding the application's architecture, data flow, and implementation details to assist with future development. 