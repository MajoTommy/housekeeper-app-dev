// <<< NEW: Import date formatting function >>>
import { formatDateForDisplay } from '../../common/js/date-utils.js';
// <<< END NEW >>>

// <<< NEW: State for viewing archived clients >>>
let isViewingArchived = false;
// <<< END NEW >>>

// <<< NEW: Add escapeHtml function back >>>
// Helper function to escape HTML characters for security
function escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) {
        return '';
    }
    return String(unsafe)
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
 }
// <<< END NEW >>>

// Debug function to help diagnose issues
function debugFirebaseStatus() {
    console.log('=== Firebase Debug Information ===');
    
    // Check if Firebase is defined
    if (typeof firebase === 'undefined') {
        console.error('Firebase is not defined');
        return;
    }
    
    console.log('Firebase is defined');
    
    // Check if Firebase is initialized
    if (firebase.apps && firebase.apps.length > 0) {
        console.log('Firebase is initialized with', firebase.apps.length, 'app(s)');
    } else {
        console.error('Firebase is not initialized');
    }
    
    // Check if Firestore is available
    if (firebase.firestore) {
        console.log('Firestore is available');
        
        // Try to access Firestore
        try {
            const db = firebase.firestore();
            console.log('Firestore instance created');
        } catch (error) {
            console.error('Error creating Firestore instance:', error);
        }
    } else {
        console.error('Firestore is not available');
    }
    
    // Check if Auth is available
    if (firebase.auth) {
        console.log('Auth is available');
        
        // Try to get current user
        try {
            const user = firebase.auth().currentUser;
            console.log('Current user:', user ? user.uid : 'No user logged in');
        } catch (error) {
            console.error('Error getting current user:', error);
        }
    } else {
        console.error('Auth is not available');
    }
    
    console.log('=== End Firebase Debug Information ===');
}

// clients.js - Handles all client-related functionality

// Global loading indicator functions
function showLoading(message = 'Loading...') {
    const existingOverlay = document.getElementById('loadingOverlay');
    if (existingOverlay) {
        existingOverlay.classList.remove('hidden');
    } else {
        const loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'loadingOverlay';
        loadingOverlay.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center';
        loadingOverlay.innerHTML = `
            <div class="bg-white p-4 rounded-lg shadow-lg flex items-center">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
                <p class="text-black">${message}</p>
            </div>
        `;
        document.body.appendChild(loadingOverlay);
    }
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.remove();
    }
}

// Show success message
function showSuccessMessage(message, duration = 5000) {
    // Create success container if it doesn't exist
    let successContainer = document.getElementById('success-container');
    if (!successContainer) {
        successContainer = document.createElement('div');
        successContainer.id = 'success-container';
        successContainer.className = 'p-4 m-4 bg-green-100 border border-green-400 text-green-700 rounded';
        
        // Insert at the top of the body or after the header
        const header = document.querySelector('.sticky');
        if (header && header.nextSibling) {
            document.body.insertBefore(successContainer, header.nextSibling);
        } else {
            document.body.prepend(successContainer);
        }
    }
    
    // Make sure the container is visible
    successContainer.classList.remove('hidden');
    
    successContainer.innerHTML = `
        <div class="flex items-center">
            <svg class="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
            </svg>
            <p>${message}</p>
        </div>
    `;
    
    // Auto-hide after duration
    setTimeout(() => {
        successContainer.classList.add('hidden');
    }, duration);
}

// Show error message
function showErrorMessage(message) {
    console.error('Error:', message);
    const errorContainer = document.querySelector('.error-container');
    if (errorContainer) {
        const errorMessage = document.getElementById('error-message');
        if (errorMessage) {
            errorMessage.textContent = message;
        } else {
            errorContainer.textContent = message;
        }
        errorContainer.classList.remove('hidden');
        errorContainer.style.display = 'block';
    } else {
        console.error('Error container not found in DOM');
        alert('Error: ' + message);
    }
}

// Hide error message
function hideErrorMessage() {
    const errorContainer = document.querySelector('.error-container');
    if (errorContainer) {
        errorContainer.classList.add('hidden');
        errorContainer.style.display = 'none';
    }
}

// Main function to load all clients
async function loadAllClients(viewArchived = false) {
    console.log(`Loading clients... (Archived: ${viewArchived})`);
    
    // Get the client list container
    const clientListContainer = document.getElementById('client-list');
    if (!clientListContainer) {
        console.error('Client list container not found');
        return;
    }
    
    // Show loading state
    clientListContainer.innerHTML = `
        <div class="p-4 text-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p class="mt-2 text-primary">Loading ${viewArchived ? 'archived' : 'active'} clients...</p>
        </div>
    `;
    
    try {
        // Check if user is logged in
        const user = firebase.auth().currentUser;
        if (!user) {
            console.error('No user logged in');
            clientListContainer.innerHTML = `
                <div class="p-4 text-center">
                    <p class="text-red-500">You must be logged in to view clients</p>
                    <a href="/" class="mt-4 inline-block px-4 py-2 bg-primary text-white rounded">
                        Log In
                    </a>
                </div>
            `;
            return;
        }
        
        // Get clients from Firestore, applying the correct filter
        const db = firebase.firestore();
        const clientsRef = db.collection('users').doc(user.uid).collection('clients');
        let query;
        if (viewArchived) {
            // Fetch only explicitly archived clients
            query = clientsRef.where('isActive', '==', false);
        } else {
            // Fetch active clients (isActive != false includes true and missing)
            query = clientsRef.where('isActive', '!=', false);
        }
        
        const snapshot = await query.get(); // Execute the chosen query
        
        // Clear the loading indicator
        clientListContainer.innerHTML = '';
        
        if (snapshot.empty) {
            // No clients found message
            const message = viewArchived 
                ? "No archived clients found."
                : "No active clients found.";
            const buttonText = viewArchived 
                ? null // No button needed when viewing archived
                : "Add Your First Client"; // Show Add button only for active view
                
            clientListContainer.innerHTML = `
                <div class="p-4 text-center">
                    <p class="text-primary">${message}</p>
                    ${buttonText ? 
                        `<button onclick="openAddClientModal()" class="mt-4 inline-block px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark">
                            ${buttonText}
                         </button>` : ''
                    }
                </div>
            `;
        } else {
            // Clients found, display them
            snapshot.forEach(doc => {
                const clientData = doc.data();
                const clientId = doc.id;
                const clientCard = createClientListItem(clientId, clientData);
                clientListContainer.appendChild(clientCard);
            });
        }
        
    } catch (error) {
        console.error('Error loading clients:', error);
        clientListContainer.innerHTML = `
            <div class="p-4 text-center">
                <p class="text-red-500">Failed to load clients: ${error.message}</p>
            </div>
        `;
    }
}

