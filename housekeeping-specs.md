# Housekeeper App Specifications

## Application Overview

The Housekeeper App is a mobile-first web application designed for independent housekeepers to manage their clients, schedule, and payments. The app helps housekeepers organize their work, track payments, and maintain client relationships.

## Core Features

1. **Schedule Management**
   - Daily/weekly/monthly calendar views
   - Appointment scheduling and management
   - Rescheduling functionality
   - Cleaning history tracking

2. **Client Management**
   - Client profiles with contact information
   - Client-specific cleaning preferences and notes
   - Client property details
   - Client payment history

3. **Payment Processing**
   - Payment tracking (pending/completed)
   - Payment history
   - Receipt generation
   - Payment notifications

4. **Settings & Profile**
   - Housekeeper profile management
   - Working hours configuration
   - Service area settings
   - Hourly rate management

## Data Models

### User (Housekeeper)

- id: string (unique identifier)
- name: string
- email: string (unique)
- phone: string
- hourly_rate: number
- service_area: string (e.g., "Manhattan, NY")
- working_hours: array of strings (e.g., ["Monday": "09:00-17:00", "Tuesday": "09:00-17:00"])
- profile_picture: string (URL)

### Client

- id: string (unique identifier)
- name: string
- email: string (unique)
- phone: string
- address: string
- property_details: string
- notes: string
- payment_history: array of objects (e.g., [{amount: 100, date: "2024-01-01", status: "completed"}])
- cleaning_preferences: string
- key_information: string
- cleaning_history: array of objects (e.g., [{date: "2024-01-01", status: "completed", notes: "Cleaned the kitchen and bathroom"}])


### Cleaning

- id: string (unique identifier)
- client_id: string (foreign key)
- date: string (e.g., "2024-01-01")
- status: string (e.g., "pending", "completed", "cancelled")
- notes: string
- payment_status: string (e.g., "pending", "completed", "failed")
- payment_details: object (e.g., {amount: 100, method: "credit card"})

### Payment

- id: string (unique identifier)
- client_id: string (foreign key)
- amount: number
- date: string (e.g., "2024-01-01")
- status: string (e.g., "pending", "completed", "failed")
- payment_method: string (e.g., "credit card", "cash", "check")
- notes: string

## API Endpoints

### User Endpoints

- `GET /api/users/:id` - Get user profile
- `PUT /api/users/:id` - Update user profile
- `GET /api/users/:id/schedule` - Get user's schedule
- `GET /api/users/:id/working-hours` - Get user's working hours
- `PUT /api/users/:id/working-hours` - Update user's working hours
- `GET /api/users/:id/settings` - Get user settings
- `PUT /api/users/:id/settings` - Update user settings

### Client Endpoints

- `GET /api/clients` - Get all clients
- `POST /api/clients` - Create a new client
- `GET /api/clients/:id` - Get client details
- `PUT /api/clients/:id` - Update client details
- `DELETE /api/clients/:id` - Delete a client
- `GET /api/clients/:id/appointments` - Get client's appointments
- `GET /api/clients/:id/payments` - Get client's payment history

### Cleaning Endpoints

- `GET /api/cleanings` - Get all cleanings
- `POST /api/cleanings` - Create a new cleaning appointment
- `GET /api/cleanings/:id` - Get cleaning details
- `PUT /api/cleanings/:id` - Update cleaning details
- `DELETE /api/cleanings/:id` - Cancel a cleaning
- `PUT /api/cleanings/:id/status` - Update cleaning status
- `GET /api/cleanings/date/:date` - Get cleanings for a specific date

### Payment Endpoints

- `GET /api/payments` - Get all payments
- `POST /api/payments` - Create a new payment
- `GET /api/payments/:id` - Get payment details
- `PUT /api/payments/:id` - Update payment details
- `PUT /api/payments/:id/status` - Update payment status
- `POST /api/payments/:id/receipt` - Send receipt for payment

## UI/UX Design

### User Interface

