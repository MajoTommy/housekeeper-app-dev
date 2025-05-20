# Database Structure (Firestore)

This document outlines the structure of the Firestore database for the Housekeeping App.

## Root Collections

-   `/users`: Stores base user profile information (auth details, role).
-   `/housekeeper_profiles`: Stores extended profile information specific to housekeepers.
-   `/homeowner_profiles`: Stores extended profile information specific to homeowners.
-   `/properties`: Stores details about homeowner properties (address, size, etc.). *(Note: Property characteristics like size, bedrooms, bathrooms are being centralized to `/homeowner_profiles/{userId}` for the primary property. This collection can be used for homeowners with multiple distinct properties in future iterations.)*
-   `/invites`: (Currently unused, potential for future invite system)

## `/users/{userId}` Document

Contains basic profile information common to all users, primarily sourced from Firebase Auth and initial signup.

```json
{
  "email": "user@example.com", // From Auth
  "role": "housekeeper" | "homeowner", // Set during signup
  "firstName": "Casey", // Set during signup/profile edit
  "lastName": "Keeper", // Set during signup/profile edit
  "phone": "555-333-4444", // Set during signup/profile edit
  "companyName": "Core Cleaning Co.", // Set during profile edit (housekeeper only)
  "createdAt": Timestamp, // Set on creation
  "updatedAt": Timestamp, // Set on updates
  "lastLogin": Timestamp, // (Optional) Set by Auth triggers/functions
  // --- Relevant for role: housekeeper ---
  "blockedHomeowners": ["homeownerId1", "homeownerId2"], // (Array<String>, Optional) List of homeowner UIDs blocked by this housekeeper
  "referralsEnabled": false, // (Boolean, Optional, default: false) Whether the housekeeper allows their invite code to be shared by homeowners
  "aiPreferences": { // (Object, Optional, housekeeper only) Preferences for AI-powered suggestions
    "targetHourlyRate": 50, // (Number) Housekeeper's target hourly wage for AI calculations
    "baseLocation": { // (Object, Optional) Base location for travel estimates
      "zipCode": "90210" // (String) Postal/Zip code
    }
  }
}
```
*Note: Fields like `hourly_rate`, `service_area`, `working_hours` are deprecated here; use profile/settings subcollections.* 

### Subcollections under `/users/{userId}`

#### If `role` is "housekeeper":

-   `/clients`: Stores information about clients managed *by this housekeeper*.
    -   `/clients/{clientId}`: Document ID is the same as the `linkedHomeownerId` if `isLinked` is true.
        ```json
        {
          "firstName": "Client",
          "lastName": "Name",
          "email": "client@example.com",
          "phone": "555-1234",
          "address": "123 Main St", // Full address string
          "city": "Anytown",
          "state": "CA",
          "zip": "90210",
          "notes": "Notes specific to the client",
          "isLinked": true, // (Boolean) Indicates if this client record corresponds to an active homeowner user account
          "linkedHomeownerId": "{homeownerUserId}", // (String) The UID of the linked homeowner (same as doc ID if linked)
          "isActive": true, // (Boolean) Whether the client is considered active by the housekeeper
          "archivedAt": Timestamp, // (Timestamp, Optional) When the client was archived
          "createdAt": Timestamp,
          "updatedAt": Timestamp
        }
        ```