// Create a client list item element
function createClientListItem(clientId, client) {
    const clientElement = document.createElement('div');
    // Add cursor-pointer and hover effect, and onclick handler
    clientElement.className = 'mb-4 bg-white rounded-lg shadow overflow-hidden cursor-pointer hover:shadow-md transition-shadow duration-150 ease-in-out';
    clientElement.onclick = () => openClientDetailsModal(clientId, client);

    // Get client properties with fallbacks
    const firstName = client.firstName || '';
    const lastName = client.lastName || '';
    const fullName = firstName && lastName ? `${lastName}, ${firstName}` : (firstName || lastName || 'Unnamed Client');

    const phone = client.phone || 'No phone';
    const email = client.email || 'No email';

    // Format the address
    let address = 'No address';
    if (client.address) {
        address = client.address;
    } else if (client.street) {
        const parts = [];
        if (client.street) parts.push(client.street);
        const cityState = [];
        if (client.city) cityState.push(client.city);
        if (client.state) {
            if (client.country) {
                if (client.country === 'United States') cityState.push(`${client.state}, USA`);
                else if (client.country === 'Canada') cityState.push(`${client.state}, Canada`);
                else if (client.country === 'Other') cityState.push(client.state);
                else cityState.push(`${client.state}, ${client.country}`);
            } else {
                cityState.push(client.state);
            }
        } else if (client.country) {
            cityState.push(client.country);
        }
        if (cityState.length > 0) parts.push(cityState.join(', '));
        if (client.zip) parts.push(client.zip);
        address = parts.join(', ');
    }

    // Create the HTML for the client item - Button removed, onclick on main element
    clientElement.innerHTML = `
        <div class="flex items-center p-4">
            <div class="mr-4">
                <span class="inline-flex items-center justify-center h-10 w-10 rounded-full bg-primary-light text-primary-dark">
                    <!-- Simple initials or icon -->
                    <span class="text-lg font-medium">${escapeHtml(firstName.charAt(0))}${escapeHtml(lastName.charAt(0))}</span>
                </span>
            </div>
            <div class="flex-grow">
                <h3 class="text-lg font-semibold text-gray-900 flex items-center">
                    <span>${escapeHtml(fullName)}</span>
                    ${client.isLinked ? '<span class="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 ring-1 ring-inset ring-blue-500/10"><i class="fas fa-link mr-1 text-xs"></i>Linked</span>' : ''}
                </h3>
                <div class="text-sm text-gray-600 flex items-center mt-1">
                    <svg class="h-4 w-4 mr-1.5 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"></path></svg>
                    <span>${escapeHtml(address)}</span>
                </div>
                <div class="text-sm text-gray-600 flex items-center mt-1">
                    <svg class="h-4 w-4 mr-1.5 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"></path></svg>
                    <span>${escapeHtml(phone)}</span>
                </div>
                <div class="text-sm text-gray-600 flex items-center mt-1">
                    <svg class="h-4 w-4 mr-1.5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"></path></svg>
                    <span>${escapeHtml(client.HousekeeperInternalNote || 'No internal notes')}</span>
                </div>
            </div>
        </div>
        <!-- Invite Prompt (if applicable) - Placed after the main flex container -->
        ${!client.isLinked ? `
            <div class="px-4 pb-3 pt-1 bg-yellow-50 border-t border-yellow-200 text-sm text-yellow-800">
                <p><i class="fas fa-info-circle mr-1"></i>This client isn't linked. <a href="#" class="font-medium underline hover:text-yellow-900" onclick="event.stopPropagation(); openInviteModal('${clientId}', '${escapeHtml(fullName)}');">Invite them</a> to manage bookings online.</p>
            </div>
        ` : ''}
    `;

    return clientElement;
}

// Function to open client details modal
function openClientDetailsModal(clientId, client) {
    const modal = document.getElementById('client-details-modal');
    if (!modal) return;
    
    // Clean up any existing backdrops first
    cleanupBackdrops();
    
    // Show modal
    modal.classList.remove('hidden');
    
    // Store client ID and data for later use
    modal.dataset.clientId = clientId;
    modal.dataset.clientData = JSON.stringify(client);
    
    // Update to use bottom sheet pattern instead of modal
    // Fixed at bottom, full width on mobile, with a drag handle
    modal.className = 'fixed inset-x-0 bottom-0 z-50 transform transition-transform duration-300 ease-in-out';
    
    // Format the address
    let address = 'No address';
    // <<< FIX: Prioritize simple client.address field >>>
    if (client.address) {
        address = client.address;
    } 
    // <<< FIX: Fallback to complex formatting only if simple address is missing >>>
    else if (client.street) { 
        const parts = [];
        if (client.street) parts.push(client.street);
        if (client.city) parts.push(client.city);
        if (client.state) {
            // If country is specified, include it in the format
            if (client.country) {
                if (client.country === 'United States') {
                    parts.push(`${client.state}, USA`);
                } else if (client.country === 'Canada') {
                    parts.push(`${client.state}, Canada`);
                } else if (client.country === 'Other') {
                    parts.push(client.state);
                } else {
                    parts.push(`${client.state}, ${client.country}`);
                }
            } else {
                parts.push(client.state);
            }
        } else if (client.country) {
            parts.push(client.country);
        }
        if (client.zip) parts.push(client.zip);
        address = parts.join(', ');
    }

    // Add a semi-transparent backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300';
    backdrop.style.opacity = '0';
    document.body.appendChild(backdrop);
    
    // Update bottom sheet content structure with a drag handle
    modal.innerHTML = `
        <div class="bg-white w-full rounded-t-xl overflow-hidden shadow-xl transform transition-all max-h-[90vh] flex flex-col">
            <div class="flex justify-center pt-2 pb-1">
                <div class="w-10 h-1 bg-gray-300 rounded-full"></div>
            </div>
            <div class="flex justify-between items-center p-4 border-b border-gray-200">
                <h2 class="text-xl font-semibold text-gray-900">${client.lastName}, ${client.firstName}</h2>
                <!-- <<< MODIFIED: Removed onclick, added ID >>> -->
                <button id="view-modal-close-button" class="text-primary hover:text-primary-dark p-1 rounded-full hover:bg-gray-100">
                    <svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            
            <div class="p-4 space-y-4 overflow-y-auto flex-grow -webkit-overflow-scrolling-touch">
                <div class="flex items-center gap-x-2">
                    <svg class="h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                    <span class="text-black">${address}</span>
                </div>
                
                <div class="flex items-center gap-x-2">
                    <svg class="h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                    </svg>
                    ${client.phone ? `<a href="tel:${escapeHtml(client.phone)}" class="text-primary hover:underline">${escapeHtml(client.phone)}</a>` : '<span class="text-gray-500">No phone provided</span>'}
                </div>
                <!-- <<< NEW: Email >>> -->
                <div class="flex items-center gap-x-2">
                     <svg class="h-5 w-5 text-primary flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                    ${client.email ? `<a href="mailto:${escapeHtml(client.email)}" class="text-primary hover:underline">${escapeHtml(client.email)}</a>` : '<span class="text-gray-500">No email provided</span>'}
                </div>
                <!-- <<< END NEW >>> -->
                <!-- Housekeeper Internal Notes -->
                <div class="pt-2">
                    <h3 class="font-medium text-gray-900 text-sm">HousekeeperInternalNote</h3>
                    <p class="mt-1 text-black text-sm">${escapeHtml(client.HousekeeperInternalNote || 'N/A')}</p>
                </div>
                <!-- Homeowner Instructions (if available) -->
                ${client.HomeownerInstructions ? `
                <div class="pt-2">
                    <h3 class="font-medium text-gray-900 text-sm">Homeowner Instructions</h3>
                    <p class="mt-1 text-black text-sm">${escapeHtml(client.HomeownerInstructions)}</p>
                </div>
                ` : ''}
                <!-- <<< NEW: Linked Status & Timestamps >>> -->
                 <div class="pt-4 mt-4 border-t border-gray-200 text-xs text-gray-500 space-y-1">
                    <p><strong>Status:</strong> ${client.isLinked ? `<span class="font-medium text-blue-700"><i class="fas fa-link"></i> Linked</span> (ID: ${escapeHtml(client.linkedHomeownerId)})` : '<span class="font-medium text-yellow-700"><i class="fas fa-unlink"></i> Not Linked</span>'}</p>
                    <!-- <<< MODIFIED: Directly call imported function >>> -->
                    ${client.createdAt ? `<p><strong>Created:</strong> ${formatDateForDisplay(client.createdAt?.toDate ? client.createdAt.toDate() : client.createdAt)}</p>` : ''}
                    ${client.updatedAt ? `<p><strong>Last Updated:</strong> ${formatDateForDisplay(client.updatedAt?.toDate ? client.updatedAt.toDate() : client.updatedAt)}</p>` : ''}
                 </div>
                <!-- <<< END NEW >>> -->
            </div>

            <!-- <<< MODIFIED: Added ID to footer >>> -->
            <div id="modal-footer-view" class="p-4 border-t border-gray-200 bg-gray-50">
                <!-- <<< MODIFIED: Removed onclick, added ID >>> -->
                <button id="edit-client-button" class="w-full bg-primary text-white px-4 py-3 rounded-lg hover:bg-primary-dark mb-3"> 
                    Edit Client
                </button>
                
                <!-- <<< MODIFIED: Conditional Archive/Unarchive Button >>> -->
                ${isViewingArchived ? `
                    <button id="unarchive-client-button" class="w-full bg-white text-green-600 px-4 py-3 rounded-lg border border-green-300 hover:bg-green-50 hover:text-green-700 mb-3">
                        Unarchive Client
                    </button>
                ` : `
                    <button id="archive-client-button" class="w-full bg-white text-red-600 px-4 py-3 rounded-lg border border-red-300 hover:bg-red-50 hover:text-red-700 mb-3">
                        Archive Client
                    </button>
                `}
                <!-- <<< END MODIFIED >>> -->

                <!-- <<< MODIFIED: Added ID and margin-bottom >>> -->
                <button id="close-details-modal-button" class="w-full bg-white text-black px-4 py-3 rounded-lg border border-gray-300 hover:bg-gray-50">
                    Close
                </button>
            </div>
        </div>
    `;
    
    // Prevent body scrolling when bottom sheet is open
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    // Add swipe down to close functionality
    setupBottomSheetDrag(modal);
    
    // Animate in the bottom sheet and backdrop
    setTimeout(() => {
        modal.style.transform = 'translateY(0)';
        backdrop.style.opacity = '1';
    }, 10);
    
    // Attach listener for the main close button (X)
    const closeXButton = modal.querySelector('#view-modal-close-button'); 
    if (closeXButton) {
        closeXButton.addEventListener('click', closeClientDetailsModal);
    } else {
        console.error('Could not find close button (X) in client details modal');
    }
    
    // <<< NEW: Attach listener for Edit Client button >>>
    const editButton = modal.querySelector('#edit-client-button');
    if (editButton) {
        editButton.addEventListener('click', switchToEditMode); // Assuming switchToEditMode is defined in this scope
    } else {
        console.error('Could not find Edit Client button in modal');
    }
    // <<< END NEW >>>

    // <<< NEW: Attach listener for Footer Close button >>>
    const closeFooterButton = modal.querySelector('#close-details-modal-button');
    if (closeFooterButton) {
        closeFooterButton.addEventListener('click', closeClientDetailsModal);
    } else {
        console.error('Could not find Close button in modal footer');
    }
    // <<< END NEW >>>

    // <<< MODIFIED: Attach listener for Archive OR Unarchive Client button >>>
    const archiveButton = modal.querySelector('#archive-client-button');
    const unarchiveButton = modal.querySelector('#unarchive-client-button');

    if (archiveButton) {
        archiveButton.addEventListener('click', handleArchiveClientClick); // Existing handler
        console.log("Attached listener to Archive button");
    } else if (unarchiveButton) {
        // TODO: Define handleUnarchiveClientClick function
        // unarchiveButton.addEventListener('click', () => alert('Unarchive handler not yet implemented.')); // Placeholder
        unarchiveButton.addEventListener('click', handleUnarchiveClientClick); // Use the real handler
        console.log("Attached listener to Unarchive button");
    } else {
        // This case should ideally not happen if the buttons are generated correctly
        console.error('Could not find Archive OR Unarchive Client button in modal');
    }
    // <<< END MODIFIED >>>

    // Add close on backdrop click
    backdrop.addEventListener('click', () => {
        closeClientDetailsModal();
    });
}

