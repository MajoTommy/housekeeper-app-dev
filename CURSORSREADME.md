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

### Firebase Configuration
- **public/js/firebase-config.js**: Firebase initialization 
- **public/js/firestore-service.js**: Firestore service containing CRUD operations for all collections

### Authentication
- **public/js/auth.js**: Handles user authentication
- **public/js/signup.js**: Manages user registration

### Settings Management
- **public/js/settings.js**: Core settings management logic
  - Loads user settings from Firestore
  - Handles day toggle UI interactions
  - Generates schedule previews
  - Validates and saves settings
  - Ensures proper UI display of working day panels

### Schedule Management
- **public/js/schedule.js**: Manages schedule display and interaction
  - Loads user schedule from Firestore
  - Calculates available time slots
  - Handles week navigation
  - Manages booking creation and editing

### Client Management
- **public/js/clients.js**: Handles client data operations
  - Client creation, editing, and deletion
  - Client search and filtering
  - Linking clients to appointments

### Booking Management
- **public/js/booking.js**: Manages booking interactions
  - Creating new bookings
  - Editing existing bookings
  - Handling cancellations and rescheduling

### Default Settings
- **public/js/defaults.js**: Contains default settings and calculation utilities
  - Default configuration for new users
  - Time slot calculation functions
  - Time formatting utilities

### Sample Data
- **public/js/sample-data.js**: Contains functions to populate test data
  - Creates sample settings
  - Generates sample clients and bookings

## HTML Structure

### Settings Page (public/settings/settings.html)
- Day cards for each day of the week
- Toggle switches for working/non-working days
- Job count configuration (1-3 jobs per day)
- Start time selection
- Break duration configuration
- Schedule preview visualization

### Schedule Page
- Weekly calendar view
- Navigation between weeks
- Time slot display for each day
- Booking cards for scheduled appointments
- Modal for creating/editing bookings

### Clients Page
- Client list with search functionality
- Client details view
- Client creation/editing forms

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

## Best Practices Implemented

### Data Management
- Database as single source of truth for all settings
- Initial default settings created once and stored in database
- Comprehensive validation before saving to database

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

## Future Enhancements
- Integration with payment processing
- Email and SMS notifications
- Calendar synchronization with external calendars
- Advanced reporting and analytics
- Mobile app versions

This comprehensive documentation provides a solid foundation for understanding the application's architecture, data flow, and implementation details to assist with future development. 