-   `/bookings`: Stores booking/appointment records for this housekeeper. Read by linked homeowners.
    -   `/bookings/{bookingId}`:
        ```json
        {
          "housekeeperId": "{userId}", // Housekeeper UID
          "clientId": "clientId | homeownerUserId", // UID of the client (from /clients or /users)
          "clientName": "Client Full Name", // Denormalized
          "address": "Client Address", // Optional: Denormalized from client/property at booking time
          
          "startTimestamp": Timestamp, // Primary storage (UTC)
          "endTimestamp": Timestamp, // Primary storage (UTC)
          "startTimestampMillis": Number, // UTC milliseconds since epoch
          "endTimestampMillis": Number, // UTC milliseconds since epoch
          "durationMinutes": Number, // Duration of booking
          
          "status": "pending_housekeeper_review" | "housekeeper_proposed_alternative" | "confirmed_by_housekeeper" | "homeowner_accepted_proposal" | "declined_by_housekeeper" | "declined_by_homeowner" | "cancelled_by_homeowner" | "cancelled_by_housekeeper" | "completed" | "approved_and_scheduled",
          "frequency": "one-time" | "weekly" | "bi-weekly" | "monthly", 
          "recurringEndDate": Timestamp, // (Timestamp, Optional) For recurring bookings
          "notes": "Booking specific notes", // Optional

          "baseServices": [
              { "id": "serviceId1", "name": "Standard Cleaning", "price": 120.00, "durationMinutes": 120 }
          ],
          "addonServices": [
              { "id": "addonId1", "name": "Inside Oven", "price": 45.00, "durationMinutes": 45 }
          ],
          "estimatedTotalPrice": 165.00, // Calculated total at request time by homeowner UI (based on min/max ranges and homeowner input)
          "finalQuotedPrice": 170.00, // (Number, Optional) The final price quoted by the housekeeper and used when approving a request or in a proposal.
          
          "originalRequestId": "requestDocId", // (String, Optional) If booking originated from a service request
          "source": "service_request" | "manual_booking", 
          "scheduledBookingId": "newBookingIdFromAcceptedProposal", // (String, Optional) If this is a bookingRequest that was converted into a booking

          "createdAt": Timestamp,
          "updatedAt": Timestamp,
          "requestTimestamp": Timestamp, // (Timestamp, for bookingRequests) When the request was made
          "lastUpdatedTimestamp": Timestamp, // (Timestamp, for bookingRequests) When the request was last updated
          "proposal": { // (Object, Optional, for bookingRequests with status 'housekeeper_proposed_alternative')
            "proposedDate": Timestamp | String, // Can be Firestore Timestamp or YYYY-MM-DD string
            "proposedTime": "HH:mm" | String, // E.g., "10:00" or "Morning"
            "housekeeperNotes": "This time works better.",
            "proposedFrequency": "one-time" | "weekly" | "bi-weekly" | "monthly",
            "proposedRecurringEndDate": Timestamp | String, // (YYYY-MM-DD string, Optional)
            "proposedPrice": 175.00, // (Number, Optional)
            "proposedAt": Timestamp
          },
          "declineNote": "Reason for declining...", // (String, Optional, for bookingRequests declined by homeowner)
          "confirmedAt": Timestamp, // Optional
          "cancelledAt": Timestamp, // Optional
          "cancelledBy": "homeowner" | "housekeeper", // Optional
          "cancellationReason": "Reason...", // Optional

          "stripePaymentIntentId": "pi_...", 
          "paymentStatus": "pending_payment" | "processing" | "succeeded" | "failed" | "requires_action" | "canceled"
        }
        ```
-   `/bookingRequests`: (DEPRECATED - this logic is merged into `/bookings` with various statuses)

-   `/settings`: Stores application-specific settings for the housekeeper.
    -   `/settings/app`: (Single document)
        ```json
        {
          "workingDays": { 
            "monday": {
              "isWorking": true,
              "startTime": "08:00", 
              "jobsPerDay": 2,
              "jobDurations": [ 210, 210 ], 
              "breakDurations": [ 60 ] 
            }
          },
          "timezone": "America/Los_Angeles", 
          "autoSendReceipts": false,
          "workingDaysCompat": { 
                "0": false, "1": true, "2": true, "3": true, "4": false, "5": true, "6": false
          },
          "updatedAt": Timestamp
        }
        ```
-   `/services`: Stores the services offered by the housekeeper.
    -   `/services/{serviceId}`:
        ```json
        {
          "serviceName": "Standard Cleaning", // (String) Name of the service
          "description": "Basic cleaning for homes...", // (String, Optional) Detailed description
          "type": "base" | "addon", // (String) Type of service
          "basePrice": 120.00, // (Number) The housekeeper's ideal/target price for this service under standard conditions. Used as a basis for AI suggestions.
          "homeownerVisibleMinPrice": 100.00, // (Number, Optional) The minimum price for this service shown in a range to the homeowner. If not set, basePrice might be used as min or a calculation applied.
          "homeownerVisibleMaxPrice": 180.00, // (Number, Optional) The maximum price for this service shown in a range to the homeowner. If not set, basePrice might be used as max or a calculation applied.
          "durationMinutes": 120, // (Number) Estimated duration in minutes for standard conditions
          "includedTasks": ["dust_surfaces", "vacuum_carpets_rugs"], // (Array<String>, Optional) List of predefined task IDs included in this service
          "isActive": true, // (Boolean) Whether the service is currently offered
          "createdAt": Timestamp,
          "updatedAt": Timestamp
        }
        ```
