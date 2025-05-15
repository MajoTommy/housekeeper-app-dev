# Database Structure (Firestore)

This document outlines the structure of the Firestore database for the Housekeeping App.

## Root Collections

-   `/users`: Stores base user profile information (auth details, role).
-   `/housekeeper_profiles`: Stores extended profile information specific to housekeepers.
-   `/homeowner_profiles`: Stores extended profile information specific to homeowners.
-   `/properties`: Stores details about homeowner properties (address, size, etc.).
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
  // --- NEW: Only relevant for role: housekeeper ---
  "blockedHomeowners": ["homeownerId1", "homeownerId2"] // (Array<String>, Optional) List of homeowner UIDs blocked by this housekeeper
  // --- END NEW ---
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
          // --- NEW/Explicit Fields ---
          "isLinked": true, // (Boolean) Indicates if this client record corresponds to an active homeowner user account
          "linkedHomeownerId": "{homeownerUserId}", // (String) The UID of the linked homeowner (same as doc ID if linked)
          "isActive": true, // (Boolean) Whether the client is considered active by the housekeeper
          "archivedAt": Timestamp, // (Timestamp, Optional) When the client was archived
          // --- END NEW/Explicit Fields ---
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
          "address": "Client Address", // Optional: Denormalized from client/property at booking time - Consider adding?
          
          "startTimestamp": Timestamp, // Primary storage (UTC)
          "endTimestamp": Timestamp, // Primary storage (UTC)
          "startTimestampMillis": Number, // UTC milliseconds since epoch
          "endTimestampMillis": Number, // UTC milliseconds since epoch
          "durationMinutes": Number, // Duration of booking
          
          "status": "pending" | "confirmed" | "rejected" | "cancelled_by_homeowner" | "cancelled_by_housekeeper" | "completed",
          "frequency": "one-time", // Currently only one-time bookings are created via UI
          "notes": "Booking specific notes", // Optional

          // --- NEW: Service Details ---
          "baseServiceId": "serviceDocId",
          "baseServiceName": "Standard Cleaning", // Denormalized name at booking time
          "baseServicePrice": 120.00, // Denormalized price at booking time
          "addonServices": [
              { "id": "addonId1", "name": "Inside Oven", "price": 45.00, "durationMinutes": 45 },
              { "id": "addonId2", "name": "Laundry", "price": 25.00, "durationMinutes": 60 }
              // ... other selected addons
          ],
          "totalPrice": 190.00, // Calculated total at booking time
          // --- END: Service Details ---

          // --- NEW: Service Request Origin ---
          "originalRequestId": "requestDocId", // (String, Optional) If booking originated from a service request, this is the ID from /users/{housekeeperId}/bookingRequests
          "source": "service_request" | "manual_booking", // (String, Optional) How the booking was created
          // --- END: Service Request Origin ---

          "createdAt": Timestamp,
          "updatedAt": Timestamp,
          "confirmedAt": Timestamp, // Optional
          "cancelledAt": Timestamp, // Optional
          "cancelledBy": "homeowner" | "housekeeper", // Optional
          "cancellationReason": "Reason..." // Optional

          // --- NEW: Stripe Payment Fields (Booking) ---
          "stripePaymentIntentId": "pi_...", // (String, Optional) The ID of the Stripe PaymentIntent associated with this booking's charge.
          "paymentStatus": "pending_payment" | "processing" | "succeeded" | "failed" | "requires_action" | "canceled", // (String, Optional) Tracks the booking payment status, aligned with PaymentIntent statuses.
          // --- END: Stripe Payment Fields ---
        }
        ```
-   `/settings`: Stores application-specific settings for the housekeeper.
    -   `/settings/app`: (Single document)
        ```json
        {
          "workingDays": { // Default weekly availability pattern
            "monday": {
              "isWorking": true,
              "startTime": "08:00", // 24-hour format string HH:mm (e.g., "08:00", "14:30")
              "jobsPerDay": 2,
              "jobDurations": [ 210, 210 ], // Durations in minutes
              "breakDurations": [ 60 ] // Durations in minutes
            },
            // ... other days (tuesday to sunday)
          },
          "timezone": "America/Los_Angeles", // IANA Timezone string
          "autoSendReceipts": false,
          "workingDaysCompat": { // For legacy schedule.js compatibility
                "0": false, "1": true, "2": true, "3": true, "4": false, "5": true, "6": false
          },
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
        *Note: This structure is used by the current Time Off calendar UI. Other structures (with auto-IDs) might exist from previous versions or other features but are not used by this specific UI.*

#### If `role` is "homeowner":

-   `/settings`: Stores application-specific settings for the homeowner.
    -   `/settings/app`: (Single document)
        ```json
        {
          "defaultPropertyId": "propertyId", // Optional: Default property for quick booking
          "notificationPreferences": { // Optional
            "bookingConfirmations": true,
            "reminderAlerts": true
          },
          "paymentSettings": { // Optional, Future
            "autoCharge": true
          },
          "updatedAt": Timestamp
        }
        ```
        *Note: `linkedHousekeeperId` is stored in `/homeowner_profiles/{userId}`.*

   `/bookings`: **THIS SUBCOLLECTION IS NOT USED.** Homeowners view their bookings by querying `/users/{linkedHousekeeperId}/bookings` based on matching `clientId` and the `linkedHousekeeperId` field in `/homeowner_profiles/{homeownerId}`.

## `/housekeeper_profiles/{userId}` Document

Stores extended profile information specific to housekeepers.

```json
{
  "firstName": "Casey", // May duplicate /users/{userId}
  "lastName": "Keeper", // May duplicate /users/{userId}
  "phone": "555-333-4444", // May duplicate /users/{userId}
  "companyName": "Core Cleaning Co.", // May duplicate /users/{userId}
  "address": "202 Clean St", // Optional
  "city": "Workville", // Optional
  "state": "CA", // Optional
  "zip": "90212", // Optional
  "serviceZipCodes": ["90210", "90211", "90212"], // Optional
  "inviteCode": "YGG3GW", // 6-character code for linking homeowners
  "bio": "Professional cleaning service...", // Optional
  "profilePictureUrl": "https://...", // Optional
  "createdAt": Timestamp,
  "updatedAt": Timestamp
  // Note: workingDays structure is now stored in /users/{userId}/settings/app

  // --- NEW: Stripe Integration Fields (Housekeeper) ---
  // For receiving payouts via Stripe Connect
  "stripeAccountId": "acct_...", // (String, Optional) The ID of the housekeeper's connected Stripe account (required for payouts).
  "stripeAccountStatus": "enabled" | "pending" | "restricted", // (String, Optional) Tracks the onboarding status of their connected account.

  // For paying platform subscription fees via Stripe Billing
  "stripeCustomerId": "cus_...", // (String, Optional) The ID of the Stripe Customer object associated with this housekeeper on *your platform* account (for billing subscriptions).
  "stripeSubscriptionId": "sub_...", // (String, Optional) The ID of their active platform subscription.
  "stripeSubscriptionStatus": "active" | "trialing" | "past_due" | "canceled", // (String, Optional) Status of their platform subscription.
  "stripePriceId": "price_...", // (String, Optional) The Stripe Price ID they are subscribed to.
  "stripeCurrentPeriodEnd": Timestamp, // (Timestamp, Optional) When the current subscription period ends.
  // --- END: Stripe Integration Fields ---
}
```

## `/homeowner_profiles/{userId}` Document

Stores extended profile information specific to homeowners.

```json
{
  "firstName": "Corey", // May duplicate /users/{userId}
  "lastName": "Homeowner", // May duplicate /users/{userId}
  "phone": "555-111-2222", // May duplicate /users/{userId}
  "address": "101 Home Sweet Ln", // Primary address for profile
  "city": "Homestead",
  "state": "CA",
  "zip": "90211",
  "specialInstructions": "Default instructions for cleaners", // Optional
  "linkedHousekeeperId": "housekeeperUserId", // UID of the linked housekeeper (if any)
  "preferredContactMethod": "email", // Optional
  "createdAt": Timestamp,
  "updatedAt": Timestamp

  // --- NEW: Stripe Integration Fields (Homeowner) ---
  // For making payments via Stripe
  "stripeCustomerId": "cus_...", // (String, Optional) The ID of the Stripe Customer object associated with this homeowner on *your platform* account (for saving payment methods).
  // --- END: Stripe Integration Fields ---
}
```

## `/properties/{propertyId}` Document

Stores details about individual properties owned by homeowners.

```json
{
  "ownerId": "homeownerUserId", // UID of the homeowner who owns this property
  "name": "Main Residence", // Nickname for the property
  "address": {
      "street": "123 Main St",
      "city": "Anytown",
      "state": "CA",
      "zip": "90210"
  },
  "size": 2200, // Optional: Square footage
  "bedrooms": 3, // Optional
  "bathrooms": 2, // Optional
  "specialInstructions": "Property-specific instructions.",
  "accessInformation": "Key under the flowerpot.",
  "photos": [], // Optional: Array of image URLs
  "preferredHousekeeperId": null, // Optional: If homeowner has preference different from main link
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
      "scheduledBookingId": "bookingDocId",
      "proposedDate": "YYYY-MM-DD",
      "proposedTime": "9am-12pm",
      "proposalNotes": "This time works better for my schedule.",
      "proposalSentAt": Timestamp
    }
    ```
// ... END NEW SUBCOLLECTION --- 