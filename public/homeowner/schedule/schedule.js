import { formatDateForDisplay, getLocalTimezone } from '../../common/js/date-utils.js';

// DOM Elements
let currentUser = null;
let linkedHousekeeperId = null;
let housekeeperProfile = null;
let availableServices = []; // To store fetched services { id, name, description, type, basePrice }
let currentServiceRequest = {
    baseServices: [], // Array of { id, name, price }
    addonServices: [], // Array of { id, name, price }
    preferredDate: null,
    preferredTime: '',
    notes: '',
    estimatedTotal: 0
};

// DOM Elements - Main Page
const pageTitle = document.getElementById('page-title');
const housekeeperInfoBanner = document.getElementById('housekeeper-info-banner');
const housekeeperNameDisplay = document.getElementById('housekeeper-name-display');
const housekeeperCompanyDisplay = document.getElementById('housekeeper-company-display');

// Tabs
const tabRequestNew = document.getElementById('tab-request-new');
const tabMyRequests = document.getElementById('tab-my-requests');
const contentRequestNew = document.getElementById('content-request-new');
const contentMyRequests = document.getElementById('content-my-requests');

// Service Request Form Elements
const servicesLoadingIndicator = document.getElementById('services-loading-indicator');
const servicesErrorDisplay = document.getElementById('services-error-display');
const servicesErrorMessage = document.getElementById('services-error-message');
const baseServicesSection = document.getElementById('base-services-section');
const baseServicesList = document.getElementById('base-services-list');
const addonServicesSection = document.getElementById('addon-services-section');
const addonServicesList = document.getElementById('addon-services-list');
const datetimePreferenceSection = document.getElementById('datetime-preference-section');
const preferredDateInput = document.getElementById('preferred-date');
const preferredTimeSelect = document.getElementById('preferred-time');
const datetimeErrorDisplay = document.getElementById('datetime-error-display');
const notesSection = document.getElementById('notes-section');
const homeownerNotesTextarea = document.getElementById('homeowner-notes');
const estimatedTotalSection = document.getElementById('estimated-total-section');
const estimatedTotalAmountDisplay = document.getElementById('estimated-total-amount');
const submitServiceRequestButton = document.getElementById('submit-service-request-btn');
const submitErrorDisplay = document.getElementById('submit-error-display');

// Confirmation Modal Elements
const confirmRequestModal = document.getElementById('confirm-request-modal');
const confirmRequestDrawer = document.getElementById('confirm-request-drawer');
const closeConfirmModalButton = document.getElementById('close-confirm-modal-btn');
const modalSelectedServicesSummary = document.getElementById('modal-selected-services-summary');
const modalPreferredDateSummary = document.getElementById('modal-preferred-date-summary');
const modalPreferredTimeSummary = document.getElementById('modal-preferred-time-summary');
const modalNotesSummary = document.getElementById('modal-notes-summary');
const modalEstimatedTotalSummary = document.getElementById('modal-estimated-total-summary');
const cancelSendRequestButton = document.getElementById('cancel-send-request-btn');
const confirmSendRequestButton = document.getElementById('confirm-send-request-btn');
const confirmSendSpinner = document.getElementById('confirm-send-spinner');
const modalSubmitErrorDisplay = document.getElementById('modal-submit-error-display');

// My Requests Tab Elements
const myRequestsLoadingIndicator = document.getElementById('my-requests-loading-indicator');
const myRequestsList = document.getElementById('my-requests-list');
const noRequestsMessage = document.getElementById('no-requests-message');

// --- Utility Functions ---
function showLoading(section) {
    if (section === 'services') servicesLoadingIndicator.classList.remove('hidden');
    if (section === 'my-requests') myRequestsLoadingIndicator.classList.remove('hidden');
}

function hideLoading(section) {
    if (section === 'services') servicesLoadingIndicator.classList.add('hidden');
    if (section === 'my-requests') myRequestsLoadingIndicator.classList.add('hidden');
}