-   `/timeOffDates`: Stores individual dates marked as time off via the calendar.
    -   `/timeOffDates/{YYYY-MM-DD}`: (Document ID is the date)
        ```json
        {
          "isTimeOff": true, 
          "addedAt": Timestamp 
        }
        ```

#### If `role` is "homeowner":

-   `/settings`: Stores application-specific settings for the homeowner.
    -   `/settings/app`: (Single document)
        ```json
        {
          "defaultPropertyId": "propertyId", 
          "notificationPreferences": { 
            "bookingConfirmations": true,
            "reminderAlerts": true
          },
          "paymentSettings": { 
            "autoCharge": true
          },
          "updatedAt": Timestamp
        }
        ```

## `/housekeeper_profiles/{userId}` Document

Stores extended profile information specific to housekeepers.

```json
{
  "firstName": "Casey", 
  "lastName": "Keeper", 
  "phone": "555-333-4444", 
  "companyName": "Core Cleaning Co.", 
  "address": "202 Clean St", 
  "city": "Workville", 
  "state": "CA", 
  "zip": "90212", 
  "serviceZipCodes": ["90210", "90211", "90212"], 
  "inviteCode": "YGG3GW", 
  "bio": "Professional cleaning service...", 
  "profilePictureUrl": "https://...", 
  "createdAt": Timestamp,
  "updatedAt": Timestamp,
  
  "stripeAccountId": "acct_...", 
  "stripeAccountStatus": "enabled" | "pending" | "restricted", 

  "stripeCustomerId": "cus_...", 
  "stripeSubscriptionId": "sub_...", 
  "stripeSubscriptionStatus": "active" | "trialing" | "past_due" | "canceled", 
  "stripePriceId": "price_...", 
  "stripeCurrentPeriodEnd": Timestamp
}
```

## `/homeowner_profiles/{userId}` Document

Stores extended profile information specific to homeowners.

```json
{
  "firstName": "Corey", 
  "lastName": "Homeowner", 
  "phone": "555-111-2222", 
  "address": "101 Home Sweet Ln", // Primary address for profile
  "city": "Homestead",
  "state": "CA",
  "zip": "90211",
  // --- NEW: Property Characteristics (for the primary/default property) ---
  "squareFootage": 2200, // (Number, Optional) Approximate square footage
  "numBedrooms": 3, // (Number, Optional) Number of bedrooms
  "numBathrooms": 2.5, // (Number, Optional) Number of bathrooms (e.g., 2.5 for 2 full, 1 half)
  "homeType": "house", // (String, Optional) E.g., 'house', 'apartment', 'townhouse', 'condo', 'other'
  // --- END: Property Characteristics ---
  "specialInstructions": "Default instructions for cleaners", 
  "linkedHousekeeperId": "housekeeperUserId", 
  "preferredContactMethod": "email", 
  "createdAt": Timestamp,
  "updatedAt": Timestamp,

  "stripeCustomerId": "cus_..."
}
```

## `/properties/{propertyId}` Document

Stores details about individual properties owned by homeowners. *(Note: For the current single-primary-property model, characteristics like size, bedrooms, bathrooms are primarily managed in `/homeowner_profiles/{userId}`. This collection is for future expansion to support multiple properties per homeowner.)*

```json
{
  "ownerId": "homeownerUserId", 
  "name": "Main Residence", 
  "address": {
      "street": "123 Main St",
      "city": "Anytown",
      "state": "CA",
      "zip": "90210"
  },
  // The following fields are PREFERRED on /homeowner_profiles/{userId} for the primary property
  // "size": 2200, // (Number, Optional) Square footage 
  // "bedrooms": 3, // (Number, Optional)
  // "bathrooms": 2, // (Number, Optional)
  // "homeType": "house", // (String, Optional)
  "specialInstructions": "Property-specific instructions.",
  "accessInformation": "Key under the flowerpot.",
  "photos": [], 
  "preferredHousekeeperId": null, 
  "createdAt": Timestamp,
  "updatedAt": Timestamp
}
```

