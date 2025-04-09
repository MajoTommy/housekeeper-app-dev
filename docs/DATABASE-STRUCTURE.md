# Database Structure (Firestore)

This document outlines the structure of the Firestore database for the Housekeeping App.

## Root Collections

-   `/users`: Stores user profile information for both housekeepers and homeowners.
-   `/invites`: (If applicable) Stores invitation codes or pending invites.

## `/users/{userId}` Document

Contains basic profile information common to all users.

```json
{
  "uid": "userId",
  "email": "user@example.com",
  "role": "housekeeper" | "homeowner",
  "firstName": "Casey",
  "lastName": "Keeper",
  "createdAt": Timestamp,
  // Other common fields...
}
```

### Subcollections under `/users/{userId}`

#### If `role` is "housekeeper":

-   `/clients`: Stores information about clients managed *by this housekeeper*.
    -   `/clients/{clientId}`:
        ```json
        {
          "firstName": "Client",
          "lastName": "Name",
          "email": "client@example.com",
          "phone": "555-1234",
          "address": "123 Main St, Anytown, CA 90210",
          "accessInfo": "Key under mat, code 1234",
          "specialInstructions": "Beware of dog",
          // Other client details...
        }
        ```
-   `/bookings`: Stores *all* booking/appointment records for this housekeeper.
    -   `/bookings/{bookingId}`:
        ```json
        {
          "date": "YYYY-MM-DD", // String format for the date of the booking
          "startTime": "HH:MM AM/PM", // String format (e.g., "9:00 AM", "1:30 PM")
          "endTime": "HH:MM AM/PM", // String format
          "clientId": "clientId | homeownerUserId", // Reference to /clients/{clientId} OR /users/{userId} if homeowner booked directly
          "clientName": "Client Full Name", // Denormalized for easier display
          "clientAddress": "Client Address", // Denormalized
          "clientPhone": "Client Phone", // Denormalized
          "accessInfo": "Access notes for this specific booking", // Denormalized or booking-specific
          "status": "upcoming" | "done" | "cancelled",
          "frequency": "one-time" | "weekly" | "bi-weekly" | "monthly", // Optional recurrence info
          "createdAt": Timestamp,
          "updatedAt": Timestamp
          // Potentially price, job duration estimate, etc.
        }
        ```
        *Note: The `date` field is currently stored/queried as a `YYYY-MM-DD` String.*
-   `/settings`: Stores application-specific settings for the housekeeper.
    -   `/settings/app`: (Single document for simplicity)
        ```json
        {
          "workingDays": {
            "monday": {
              "isWorking": true,
              "startTime": "HH:MM AM/PM", // e.g., "8:00 AM"
              "jobsPerDay": 2, // Number of distinct job blocks
              "jobDurations": [ 210, 210 ], // Array of job durations in minutes, length matches jobsPerDay
              "breakDurations": [ 60 ] // Array of break durations in minutes, length is jobsPerDay - 1
            },
            "tuesday": { "isWorking": false, /* ... other fields null or default */ },
            "wednesday": { /* ... */ },
            "thursday": { /* ... */ },
            "friday": { /* ... */ },
            "saturday": { /* ... */ },
            "sunday": { /* ... */ }
          },
          "timezone": "America/Winnipeg", // IANA Timezone string (e.g., "America/Los_Angeles")
          "autoSendReceipts": false, // Example setting
          "updatedAt": Timestamp
        }
        ```
        *Note: This structure represents the housekeeper's **default** weekly availability pattern.*

-   **(Planned) `/availabilityOverrides`**: Stores exceptions to the default weekly pattern.
    -   `/availabilityOverrides/{overrideId}`:
        ```json
        {
          "type": "block_day" | "block_time" | "add_working_day" | "modify_hours",
          "startDate": "YYYY-MM-DD", // Start date of override
          "endDate": "YYYY-MM-DD", // End date (can be same as start for single day)
          "startTime": "HH:MM AM/PM", // Optional: For block_time or modify_hours
          "endTime": "HH:MM AM/PM", // Optional: For block_time or modify_hours
          "isWorking": boolean, // Optional: For add_working_day
          "reason": "Vacation", // Optional description
          "createdAt": Timestamp
        }
        ```
        *Note: Structure is tentative. Needs to handle various override types.*

#### If `role` is "homeowner":

-   `/settings`: Stores application-specific settings for the homeowner.
    -   `/settings/app`: (Single document)
        ```json
        {
          "linkedHousekeeperId": "housekeeperUserId", // UID of the linked housekeeper
          // Other homeowner settings...
        }
        ```