function showError(section, message) {
    if (section === 'services') {
        servicesErrorMessage.textContent = message;
        servicesErrorDisplay.classList.remove('hidden');
    }
    // Add other error sections if needed (e.g., for submit, datetime)
}

function hideError(section) {
    if (section === 'services') servicesErrorDisplay.classList.add('hidden');
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Homeowner Schedule Page Loaded - New Request Flow');

    // Initialize Flatpickr for date selection
    flatpickr(preferredDateInput, {
        altInput: true,
        altFormat: "F j, Y",
        dateFormat: "Y-m-d",
        minDate: "today",
    });

    // Attach tab switching listeners
    tabRequestNew.addEventListener('click', () => showTab('request-new'));
    tabMyRequests.addEventListener('click', () => showTab('my-requests'));

    // Attach listeners for service request form
    submitServiceRequestButton.addEventListener('click', handleReviewRequest);
    // Event listeners for service checkboxes, date/time changes will be added when services are rendered
    preferredDateInput.addEventListener('change', validateFormAndToggleButton);
    preferredTimeSelect.addEventListener('change', validateFormAndToggleButton); // Although time is optional currently
    homeownerNotesTextarea.addEventListener('input', () => { /* Could add character counter or live validation if needed */ });


    // Attach listeners for confirmation modal
    closeConfirmModalButton.addEventListener('click', closeConfirmationModal);
    cancelSendRequestButton.addEventListener('click', closeConfirmationModal);
    confirmSendRequestButton.addEventListener('click', handleSubmitRequest);
    confirmRequestModal.addEventListener('click', (event) => { // Close on backdrop click
        if (event.target === confirmRequestModal) {
            closeConfirmationModal();
        }
    });

    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            console.log('Current homeowner:', currentUser.uid);
            showLoading('services');
            try {
                const homeownerProfile = await window.firestoreService.getHomeownerProfile(currentUser.uid);
                if (homeownerProfile && homeownerProfile.linkedHousekeeperId) {
                    linkedHousekeeperId = homeownerProfile.linkedHousekeeperId;
                    console.log('Linked housekeeper ID:', linkedHousekeeperId);
                    await fetchHousekeeperDetailsAndServices();
                } else {
                    console.warn('Homeowner not linked to a housekeeper.');
                    showError('services', 'You are not currently linked with a housekeeper. Please link with a housekeeper from your dashboard to request services.');
                    hideLoading('services');
                    // Disable form sections
                    disableServiceRequestForm('You must be linked to a housekeeper to request services.');
                }
            } catch (error) {
                console.error('Error fetching homeowner profile or services:', error);
                showError('services', 'Could not load your information or housekeeper details. Please try again.');
                hideLoading('services');
                disableServiceRequestForm('Could not load necessary data.');
            }
        } else {
            console.log('User not authenticated. Auth-router should handle redirect.');
            disableServiceRequestForm('Please log in to request services.');
            // Clear any potentially sensitive loaded data if user logs out
            housekeeperInfoBanner.classList.add('hidden');
            baseServicesList.innerHTML = '';
            addonServicesList.innerHTML = '';
            myRequestsList.innerHTML = '';
            noRequestsMessage.textContent = 'Please log in to view or make requests.';
            noRequestsMessage.classList.remove('hidden');
        }
    });
});

function disableServiceRequestForm(message) {
    baseServicesSection.classList.add('hidden');
    addonServicesSection.classList.add('hidden');
    datetimePreferenceSection.classList.add('hidden');
    notesSection.classList.add('hidden');
    estimatedTotalSection.classList.add('hidden');
    submitServiceRequestButton.disabled = true;
    if (message && servicesErrorDisplay.classList.contains('hidden')) { // Show message if no specific error is already there
         showError('services', message);
    } else if (message && !servicesErrorDisplay.classList.contains('hidden') && servicesErrorMessage.textContent.includes('You must be linked')) {
        // Don't overwrite the specific "not linked" message with a generic one.
    }
}

