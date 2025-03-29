# Database Structure Documentation

This document outlines the structure of the Firebase Firestore database used in the Housekeeping App.

## Overview

The database is organized around user accounts, with each user having their own collections for settings, clients, and bookings.

```
users/
  {userId}/
    settings/
      workingDays: {...}
      workingDaysCompat: {...}
      calculatedTimeSlots: [...]
      ...other settings
    clients/
      {clientId}/
        ...client data
    bookings/
      {bookingId}/
        ...booking data
```

## Collections

### Settings

The settings document contains user preferences and configuration.

```javascript
{
  workingDays: {
    sunday: { isWorking: false },
    monday: { 
      isWorking: true,
      startTime: "8:00 AM",
      endTime: "5:00 PM",
      jobsPerDay: 2,
      cleaningDuration: 180,
      breakTime: 90,
      maxHours: 420
    },
    // ... other days
  },
  workingDaysCompat: {
    0: false,  // Sunday
    1: true,   // Monday
    // ... other days
  },
  calculatedTimeSlots: [
    {
      day: 1,  // Monday
      slots: [
        {
          start: "9:00 AM",
          end: "12:00 PM",
          durationMinutes: 180
        },
        // ... other slots
      ]
    },
    // ... other days
  ],
  hourlyRate: 30,
  autoSendReceipts: true,
  updatedAt: Timestamp
}
```

### Clients

Each client document contains information about a client.

```javascript
{
  firstName: "John",
  lastName: "Smith",
  street: "123 Main St",
  city: "Anytown",
  state: "CA",
  zip: "90210",
  phone: "555-123-4567",
  email: "john.smith@example.com",
  accessInfo: "Key under the mat",
  specialInstructions: "Please clean the windows thoroughly",
  frequency: "weekly",
  scheduleDay: "Monday",
  scheduleTime: "10:00 AM",
  propertyDetails: "3 bedroom, 2 bath house",
  price: "150",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Bookings

Each booking document represents a scheduled cleaning.

```javascript
{
  date: "2023-05-15",
  startTime: "9:00 AM",
  endTime: "12:00 PM",
  clientId: "abc123",
  clientFirstName: "John",
  clientLastName: "Smith",
  clientAddress: "123 Main St, Anytown, CA 90210",
  clientPhone: "555-123-4567",
  clientEmail: "john.smith@example.com",
  accessInfo: "Key under the mat",
  propertyDetails: "3 bedroom, 2 bath house",
  specialInstructions: "Please clean the windows thoroughly",
  frequency: "weekly",
  occurrenceNumber: 1,
  totalOccurrences: 8,
  status: "scheduled",
  price: "150",
  seriesId: "series-1234567890",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

## Data Relationships

1. **Clients to Bookings**: Bookings reference clients using the `clientId` field. Essential client information is duplicated in the booking for quick access.

2. **Settings to Bookings**: The time slots in bookings are based on the user's settings, particularly the `calculatedTimeSlots` field.

3. **Series Bookings**: Recurring bookings are linked using the `seriesId` field, allowing operations on all bookings in a series.

## Data Validation

1. **Client Data Validation**:
   - First name and last name are required
   - Phone numbers must contain only valid characters
   - Email addresses must be in a valid format
   - Prices must be positive numbers
   - Frequency must be one of the allowed values

2. **Booking Data Validation**:
   - Date, start time, and end time are required
   - Date must be in YYYY-MM-DD format
   - Times must be in HH:MM AM/PM format
   - End time must be after start time
   - Frequency must be one of the allowed values

## Best Practices

1. **Consistent Client References**: Always include the full set of client fields in bookings to ensure consistency.

2. **Timestamps**: Always include `createdAt` and `updatedAt` timestamps for tracking changes.

3. **Status Tracking**: Use the `status` field in bookings to track the current state (scheduled, in-progress, completed, cancelled).

4. **Data Integrity**: Validate all data before saving to ensure consistency and prevent errors. 