// Function to set up drag functionality for bottom sheet
function setupBottomSheetDrag(bottomSheet) {
    const content = bottomSheet.querySelector('.bg-white');
    if (!content) return;
    
    let startY = 0;
    let startHeight = 0;
    let isDragging = false;
    
    // The drag handle at the top of the sheet
    const dragHandle = content.querySelector('div:first-child');
    
    const onStart = (e) => {
        const touch = e.touches ? e.touches[0] : e;
        startY = touch.clientY;
        startHeight = content.offsetHeight;
        isDragging = true;
        
        document.addEventListener('mousemove', onMove);
        document.addEventListener('touchmove', onMove);
        document.addEventListener('mouseup', onEnd);
        document.addEventListener('touchend', onEnd);
    };
    
    const onMove = (e) => {
        if (!isDragging) return;
        
        const touch = e.touches ? e.touches[0] : e;
        const deltaY = touch.clientY - startY;
        
        // Only allow dragging down, not up
        if (deltaY > 0) {
            bottomSheet.style.transform = `translateY(${deltaY}px)`;
        }
    };
    
    const onEnd = (e) => {
        if (!isDragging) return;
        isDragging = false;
        
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('mouseup', onEnd);
        document.removeEventListener('touchend', onEnd);
        
        const touch = e.changedTouches ? e.changedTouches[0] : e;
        const deltaY = touch.clientY - startY;
        
        // If dragged more than 150px down or with enough velocity, close the sheet
        if (deltaY > 150) {
            closeClientDetailsModal();
        } else {
            // Otherwise snap back to fully open
            bottomSheet.style.transform = 'translateY(0)';
        }
    };
    
    // Add event listeners for mouse and touch
    dragHandle.addEventListener('mousedown', onStart);
    dragHandle.addEventListener('touchstart', onStart);
}

// Function to close client details modal
function closeClientDetailsModal() {
    const modal = document.getElementById('client-details-modal');
    if (modal) {
        // Get the backdrop element
        const backdropId = modal.dataset.backdropElement;
        const backdrop = document.getElementById(backdropId);
        
        // Animate out
        modal.style.transform = 'translateY(100%)';
        if (backdrop) {
            backdrop.style.opacity = '0';
        }
        
        // After animation completes, hide and clean up
        setTimeout(() => {
            modal.classList.add('hidden');
            // Clear the stored data
            delete modal.dataset.clientId;
            delete modal.dataset.clientData;
            
            // Remove the backdrop
            if (backdrop) {
                backdrop.remove();
            }
            
            // Re-enable body scrolling
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
            
            // Safety check: remove any other backdrops that might be lingering
            cleanupBackdrops();
        }, 300); // Match the duration in the CSS transition
    } else {
        // If modal not found, still clean up any lingering backdrops
        cleanupBackdrops();
    }
}

// Helper function to clean up any lingering backdrops
function cleanupBackdrops() {
    // Find and remove any backdrop elements that might be lingering
    const backdrops = document.querySelectorAll('div[id^="backdrop-"]');
    backdrops.forEach(backdrop => {
        backdrop.remove();
    });
    
    // Also find any elements with the backdrop styling
    const backdropElements = document.querySelectorAll('.fixed.inset-0.bg-black.bg-opacity-50.z-40');
    backdropElements.forEach(element => {
        element.remove();
    });
    
    // Ensure body scrolling is re-enabled
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    document.body.style.position = '';
    document.documentElement.style.position = '';
}

// Function to switch to edit mode
function switchToEditMode() {
    const modal = document.getElementById('client-details-modal');
    if (!modal) return;

    const clientId = modal.dataset.clientId;
    const clientData = JSON.parse(modal.dataset.clientData);

    // Hide the original view footer
    const viewFooter = modal.querySelector('#modal-footer-view');
    if (viewFooter) viewFooter.classList.add('hidden');

    // Get the main content area (assuming the structure added by openClientDetailsModal)
    const modalContentArea = modal.querySelector('.p-4.space-y-4.overflow-y-auto');
    if (!modalContentArea) {
        console.error("Could not find modal content area to replace for editing.");
        return;
    }

    // Replace content area with edit form
    modalContentArea.innerHTML = `
        <form id="client-edit-form" class="space-y-4">
            <div>
                <label for="editFirstName" class="block text-sm font-medium text-gray-700">First Name</label>
                <input type="text" id="editFirstName" value="${escapeHtml(clientData.firstName || '')}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" required>
            </div>
            <div>
                <label for="editLastName" class="block text-sm font-medium text-gray-700">Last Name</label>
                <input type="text" id="editLastName" value="${escapeHtml(clientData.lastName || '')}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" required>
            </div>
            <div>
                <label for="editEmail" class="block text-sm font-medium text-gray-700">Email</label>
                <input type="email" id="editEmail" value="${escapeHtml(clientData.email || '')}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
            </div>
            <div>
                <label for="editPhone" class="block text-sm font-medium text-gray-700">Phone</label>
                <input type="tel" id="editPhone" value="${escapeHtml(clientData.phone || '')}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
            </div>
            <div>
                <label for="editAddress" class="block text-sm font-medium text-gray-700">Address</label>
                <textarea id="editAddress" rows="3" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">${escapeHtml(clientData.address || '')}</textarea>
            </div>
            <div>
                <label for="editHousekeeperInternalNote" class="block text-sm font-medium text-gray-700">Housekeeper Notes / Access Info</label>
                <textarea id="editHousekeeperInternalNote" rows="3" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">${escapeHtml(clientData.HousekeeperInternalNote || '')}</textarea>
            </div>
            <!-- Note: HomeownerInstructions are not editable by housekeeper -->

            <!-- Action Buttons for Edit Mode -->
            <div class="pt-4 border-t border-gray-200 flex justify-end space-x-3">
                <button type="button" id="cancel-edit-button" class="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    Cancel
                </button>
                <button type="submit" id="save-edit-button" class="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                    Save Changes
                </button>
            </div>
             <!-- Status Message Area -->
             <div id="edit-status-message" class="mt-2 text-sm text-center"></div>
        </form>
    `;

    // Add event listeners for the new buttons and form
    const editForm = modalContentArea.querySelector('#client-edit-form');
    const cancelButton = modalContentArea.querySelector('#cancel-edit-button');
    
    if (editForm) {
        editForm.addEventListener('submit', (e) => {
            e.preventDefault(); // Prevent default form submission
            saveClientDetails(); // Call the save function
        });
    }
    if (cancelButton) {
        cancelButton.addEventListener('click', cancelEdit); // Call the cancel function
    }
    
    // No need to re-setup drag here, happens on open
}