async function fetchHousekeeperDetailsAndServices() {
    if (!linkedHousekeeperId) return;

    try {
        housekeeperProfile = await window.firestoreService.getUserProfile(linkedHousekeeperId); // Assuming getUserProfile works for any user type
        if (housekeeperProfile) {
            housekeeperNameDisplay.textContent = housekeeperProfile.name || 'Your Housekeeper';
            housekeeperCompanyDisplay.textContent = housekeeperProfile.companyName || '';
            housekeeperInfoBanner.classList.remove('hidden');
        } else {
            console.warn('Could not fetch housekeeper profile details.');
        }

        const servicesSnapshot = await firebase.firestore()
            .collection('users').doc(linkedHousekeeperId)
            .collection('services').where('isActive', '==', true).get();

        if (servicesSnapshot.empty) {
            console.warn('No active services found for this housekeeper.');
            showError('services', 'This housekeeper has not set up any services yet.');
            disableServiceRequestForm('No services available from this housekeeper.');
        } else {
            availableServices = servicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log('Available services fetched:', availableServices);
            displayServices();
            baseServicesSection.classList.remove('hidden');
            // addonServicesSection is shown/hidden within displayServices
            datetimePreferenceSection.classList.remove('hidden');
            notesSection.classList.remove('hidden');
            estimatedTotalSection.classList.remove('hidden');
            // submitServiceRequestButton state is handled by validateFormAndToggleButton
            hideError('services');
            validateFormAndToggleButton(); // Initial validation
        }
    } catch (error) {
        console.error('Error fetching housekeeper services:', error);
        showError('services', 'Could not load housekeeper services. Please try refreshing.');
        disableServiceRequestForm('Failed to load services.');
    } finally {
        hideLoading('services');
    }
}

function displayServices() {
    baseServicesList.innerHTML = '';
    addonServicesList.innerHTML = '';
    let hasBaseServices = false;
    let hasAddonServices = false;

    availableServices.forEach(service => {
        const serviceElement = createServiceElement(service);
        if (service.type === 'base') {
            baseServicesList.appendChild(serviceElement);
            hasBaseServices = true;
        } else if (service.type === 'addon') {
            addonServicesList.appendChild(serviceElement);
            hasAddonServices = true;
        }
    });

    if (!hasBaseServices) {
        baseServicesSection.classList.add('hidden');
        // Show a message if no base services, as this is critical
        const p = document.createElement('p');
        p.className = 'text-sm text-gray-500 p-4 text-center';
        p.textContent = 'No base services are currently available from this housekeeper.';
        baseServicesList.appendChild(p); // Add message to the list container
    } else {
        baseServicesSection.classList.remove('hidden');
    }

    if (!hasAddonServices) {
        addonServicesSection.classList.add('hidden');
    } else {
        addonServicesSection.classList.remove('hidden');
    }
    document.querySelectorAll('input[name="base_service"], input[name="addon_service"]').forEach(checkbox => {
        checkbox.addEventListener('change', handleServiceSelectionChange);
    });
    updateEstimatedTotal();
    validateFormAndToggleButton();
}

function createServiceElement(service) {
    const label = document.createElement('label');
    label.className = 'flex items-start bg-neutral-card p-4 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer';

    const inputType = 'checkbox'; // Always checkbox for multiple selections
    const inputName = service.type === 'base' ? 'base_service' : 'addon_service';

    const checkbox = document.createElement('input');
    checkbox.type = inputType;
    checkbox.name = inputName;
    checkbox.value = service.id;
    checkbox.dataset.service = JSON.stringify(service);
    checkbox.className = 'h-5 w-5 text-primary focus:ring-primary border-gray-300 rounded mt-1 flex-shrink-0';

    const detailsDiv = document.createElement('div');
    detailsDiv.className = 'ml-3 flex-grow';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'text-md font-medium text-neutral-text block';
    nameSpan.textContent = service.serviceName;

    const descriptionP = document.createElement('p');
    descriptionP.className = 'text-sm text-gray-600 mt-1';
    descriptionP.textContent = service.description || '';

    detailsDiv.appendChild(nameSpan);
    if (service.description) detailsDiv.appendChild(descriptionP);

    const priceSpan = document.createElement('span');
    priceSpan.className = 'text-md font-semibold text-primary ml-3 whitespace-nowrap';
    priceSpan.textContent = `$${parseFloat(service.basePrice || 0).toFixed(2)}`;

    label.appendChild(checkbox);
    label.appendChild(detailsDiv);
    label.appendChild(priceSpan);

    return label;
}

