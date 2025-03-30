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