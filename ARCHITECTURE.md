# Application Architecture

## File Structure

### Core Pages
```
├── index.html          # Main dashboard/home
├── today.html          # Today's work view
├── calendar.html       # Schedule overview (My Schedule)
├── clients.html        # Client list
└── payments.html       # Payment tracking
```

### Client Management
```
├── client-details.html # Individual client view
├── edit-client.html    # Edit client information
└── add-client.html     # New client creation
```

### Job Management
```
├── job-details.html    # Individual job view
└── add-cleaning.html   # Schedule new cleaning
```

### Payment Management
```
├── payment-details.html    # Individual payment view
├── payment-reminder.html   # Send payment reminder
├── receipt-generator.html  # Generate receipt
└── payment-history.html    # Payment history view
```

## Navigation Flow

### Primary Navigation
- Home → Today's Work
- Home → My Schedule
- Home → Clients
- Home → Payments

### Client Flow
```
Clients List → Client Details → Edit Client
                             → Schedule Cleaning
                             → Payment History
```

### Job Flow
```
Today's Work → Job Details → Mark Complete
                          → Send Reminder
                          → Generate Receipt
```

### Payment Flow
```
Payments → Payment Details → Send Reminder
                          → Generate Receipt
                          → View History
```

## Design Components

### Common Elements
- Header with back button
- Action buttons at bottom
- Card-based content layout
- Status badges
- Icon-based navigation

### Consistent Styling
- Color scheme
  - Primary: #2196F3 (Blue)
  - Success: #4CAF50 (Green)
  - Warning: #FF9800 (Orange)
  - Danger: #F44336 (Red)
- Typography
  - Font: Arial, sans-serif
  - Headings: 24px, 20px, 18px
  - Body: 16px, 14px
- Spacing
  - Padding: 20px, 15px
  - Margins: 20px, 15px, 10px
- Borders
  - Radius: 25px, 20px, 12px
  - Shadow: 0 2px 4px rgba(0,0,0,0.1)

## Mobile-First Principles
1. Single column layouts
2. Touch-friendly targets (min 44px)
3. Bottom-aligned actions
4. Scrollable content areas
5. Minimal data entry
6. Clear visual hierarchy 