## Considerations

-   **Denormalization:** Client name, service names, and service prices are denormalized into booking records. Consider Cloud Functions to update future bookings if profile/client/service info changes (low priority for MVP).
-   **Consistency:** Basic user info (name, phone) is potentially duplicated between `/users/{userId}` and the role-specific profile (`/housekeeper_profiles` or `/homeowner_profiles`). Updates should ideally write to both locations atomically (e.g., using batched writes as implemented in `updateHousekeeperProfileAndUser`).
-   **Date/Time Handling:** Uses Firestore Timestamps (UTC) for primary storage of event times (bookings). Millisecond versions are stored alongside for frontend convenience. Timezone settings (`/users/{housekeeperId}/settings/app.timezone`) are crucial for correctly formatting these UTC times for display in the UI.
-   **Time Off:** The current calendar UI uses `YYYY-MM-DD` document IDs. Other formats might exist from old data/features but aren't used by this UI.
-   **Homeowner Access:** Homeowner views rely on security rules allowing reads from `/users/{linkedHousekeeperId}/bookings` based on matching `clientId` and the `linkedHousekeeperId` field in `/homeowner_profiles/{homeownerId}`.

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

Stores booking/appointment records for a specific housekeeper.

```javascript
{
  // Core Identifiers
  "housekeeperId": "wnvHPASoOlUUeofBcbi2wq3ZSRz2", // (String) UID of the housekeeper this booking belongs to.
  "homeownerId": "oVq1QoYHcRRTkh0KjMeGfhkgx5H3", // (String) UID of the homeowner who booked (or clientId if booked by housekeeper).
  
  // Denormalized Client/Homeowner Info (for display)
  "clientName": "Corey Homeowner", // (String) Name of the homeowner/client.
  "address": "101 Home Sweet Ln", // (String) Address where the service will occur (denormalized from profile).

  // Primary Time Fields (Stored as Firestore Timestamps)
  "startTimestamp": Timestamp, // (Timestamp) Start date and time of the booking (UTC).
  "endTimestamp": Timestamp, // (Timestamp) End date and time of the booking (UTC).

  // Millisecond Time Fields (Stored as Numbers for Frontend Use)
  "startTimestampMillis": 1744642800000, // (Number) UTC milliseconds since epoch for start time.
  "endTimestampMillis": 1744655400000, // (Number) UTC milliseconds since epoch for end time.
  
  // Booking Details
  "status": "pending" | "confirmed" | "rejected" | "cancelled_by_homeowner" | "cancelled_by_housekeeper" | "completed",
  "frequency": "one-time" | "weekly" | "bi-weekly" | "monthly",
  "notes": "First cleaning for Corey.",
  "serviceType": "Standard Cleaning",

  // Auditing Timestamps
  "createdAt": Timestamp,
  "updatedAt": Timestamp,
  "confirmedAt": Timestamp,
  "cancelledAt": Timestamp,
  
  // Cancellation Details (Optional)
  "cancelledBy": "homeowner" | "housekeeper",
  "cancellationReason": "Reason provided..."
}
```

### Housekeeper Profiles (`/housekeeper_profiles/{userId}`)

Extended information specific to housekeepers. Populated/updated by `populate-sample-data.js` or settings UI.