function handleServiceSelectionChange() {
    currentServiceRequest.baseServices = [];
    currentServiceRequest.addonServices = [];
    currentServiceRequest.estimatedTotal = 0; // Use this name consistently

    document.querySelectorAll('input[name="base_service"]:checked').forEach(cb => {
        const service = JSON.parse(cb.dataset.service); // Parse the full service object
        currentServiceRequest.baseServices.push({ 
            id: service.id, 
            name: service.serviceName, 
            price: parseFloat(service.basePrice), 
            type: service.type, 
            durationMinutes: parseInt(service.durationMinutes || 0) // Get duration
        });
        currentServiceRequest.estimatedTotal += parseFloat(service.basePrice);
    });
    document.querySelectorAll('input[name="addon_service"]:checked').forEach(cb => {
        const service = JSON.parse(cb.dataset.service); // Parse the full service object
        currentServiceRequest.addonServices.push({ 
            id: service.id, 
            name: service.serviceName, 
            price: parseFloat(service.basePrice), 
            type: service.type, 
            durationMinutes: parseInt(service.durationMinutes || 0) // Get duration
        });
        currentServiceRequest.estimatedTotal += parseFloat(service.basePrice);
    });

    updateEstimatedTotal();
    validateFormAndToggleButton();
}

function updateEstimatedTotal() {
    estimatedTotalAmountDisplay.textContent = `$${currentServiceRequest.estimatedTotal.toFixed(2)}`;
}

function validateFormAndToggleButton() {
    const hasBaseService = currentServiceRequest.baseServices.length > 0;
    const hasDate = !!preferredDateInput.value;

    if (hasBaseService && hasDate) {
        submitServiceRequestButton.disabled = false;
        submitErrorDisplay.classList.add('hidden');
         datetimeErrorDisplay.classList.add('hidden'); // Hide date error if date is now selected
    } else {
        submitServiceRequestButton.disabled = true;
        let errorMsg = [];
        if (!hasBaseService) errorMsg.push('Please select a base service.');
        if (!hasDate) {
            errorMsg.push('Please select a preferred date.');
            datetimeErrorDisplay.textContent = 'Preferred date is required.'; // Specific error for date field
            datetimeErrorDisplay.classList.remove('hidden');
        } else {
            datetimeErrorDisplay.classList.add('hidden');
        }
        // Only show general submit error if one of the conditions is met
        if (!hasBaseService || !hasDate) {
            submitErrorDisplay.textContent = errorMsg.join(' ');
            submitErrorDisplay.classList.remove('hidden');
        } else {
            submitErrorDisplay.classList.add('hidden');
        }
    }
}


