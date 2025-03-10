// Default settings for new users
const DEFAULT_SETTINGS = {
    workingDays: {
        0: false,  // Sunday
        1: true,   // Monday
        2: true,   // Tuesday
        3: true,   // Wednesday
        4: true,   // Thursday
        5: true,   // Friday
        6: false   // Saturday
    },
    workingHours: {
        start: "09:00",
        end: "17:00"
    },
    cleaningsPerDay: 3,
    hourlyRate: 30,
    autoSendReceipts: false
};

// Function to calculate available time slots based on settings
function calculateAvailableTimeSlots(settings) {
    const slots = [];
    
    // If no settings provided, return empty array
    if (!settings) return slots;
    
    // Get working hours
    const startTime = settings.workingHours?.start || "09:00";
    const endTime = settings.workingHours?.end || "17:00";
    
    // Get cleanings per day
    const cleaningsPerDay = settings.cleaningsPerDay || 3;
    
    // Calculate total working minutes
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    const totalMinutes = endMinutes - startMinutes;
    
    // Calculate minutes per cleaning
    const minutesPerCleaning = Math.floor(totalMinutes / cleaningsPerDay);
    
    // Generate time slots
    for (let i = 0; i < cleaningsPerDay; i++) {
        const slotStart = startMinutes + (i * minutesPerCleaning);
        const slotEnd = slotStart + minutesPerCleaning;
        
        slots.push({
            start: minutesToTime(slotStart),
            end: minutesToTime(slotEnd)
        });
    }
    
    return slots;
}

// Helper function to convert time string (HH:MM) to minutes
function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return (hours * 60) + minutes;
}

// Helper function to convert minutes to time string (HH:MM)
function minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    // Format with AM/PM
    let period = 'AM';
    let displayHours = hours;
    
    if (hours >= 12) {
        period = 'PM';
        displayHours = hours === 12 ? 12 : hours - 12;
    }
    
    if (displayHours === 0) {
        displayHours = 12;
    }
    
    return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
} 