```javascript
{
  firstName: "Casey",
  lastName: "Keeper",
  companyName: "Core Cleaning Co.",
  phone: "555-333-4444",
  address: "202 Clean St",
  city: "Workville",
  state: "CA",
  zip: "90212",
  serviceZipCodes: ["90210", "90211", "90212"],
  workingDays: {
      monday: { available: true, startTime: "09:00", endTime: "17:00" },
  },
  inviteCode: "COREKEEPER-XYZ",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Homeowner Profiles (`/homeowner_profiles/{userId}`)

Extended information specific to homeowners. Populated/updated by `populate-sample-data.js` or settings UI.

```javascript
{
  firstName: "Corey",
  lastName: "Homeowner",
  address: "101 Home Sweet Ln",
  city: "Homestead",
  state: "CA",
  zip: "90211",
  phone: "555-111-2222",
  specialInstructions: "Please use the back door.",
  linkedHousekeeperId: "housekeeper_user_id",
  createdAt: Timestamp,
  updatedAt: Timestamp
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
  size: 2000,
  bedrooms: 3,
  bathrooms: 2,
  specialInstructions: "Please focus on kitchen and bathrooms",
  accessInformation: "Key under the mat. Alarm code: 1234",
  photos: ["https://example.com/property1.jpg"],
  ownerId: "homeowner_user_id",
  preferredHousekeeperId: "housekeeper_user_id",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Housekeeper Settings (`/users/{housekeeperId}/settings/app`)

Stores application configuration for the housekeeper. This is the single source of truth for housekeeper settings.

```javascript
{
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
  workingDaysCompat: {
    "0": false,
    "1": true,
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
  defaultPropertyId: "property_id",
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

*(Note: Comprehensive sample data population is now handled separately by the developer tool `dev-tools.html` and `public/js/populate-sample-data.js`. This script now also **deletes existing subcollection data** (services, clients, bookings, settings) for the specified housekeeper before populating to ensure a clean state.)*

## Data Relationships

1.  **Users to Profiles**: Each user document in `/users/{userId}` has a corresponding profile document in either `/housekeeper_profiles/{userId}` or `/homeowner_profiles/{userId}` based on the `role` field in the user document.
2.  **Homeowners to Housekeepers (Linking)**: A homeowner profile (`/homeowner_profiles/{homeownerId}`) can contain a `linkedHousekeeperId` field, pointing to the UID of the housekeeper they are linked with via an invite code.
3.  **Housekeepers to Clients**: Housekeepers manage multiple clients (1:many relationship) stored in their `/users/{housekeeperId}/clients` subcollection.
4.  **Bookings Relationships**: 
    *   Bookings in `/users/{housekeeperId}/bookings` reference the client via `clientId`. This `clientId` can be the **User ID** of a linked homeowner OR the **Document ID** of a client stored in the housekeeper's `/clients` subcollection.
    *   If a booking originated from a service request, its `originalRequestId` field links to the corresponding document in `/users/{housekeeperId}/bookingRequests`.
    *   A `bookingRequest` with status `approved_and_scheduled` will have a `scheduledBookingId` field linking to the created document in `/users/{housekeeperId}/bookings`.
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

// ... NEW SUBCOLLECTION: bookingRequests ---
-   `/bookingRequests/{requestId}`: Stores service requests made by homeowners to this housekeeper.
    ```json
    {
      "homeownerId": "homeownerUserId",
      "homeownerName": "Corey Homeowner",
      "housekeeperId": "housekeeperUserId",
      "baseServices": [
        {
          "id": "serviceDocId",
          "name": "Standard Cleaning",
          "price": 120.00,
          "type": "base",
          "durationMinutes": 120
        }
      ],
      "addonServices": [
        {
          "id": "addonId1",
          "name": "Inside Oven",
          "price": 45.00,
          "type": "addon",
          "durationMinutes": 45
        }
      ],
      "preferredDate": "YYYY-MM-DD",
      "preferredTime": "9am-12pm",
      "notes": "Please pay attention to the kitchen floor.",
      "estimatedTotal": 165.00,
      "status": "pending_housekeeper_review" | "housekeeper_proposed_alternative" | "homeowner_accepted_proposal" | "approved_and_scheduled" | "declined_by_housekeeper" | "cancelled_by_homeowner" | "completed",
      "requestTimestamp": Timestamp,
      "lastUpdatedAt": Timestamp,
      "frequency": "one-time" | "weekly" | "bi-weekly" | "monthly",
      "recurringEndDate": "YYYY-MM-DD",
      "preferredDayOfWeek": "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday",
      "scheduledBookingId": "bookingDocId",
      "proposedDate": "YYYY-MM-DD",
      "proposedTime": "9am-12pm",
      "proposalNotes": "This time works better for my schedule.",
      "proposedFrequency": "one-time" | "weekly" | "bi-weekly" | "monthly",
      "proposedRecurringEndDate": "YYYY-MM-DD",
      "proposalSentAt": Timestamp
    }
    ```
// ... END NEW SUBCOLLECTION --- 