function handleReviewRequest() {
    currentServiceRequest.preferredDate = preferredDateInput.value;
    currentServiceRequest.preferredTime = preferredTimeSelect.value;
    currentServiceRequest.notes = homeownerNotesTextarea.value.trim();

    // Final validation before showing modal - re-run to be sure
    validateFormAndToggleButton();
    if (submitServiceRequestButton.disabled) {
        // Error messages are already shown by validateFormAndToggleButton
        return;
    }

    modalSelectedServicesSummary.innerHTML = '';
    if (currentServiceRequest.baseServices.length > 0) {
        const baseTitle = document.createElement('p');
        baseTitle.className = 'font-semibold text-neutral-text';
        baseTitle.textContent = 'Base Service(s):';
        modalSelectedServicesSummary.appendChild(baseTitle);
        currentServiceRequest.baseServices.forEach(s => {
            const p = document.createElement('p');
            p.innerHTML = `&bull; ${s.name} <span class="text-gray-600">($${s.price.toFixed(2)})</span>`;
            modalSelectedServicesSummary.appendChild(p);
        });
    }
    if (currentServiceRequest.addonServices.length > 0) {
        const addonTitle = document.createElement('p');
        addonTitle.className = 'font-semibold text-neutral-text mt-2';
        addonTitle.textContent = 'Add-on Service(s):';
        modalSelectedServicesSummary.appendChild(addonTitle);
        currentServiceRequest.addonServices.forEach(s => {
            const p = document.createElement('p');
            p.innerHTML = `&bull; ${s.name} <span class="text-gray-600">($${s.price.toFixed(2)})</span>`;
            modalSelectedServicesSummary.appendChild(p);
        });
    }

    // --- Direct date formatting for modal to ensure accuracy ---
    let formattedDateForModal = 'Not set';
    if (currentServiceRequest.preferredDate && typeof currentServiceRequest.preferredDate === 'string') {
        const parts = currentServiceRequest.preferredDate.split('-');
        if (parts.length === 3) {
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1; // JavaScript months are 0-indexed
            const day = parseInt(parts[2], 10);
            if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
                const dateObj = new Date(Date.UTC(year, month, day));
                formattedDateForModal = dateObj.toLocaleDateString(undefined, { 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric', 
                    timeZone: 'UTC' 
                });
            }
        }
    }
    modalPreferredDateSummary.textContent = formattedDateForModal;
    // --- End direct date formatting ---

    const selectedTimeOption = preferredTimeSelect.options[preferredTimeSelect.selectedIndex];
    modalPreferredTimeSummary.textContent = selectedTimeOption ? selectedTimeOption.text : 'Any time';
    modalNotesSummary.textContent = currentServiceRequest.notes || 'No additional notes.';
    modalEstimatedTotalSummary.textContent = `$${currentServiceRequest.estimatedTotal.toFixed(2)}`;

    openConfirmationModal();
}

function openConfirmationModal() {
    modalSubmitErrorDisplay.classList.add('hidden');
    confirmRequestModal.classList.remove('hidden');
    setTimeout(() => {
        confirmRequestModal.classList.remove('opacity-0');
        confirmRequestDrawer.classList.remove('translate-y-full');
    }, 10);
}

function closeConfirmationModal() {
    confirmRequestModal.classList.add('opacity-0');
    confirmRequestDrawer.classList.add('translate-y-full');
    setTimeout(() => {
        confirmRequestModal.classList.add('hidden');
    }, 300);
}

async function handleSubmitRequest() {
    console.log('Submitting service request:', currentServiceRequest);
    confirmSendSpinner.classList.remove('hidden');
    confirmSendRequestButton.disabled = true;
    modalSubmitErrorDisplay.classList.add('hidden');

    if (!currentUser || !linkedHousekeeperId) {
        modalSubmitErrorDisplay.textContent = 'User or housekeeper information is missing. Cannot submit.';
        modalSubmitErrorDisplay.classList.remove('hidden');
        confirmSendSpinner.classList.add('hidden');
        confirmSendRequestButton.disabled = false;
        return;
    }

    const requestData = {
        homeownerId: currentUser.uid,
        homeownerName: currentUser.displayName || currentUser.email, 
        housekeeperId: linkedHousekeeperId,
        baseServices: currentServiceRequest.baseServices.map(s => ({ // Ensure all relevant fields are mapped
            id: s.id,
            name: s.name,
            price: s.price,
            type: s.type,
            durationMinutes: s.durationMinutes
        })),
        addonServices: currentServiceRequest.addonServices.map(s => ({ // Ensure all relevant fields are mapped
            id: s.id,
            name: s.name,
            price: s.price,
            type: s.type,
            durationMinutes: s.durationMinutes
        })),
        preferredDate: currentServiceRequest.preferredDate,
        preferredTimeWindow: currentServiceRequest.preferredTime, // Should be preferredTimeWindow
        notes: currentServiceRequest.notes,
        estimatedTotalPrice: currentServiceRequest.estimatedTotal,
        status: 'pending_housekeeper_review',
        requestTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
        lastUpdatedTimestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        const requestRef = await firebase.firestore()
            .collection('users').doc(linkedHousekeeperId)
            .collection('bookingRequests').add(requestData);
        
        console.log('Service request submitted successfully, ID:', requestRef.id);
        closeConfirmationModal();
        showToast('Service request sent successfully!', 'success');
        resetRequestForm();
        showTab('my-requests'); // Switch and auto-load

    } catch (error) {
        console.error('Error submitting service request:', error);
        modalSubmitErrorDisplay.textContent = `Failed to send request: ${error.message}`;
        modalSubmitErrorDisplay.classList.remove('hidden');
    } finally {
        confirmSendSpinner.classList.add('hidden');
        confirmSendRequestButton.disabled = false;
    }
}