// Function to cancel edit and return to view mode
function cancelEdit() {
    const modal = document.getElementById('client-details-modal');
    if (!modal || !modal.dataset.clientId || !modal.dataset.clientData) {
        console.error("Cannot cancel edit, modal or client data missing.");
        closeClientDetailsModal(); // Fallback to just closing
        return;
    }
    const clientData = JSON.parse(modal.dataset.clientData);
    // Re-render the view mode by calling open again
    // This will also automatically show the correct footer
    openClientDetailsModal(modal.dataset.clientId, clientData);
}

// Function to save client details
async function saveClientDetails() {
    const modal = document.getElementById('client-details-modal');
    const clientId = modal.dataset.clientId;
    
    if (!clientId) {
        showErrorMessage('No client ID found');
        return;
    }
    
    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            throw new Error('You must be logged in to save client details');
        }
        
        // Show loading state
        showLoading('Saving changes...');
        
        // Get values from form fields
        const updatedData = {
            firstName: document.getElementById('editFirstName').value.trim(),
            lastName: document.getElementById('editLastName').value.trim(),
            email: document.getElementById('editEmail').value.trim(),
            phone: document.getElementById('editPhone').value.trim(),
            // <<< UPDATED: Get single address field >>>
            address: document.getElementById('editAddress').value.trim(),
            // <<< END UPDATED >>>
            HousekeeperInternalNote: document.getElementById('editHousekeeperInternalNote').value.trim(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Basic Validation
        if (!updatedData.firstName && !updatedData.lastName) {
            showErrorMessage('Please enter at least a first or last name.');
            return;
        }
        
        // Update in Firestore
        const db = firebase.firestore();
        await db.collection('users').doc(user.uid)
            .collection('clients').doc(clientId)
            .update(updatedData);
        
        // Hide loading state
        hideLoading();
        
        // Close the modal instead of reopening it
        closeClientDetailsModal();
        
        // Show success message
        showSuccessMessage(`Client ${updatedData.firstName} ${updatedData.lastName} updated successfully`);
        
        // Refresh the client list
        loadAllClients();
        
    } catch (error) {
        console.error('Error saving client details:', error);
        hideLoading();
        showErrorMessage('Error saving client details: ' + error.message);
    }
}

// Initialize search functionality
function initSearchFunctionality() {
    const searchInput = document.getElementById('client-search');
    if (!searchInput) {
        console.log('Search input not found');
        return;
    }
    
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const clientElements = document.querySelectorAll('#client-list > div:not(.p-4)');
        
        clientElements.forEach(element => {
            // Skip the "Add New Client" button at the end
            if (element.querySelector('a[href="add-client.html"]')) {
                return;
            }
            
            const clientName = element.querySelector('h3')?.textContent.toLowerCase() || '';
            let matchFound = clientName.includes(searchTerm);
            
            // Also search in address, phone, and access information
            const addressElement = element.querySelector('svg[d*="M15 10.5a3 3 0 11-6 0"] + span');
            const phoneElement = element.querySelector('svg[d*="M2.25 6.75c0 8.284"] + span');
            const accessElement = element.querySelector('svg[d*="M15.75 5.25a3 3 0 013 3m3"] + span');
            
            if (addressElement && addressElement.textContent.toLowerCase().includes(searchTerm)) {
                matchFound = true;
            }
            
            if (phoneElement && phoneElement.textContent.toLowerCase().includes(searchTerm)) {
                matchFound = true;
            }
            
            if (accessElement && accessElement.textContent.toLowerCase().includes(searchTerm)) {
                matchFound = true;
            }
            
            element.style.display = matchFound ? '' : 'none';
        });
    });
}

// Create a sample client
async function createSampleClient() {
    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            console.error('No user logged in');
            showErrorMessage('You must be logged in to create a sample client');
            return false;
        }
        
        const db = firebase.firestore();
        const clientsRef = db.collection('users').doc(user.uid).collection('clients');
        
        const sampleClient = {
            firstName: 'John',
            lastName: 'Doe',
            phone: '555-123-4567',
            email: 'john.doe@example.com',
            street: '123 Main St',
            city: 'Anytown',
            state: 'CA',
            zip: '12345',
            accessInfo: 'Key under the mat',
            specialInstructions: 'Please clean the windows thoroughly',
            frequency: 'weekly',
            scheduleDay: 'Monday',
            scheduleTime: '10:00 AM',
            propertyDetails: '3 bedroom, 2 bath house',
            price: '150',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        const docRef = await clientsRef.add(sampleClient);
        console.log('Sample client created with ID:', docRef.id);
        showSuccessMessage('Sample client created successfully!');
        return true;
    } catch (error) {
        console.error('Error creating sample client:', error);
        showErrorMessage('Error creating sample client: ' + error.message);
        return false;
    }
}

// Function to create sample bookings for a client
async function createSampleBookingsForClient(userId, clientId, clientData) {
    try {
        const db = firebase.firestore();
        const bookingsRef = db.collection('users').doc(userId).collection('bookings');
        
        // Create 3 future bookings for this client
        const today = new Date();
        const bookings = [];
        
        // Based on client's schedule preferences
        const scheduleDay = clientData.scheduleDay || 'Monday';
        const scheduleTime = clientData.scheduleTime || '10:00 AM';
        
        // Create next 3 occurrences of their preferred day
        for(let i = 0; i < 3; i++) {
            const nextDate = getNextDayOccurrence(scheduleDay, i);
            const [hours, minutes, period] = scheduleTime.match(/(\d+):(\d+)\s*(AM|PM)/).slice(1);
            nextDate.setHours(
                (period === 'PM' ? (parseInt(hours) % 12) + 12 : parseInt(hours) % 12),
                parseInt(minutes),
                0,
                0
            );
            
            const booking = {
                clientId: clientId,
                date: firebase.firestore.Timestamp.fromDate(nextDate),
                status: 'scheduled',
                startTime: scheduleTime,
                endTime: addHours(scheduleTime, 2), // 2-hour cleaning by default
                frequency: clientData.frequency || 'weekly',
                price: clientData.price || '150',
                address: `${clientData.street}, ${clientData.city}, ${clientData.state} ${clientData.zip}`,
                clientName: `${clientData.firstName} ${clientData.lastName}`,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            bookings.push(booking);
        }
        
        // Add all bookings in a batch
        const batch = db.batch();
        bookings.forEach(booking => {
            const newBookingRef = bookingsRef.doc();
            batch.set(newBookingRef, booking);
        });
        
        await batch.commit();
        console.log(`Created ${bookings.length} sample bookings for client ${clientId}`);
        return true;
    } catch (error) {
        console.error('Error creating sample bookings:', error);
        return false;
    }
}

// Helper function to get next occurrence of a day
function getNextDayOccurrence(dayName, skipWeeks = 0) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = new Date();
    const targetDay = days.indexOf(dayName.toLowerCase());
    const todayDay = today.getDay();
    
    let daysUntilTarget = targetDay - todayDay;
    if (daysUntilTarget <= 0) {
        daysUntilTarget += 7;
    }
    
    const result = new Date(today);
    result.setDate(today.getDate() + daysUntilTarget + (skipWeeks * 7));
    return result;
}