The application follows a clean, minimalist design with a focus on usability and efficiency. The color scheme uses blue as the primary color (#2196F3) with light blue accents (#E3F2FD) and red for alerts/notifications (#DC2626).

Key UI principles:
- Mobile-first responsive design
- Large touch targets for mobile users
- Clear visual hierarchy
- Consistent navigation patterns
- Minimal cognitive load

### Client Interface

Client management screens feature:
- Card-based list view with search and filter
- Detailed client profiles with tabbed sections
- Quick action buttons for common tasks
- Inline editing capabilities
- Visual indicators for client status

### Cleaning Interface

Schedule management screens include:
- Calendar view with day/week/month options
- Color-coded appointment status
- Drag-and-drop rescheduling (future enhancement)
- Time slot visualization
- Conflict detection and prevention

### Payment Interface

Payment screens feature:
- Clear separation between pending and completed payments
- Visual indicators for payment status
- Receipt preview functionality
- Payment history with filtering options
- Quick actions for marking payments as received

## Additional Requirements

### Security Requirements
- User authentication with email/password
- Password recovery functionality
- Data encryption for sensitive information
- Session management and timeout
- Input validation and sanitization
- Protection against common web vulnerabilities (XSS, CSRF)

### Performance Requirements
- Page load time under 2 seconds
- Smooth scrolling and transitions
- Efficient data loading with pagination
- Optimized images and assets
- Caching strategy for frequently accessed data

### Compliance Requirements
- GDPR compliance for user data
- Secure handling of payment information
- Privacy policy and terms of service
- Data retention policies
- User consent management

### Accessibility Requirements
- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader compatibility
- Sufficient color contrast
- Text resizing support
- Alternative text for images

## Error Handling

### Frontend Error Handling
- User-friendly error messages
- Form validation with inline error messages
- Network error detection and retry mechanisms
- Graceful degradation when features are unavailable
- Offline mode indicators

### Backend Error Handling
- Consistent error response format
- Appropriate HTTP status codes
- Detailed error logging
- Rate limiting for API endpoints
- Graceful handling of database errors

## Testing Strategy

### Frontend Testing
- Unit tests for components and utilities
- Integration tests for user flows
- End-to-end tests for critical paths
- Cross-browser compatibility testing
- Responsive design testing across devices

### Backend Testing
- Unit tests for API endpoints
- Integration tests for data flows
- Load testing for performance
- Security testing for vulnerabilities
- Database query optimization testing

## Deployment Strategy

### Development Environment
- Local development setup with mock data
- Version control with Git
- CI/CD pipeline for automated testing

### Staging Environment
- Mirror of production environment
- Testing with production-like data
- Performance and security testing

### Production Environment
- Scalable cloud hosting (AWS/GCP/Azure)
- CDN for static assets
- Database backups and replication
- Monitoring and alerting setup
- Zero-downtime deployments

## Analytics and Monitoring

### User Analytics
- Page views and user flows
- Feature usage metrics
- Conversion rates for key actions
- Session duration and frequency
- User retention metrics

### System Monitoring
- Server uptime and performance
- API response times
- Error rates and patterns
- Database performance
- Resource utilization

## Notifications System

### In-App Notifications
- Payment reminders
- Upcoming appointment alerts
- Client updates
- System announcements
- Feature updates

### Email Notifications
- Appointment confirmations
- Payment receipts
- Reminder emails
- Weekly schedule summaries
- Account updates

### Push Notifications (Future)
- Appointment reminders
- Payment confirmations
- Client messages
- Schedule changes
- Urgent alerts

## Data Backup and Recovery

### Backup Strategy
- Daily automated backups
- Point-in-time recovery options
- Encrypted backup storage
- Retention policy (30 days minimum)
- Regular backup testing

### Disaster Recovery
- Recovery time objective (RTO): 4 hours
- Recovery point objective (RPO): 24 hours
- Documented recovery procedures
- Regular disaster recovery drills
- Off-site backup storage

## Third-Party Integrations

### Payment Processing
- Stripe/PayPal integration for online payments
- Invoice generation with PDF export
- Automatic payment reconciliation
- Tax calculation and reporting

### Calendar Integration
- Google Calendar sync
- Apple Calendar sync
- Outlook Calendar sync
- iCal export functionality

### Communication
- SMS notifications via Twilio
- Email service integration (SendGrid/Mailchimp)
- In-app messaging system

### Maps and Location
- Google Maps integration for addresses
- Route optimization suggestions
- Travel time estimation
- Geolocation for mobile check-ins

## User Flows

### Schedule Management

1. **View Schedule**
   - User opens the app and lands on the schedule view (index.html)
   - Calendar displays current day's appointments by default
   - User can navigate to different dates
   - Each appointment shows client name, time, and status

2. **Add New Appointment**
   - User clicks "+" button on schedule page
   - User selects date and time slot on new-cleaning.html
   - A blue card at the top displays the selected date and time
   - User chooses between "Existing Customer" or "New Customer"
   - If "Existing Customer", user is taken to select-customer.html
   - User selects a client from the list
   - User is taken to select-frequency.html to choose cleaning frequency (One Time, Weekly, Bi-Weekly, Monthly)
   - User confirms appointment details on confirm-booking.html
   - New appointment is added to schedule

3. **Reschedule Appointment**
   - User clicks "Reschedule" on an appointment
   - User is taken to reschedule-choice.html
   - User selects whether to reschedule with same client or different client
   - User selects new date and time
   - User confirms changes

4. **Cancel Appointment**
   - User selects an appointment
   - User clicks "Cancel" option
   - User confirms cancellation

### Client Management

1. **View Clients**
   - User navigates to Clients tab
   - List of clients is displayed with search functionality
   - User can filter clients by various criteria

2. **Add New Client**
   - User clicks "+" button on clients page
   - User enters client details (name, contact info, address)
   - User adds property details and cleaning preferences
   - User sets payment rate
   - User saves new client

3. **View Client Details**
   - User clicks on a client from the list
   - Client profile displays with contact info, property details, and payment history
   - User can see upcoming and past appointments for this client

4. **Edit Client**
   - User navigates to client details
   - User clicks "Edit" button
   - User modifies client information
   - User saves changes

### Payment Processing

1. **View Payments**
   - User navigates to Payments tab
   - List of pending and completed payments is displayed
   - Red badge on Payments tab shows number of pending payments

2. **Mark Payment as Paid**
   - User selects a pending payment
   - User clicks "Mark as Paid"
   - User adds payment method details (optional)
   - User confirms payment received

3. **Send Receipt**
   - After marking payment as paid, user has option to send receipt
   - User confirms sending receipt to client's email

### Settings Management

1. **Edit Profile**
   - User navigates to Settings tab
   - User clicks "Edit" on profile card
   - User updates personal information
   - User saves changes

2. **Configure Working Hours**
   - User navigates to Settings tab
   - User selects working days
   - User sets start and end times
   - User saves working hours

3. **Manage Payment Settings**
   - User toggles auto-send receipts option
   - Settings are saved automatically

## UI Components

### Navigation
- Bottom tab navigation with Schedule, Clients, Payments, and Settings
- Back buttons for sub-pages
- Settings icon in header for main pages

### Common UI Elements
- Client cards with basic information
- Appointment cards with time and status
- Payment cards with amount and status
- Action buttons (primary and secondary)
- Form inputs with labels
- Toggle switches for boolean settings
- Search bars for filtering lists
- Notification badges for pending items
- Blue date/time cards with white text for booking flow

## Booking Flow UI Pattern
The booking flow follows a consistent pattern with these elements:
1. Blue card at the top of each page showing date and time information
2. Clear page titles indicating the current step
3. Back button for navigation to previous step
4. Consistent styling across all booking-related pages
5. Progressive disclosure of information as the user moves through the flow

## Page Structure

### Main Pages
1. **Schedule (index.html)**
   - Calendar view with daily appointments
   - Add appointment button
   - Navigation to other main sections

2. **Clients (clients/clients.html)**
   - Client list with search functionality
   - Add client button
   - Client filtering options

3. **Payments (payments/payments.html)**
   - Pending payments section
   - Completed payments section
   - Payment notification badge

4. **Settings (settings/settings.html)**
   - Profile information
   - Working hours configuration
   - Payment settings
   - Support options

### Booking Flow Pages
1. **New Cleaning (schedule/new-cleaning.html)**
   - Date and time selection
   - Blue card displaying selected date and time
   - Options for existing or new customer

2. **Select Customer (schedule/select-customer.html)**
   - Blue card displaying selected date and time
   - List of recent customers
   - Search functionality for finding customers

3. **Select Frequency (schedule/select-frequency.html)**
   - Blue card displaying selected date and time and client
   - Options for cleaning frequency (One Time, Weekly, Bi-Weekly, Monthly)

4. **Confirm Booking (schedule/confirm-booking.html)**
   - Summary of appointment details
   - Confirmation button
   - Option to add to calendar

## Technical Requirements

1. **Frontend**
   - HTML5, CSS (Tailwind CSS), JavaScript
   - Mobile-first responsive design
   - Progressive Web App capabilities

2. **Backend** (to be implemented)
   - RESTful API for data operations
   - Authentication and authorization
   - Data persistence
   - Email notifications

3. **Data Storage**
   - User profiles
   - Client information
   - Appointment details
   - Payment records

## Implementation Priorities

1. **Phase 1: Core Functionality**
   - Schedule viewing and management
   - Basic client management
   - Simple payment tracking

2. **Phase 2: Enhanced Features**
   - Advanced scheduling options
   - Detailed client profiles
   - Comprehensive payment processing
   - Receipt generation

3. **Phase 3: Optimization**
   - Performance improvements
   - Offline capabilities
   - Push notifications
   - Data analytics and reporting

## Page Structure

### Main Pages
1. **Schedule (index.html)**
   - Calendar view with daily appointments
   - Add appointment button
   - Navigation to other main sections

2. **Clients (clients/clients.html)**
   - Client list with search functionality
   - Add client button
   - Client filtering options

3. **Payments (payments/payments.html)**
   - Pending payments section
   - Completed payments section
   - Payment notification badge

4. **Settings (settings/settings.html)**
   - Profile information
   - Working hours configuration
   - Payment settings
   - Support options

### Booking Flow Pages
1. **New Cleaning (schedule/new-cleaning.html)**
   - Date and time selection
   - Blue card displaying selected date and time
   - Options for existing or new customer

2. **Select Customer (schedule/select-customer.html)**
   - Blue card displaying selected date and time
   - List of recent customers
   - Search functionality for finding customers

3. **Select Frequency (schedule/select-frequency.html)**
   - Blue card displaying selected date and time and client
   - Options for cleaning frequency (One Time, Weekly, Bi-Weekly, Monthly)

4. **Confirm Booking (schedule/confirm-booking.html)**
   - Summary of appointment details
   - Confirmation button
   - Option to add to calendar

### Sub-Pages
1. **Appointment Details (schedule/appointment-details.html)**
   - Client information
   - Appointment time and status
   - Actions (complete, reschedule, cancel)

2. **Add/Edit Appointment (schedule/add-appointment.html)**
   - Client selection
   - Date and time pickers
   - Notes field

3. **Client Details (clients/client-details.html)**
   - Contact information
   - Property details
   - Cleaning preferences
   - Payment history
   - Upcoming appointments

4. **Add/Edit Client (clients/add-client.html)**
   - Contact information form
   - Property details form
   - Cleaning preferences form
   - Payment rate settings

5. **Payment Details (payments/payment-details.html)**
   - Client information
   - Appointment details
   - Payment amount and status
   - Payment actions

6. **Edit Profile (settings/edit-profile.html)**
   - Personal information form
   - Service area settings
   - Hourly rate configuration

7. **Help & Support (settings/help.html)**
   - FAQ section
   - Contact support option
   - Quick guides