function resetRequestForm() {
    currentServiceRequest = {
        baseServices: [], addonServices: [], preferredDate: null, preferredTime: '', notes: '', estimatedTotal: 0
    };
    document.querySelectorAll('input[name="base_service"], input[name="addon_service"]').forEach(cb => cb.checked = false);
    if (preferredDateInput._flatpickr) { // Check if flatpickr instance exists
        preferredDateInput._flatpickr.clear();
    } else {
        preferredDateInput.value = ''; // Fallback if flatpickr not init
    }
    preferredTimeSelect.value = '';
    homeownerNotesTextarea.value = '';
    updateEstimatedTotal();
    validateFormAndToggleButton(); // This will disable button and show errors if needed
    submitErrorDisplay.classList.add('hidden'); // Specifically hide general submit error
    datetimeErrorDisplay.classList.add('hidden'); // And specific date error
}

// --- Tab Management ---
function showTab(tabName) {
    if (tabName === 'request-new') {
        contentRequestNew.classList.remove('hidden');
        contentMyRequests.classList.add('hidden');
        tabRequestNew.classList.add('border-primary', 'text-primary');
        tabRequestNew.classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
        tabMyRequests.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
        tabMyRequests.classList.remove('border-primary', 'text-primary');
        pageTitle.textContent = 'Request New Service';
        // Re-validate form when switching to it, in case data was missing (e.g. no housekeeper link)
        validateFormAndToggleButton(); 
    } else if (tabName === 'my-requests') {
        contentMyRequests.classList.remove('hidden');
        contentRequestNew.classList.add('hidden');
        tabMyRequests.classList.add('border-primary', 'text-primary');
        tabMyRequests.classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
        tabRequestNew.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
        tabRequestNew.classList.remove('border-primary', 'text-primary');
        pageTitle.textContent = 'My Service Requests';
        loadMyRequests();
    }
}

// --- My Requests Tab Logic ---
async function loadMyRequests() {
    if (!currentUser) {
        noRequestsMessage.textContent = 'Please log in to see your requests.';
        noRequestsMessage.classList.remove('hidden');
        myRequestsLoadingIndicator.classList.add('hidden');
        myRequestsList.innerHTML = ''; // Clear list
        return;
    }
    // Note: linkedHousekeeperId might not be strictly necessary to *view* requests
    // if we stored requests in a top-level collection with homeownerId.
    // However, our current model is /users/{hkId}/bookingRequests, so it IS needed.
    if (!linkedHousekeeperId && currentUser) { // Added check for currentUser to avoid error if logout happens mid-load
        noRequestsMessage.textContent = 'You need to be linked to a housekeeper to view past requests with them.';
        noRequestsMessage.classList.remove('hidden');
        myRequestsList.innerHTML = '';
        myRequestsLoadingIndicator.classList.add('hidden');
        return;
    }


    showLoading('my-requests');
    myRequestsList.innerHTML = '';
    noRequestsMessage.classList.add('hidden');

    try {
        const requestsSnapshot = await firebase.firestore()
            .collection('users').doc(linkedHousekeeperId) // Assuming requests are under housekeeper
            .collection('bookingRequests')
            .where('homeownerId', '==', currentUser.uid)
            .orderBy('requestTimestamp', 'desc')
            .get();

        if (requestsSnapshot.empty) {
            noRequestsMessage.textContent = 'You haven\'t made any service requests yet.';
            noRequestsMessage.classList.remove('hidden');
        } else {
            requestsSnapshot.forEach(doc => {
                const request = { id: doc.id, ...doc.data() };
                myRequestsList.appendChild(createRequestItemElement(request));
            });
        }
    } catch (error) {
        console.error('Error loading service requests:', error);
        noRequestsMessage.textContent = 'Could not load your requests. Please try again.';
        noRequestsMessage.classList.remove('hidden');
    } finally {
        hideLoading('my-requests');
    }
}