// Helper function to add hours to a time string
function addHours(timeStr, hoursToAdd) {
    const [hours, minutes, period] = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/).slice(1);
    let totalHours = parseInt(hours);
    if (period === 'PM' && totalHours !== 12) totalHours += 12;
    if (period === 'AM' && totalHours === 12) totalHours = 0;
    
    totalHours += hoursToAdd;
    const newPeriod = totalHours >= 12 ? 'PM' : 'AM';
    const newHours = totalHours % 12 || 12;
    
    return `${newHours}:${minutes} ${newPeriod}`;
}

// Add function to load client details
async function loadClientDetails(clientId) {
    // CRITICAL: Check if clients.js is blocked on this page
    if (window.blockClientsJs === true) {
        console.log('loadClientDetails in clients.js blocked by blockClientsJs flag');
        return; // Exit immediately
    }
    
    console.log('Loading client details for:', clientId);
    
    // Hide any error messages
    hideErrorMessage();
    
    // Directly hide any error messages at the top of the page
    const errorMessages = document.querySelectorAll('.bg-red-100');
    errorMessages.forEach(el => {
        el.style.display = 'none';
    });
    
    // Debug Firebase status to ensure it's properly initialized
    debugFirebaseStatus();
    
    // Log the DOM structure to help debug
    console.log('DOM structure:');
    const allElements = document.querySelectorAll('*');
    console.log('Total elements:', allElements.length);
    console.log('h2 elements:', document.querySelectorAll('h2').length);
    console.log('p.text-gray-600 elements:', document.querySelectorAll('p.text-gray-600').length);
    console.log('a[href^="tel:"] elements:', document.querySelectorAll('a[href^="tel:"]').length);
    console.log('a[href^="mailto:"] elements:', document.querySelectorAll('a[href^="mailto:"]').length);
    console.log('client-card elements:', document.querySelectorAll('.client-card').length);
    
    // Show loading state - use the new loading-spinner class
    const loadingSpinners = document.querySelectorAll('.loading-spinner');
    loadingSpinners.forEach(el => {
        if (el) el.style.display = 'block';
    });
    
    try {
        // Validate client ID
        if (!clientId) {
            throw new Error('No client ID provided');
        }
        
        const user = firebase.auth().currentUser;
        if (!user) {
            throw new Error('You must be logged in to view client details');
        }
        
        const db = firebase.firestore();
        const clientDoc = await db.collection('users').doc(user.uid)
            .collection('clients').doc(clientId).get();
        
        if (!clientDoc.exists) {
            throw new Error('Client not found');
        }
        
        const client = clientDoc.data();
        console.log('Client data loaded:', client);
        
        // Update page title with client name
        try {
            document.title = `${client.firstName} ${client.lastName} - Client Details`;
        } catch (err) {
            console.error('Error updating page title:', err);
        }
        
        // Update edit client link to include the client ID
        try {
            const editLink = document.querySelector('a[href="edit-client.html"]');
            if (editLink) {
                editLink.href = `edit-client.html?id=${clientId}`;
            } else {
                console.warn('Edit link not found');
            }
        } catch (err) {
            console.error('Error updating edit link:', err);
        }
        
        // Update basic client info
        try {
            const nameElement = document.querySelector('h2');
            if (nameElement) {
                nameElement.textContent = `${client.lastName}, ${client.firstName}`;
            } else {
                console.warn('Name element (h2) not found');
            }
            
            const addressElement = document.querySelector('p.text-gray-600');
            if (addressElement) {
                const address = [];
                if (client.street) address.push(client.street);
                if (client.city) address.push(client.city);
                if (client.state) address.push(client.state);
                if (client.zip) address.push(client.zip);
                
                addressElement.textContent = address.length > 0 ? address.join(', ') : 'No address provided';
            } else {
                console.warn('Address element not found');
            }
        } catch (err) {
            console.error('Error updating basic client info:', err);
        }
        
        // Update contact information
        try {
            const phoneLink = document.querySelector('a[href^="tel:"]');
            if (phoneLink && client.phone) {
                phoneLink.href = `tel:${client.phone}`;
                phoneLink.innerHTML = `<i class="fas fa-phone"></i> ${client.phone}`;
            } else if (phoneLink) {
                phoneLink.href = '#';
                phoneLink.innerHTML = `<i class="fas fa-phone"></i> No phone provided`;
            } else {
                console.warn('Phone link not found');
            }
            
            const emailLink = document.querySelector('a[href^="mailto:"]');
            if (emailLink && client.email) {
                emailLink.href = `mailto:${client.email}`;
                emailLink.innerHTML = `<i class="fas fa-envelope"></i> ${client.email}`;
            } else if (emailLink) {
                emailLink.href = '#';
                emailLink.innerHTML = `<i class="fas fa-envelope"></i> No email provided`;
            } else {
                console.warn('Email link not found');
            }
        } catch (err) {
            console.error('Error updating contact information:', err);
        }
        
        // Update Cleaning Schedule section
        try {
            // Find the section by heading text
            const cleaningScheduleHeading = Array.from(document.querySelectorAll('h3')).find(el => 
                el.textContent.includes('Cleaning Schedule'));
            
            if (cleaningScheduleHeading) {
                // Find the parent div that contains the heading
                const sectionDiv = cleaningScheduleHeading.closest('.p-4');
                
                if (sectionDiv) {
                    // Remove the loading spinner
                    const spinner = sectionDiv.querySelector('.loading-spinner');
                    if (spinner) {
                        spinner.remove();
                    }
                    
                    // Format schedule information from various fields
                    const frequency = client.frequency || 'Not specified';
                    
                    // Build schedule string from various possible fields
                    let scheduleInfo = 'Not specified';
                    if (client.schedule) {
                        scheduleInfo = client.schedule;
                    } else if (client.scheduleDay && client.scheduleTime) {
                        scheduleInfo = `Every ${client.scheduleDay} at ${client.scheduleTime}`;
                    }
                    
                    // Get property details from various possible fields
                    const propertyDetails = client.propertyDetails || client.property || 'Not specified';
                    
                    // Create the content HTML
                    let scheduleHTML = `
                        <div class="mt-4">
                            <p class="font-medium">Frequency: <span class="font-normal">${frequency}</span></p>
                            <p class="font-medium mt-2">Schedule: <span class="font-normal">${scheduleInfo}</span></p>
                            <p class="font-medium mt-2">Property Details: <span class="font-normal">${propertyDetails}</span></p>
                            <div class="mt-4">
                                <a href="../schedule/reschedule-choice.html?clientId=${clientId}" class="text-blue-600 hover:text-blue-800">
                                    <i class="fas fa-calendar-alt mr-1"></i> Reschedule
                                </a>
                            </div>
                        </div>
                    `;
                    
                    // Append the content to the section div
                    sectionDiv.insertAdjacentHTML('beforeend', scheduleHTML);
                } else {
                    console.warn('Section div for Cleaning Schedule not found');
                }
            } else {
                console.warn('Cleaning Schedule heading not found');
            }
        } catch (err) {
            console.error('Error updating Cleaning Schedule section:', err);
        }
        
        // Update Upcoming Cleanings section
        try {
            // Find the section by heading text
            const upcomingCleaningsHeading = Array.from(document.querySelectorAll('h3')).find(el => 
                el.textContent.includes('Upcoming Cleanings'));
            
            if (upcomingCleaningsHeading) {
                // Find the parent div that contains the heading
                const sectionDiv = upcomingCleaningsHeading.closest('.p-4');
                
                if (sectionDiv) {
                    // Remove the loading spinner
                    const spinner = sectionDiv.querySelector('.loading-spinner');
                    if (spinner) {
                        spinner.remove();
                    }
                    
                    // Show temporary loading state
                    const loadingDiv = document.createElement('div');
                    loadingDiv.className = 'mt-4 text-center';
                    loadingDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading bookings...';
                    sectionDiv.appendChild(loadingDiv);
                    
                    // Fetch bookings for this client
                    try {
                        const bookingsRef = db.collection('users').doc(user.uid)
                            .collection('bookings');
                        
                        // Query for all bookings for this client without date filter
                        const bookingsSnapshot = await bookingsRef
                            .where('clientId', '==', clientId)
                            .get();
                        
                        console.log(`Found ${bookingsSnapshot.docs.length} bookings for client ${clientId}`);
                        
                        // Remove the temporary loading div
                        loadingDiv.remove();
                        
                        if (!bookingsSnapshot.empty) {
                            // Filter bookings to only include future ones
                            const now = new Date();
                            const upcomingBookings = bookingsSnapshot.docs
                                .map(doc => {
                                    const data = doc.data();
                                    // Handle different date formats
                                    let bookingDate;
                                    if (data.date && data.date.toDate) {
                                        // Firestore Timestamp
                                        bookingDate = data.date.toDate();
                                    } else if (data.date && typeof data.date === 'string') {
                                        // String date
                                        bookingDate = new Date(data.date);
                                    } else if (data.date && typeof data.date === 'object') {
                                        // Date object
                                        bookingDate = new Date(data.date);
                                    } else {
                                        console.warn('Invalid date format for booking:', data);
                                        return null;
                                    }
                                    
                                    return {
                                        id: doc.id,
                                        ...data,
                                        parsedDate: bookingDate
                                    };
                                })
                                .filter(booking => booking && booking.parsedDate && booking.parsedDate >= now)
                                .sort((a, b) => a.parsedDate - b.parsedDate);
                            
                            console.log(`Found ${upcomingBookings.length} upcoming bookings`);
                            
                            if (upcomingBookings.length > 0) {
                                let bookingsHTML = '<div class="mt-4">';
                                
                                upcomingBookings.forEach(booking => {
                                    const formattedDate = booking.parsedDate.toLocaleDateString();
                                    const formattedTime = booking.startTime || 'No time specified';
                                    
                                    bookingsHTML += `
                                        <div class="mb-4 p-3 border border-gray-200 rounded-lg">
                                            <div class="flex justify-between items-center">
                                                <div>
                                                    <p class="font-medium">${formattedDate} at ${formattedTime}</p>
                                                    <p class="text-sm text-gray-600">${booking.notes || 'No notes'}</p>
                                                </div>
                                                <div>
                                                    <a href="booking-details.html?id=${booking.id}" class="text-blue-600 hover:text-blue-800">
                                                        <i class="fas fa-eye"></i>
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    `;
                                });
                                
                                bookingsHTML += '</div>';
                                sectionDiv.insertAdjacentHTML('beforeend', bookingsHTML);
                            } else {
                                sectionDiv.insertAdjacentHTML('beforeend', '<p class="mt-4 text-gray-600">No upcoming cleanings scheduled.</p>');
                            }
                        } else {
                            sectionDiv.insertAdjacentHTML('beforeend', '<p class="mt-4 text-gray-600">No cleanings scheduled for this client.</p>');
                        }
                    } catch (err) {
                        console.error('Error fetching bookings:', err);
                        // Remove the temporary loading div
                        loadingDiv.remove();
                        sectionDiv.insertAdjacentHTML('beforeend', `<p class="mt-4 text-red-600">Error loading bookings: ${err.message}</p>`);
                    }
                } else {
                    console.warn('Section div for Upcoming Cleanings not found');
                }
            } else {
                console.warn('Upcoming Cleanings heading not found');
            }
        } catch (err) {
            console.error('Error updating Upcoming Cleanings section:', err);
        }
        
        // Update Access Information section
        try {
            // Find the section by heading text
            const accessInfoHeading = Array.from(document.querySelectorAll('h3')).find(el => 
                el.textContent.includes('Access Information'));
            
            if (accessInfoHeading) {
                // Find the parent div that contains the heading
                const sectionDiv = accessInfoHeading.closest('.p-4');
                
                if (sectionDiv) {
                    // Remove the loading spinner
                    const spinner = sectionDiv.querySelector('.loading-spinner');
                    if (spinner) {
                        spinner.remove();
                    }
                    
                    // Check both possible field names
                    const accessInformation = client.accessInformation || client.accessInfo || null;
                    if (accessInformation) {
                        sectionDiv.insertAdjacentHTML('beforeend', `<p class="mt-4">${accessInformation}</p>`);
                    } else {
                        sectionDiv.insertAdjacentHTML('beforeend', '<p class="mt-4 text-gray-600">No access information provided.</p>');
                    }
                } else {
                    console.warn('Section div for Access Information not found');
                }
            } else {
                console.warn('Access Information heading not found');
            }
        } catch (err) {
            console.error('Error updating Access Information section:', err);
        }
        
        // Update Special Instructions section
        try {
            // Find the section by heading text
            const specialInstructionsHeading = Array.from(document.querySelectorAll('h3')).find(el => 
                el.textContent.includes('Special Instructions'));
            
            if (specialInstructionsHeading) {
                // Find the parent div that contains the heading
                const sectionDiv = specialInstructionsHeading.closest('.p-4');
                
                if (sectionDiv) {
                    // Remove the loading spinner
                    const spinner = sectionDiv.querySelector('.loading-spinner');
                    if (spinner) {
                        spinner.remove();
                    }
                    
                    // Check both possible field names
                    const instructions = client.specialInstructions || client.instructions || null;
                    if (instructions) {
                        sectionDiv.insertAdjacentHTML('beforeend', `<p class="mt-4">${instructions}</p>`);
                    } else {
                        sectionDiv.insertAdjacentHTML('beforeend', '<p class="mt-4 text-gray-600">No special instructions provided.</p>');
                    }
                } else {
                    console.warn('Section div for Special Instructions not found');
                }
            } else {
                console.warn('Special Instructions heading not found');
            }
        } catch (err) {
            console.error('Error updating Special Instructions section:', err);
        }
        
        // Hide all loading spinners
        document.querySelectorAll('.loading-spinner').forEach(el => {
            if (el) el.style.display = 'none';
        });
        
    } catch (error) {
        console.error('Error loading client details:', error);
        
        // Show error message
        showErrorMessage(`Error loading client details: ${error.message}`);
        
        // Hide loading spinners
        document.querySelectorAll('.loading-spinner').forEach(el => {
            if (el) el.style.display = 'none';
        });
        
        // Update sections with error state
        document.querySelectorAll('.client-card .p-4').forEach(section => {
            try {
                const heading = section.querySelector('h3');
                if (heading) {
                    // Keep the heading but clear the rest of the content
                    const headingText = heading.textContent;
                    section.innerHTML = '';
                    const newHeading = document.createElement('h3');
                    newHeading.className = 'text-lg font-semibold text-gray-900 mb-2';
                    newHeading.textContent = headingText;
                    section.appendChild(newHeading);
                    
                    // Add error message
                    const errorMsg = document.createElement('p');
                    errorMsg.className = 'text-red-500 mt-2';
                    errorMsg.textContent = 'Could not load data';
                    section.appendChild(errorMsg);
                }
            } catch (err) {
                console.error('Error updating section with error state:', err);
            }
        });
    }
}

