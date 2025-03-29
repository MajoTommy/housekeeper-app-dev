# Housekeeping App - Simplified Structure

## Overview
The Housekeeping App has been simplified to focus on three core features:
1. **Schedule** - Managing appointments and cleanings
2. **Clients** - Managing client information
3. **Settings** - Configuring app preferences and working days

## App Navigation
The app uses a consistent footer navigation menu across all pages:
- Schedule (calendar icon)
- Clients (users icon)
- Settings (cog icon)

## File Structure

### Main Pages
- `public/index.html` - Schedule page (main dashboard)
- `public/clients/clients.html` - Clients management
- `public/settings/settings.html` - App settings

### Authentication Pages
- `public/login.html` - User login
- `public/signup.html` - New user registration
- `public/forgot-password.html` - Password recovery
- `public/404.html` - Error page

## JavaScript Structure
- `public/js/schedule.js` - Schedule functionality
- `public/js/clients.js` - Clients management functionality
- `public/js/settings.js` - Settings management functionality
- `public/js/auth.js` - Authentication functionality
- `public/js/firestore-service.js` - Database service
- `public/js/firebase-config.js` - Firebase configuration
- `public/js/defaults.js` - Default app settings
- `public/js/sample-data.js` - Sample data generator for development

## Core Features

### Schedule
- View weekly schedule
- Book new cleanings
- Manage existing appointments

### Clients
- View and search client list
- Add new clients
- Edit client details

### Settings
- Configure working days
- Set up schedule preferences (start times, job durations)
- Adjust cleaning preferences

## Development Notes
- The app has been simplified to focus on core functionality
- Removed features related to payments and other non-essential elements
- Streamlined navigation to improve user experience 