function createRequestItemElement(request) {
    const div = document.createElement('div');
    div.className = 'bg-neutral-card p-4 rounded-lg shadow mb-4';

    let servicesSummary = request.baseServices.map(s => s.name).join(', ');
    if (request.addonServices && request.addonServices.length > 0) {
        servicesSummary += ` (+ ${request.addonServices.map(s => s.name).join(', ')})`;
    }

    // --- Direct date formatting for request list to ensure accuracy ---
    let formattedRequestedDate = 'Any date';
    if (request.preferredDate && typeof request.preferredDate === 'string') {
        const parts = request.preferredDate.split('-');
        if (parts.length === 3) {
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1; // JavaScript months are 0-indexed
            const day = parseInt(parts[2], 10);
            if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
                const dateObj = new Date(Date.UTC(year, month, day));
                formattedRequestedDate = dateObj.toLocaleDateString(undefined, { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric', 
                    timeZone: 'UTC' 
                });
            }
        }
    }
    // --- End direct date formatting ---
    
    let preferredTimeText = 'Any time';
    if (request.preferredTimeWindow) {
        const timeOption = preferredTimeSelect.querySelector(`option[value="${request.preferredTimeWindow}"]`);
        if (timeOption) preferredTimeText = timeOption.textContent;
    }


    let statusColor = 'bg-yellow-100 text-yellow-800';
    let statusText = 'Pending Review';

    switch (request.status) {
        case 'pending_housekeeper_review': statusColor = 'bg-yellow-100 text-yellow-800'; statusText = 'Pending Review'; break;
        case 'housekeeper_proposed_alternative': statusColor = 'bg-blue-100 text-blue-800'; statusText = 'Proposal Received'; break;
        case 'homeowner_accepted_proposal': // This will become a confirmed booking
        case 'confirmed_by_housekeeper': // Direct confirm by housekeeper
        case 'confirmed': // Generic confirmed
            statusColor = 'bg-green-100 text-green-800'; statusText = 'Confirmed'; break;
        case 'cancelled_by_homeowner':
        case 'cancelled_by_housekeeper':
            statusColor = 'bg-red-100 text-red-800'; statusText = 'Cancelled'; break;
        case 'declined_by_housekeeper':
        case 'declined_by_homeowner':
            statusColor = 'bg-red-100 text-red-800'; statusText = 'Declined'; break;
        case 'completed':
             statusColor = 'bg-secondary-light text-secondary-dark'; statusText = 'Completed'; break; // Assuming secondary color for completed
        default:
            statusColor = 'bg-gray-100 text-gray-800'; statusText = request.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    div.innerHTML = `
        <div class="flex justify-between items-start">
            <div>
                <p class="text-md font-semibold text-neutral-text truncate pr-2" title="${servicesSummary}">${servicesSummary}</p>
                <p class="text-sm text-gray-500">Requested for: ${formattedRequestedDate} (${preferredTimeText})</p>
                ${request.estimatedTotalPrice ? `<p class="text-sm text-gray-500">Est. Price: $${request.estimatedTotalPrice.toFixed(2)}</p>` : ''}
                ${request.finalPrice ? `<p class="text-sm font-medium text-secondary-dark">Final Price: $${request.finalPrice.toFixed(2)}</p>` : ''}
            </div>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor} whitespace-nowrap">
                ${statusText}
            </span>
        </div>
        <div class="mt-3 flex justify-between items-center">
            <button data-request-id="${request.id}" class="view-request-details-btn text-sm text-primary hover:underline focus:outline-none">
                View Details ${request.status === 'housekeeper_proposed_alternative' ? '/ Proposal' : ''}
            </button>
            ${ (request.status === 'pending_housekeeper_review' || request.status === 'housekeeper_proposed_alternative') ? 
                `<button data-request-id="${request.id}" data-request-status="${request.status}" class="cancel-request-btn text-sm text-red-500 hover:text-red-700 focus:outline-none">Cancel Request</button>` : ''
            }
        </div>
    `;
    
    const viewDetailsBtn = div.querySelector('.view-request-details-btn');
    if (viewDetailsBtn) {
        viewDetailsBtn.addEventListener('click', () => handleViewRequestDetails(request.id, request.status));
    }
    const cancelBtn = div.querySelector('.cancel-request-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => handleCancelHomeownerRequest(request.id, servicesSummary));
    }

    return div;
}