// A simpler approach to loading client details
async function loadClientDetailsSimple(clientId) {
    console.log('Loading client details (simple approach) for:', clientId);
    
    // Hide any existing error messages
    try {
        const errorContainers = document.querySelectorAll('.error-container, .bg-red-100');
        errorContainers.forEach(container => {
            if (container) {
                container.style.display = 'none';
            }
        });
    } catch (err) {
        console.error('Error hiding error messages:', err);
    }
    
    // Show all loading spinners
    try {
        const spinners = document.querySelectorAll('.loading-spinner');
        spinners.forEach(spinner => {
            if (spinner) {
                spinner.style.display = 'block';
            }
        });
    } catch (err) {
        console.error('Error showing loading spinners:', err);
    }
    
    try {
        // Basic validation
        if (!clientId) {
            throw new Error('No client ID provided');
        }
        
        // Check authentication
        const user = firebase.auth().currentUser;
        if (!user) {
            throw new Error('You must be logged in to view client details');
        }
        
        // Get client data
        const db = firebase.firestore();
        const clientDoc = await db.collection('users').doc(user.uid)
            .collection('clients').doc(clientId).get();
        
        if (!clientDoc.exists) {
            throw new Error('Client not found');
        }
        
        const client = clientDoc.data();
        console.log('Client data loaded:', client);
        
        // Update client info section
        try {
            // Update page title
            document.title = `${client.firstName} ${client.lastName} - Client Details`;
            
            // Update client name
            const nameElement = document.querySelector('h2');
            if (nameElement) {
                nameElement.textContent = `${client.lastName}, ${client.firstName}`;
            }
            
            // Update address
            const addressElement = document.querySelector('p.text-gray-600');
            if (addressElement) {
                const address = [];
                if (client.street) address.push(client.street);
                if (client.city) address.push(client.city);
                if (client.state) address.push(client.state);
                if (client.zip) address.push(client.zip);
                
                addressElement.textContent = address.length > 0 ? address.join(', ') : 'No address provided';
            }
            
            // Update phone
            const phoneLink = document.querySelector('a[href^="tel:"]');
            if (phoneLink) {
                if (client.phone) {
                    phoneLink.href = `tel:${client.phone}`;
                    phoneLink.innerHTML = `<i class="fas fa-phone"></i> ${client.phone}`;
                } else {
                    phoneLink.href = '#';
                    phoneLink.innerHTML = `<i class="fas fa-phone"></i> No phone provided`;
                }
            }
            
            // Update email
            const emailLink = document.querySelector('a[href^="mailto:"]');
            if (emailLink) {
                if (client.email) {
                    emailLink.href = `mailto:${client.email}`;
                    emailLink.innerHTML = `<i class="fas fa-envelope"></i> ${client.email}`;
                } else {
                    emailLink.href = '#';
                    emailLink.innerHTML = `<i class="fas fa-envelope"></i> No email provided`;
                }
            }
        } catch (err) {
            console.error('Error updating client info:', err);
        }
        
        // Update all sections
        updateAllSections(client, clientId, user.uid);
        
    } catch (error) {
        console.error('Error loading client details:', error);
        
        // Show error message at the top
        try {
            const errorContainer = document.querySelector('.error-container');
            if (errorContainer) {
                const errorMessage = document.getElementById('error-message');
                if (errorMessage) {
                    errorMessage.textContent = `Error: ${error.message}`;
                } else {
                    errorContainer.textContent = `Error: ${error.message}`;
                }
                errorContainer.style.display = 'block';
                errorContainer.classList.remove('hidden');
            } else {
                alert(`Error: ${error.message}`);
            }
        } catch (err) {
            console.error('Error showing error message:', err);
            alert(`Error: ${error.message}`);
        }
        
        // Hide all loading spinners
        try {
            const spinners = document.querySelectorAll('.loading-spinner');
            spinners.forEach(spinner => {
                if (spinner) {
                    spinner.style.display = 'none';
                }
            });
        } catch (err) {
            console.error('Error hiding loading spinners:', err);
        }
    }
}