-   `/bookings`: (Optional, could live under housekeeper only) Stores bookings *made by this homeowner*. Might duplicate data in housekeeper's bookings.
    -   `/bookings/{bookingId}`: (Similar structure to housekeeper's booking, linking back to housekeeper)

## Considerations

-   **Denormalization:** Client details (`clientName`, `clientAddress`, etc.) are denormalized into booking records for efficient display on the housekeeper's schedule without requiring extra reads. Updates to client profiles would ideally trigger updates to future booking records (using Cloud Functions).
-   **Date/Time Handling:** Storing dates as `YYYY-MM-DD` strings simplifies some queries but requires careful handling in Cloud Functions compared to Timestamps, especially regarding timezones and range queries. Storing times as `HH:MM AM/PM` strings requires parsing logic. Using minutes-since-midnight internally in functions can be more robust. Timezone information from housekeeper settings is crucial for interpreting these values correctly for display.
-   **Scalability:** For very high booking volumes, sharding or different data modeling might be needed, but the current structure is suitable for typical use cases.
-   **Overrides:** The planned override system adds complexity but provides necessary flexibility. Careful implementation is needed in the `getAvailableSlots` function to layer overrides onto default settings before subtracting bookings.

## Overview

The database is organized to support both housekeepers and homeowners, with collections specific to each user type as well as shared resources. The architecture allows homeowners to own multiple properties and housekeepers to manage their clients and bookings.

## Database Organization

The database follows a role-based architecture:

1. **User-centric Organization**: All data is organized under the relevant user, with subcollections for user-specific data
2. **Role-based Collections**: Separate collections for role-specific extended profiles (`housekeeper_profiles` and `homeowner_profiles`)
3. **Shared Resources**: Global collections like `properties` that are referenced from user documents

## Data Models / Collections

### Users (`/users/{userId}`)

Base user information common to both housekeepers and homeowners. Populated during signup and potentially updated by `populate-sample-data.js`.

```javascript
{
  email: "user@example.com", // (String) From Firebase Auth
  role: "housekeeper" | "homeowner", // (String) Set during signup
  firstName: "John", // (String) User's first name (may be set initially or via profile update)
  lastName: "Doe", // (String) User's last name
  companyName: "Cleaning Co.", // (String, Optional) Only relevant for housekeepers, potentially duplicated from profile
  // Fields below might be legacy or less used, profiles are preferred
  phone: "555-123-4567", // (String, Optional)
  hourly_rate: 0, // (Number, Optional, Likely unused - use profile)
  service_area: "", // (String, Optional, Likely unused - use profile)
  working_hours: {}, // (Object, Optional, Likely unused - use profile settings)
  profile_picture: "", // (String, Optional, Likely unused - use profile)
  createdAt: Timestamp, // Set on creation
  updatedAt: Timestamp, // Set on updates
  lastLogin: Timestamp // (Optional) Updated by Auth functions
}
```

### Clients (`/users/{housekeeperId}/clients/{clientId}`)

For housekeepers, stores their client information. Added via UI or `populate-sample-data.js`.

```javascript
{
  firstName: "Manual", // (String) Client's first name
  lastName: "Clientone", // (String) Client's last name
  email: "manual1@example.com", // (String, Optional)
  phone: "555-555-0001", // (String, Optional)
  address: "789 Test Ave", // (String, Optional) Full address string
  city: "Sampletown", // (String, Optional)
  state: "CA", // (String, Optional)
  zip: "90210", // (String, Optional)
  notes: "Has a dog, prefers eco-friendly products", // (String, Optional)
  createdAt: Timestamp, // Set by firestoreService.addClient
  updatedAt: Timestamp // (Optional) Set on updates
}
```

### Bookings (`/users/{housekeeperId}/bookings/{bookingId}`)

For housekeepers, stores their booking information. Added via UI (`schedule.js` -> `firestoreService.addBooking`) or `populate-sample-data.js`.

```javascript
{
  clientId: "homeowner_user_id_or_generated_client_id", // (String) Links to homeowner UID or a client doc ID
  clientName: "Corey Homeowner", // (String) Denormalized client name at time of booking
  date: "2025-08-15", // (String) Format YYYY-MM-DD
  startTime: "10:00", // (String) Format HH:MM (24-hour)
  endTime: "12:00", // (String) Format HH:MM (24-hour)
  status: "scheduled" | "completed" | "canceled", // (String)
  frequency: "one-time" | "weekly" | "bi-weekly" | "monthly", // (String)
  notes: "First cleaning for Corey.", // (String, Optional)
  address: "101 Home Sweet Ln", // (String, Optional) Denormalized address at time of booking
  createdAt: Timestamp, // Set by firestoreService.addBooking
  updatedAt: Timestamp // (Optional) Set on updates
}
```

### Housekeeper Profiles (`/housekeeper_profiles/{userId}`)

Extended information specific to housekeepers. Populated/updated by `populate-sample-data.js` or settings UI.

```javascript
{
  firstName: "Casey", // (String)
  lastName: "Keeper", // (String)
  companyName: "Core Cleaning Co.", // (String, Optional)
  phone: "555-333-4444", // (String)
  address: "202 Clean St", // (String, Optional)
  city: "Workville", // (String, Optional)
  state: "CA", // (String, Optional)
  zip: "90212", // (String, Optional)
  serviceZipCodes: ["90210", "90211", "90212"], // (Array of Strings)
  workingDays: { // (Map) Structure defining availability (may be complex, see settings section too)
      monday: { available: true, startTime: "09:00", endTime: "17:00" },
      // ... other days
  },
  inviteCode: "COREKEEPER-XYZ", // (String) Generated 6-char code
  // DEPRECATED FIELDS? (Compare with example below)
  // businessName: "John's Cleaning Service",
  // serviceAreas: ["Downtown", "Suburbs"],
  // servicesOffered: ["Regular Cleaning", "Deep Cleaning"],
  // pricing: { hourlyRate: 30, minimumHours: 2 },
  // bio: "Experienced cleaner with 5 years in the industry",
  // profilePicture: "https://example.com/profile.jpg",
  createdAt: Timestamp, // (Optional) Set on creation
  updatedAt: Timestamp // Set on updates
}
```

### Homeowner Profiles (`/homeowner_profiles/{userId}`)

Extended information specific to homeowners. Populated/updated by `populate-sample-data.js` or settings UI.

```javascript
{
  firstName: "Corey", // (String)
  lastName: "Homeowner", // (String)
  address: "101 Home Sweet Ln", // (String)
  city: "Homestead", // (String)
  state: "CA", // (String)
  zip: "90211", // (String)
  phone: "555-111-2222", // (String)
  specialInstructions: "Please use the back door.", // (String, Optional)
  linkedHousekeeperId: "housekeeper_user_id", // (String, Optional) Set via invite code linking
  // DEPRECATED FIELDS? (Compare with example below)
  // preferredContactMethod: "email" | "phone" | "text",
  // paymentMethods: ["credit_card", "paypal"],
  // defaultInstructions: "Please use eco-friendly products",
  // communicationPreferences: { sendReminders: true, reminderHours: 24 },
  createdAt: Timestamp, // (Optional) Set on creation
  updatedAt: Timestamp // Set on updates
}
```

### Properties (`/properties/{propertyId}`)

Properties owned by homeowners that need cleaning services.

```javascript
{
  name: "Main Home",
  address: {
    street: "123 Main St",
    city: "Anytown",
    state: "CA",
    zip: "90210"
  },
  size: 2000, // square feet
  bedrooms: 3,
  bathrooms: 2,
  specialInstructions: "Please focus on kitchen and bathrooms",
  accessInformation: "Key under the mat. Alarm code: 1234",
  photos: ["https://example.com/property1.jpg"],
  ownerId: "homeowner_user_id", // Reference to user
  preferredHousekeeperId: "housekeeper_user_id", // Optional preferred cleaner
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Housekeeper Settings (`/users/{housekeeperId}/settings/app`)

Stores application configuration for the housekeeper. This is the single source of truth for housekeeper settings.

```javascript
{
  // Represents the housekeeper's working schedule and preferences.
  // This object is normalized by firestore-service.js upon read/write.
  workingDays: {
    monday: {
      isWorking: true,
      jobsPerDay: 2,
      startTime: "8:00 AM",
      breakTime: 90,
      breakDurations: [90],
      jobDurations: [180, 180]
    },
    tuesday: { isWorking: true, /* ... other fields ... */ },
    wednesday: { isWorking: false, /* ... other fields ... */ },
    thursday: { isWorking: true, /* ... other fields ... */ },
    friday: { isWorking: true, /* ... other fields ... */ },
    saturday: { isWorking: false, /* ... other fields ... */ },
    sunday: { isWorking: false, /* ... other fields ... */ }
  },
  // Simplified structure for quick lookup, generated by firestore-service.js
  workingDaysCompat: {
    "0": false, // Sunday
    "1": true,  // Monday
    // ... etc for 2-6
  },
  autoSendReceipts: false,
  updatedAt: Timestamp
}
```

### Homeowner Settings (`/users/{homeownerId}/settings/app`)

Settings specific to homeowners.

```javascript
{
  notificationPreferences: {
    bookingConfirmations: true,
    reminderAlerts: true,
    specialOffers: false
  },
  defaultPropertyId: "property_id", // Default property for bookings
  paymentSettings: {
    autoCharge: true,
    preferredMethod: "credit_card"
  },
  updatedAt: Timestamp
}
```

## User Creation Process

When a new user signs up (`signup.js`):

1.  Firebase Auth user is created.
2.  On success, `sample-data.js` is called which creates:
    *   A minimal document in `/users/{userId}` with `email` and `role`.
    *   A minimal profile document in `/housekeeper_profiles/{userId}` or `/homeowner_profiles/{userId}`.
    *   (Potentially) An empty settings document in `/users/{userId}/settings/app`.

*(Note: Comprehensive sample data population is now handled separately by the developer tool `dev-tools.html` and `populate-sample-data.js`, not during regular signup.)*

## Data Relationships

1.  **Users to Profiles**: Each user document in `/users/{userId}` has a corresponding profile document in either `/housekeeper_profiles/{userId}` or `/homeowner_profiles/{userId}` based on the `role` field in the user document.
2.  **Homeowners to Housekeepers (Linking)**: A homeowner profile (`/homeowner_profiles/{homeownerId}`) can contain a `linkedHousekeeperId` field, pointing to the UID of the housekeeper they are linked with via an invite code.
3.  **Housekeepers to Clients**: Housekeepers manage multiple clients (1:many relationship) stored in their `/users/{housekeeperId}/clients` subcollection.
4.  **Bookings Relationships**: 
    *   Bookings in `/users/{housekeeperId}/bookings` reference the client via `clientId`. This `clientId` can be the **User ID** of a linked homeowner OR the **Document ID** of a client stored in the housekeeper's `/clients` subcollection.
    *   *(Removed reference to propertyId here as it doesn't seem relevant to bookings collection)*

## Role-Based Application Flow

1. **Authentication**: Users sign in via Firebase Authentication
2. **Role Detection**: The application checks the user's role from their `/users/{userId}` document
3. **Routing**:
   - Housekeepers are directed to `/housekeeper/dashboard.html`
   - Homeowners are directed to `/homeowner/dashboard.html`
4. **Data Access**: Each interface only loads the relevant data for that user role

## Data Reset & Sample Data

The application includes a `resetDB()` function that:

1. Clears existing subcollections for the current user
2. Regenerates sample data appropriate for the user's role
3. Maintains the user's basic information and role
4. Ensures all required documents and subcollections exist

## Security Rules

Security rules ensure:

1. Users can only read/write their own profile data
2. Data access is restricted by role (housekeepers cannot access homeowner data and vice versa)
3. References between collections are properly maintained and validated

## Best Practices

1. Always use the database as the source of truth
2. Minimize redundant data while considering read optimization
3. Use transactions for operations that update multiple documents
4. Maintain proper timestamps for all created or updated documents
5. Check user role before displaying role-specific features

## `bookings` Collection

Stores information about individual booking appointments.

-   **Document ID:** Auto-generated (e.g., `a3fG7HkLpQ...`)
-   **Fields:**
    -   `housekeeperId`: (String) UID of the housekeeper.
    -   `homeownerId`: (String) UID of the homeowner who booked.
    -   `homeownerName`: (String) Name of the homeowner (for display).
    -   `propertyAddress`: (String) Address of the property being cleaned.
    -   `startTime`: (Timestamp) Start date and time of the booking.
    -   `endTime`: (Timestamp) End date and time of the booking.
    -   `durationMinutes`: (Number) Duration of the booking in minutes.
    -   `status`: (String) Current status of the booking (e.g., `pending`, `confirmed`, `cancelled_by_homeowner`, `cancelled_by_housekeeper`, `completed`). (UPDATED: Added cancellation statuses).
    -   `notes`: (String) Optional notes from the homeowner during booking.
    -   `createdAt`: (Timestamp) When the booking request was created.
    -   `updatedAt`: (Timestamp) When the booking was last updated.
    -   `confirmedAt`: (Timestamp, Optional) When the booking was confirmed by the housekeeper.
    -   `cancelledAt`: (Timestamp, Optional) When the booking was cancelled. (NEW)
    -   `cancelledBy`: (String, Optional) Who cancelled ('homeowner' or 'housekeeper'). (NEW)
    -   `cancellationReason`: (String, Optional) Reason provided for cancellation. (NEW)

## `users` Collection (May be split or combined based on Auth)

Stores user profile information. Could potentially be split into `homeowners` and `housekeepers` collections if profiles differ significantly. 