// --- Placeholder for viewing request details (modal or new page) ---
function handleViewRequestDetails(requestId, status) {
    console.log('View details for request:', requestId, 'with status:', status);
    // This would typically open a modal or navigate to a detailed view page.
    // For the demo, we can just log it.
    // If status is 'housekeeper_proposed_alternative', the modal should show the proposal.
    showToast(`Viewing details for request ${requestId}. Status: ${status}. (Implementation pending)`, 'info');
}

// --- Placeholder for homeowner cancelling a request ---
async function handleCancelHomeownerRequest(requestId, serviceSummary) {
    console.log('Attempting to cancel request by homeowner:', requestId);

    // Simple confirmation for now
    if (!confirm(`Are you sure you want to cancel your request for "${serviceSummary}"?`)) {
        return;
    }

    showToast('Cancelling request...', 'info');
    try {
        // We need a cloud function for this to handle notifications, refunds if applicable, etc.
        // For now, just update status directly if allowed by security rules (likely not for homeowners directly on housekeeper's subcollection)
        // This direct update is primarily for quick demo and assumes permissive rules or admin access.
        // **A Cloud Function is the proper way.**

        const functions = firebase.functions();
        const cancelHomeownerRequestFunction = functions.httpsCallable('cancelHomeownerServiceRequest');

        const result = await cancelHomeownerRequestFunction({ 
            requestId: requestId,
            housekeeperId: linkedHousekeeperId // Pass housekeeperId for the function to find the request
        });

        if (result.data.success) {
            showToast('Request cancelled successfully.', 'success');
            loadMyRequests(); // Refresh the list
        } else {
            throw new Error(result.data.message || 'Failed to cancel via function.');
        }

    } catch (error) {
        console.error('Error cancelling request:', error);
        showToast(`Error cancelling request: ${error.message}`, 'error');
    }
}


// Toast notification utility
function showToast(message, type = 'info', duration = 3000) {
    const toastId = 'toast-notification-request-page'; // Unique ID for this page's toast
    let toast = document.getElementById(toastId);
    if (!toast) {
        toast = document.createElement('div');
        toast.id = toastId;
        // Base classes - ensure z-index is high enough, position fixed
        toast.className = 'fixed top-5 right-5 z-[100] px-4 py-3 rounded-md shadow-lg text-white text-sm font-medium transition-all duration-300 ease-out opacity-0 transform translate-x-full';
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    let bgColorClass = 'bg-primary'; // Default (info)
    if (type === 'success') {
        bgColorClass = 'bg-secondary';
    } else if (type === 'error') {
        bgColorClass = 'bg-red-500';
    }
    
    // Remove old color classes and add new one
    toast.className = toast.className.replace(/bg-\S+/g, '');
    toast.classList.add(bgColorClass);


    // Show toast
    setTimeout(() => {
        toast.classList.remove('opacity-0', 'translate-x-full');
        toast.classList.add('opacity-100', 'translate-x-0');
    }, 10);

    // Hide toast after duration
    setTimeout(() => {
        toast.classList.remove('opacity-100', 'translate-x-0');
        toast.classList.add('opacity-0', 'translate-x-full');
    }, duration + 10); // Add the initial 10ms for show animation
} 