// Helper function to update all sections
async function updateAllSections(client, clientId, userId) {
    try {
        // Update cleaning schedule section
        updateSection('cleaning-schedule-section', createCleaningScheduleContent(client, clientId));
        
        // Update upcoming cleanings section
        try {
            // Show loading state for this section
            const section = document.getElementById('upcoming-cleanings-section');
            if (section) {
                const spinner = section.querySelector('.loading-spinner');
                if (spinner) {
                    spinner.style.display = 'block';
                }
            }
            
            // Fetch bookings
            const db = firebase.firestore();
            const bookingsSnapshot = await db.collection('users').doc(userId)
                .collection('bookings')
                .where('clientId', '==', clientId)
                .get();
            
            // Process and display bookings
            const bookingsContent = createUpcomingCleaningsContent(bookingsSnapshot);
            updateSection('upcoming-cleanings-section', bookingsContent);
        } catch (err) {
            console.error('Error updating upcoming cleanings:', err);
            updateSection('upcoming-cleanings-section', `<p class="mt-4 text-red-600">Error loading bookings: ${err.message}</p>`);
        }
        
        // Update access information section
        const accessInfo = client.accessInformation || client.accessInfo || null;
        if (accessInfo) {
            updateSection('access-info-section', `<p class="mt-4">${accessInfo}</p>`);
        } else {
            updateSection('access-info-section', '<p class="mt-4 text-gray-600">No access information provided.</p>');
        }
        
        // Update special instructions section
        const instructions = client.specialInstructions || client.instructions || null;
        if (instructions) {
            updateSection('special-instructions-section', `<p class="mt-4">${instructions}</p>`);
        } else {
            updateSection('special-instructions-section', '<p class="mt-4 text-gray-600">No special instructions provided.</p>');
        }
    } catch (err) {
        console.error('Error updating sections:', err);
    }
}

// Helper function to update a section
function updateSection(sectionId, content) {
    try {
        const section = document.getElementById(sectionId);
        if (!section) {
            console.warn(`Section ${sectionId} not found`);
            return;
        }
        
        // Hide spinner
        const spinner = section.querySelector('.loading-spinner');
        if (spinner) {
            spinner.style.display = 'none';
        }
        
        // Update content
        const contentDiv = section.querySelector('.section-content');
        if (contentDiv) {
            contentDiv.innerHTML = content;
            contentDiv.style.display = 'block';
        } else {
            console.warn(`Content div not found in section ${sectionId}`);
        }
    } catch (err) {
        console.error(`Error updating section ${sectionId}:`, err);
    }
}

// Helper function to create cleaning schedule content
function createCleaningScheduleContent(client, clientId) {
    // Format schedule information
    const frequency = client.frequency || 'Not specified';
    
    // Build schedule string
    let scheduleInfo = 'Not specified';
    if (client.schedule) {
        scheduleInfo = client.schedule;
    } else if (client.scheduleDay && client.scheduleTime) {
        scheduleInfo = `Every ${client.scheduleDay} at ${client.scheduleTime}`;
    }
    
    // Get property details
    const propertyDetails = client.propertyDetails || client.property || 'Not specified';
    
    // Create HTML content
    return `
        <div class="mt-4">
            <p class="font-medium">Frequency: <span class="font-normal">${frequency}</span></p>
            <p class="font-medium mt-2">Schedule: <span class="font-normal">${scheduleInfo}</span></p>
            <p class="font-medium mt-2">Property Details: <span class="font-normal">${propertyDetails}</span></p>
            <div class="mt-4">
                <a href="../schedule/reschedule-choice.html?clientId=${clientId}" class="text-blue-600 hover:text-blue-800">
                    <i class="fas fa-calendar-alt mr-1"></i> Reschedule
                </a>
            </div>
        </div>
    `;
}

