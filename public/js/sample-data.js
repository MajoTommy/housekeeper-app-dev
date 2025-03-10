// Sample data generator for development purposes
// This script will add sample clients to the current user's Firestore database

// Sample client data
const sampleClients = [
    {
        name: "John Smith",
        address: "123 Main St, Anytown, CA 90210",
        phone: "555-123-4567",
        email: "john.smith@example.com",
        notes: "Has two dogs. Prefers eco-friendly products."
    },
    {
        name: "Sarah Johnson",
        address: "456 Oak Ave, Somewhere, CA 90211",
        phone: "555-987-6543",
        email: "sarah.j@example.com",
        notes: "Allergic to strong fragrances. Leave key under mat."
    },
    {
        name: "Michael Brown",
        address: "789 Pine Rd, Nowhere, CA 90212",
        phone: "555-456-7890",
        email: "mbrown@example.com",
        notes: "Has a cat. Prefers morning appointments."
    },
    {
        name: "Emily Davis",
        address: "321 Elm St, Anytown, CA 90213",
        phone: "555-789-0123",
        email: "emily.davis@example.com",
        notes: "Security system code: 1234. Call before arriving."
    }
];

// Sample booking data
const sampleBookings = [
    {
        clientName: "Jennifer Wilson",
        clientAddress: "567 Pine Road, Anytown, CA 90214",
        clientPhone: "555-987-6543",
        accessInfo: "Lockbox code: 1234",
        date: getTodayString(),
        startTime: "10:00 AM",
        endTime: "12:00 PM",
        frequency: "weekly",
        status: "scheduled",
        notes: "Please focus on kitchen and bathrooms"
    },
    {
        clientName: "Michael Brown",
        clientAddress: "789 Pine Rd, Nowhere, CA 90212",
        clientPhone: "555-456-7890",
        accessInfo: "Client will be home",
        date: getTomorrowString(),
        startTime: "2:00 PM",
        endTime: "4:00 PM",
        frequency: "biweekly",
        status: "scheduled",
        notes: "Has a cat. Prefers morning appointments."
    }
];

// Function to get today's date as YYYY-MM-DD
function getTodayString() {
    const today = new Date();
    return today.toISOString().split('T')[0];
}

// Function to get tomorrow's date as YYYY-MM-DD
function getTomorrowString() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
}

// Function to add sample clients to Firestore
async function addSampleClients() {
    const user = firebase.auth().currentUser;
    
    if (!user) {
        console.error('No user logged in. Please log in to add sample data.');
        return;
    }
    
    console.log('Adding sample clients for user:', user.uid);
    
    try {
        const clientsRef = firebase.firestore().collection('users').doc(user.uid).collection('clients');
        
        // Check if clients already exist
        const snapshot = await clientsRef.get();
        if (!snapshot.empty) {
            console.log('Clients already exist. Skipping sample data creation.');
            return;
        }
        
        // Add each sample client
        const batch = firebase.firestore().batch();
        
        sampleClients.forEach(client => {
            const newClientRef = clientsRef.doc();
            batch.set(newClientRef, {
                ...client,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        });
        
        await batch.commit();
        console.log('Successfully added sample clients!');
        
    } catch (error) {
        console.error('Error adding sample clients:', error);
    }
}

// Function to add sample bookings to Firestore
async function addSampleBookings() {
    const user = firebase.auth().currentUser;
    
    if (!user) {
        console.error('No user logged in. Please log in to add sample data.');
        return;
    }
    
    console.log('Adding sample bookings for user:', user.uid);
    
    try {
        const bookingsRef = firebase.firestore().collection('users').doc(user.uid).collection('bookings');
        
        // Check if bookings already exist
        const snapshot = await bookingsRef.get();
        if (!snapshot.empty) {
            console.log('Bookings already exist. Skipping sample data creation.');
            return;
        }
        
        // Add each sample booking
        const batch = firebase.firestore().batch();
        
        sampleBookings.forEach(booking => {
            const newBookingRef = bookingsRef.doc();
            batch.set(newBookingRef, {
                ...booking,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        });
        
        await batch.commit();
        console.log('Successfully added sample bookings!');
        
    } catch (error) {
        console.error('Error adding sample bookings:', error);
    }
}

// Add a button to trigger sample data creation
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the index page
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/')) {
        // Create a hidden button that we'll trigger programmatically
        const dataButton = document.createElement('button');
        dataButton.id = 'add-sample-data';
        dataButton.style.display = 'none';
        dataButton.addEventListener('click', async function() {
            await addSampleClients();
            await addSampleBookings();
        });
        document.body.appendChild(dataButton);
        
        // Check if user is logged in and trigger sample data creation
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                // Wait a bit to ensure Firestore is initialized
                setTimeout(() => {
                    dataButton.click();
                }, 2000);
            }
        });
    }
}); 