// Helper function to create upcoming cleanings content
function createUpcomingCleaningsContent(bookingsSnapshot) {
    if (bookingsSnapshot.empty) {
        return '<p class="mt-4 text-gray-600">No cleanings scheduled for this client.</p>';
    }
    
    // Filter for upcoming bookings
    const now = new Date();
    const upcomingBookings = bookingsSnapshot.docs
        .map(doc => {
            const data = doc.data();
            let bookingDate;
            
            if (data.date && data.date.toDate) {
                bookingDate = data.date.toDate();
            } else if (data.date && typeof data.date === 'string') {
                bookingDate = new Date(data.date);
            } else if (data.date && typeof data.date === 'object') {
                bookingDate = new Date(data.date);
            } else {
                return null;
            }
            
            return {
                id: doc.id,
                ...data,
                parsedDate: bookingDate
            };
        })
        .filter(booking => booking && booking.parsedDate && booking.parsedDate >= now)
        .sort((a, b) => a.parsedDate - b.parsedDate);
    
    if (upcomingBookings.length === 0) {
        return '<p class="mt-4 text-gray-600">No upcoming cleanings scheduled.</p>';
    }
    
    // Create HTML for bookings
    let html = '<div class="mt-4">';
    
    upcomingBookings.forEach(booking => {
        const formattedDate = booking.parsedDate.toLocaleDateString();
        const formattedTime = booking.startTime || 'No time specified';
        
        html += `
            <div class="mb-4 p-3 border border-gray-200 rounded-lg">
                <div class="flex justify-between items-center">
                    <div>
                        <p class="font-medium">${formattedDate} at ${formattedTime}</p>
                        <p class="text-sm text-gray-600">${booking.notes || 'No notes'}</p>
                    </div>
                    <div>
                        <a href="../schedule/index.html?bookingId=${booking.id}" class="text-blue-600 hover:text-blue-800">
                            <i class="fas fa-eye"></i>
                        </a>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    return html;
}

// A very simple function to fix the client details page
function fixClientDetailsPage() {
    console.log('Fixing client details page');
    
    // Hide any error messages
    try {
        const errorContainers = document.querySelectorAll('.error-container, .bg-red-100');
        errorContainers.forEach(container => {
            if (container) {
                container.style.display = 'none';
            }
        });
    } catch (err) {
        console.error('Error hiding error messages:', err);
    }
    
    // Fix the loading spinners
    try {
        const spinners = document.querySelectorAll('.loading-spinner');
        spinners.forEach(spinner => {
            if (spinner) {
                spinner.style.display = 'none';
            }
        });
    } catch (err) {
        console.error('Error hiding spinners:', err);
    }
    
    // Add placeholder content to each section
    try {
        const sections = document.querySelectorAll('.client-card');
        sections.forEach(section => {
            try {
                const heading = section.querySelector('h3');
                if (!heading) return;
                
                const headingText = heading.textContent;
                const contentDiv = section.querySelector('.p-4');
                
                if (!contentDiv) return;
                
                // Create placeholder content based on section type
                let placeholderHTML = '';
                
                if (headingText.includes('Cleaning Schedule')) {
                    placeholderHTML = `
                        <h3 class="text-lg font-semibold text-gray-900 mb-2">Cleaning Schedule</h3>
                        <p class="mt-4 text-gray-600">Schedule information will appear here.</p>
                    `;
                }
                else if (headingText.includes('Upcoming Cleanings')) {
                    placeholderHTML = `
                        <h3 class="text-lg font-semibold text-gray-900 mb-2">Upcoming Cleanings</h3>
                        <p class="mt-4 text-gray-600">Upcoming cleanings will appear here.</p>
                    `;
                }
                else if (headingText.includes('Access Information')) {
                    placeholderHTML = `
                        <h3 class="text-lg font-semibold text-gray-900 mb-2">Access Information</h3>
                        <p class="mt-4 text-gray-600">Access information will appear here.</p>
                    `;
                }
                else if (headingText.includes('Special Instructions')) {
                    placeholderHTML = `
                        <h3 class="text-lg font-semibold text-gray-900 mb-2">Special Instructions</h3>
                        <p class="mt-4 text-gray-600">Special instructions will appear here.</p>
                    `;
                }
                
                // Set the content
                if (placeholderHTML) {
                    contentDiv.innerHTML = placeholderHTML;
                }
            } catch (err) {
                console.error('Error updating section:', err);
            }
        });
    } catch (err) {
        console.error('Error updating sections:', err);
    }
}

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Clients.js loaded');
    
    // Check if user is logged in
    firebase.auth().onAuthStateChanged(async user => {
        if (user) {
            console.log('User is logged in:', user.uid);
            // Initialize search first (it doesn't depend on loaded clients)
            initSearchFunctionality(); 
            
            // Find the toggle switch *after* DOM is loaded
            const archivedToggle = document.getElementById('toggle-archived-clients');
            
            // Set initial state based on the toggle's default (usually unchecked)
            if (archivedToggle) {
                isViewingArchived = archivedToggle.checked; 
                console.log(`Initial archived view state: ${isViewingArchived}`);
            } else {
                console.warn('Toggle switch #toggle-archived-clients not found on initial load.');
                isViewingArchived = false; // Default to false if toggle not found
            }

            // Load initial clients based on the determined state
            await loadAllClients(isViewingArchived); 

            // Add listener *after* checking initial state and performing initial load
            if (archivedToggle) {
                archivedToggle.addEventListener('change', (event) => {
                    isViewingArchived = event.target.checked;
                    console.log(`Archived toggle changed. Viewing archived: ${isViewingArchived}`);
                    loadAllClients(isViewingArchived); // Reload clients based on toggle
                });
            } // No else needed here, already warned if not found

        } else {
            console.log('No user logged in. Showing login prompt.');
            showLoginPrompt(); // Redirect or show message if not logged in
        }
    });
}); // <<< Correct end of DOMContentLoaded listener

// --- END: Invite Client Modal Logic ---

// --- Action Execution Functions ---
// ... (executeArchiveAction, executeUnarchiveAction)
// --- END Action Execution Functions ---

// --- ADD BACK MISSING FUNCTIONS ---

/**
 * Checks if a client has any future bookings (pending or confirmed).
 * @param {string} clientId The ID of the client to check.
 * @returns {Promise<boolean>} True if future bookings exist, false otherwise.
 */
async function checkFutureBookings(clientId) {
    console.log(`[Archive Check] Checking future bookings for client: ${clientId}`);
    const user = firebase.auth().currentUser;
    if (!user) {
        console.error("[Archive Check] User not authenticated.");
        showErrorMessage("Authentication error. Cannot check bookings.");
        return true; // Assume bookings exist to prevent accidental archival on auth error
    }

    try {
        const db = firebase.firestore();
        const bookingsRef = db.collection('users').doc(user.uid).collection('bookings');
        const nowTimestamp = firebase.firestore.Timestamp.now();

        // Query for future bookings (pending or confirmed)
        const snapshot = await bookingsRef
            .where('clientId', '==', clientId)
            .where('status', 'in', ['pending', 'confirmed'])
            .where('startTimestamp', '>', nowTimestamp)
            .limit(1) // We only need to know if at least one exists
            .get();

        if (!snapshot.empty) {
            console.log(`[Archive Check] Found ${snapshot.size} future booking(s) for client ${clientId}.`);
            return true; // Future bookings exist
        } else {
            console.log(`[Archive Check] No future bookings found for client ${clientId}.`);
            return false; // No future bookings found
        }
    } catch (error) {
        console.error("[Archive Check] Error checking future bookings:", error);
        showErrorMessage("Error checking client's future bookings. Please try again.");
        return true; // Assume bookings exist on error to be safe
    }
}

/**
 * Handles the click event for the "Archive Client" button.
 */
async function handleArchiveClientClick() {
    console.log('[Archive Click] Archive button clicked.');
    const modal = document.getElementById('client-details-modal');
    const clientId = modal?.dataset.clientId;
    if (!modal || !clientId) {
        console.error('[Archive Click] Modal or client ID not found.');
        showErrorMessage("Could not identify the client to archive.");
        return;
    }

    const clientData = JSON.parse(modal.dataset.clientData || '{}');
    const clientName = `${clientData.firstName || ''} ${clientData.lastName || ''}`.trim() || 'this client';

    showLoading("Checking for future bookings...");

    try {
        const hasFutureBookings = await checkFutureBookings(clientId);

        if (hasFutureBookings) {
            hideLoading();
            showErrorMessage(`${clientName} has upcoming bookings. Please cancel or complete future bookings before archiving.`);
            return;
        }

        hideLoading(); // Hide booking check loading
        console.log(`[Archive Click] No future bookings found for ${clientId}. Ready to call confirmation modal.`);
        
        // Open Custom Confirmation Modal
        openActionConfirmModal(
            'archive',
            clientId,
            clientName,
            `Are you sure you want to archive ${clientName}? This will hide them from your list and prevent them from booking new appointments with you.`,
            'Confirm Archive',
            executeArchiveAction // Pass the function to execute
        );

    } catch (error) {
        hideLoading();
        console.error('[Archive Click] Error during archive check process:', error);
        showErrorMessage("An unexpected error occurred while checking for bookings.");
    }
}

/**
 * Handles the click event for the "Unarchive Client" button.
 */
async function handleUnarchiveClientClick() {
    console.log('[Unarchive Click] Unarchive button clicked.');
    const modal = document.getElementById('client-details-modal');
    const clientId = modal?.dataset.clientId;
    if (!modal || !clientId) {
        console.error('[Unarchive Click] Modal or client ID not found.');
        showErrorMessage("Could not identify the client to unarchive.");
        return;
    }

    const clientData = JSON.parse(modal.dataset.clientData || '{}');
    const clientName = `${clientData.firstName || ''} ${clientData.lastName || ''}`.trim() || 'this client';

    // Open Custom Confirmation Modal
    openActionConfirmModal(
        'unarchive',
        clientId,
        clientName,
        `Are you sure you want to unarchive ${clientName}? This will make them active again and allow them to book new appointments.`,
        'Confirm Unarchive',
        executeUnarchiveAction // Pass the function to execute
    );
}
// --- END ADDING BACK FUNCTIONS ---