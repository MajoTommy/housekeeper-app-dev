import { formatDateForDisplay, getLocalTimezone, formatDate, formatTime } from '../../common/js/date-utils.js';

// DOM Elements
let currentUser = null;
let linkedHousekeeperId = null;
let housekeeperProfile = null;
let availableServices = []; // To store fetched services { id, name, description, type, basePrice }
let currentServiceRequest = {
    baseServices: [], // Array of { id, name, minPrice, maxPrice, basePrice, type }
    addonServices: [], // Array of { id, name, minPrice, maxPrice, basePrice, type }
    preferredDate: null,
    preferredTime: '',
    frequency: 'one-time', // Default frequency
    recurringEndDate: null, // Default
    notes: '',
    estimatedTotal: { min: 0, max: 0 }
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

// --- NEW: Property Details Prompt Elements ---
const propertyDetailsPrompt = document.getElementById('property-details-prompt');
// const goToPropertySettingsBtn = document.getElementById('go-to-property-settings-btn'); // Link, JS interaction not strictly needed for now
const submitRequestButtonContainer = document.getElementById('submit-request-button-container');

// --- NEW: Frequency Section Elements ---
const frequencySection = document.getElementById('frequency-section');
const requestFrequencySelect = document.getElementById('request-frequency');
const recurringEndDateWrapper = document.getElementById('recurring-end-date-wrapper');
const recurringEndDateInput = document.getElementById('recurring-end-date');
// --- END NEW ---

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

// Proposal Response Modal Elements
const proposalResponseModal = document.getElementById('proposal-response-modal');
const proposalResponseDrawer = document.getElementById('proposal-response-drawer');
const closeProposalModalBtn = document.getElementById('close-proposal-modal-btn');
const proposalDateDisplay = document.getElementById('proposal-date-display');
const proposalTimeDisplay = document.getElementById('proposal-time-display');
const proposalNoteDisplay = document.getElementById('proposal-note-display');
const acceptProposalBtn = document.getElementById('accept-proposal-btn');
const declineProposalBtn = document.getElementById('decline-proposal-btn');
const cancelDeclineBtn = document.getElementById('cancel-decline-btn');
const declineNoteSection = document.getElementById('decline-note-section');
const declineNoteInput = document.getElementById('decline-note-input');
const proposalResponseError = document.getElementById('proposal-response-error');

// --- NEW: DOM elements for proposal frequency display ---
const proposalFrequencyWrapper = document.getElementById('proposal-frequency-wrapper');
const proposalFrequencyDisplay = document.getElementById('proposal-frequency-display');
const proposalRecurringEndDateWrapper = document.getElementById('proposal-recurring-end-date-wrapper');
const proposalRecurringEndDateDisplay = document.getElementById('proposal-recurring-end-date-display');
// --- END NEW ---

// --- NEW: Generic Request Details Modal Elements ---
const requestDetailsModal = document.getElementById('request-details-modal');
const requestDetailsDrawer = document.getElementById('request-details-drawer');
const closeRequestDetailsModalBtn = document.getElementById('close-request-details-modal-btn');
const okayRequestDetailsBtn = document.getElementById('okay-request-details-btn');
const detailsStatusDisplay = document.getElementById('details-status-display');
const detailsDateDisplay = document.getElementById('details-date-display');
const detailsTimeDisplay = document.getElementById('details-time-display');
const detailsFrequencyWrapper = document.getElementById('details-frequency-wrapper');
const detailsFrequencyDisplay = document.getElementById('details-frequency-display');
const detailsRecurringEndDateWrapper = document.getElementById('details-recurring-end-date-wrapper');
const detailsRecurringEndDateDisplay = document.getElementById('details-recurring-end-date-display');
const detailsServicesList = document.getElementById('details-services-list');
const detailsNotesWrapper = document.getElementById('details-notes-wrapper');
const detailsNotesDisplay = document.getElementById('details-notes-display');
const detailsPriceDisplay = document.getElementById('details-price-display');
// --- END NEW ---

let currentProposalRequest = null;
let inDeclineMode = false;

// --- Utility Functions ---
function showLoading(section) {
    if (section === 'services') servicesLoadingIndicator.classList.remove('hidden');
    if (section === 'my-requests') myRequestsLoadingIndicator.classList.remove('hidden');
}

function hideLoading(section) {
    if (section === 'services') servicesLoadingIndicator.classList.add('hidden');
    if (section === 'my-requests') {
        myRequestsLoadingIndicator.classList.add('hidden');
        // Also hide the overall request new content loading if services are also done or failed
        if (servicesLoadingIndicator.classList.contains('hidden')) {
            // This logic might be too simple, consider a more robust state check
        }
    }
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

    // --- NEW: Initialize Flatpickr for Recurring End Date ---
    flatpickr(recurringEndDateInput, {
        altInput: true,
        altFormat: "F j, Y",
        dateFormat: "Y-m-d",
        minDate: "today", // Or perhaps preferredDateInput.value + 1 day
    });
    // --- END NEW ---

    // Attach tab switching listeners
    tabRequestNew.addEventListener('click', () => showTab('request-new'));
    tabMyRequests.addEventListener('click', () => showTab('my-requests'));

    // Attach listeners for service request form
    submitServiceRequestButton.addEventListener('click', handleReviewRequest);
    preferredDateInput.addEventListener('change', validateFormAndToggleButton);
    preferredTimeSelect.addEventListener('change', validateFormAndToggleButton);
    homeownerNotesTextarea.addEventListener('input', () => { /* Could add character counter */ });

    // --- NEW: Event listener for frequency select ---
    if (requestFrequencySelect) {
        requestFrequencySelect.addEventListener('change', () => {
            if (requestFrequencySelect.value === 'one-time') {
                recurringEndDateWrapper.classList.add('hidden');
                if (recurringEndDateInput._flatpickr) { // Clear date if going back to one-time
                    recurringEndDateInput._flatpickr.clear();
                }
            } else {
                recurringEndDateWrapper.classList.remove('hidden');
            }
            validateFormAndToggleButton(); // Re-validate if frequency changes requirements
        });
    }
    // --- END NEW ---

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
            
            // Determine which tab is active based on HTML (or a default if JS were to control it initially)
            // Since HTML now defaults to "My Requests", we'll prioritize loading its data.
            // We also need to load data for the "Request New Service" tab for when the user switches to it.

            showLoading('services'); // For the "Request New Service" tab parts
            showLoading('my-requests'); // For the "My Requests" tab

            try {
                const homeownerProfile = await window.firestoreService.getHomeownerProfile(currentUser.uid);

                // Helper function to check for essential property details
                const arePropertyDetailsComplete = (profile) => {
                    return profile && 
                           profile.squareFootage && 
                           profile.numBedrooms && 
                           profile.numBathrooms && 
                           profile.homeType;
                };

                if (homeownerProfile && homeownerProfile.linkedHousekeeperId) {
                    linkedHousekeeperId = homeownerProfile.linkedHousekeeperId;
                    console.log('Linked housekeeper ID:', linkedHousekeeperId);

                    if (arePropertyDetailsComplete(homeownerProfile)) {
                        propertyDetailsPrompt.classList.add('hidden');
                        // Proceed to fetch services for the "Request New Service" tab
                        await fetchHousekeeperDetailsAndServices(); 
                    } else {
                        propertyDetailsPrompt.classList.remove('hidden');
                        console.warn('Homeowner property details are incomplete.');
                        disableServiceRequestForm('Please complete your property details in Settings to request services and see price estimates.');
                        hideLoading('services'); // Ensure services loading is hidden
                    }
                    // Load "My Requests" tab data regardless of property details completion for the other tab
                    await loadMyRequests(); 

                } else {
                    console.warn('Homeowner not linked to a housekeeper.');
                    showError('services', 'You are not currently linked with a housekeeper. Please link with a housekeeper from your dashboard to request services.');
                    disableServiceRequestForm('You must be linked to a housekeeper to request services.');
                    // Also update My Requests tab if needed
                    myRequestsList.innerHTML = '';
                    noRequestsMessage.textContent = 'Link with a housekeeper to view and make service requests.';
                    noRequestsMessage.classList.remove('hidden');
                    hideLoading('services');
                    hideLoading('my-requests');
                }
            } catch (error) {
                console.error('Error fetching homeowner profile or initial data:', error);
                showError('services', 'Could not load your information or housekeeper details. Please try again.');
                myRequestsList.innerHTML = '';
                noRequestsMessage.textContent = 'Error loading your request information. Please try again later.';
                noRequestsMessage.classList.remove('hidden');
                hideLoading('services');
                hideLoading('my-requests');
            }
        } else {
            console.log('User not authenticated. Auth-router should handle redirect.');
            disableServiceRequestForm('Please log in to request services.');
            // Clear any potentially sensitive loaded data if user logs out
            housekeeperInfoBanner.classList.add('hidden');
            baseServicesList.innerHTML = '';
            addonServicesList.innerHTML = '';
            contentRequestNew.classList.add('hidden'); // Ensure new request form is hidden
            contentMyRequests.classList.remove('hidden'); // Ensure my requests tab is shown (as it's default)
            myRequestsList.innerHTML = '';
            noRequestsMessage.textContent = 'Please log in to view or make requests.';
            noRequestsMessage.classList.remove('hidden');
            hideLoading('services');
            hideLoading('my-requests');
        }
    });
});

function disableServiceRequestForm(message) {
    console.log('Disabling service request form:', message);
    contentRequestNew.classList.remove('hidden'); // Make sure the tab content area is visible to show the message
    servicesLoadingIndicator.classList.add('hidden');
    propertyDetailsPrompt.classList.add('hidden'); // Ensure prompt is hidden if we are disabling for other reasons
    
    // Hide all form sections that require services or property details
    baseServicesSection.classList.add('hidden');
    addonServicesSection.classList.add('hidden');
    datetimePreferenceSection.classList.add('hidden');
    frequencySection.classList.add('hidden');
    notesSection.classList.add('hidden');
    estimatedTotalSection.classList.add('hidden');
    if(submitRequestButtonContainer) submitRequestButtonContainer.classList.add('hidden');

    if (message) {
        showError('services', message); // Use the existing services error display area
    } else {
        hideError('services');
    }
    submitServiceRequestButton.disabled = true;
}

async function fetchHousekeeperDetailsAndServices() {
    if (!linkedHousekeeperId) {
        showError('services', 'Cannot load services: No linked housekeeper.');
        hideLoading('services');
        disableServiceRequestForm('No housekeeper linked.');
        return;
    }

    // Ensure prompt is hidden if we reach here (meaning details should be complete)
    propertyDetailsPrompt.classList.add('hidden'); 
    showLoading('services');
    hideError('services');

    try {
        housekeeperProfile = await window.firestoreService.getHousekeeperProfile(linkedHousekeeperId);
        if (housekeeperProfile) {
            housekeeperNameDisplay.textContent = `${housekeeperProfile.firstName || ''} ${housekeeperProfile.lastName || ''}`.trim() || 'Your Housekeeper';
            housekeeperCompanyDisplay.textContent = housekeeperProfile.companyName || '';
            housekeeperInfoBanner.classList.remove('hidden');
        } else {
            console.warn('Could not fetch housekeeper profile details.');
            // Do not show banner, but can still attempt to load services if ID is known
        }

        // Fetch services
        const servicesPath = `users/${linkedHousekeeperId}/services`;
        const servicesSnapshot = await firebase.firestore().collection(servicesPath).where('isActive', '==', true).get();
        availableServices = servicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        console.log('Fetched services:', availableServices);
        displayServices(); // This will populate baseServicesList and addonServicesList

        // NOW show the relevant sections since services are loaded (or attempted)
        baseServicesSection.classList.remove('hidden');
        addonServicesSection.classList.remove('hidden');
        datetimePreferenceSection.classList.remove('hidden');
        frequencySection.classList.remove('hidden');
        notesSection.classList.remove('hidden');
        // estimatedTotalSection will be shown by updateEstimatedTotal when items are selected
        if(submitRequestButtonContainer) submitRequestButtonContainer.classList.remove('hidden');
        validateFormAndToggleButton(); // Initial validation for submit button state

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
    const serviceElement = document.createElement('label');
    serviceElement.className = 'flex items-start bg-neutral-card p-4 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.name = service.type === 'base' ? 'base_service' : 'addon_service';
    checkbox.value = service.id;
    checkbox.dataset.serviceName = service.serviceName;
    checkbox.dataset.basePrice = service.basePrice; // Keep for reference if needed
    checkbox.dataset.minPrice = service.homeownerVisibleMinPrice; // NEW
    checkbox.dataset.maxPrice = service.homeownerVisibleMaxPrice; // NEW
    checkbox.dataset.serviceType = service.type; // NEW
    checkbox.className = 'h-5 w-5 text-primary focus:ring-primary border-gray-300 rounded mt-0.5 flex-shrink-0';

    const serviceInfoDiv = document.createElement('div');
    serviceInfoDiv.className = 'ml-3 flex-grow';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'text-md font-medium text-neutral-text block';
    nameSpan.textContent = service.serviceName;

    const descriptionP = document.createElement('p');
    descriptionP.className = 'text-sm text-gray-600 mt-1';
    descriptionP.textContent = service.description || '';

    serviceInfoDiv.appendChild(nameSpan);
    serviceInfoDiv.appendChild(descriptionP);

    // Price Display Logic
    const priceSpan = document.createElement('span');
    priceSpan.className = 'text-md font-semibold text-primary block text-right flex-shrink-0 ml-auto pl-3'; // Added block, text-right, ml-auto, pl-3

    let priceText = "Price Varies";
    const minPrice = parseFloat(service.homeownerVisibleMinPrice);
    const maxPrice = parseFloat(service.homeownerVisibleMaxPrice);
    const basePrice = parseFloat(service.basePrice);

    if (!isNaN(minPrice) && !isNaN(maxPrice) && minPrice !== maxPrice) {
        priceText = `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`;
    } else if (!isNaN(minPrice) && !isNaN(maxPrice) && minPrice === maxPrice) { // If min and max are equal, show single price
        priceText = `$${minPrice.toFixed(2)}`;
    } else if (!isNaN(basePrice)) {
        priceText = `Approx. $${basePrice.toFixed(2)}`;
    }
    // If only one of min/max is defined, or neither, it remains "Price Varies"
    
    priceSpan.textContent = priceText;

    // Append checkbox, then info, then price for flex layout
    serviceElement.appendChild(checkbox);
    serviceElement.appendChild(serviceInfoDiv); // This now contains name and description
    serviceElement.appendChild(priceSpan); // Price span added here

    return serviceElement;
}

function handleServiceSelectionChange() {
    currentServiceRequest.baseServices = [];
    currentServiceRequest.addonServices = [];

    const selectedCheckboxes = document.querySelectorAll('input[name="base_service"]:checked, input[name="addon_service"]:checked');
    
    selectedCheckboxes.forEach(checkbox => {
        const serviceInfo = {
            id: checkbox.value,
            name: checkbox.dataset.serviceName,
            basePrice: parseFloat(checkbox.dataset.basePrice) || 0,
            minPrice: checkbox.dataset.minPrice ? parseFloat(checkbox.dataset.minPrice) : null,
            maxPrice: checkbox.dataset.maxPrice ? parseFloat(checkbox.dataset.maxPrice) : null,
            type: checkbox.dataset.serviceType
        };

        if (checkbox.name === 'base_service') {
            currentServiceRequest.baseServices.push(serviceInfo);
        } else {
            currentServiceRequest.addonServices.push(serviceInfo);
        }
    });

    console.log('Current selected base services:', currentServiceRequest.baseServices);
    console.log('Current selected addon services:', currentServiceRequest.addonServices);
    updateEstimatedTotal();
    validateFormAndToggleButton(); // Update submit button state based on selections
}

function updateEstimatedTotal() {
    let totalMinPrice = 0;
    let totalMaxPrice = 0;

    currentServiceRequest.baseServices.forEach(service => {
        const min = service.minPrice !== null ? service.minPrice : (service.basePrice || 0);
        const max = service.maxPrice !== null ? service.maxPrice : (service.basePrice || 0);
        totalMinPrice += min;
        totalMaxPrice += max;
    });

    currentServiceRequest.addonServices.forEach(service => {
        const min = service.minPrice !== null ? service.minPrice : (service.basePrice || 0);
        const max = service.maxPrice !== null ? service.maxPrice : (service.basePrice || 0);
        totalMinPrice += min;
        totalMaxPrice += max;
    });

    currentServiceRequest.estimatedTotal = { min: totalMinPrice, max: totalMaxPrice }; // Store as object

    if (totalMinPrice === 0 && totalMaxPrice === 0 && currentServiceRequest.baseServices.length === 0 && currentServiceRequest.addonServices.length === 0) {
        estimatedTotalAmountDisplay.textContent = '$0.00';
        estimatedTotalSection.classList.add('hidden');
    } else if (totalMinPrice === totalMaxPrice) {
        estimatedTotalAmountDisplay.textContent = `$${totalMinPrice.toFixed(2)}`;
        estimatedTotalSection.classList.remove('hidden');
    } else {
        estimatedTotalAmountDisplay.textContent = `$${totalMinPrice.toFixed(2)} - $${totalMaxPrice.toFixed(2)}`;
        estimatedTotalSection.classList.remove('hidden');
    }
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
    currentServiceRequest.frequency = requestFrequencySelect.value;
    currentServiceRequest.recurringEndDate = (requestFrequencySelect.value !== 'one-time' && recurringEndDateInput.value) ? recurringEndDateInput.value : null;
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
            p.innerHTML = `&bull; ${s.name} <span class="text-gray-600">($${s.basePrice.toFixed(2)})</span>`;
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
            p.innerHTML = `&bull; ${s.name} <span class="text-gray-600">($${s.basePrice.toFixed(2)})</span>`;
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

    // --- NEW: Display frequency in modal ---
    const frequencyText = requestFrequencySelect.options[requestFrequencySelect.selectedIndex].text;
    let frequencySummaryText = `Frequency: ${frequencyText}`;
    if (currentServiceRequest.frequency !== 'one-time' && currentServiceRequest.recurringEndDate) {
        const endDateObj = new Date(currentServiceRequest.recurringEndDate); // Assumes YYYY-MM-DD from flatpickr
        // Use formatDate if available and imported, otherwise simple toLocaleDateString
        const formattedEndDate = (typeof formatDate === 'function') 
            ? formatDate(endDateObj, 'short-date') 
            : endDateObj.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
        frequencySummaryText += ` (Repeats until: ${formattedEndDate})`;
    }
    // We need a place in the modal to put this. For now, let's add it after preferred time.
    // This assumes modalPreferredTimeSummary is a <p> or <span>. We'll insert after it.
    let freqSummaryElement = document.getElementById('modal-frequency-summary');
    if (!freqSummaryElement) {
        freqSummaryElement = document.createElement('p');
        freqSummaryElement.id = 'modal-frequency-summary';
        freqSummaryElement.className = 'text-sm';
        // Insert after modalPreferredTimeSummary, or adjust as needed based on modal structure
        if(modalPreferredTimeSummary && modalPreferredTimeSummary.parentNode) {
            modalPreferredTimeSummary.parentNode.insertBefore(freqSummaryElement, modalPreferredTimeSummary.nextSibling);
        } else { // fallback if structure is unexpected
            modalNotesSummary.parentNode.insertBefore(freqSummaryElement, modalNotesSummary);
        }
    }
    freqSummaryElement.innerHTML = `<strong class="text-neutral-text">Frequency:</strong> ${frequencyText}`;
    if (currentServiceRequest.frequency !== 'one-time' && currentServiceRequest.recurringEndDate) {
        const endDateObj = new Date(currentServiceRequest.recurringEndDate);
        const formattedEndDate = (typeof formatDate === 'function')
            ? formatDate(endDateObj, 'short-date')
            : endDateObj.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }); // Ensure UTC interpretation for YYYY-MM-DD
        freqSummaryElement.innerHTML += `<br><strong class="text-neutral-text">Repeats Until:</strong> ${formattedEndDate}`;
    } else if (currentServiceRequest.frequency !== 'one-time') {
        // Just show frequency if it's recurring but no end date
    }

    modalNotesSummary.textContent = currentServiceRequest.notes || 'No additional notes.';
    modalEstimatedTotalSummary.textContent = `$${currentServiceRequest.estimatedTotal.min.toFixed(2)} - $${currentServiceRequest.estimatedTotal.max.toFixed(2)}`;

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
        baseServices: currentServiceRequest.baseServices.map(s => ({
            id: s.id,
            name: s.name,
            price: s.basePrice,
            type: s.type,
            durationMinutes: 0 // Duration will be calculated based on selected services
        })),
        addonServices: currentServiceRequest.addonServices.map(s => ({
            id: s.id,
            name: s.name,
            price: s.basePrice,
            type: s.type,
            durationMinutes: 0 // Duration will be calculated based on selected services
        })),
        preferredDate: currentServiceRequest.preferredDate,
        preferredTimeWindow: currentServiceRequest.preferredTime, // Renamed from preferredTime in some earlier versions
        frequency: currentServiceRequest.frequency,
        recurringEndDate: currentServiceRequest.recurringEndDate, // Will be null if not set or one-time
        notes: currentServiceRequest.notes,
        estimatedTotalPrice: currentServiceRequest.estimatedTotal.max,
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
        baseServices: [], addonServices: [], preferredDate: null, preferredTime: '',
        frequency: 'one-time', recurringEndDate: null, notes: '', estimatedTotal: { min: 0, max: 0 }
    };
    document.querySelectorAll('input[name="base_service"], input[name="addon_service"]').forEach(cb => cb.checked = false);
    if (preferredDateInput._flatpickr) {
        preferredDateInput._flatpickr.clear();
    } else {
        preferredDateInput.value = '';
    }
    preferredTimeSelect.value = '';
    if(requestFrequencySelect) requestFrequencySelect.value = 'one-time';
    if(recurringEndDateInput._flatpickr) recurringEndDateInput._flatpickr.clear();
    if(recurringEndDateWrapper) recurringEndDateWrapper.classList.add('hidden');
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

    // --- NEW: Format Frequency for Display ---
    let frequencyDisplayHtml = '';
    if (request.frequency && request.frequency !== 'one-time') {
        let frequencyText = request.frequency.charAt(0).toUpperCase() + request.frequency.slice(1); // Capitalize, e.g., "Weekly"
        if (requestFrequencySelect) { // Try to get the display text from the select options for better localization/wording
            const freqOption = Array.from(requestFrequencySelect.options).find(opt => opt.value === request.frequency);
            if (freqOption) frequencyText = freqOption.text;
        }

        let recurringEndDateText = '';
        if (request.recurringEndDate) {
            try {
                const endDateObj = new Date(request.recurringEndDate); // Assumes YYYY-MM-DD
                const formattedEndDate = (typeof formatDate === 'function')
                    ? formatDate(endDateObj, 'short-date') 
                    : endDateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
                recurringEndDateText = ` until ${formattedEndDate}`;
            } catch (e) { console.warn("Error formatting recurring end date for display:", e); }
        }
        frequencyDisplayHtml = `<p class="text-sm text-gray-500">Frequency: ${frequencyText}${recurringEndDateText}</p>`;
    }
    // --- END NEW ---


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
                ${frequencyDisplayHtml}
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
async function handleViewRequestDetails(requestId, status) {
    showToast('Loading request details...', 'info', 1500); // Give immediate feedback
    try {
        const doc = await firebase.firestore()
            .collection('users').doc(linkedHousekeeperId)
            .collection('bookingRequests').doc(requestId).get();

        if (!doc.exists) {
            showToast('Request not found.', 'error');
            return;
        }
        const request = { id: doc.id, ...doc.data() };
        const freshStatus = request.status; // Use the status from the freshly fetched data

        if (freshStatus === 'housekeeper_proposed_alternative') {
            currentProposalRequest = request;
            
            // --- DEBUGGING: Log the received proposal object ---
            console.log('[Homeowner View] Received request.proposal:', JSON.parse(JSON.stringify(request.proposal || {}))); // Log entire proposal, or {} if no proposal
            // --- END DEBUGGING ---

            // Populate modal fields for proposal
            if (request.proposal && request.proposal.proposedDate) {
                let dateToFormat = request.proposal.proposedDate;
                console.log('[Homeowner View] dateToFormat (proposedDate raw):', JSON.parse(JSON.stringify(dateToFormat || null)));
                if (dateToFormat && typeof dateToFormat.toDate === 'function') {
                    dateToFormat = dateToFormat.toDate();
                    console.log('[Homeowner View] dateToFormat (after .toDate()):', dateToFormat);
                }
                try {
                    proposalDateDisplay.textContent = formatDateForDisplay(dateToFormat) || '[Not set]';
                } catch (e) {
                    console.warn("Error formatting proposedDate for display (housekeeper_proposed_alternative):", e, request.proposal.proposedDate);
                    proposalDateDisplay.textContent = request.proposal.proposedDate;
                }
            } else {
                proposalDateDisplay.textContent = '[Not set]';
            }

            const proposedTimeForLog = request.proposal ? request.proposal.proposedTime : null;
            console.log('[Homeowner View] proposedTime raw:', JSON.parse(JSON.stringify(proposedTimeForLog)));
            proposalTimeDisplay.textContent = request.proposal && request.proposal.proposedTime ? formatTime(request.proposal.proposedTime) : '[Not set]';
            proposalNoteDisplay.textContent = request.proposal && request.proposal.housekeeperNotes ? request.proposal.housekeeperNotes : 'No note provided.';
            
            if (request.proposal && request.proposal.proposedFrequency && request.proposal.proposedFrequency !== 'one-time') {
                let freqText = request.proposal.proposedFrequency.charAt(0).toUpperCase() + request.proposal.proposedFrequency.slice(1);
                if (freqText === 'Bi-weekly') freqText = 'Every 2 Weeks'; 
                proposalFrequencyDisplay.textContent = freqText;
                proposalFrequencyWrapper.classList.remove('hidden');

                if (request.proposal.proposedRecurringEndDate) {
                    try {
                        proposalRecurringEndDateDisplay.textContent = formatDateForDisplay(request.proposal.proposedRecurringEndDate) || '[Not set]';
                    } catch (e) {
                        console.warn("Error formatting proposedRecurringEndDate for display:", e, request.proposal.proposedRecurringEndDate);
                        proposalRecurringEndDateDisplay.textContent = request.proposal.proposedRecurringEndDate;
                    }
                    proposalRecurringEndDateWrapper.classList.remove('hidden');
                } else {
                    proposalRecurringEndDateDisplay.textContent = '[Not set]';
                    proposalRecurringEndDateWrapper.classList.add('hidden');
                }
            } else {
                proposalFrequencyDisplay.textContent = 'One-time';
                proposalFrequencyWrapper.classList.remove('hidden');
                proposalRecurringEndDateWrapper.classList.add('hidden');
            }
            openProposalModal();
        } else {
            // --- NEW: Handle other statuses by showing the generic details modal ---
            console.log(`[Homeowner View] Viewing details for request ${requestId} with fresh status: ${freshStatus} - Populating generic details modal.`);
            
            // Populate generic details modal
            detailsStatusDisplay.textContent = freshStatus.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            detailsDateDisplay.textContent = request.preferredDate ? formatDateForDisplay(request.preferredDate) : '[Not set]';
            
            let preferredTimeText = '[Any time]';
            if (request.preferredTimeWindow) {
                const timeOption = preferredTimeSelect.querySelector(`option[value="${request.preferredTimeWindow}"]`);
                if (timeOption) preferredTimeText = timeOption.textContent;
                else preferredTimeText = request.preferredTimeWindow; // Fallback to raw value if not in select
            }
            detailsTimeDisplay.textContent = preferredTimeText;

            if (request.frequency && request.frequency !== 'one-time') {
                let freqText = request.frequency.charAt(0).toUpperCase() + request.frequency.slice(1);
                const freqOption = requestFrequencySelect ? Array.from(requestFrequencySelect.options).find(opt => opt.value === request.frequency) : null;
                if (freqOption) freqText = freqOption.text;
                else if (freqText === 'Bi-weekly') freqText = 'Every 2 Weeks';
                detailsFrequencyDisplay.textContent = freqText;
                detailsFrequencyWrapper.classList.remove('hidden');

                if (request.recurringEndDate) {
                    detailsRecurringEndDateDisplay.textContent = formatDateForDisplay(request.recurringEndDate) || '[Not set]';
                    detailsRecurringEndDateWrapper.classList.remove('hidden');
                } else {
                    detailsRecurringEndDateDisplay.textContent = '[Not set]';
                    detailsRecurringEndDateWrapper.classList.add('hidden');
                }
            } else {
                detailsFrequencyDisplay.textContent = 'One-time';
                detailsFrequencyWrapper.classList.remove('hidden');
                detailsRecurringEndDateWrapper.classList.add('hidden');
            }

            detailsServicesList.innerHTML = ''; // Clear previous
            if (request.baseServices && request.baseServices.length > 0) {
                request.baseServices.forEach(s => {
                    const li = document.createElement('li');
                    li.textContent = `${s.name} ($${s.price.toFixed(2)})`;
                    detailsServicesList.appendChild(li);
                });
            }
            if (request.addonServices && request.addonServices.length > 0) {
                request.addonServices.forEach(s => {
                    const li = document.createElement('li');
                    li.textContent = `${s.name} ($${s.price.toFixed(2)}) (Add-on)`;
                    detailsServicesList.appendChild(li);
                });
            }
            if (detailsServicesList.innerHTML === '') {
                detailsServicesList.innerHTML = '<li>No services specified.</li>';
            }

            if (request.notes) {
                detailsNotesDisplay.textContent = request.notes;
                detailsNotesWrapper.classList.remove('hidden');
            } else {
                detailsNotesDisplay.textContent = 'No additional notes provided.';
                // Optionally hide wrapper if no notes, or show 'No notes'
                // detailsNotesWrapper.classList.add('hidden'); 
            }
            
            detailsPriceDisplay.textContent = request.estimatedTotalPrice ? `$${request.estimatedTotalPrice.toFixed(2)}` : '[N/A]';
            
            openRequestDetailsModal();
            // --- END NEW ---
        }
    } catch (error) {
        console.error('Error fetching or displaying request details:', error);
        showToast('Could not load request details. Please try again.', 'error');
    }
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

// Modal open/close helpers
function openProposalModal() {
    if (!proposalResponseModal || !proposalResponseDrawer) return; // Guard clause
    proposalResponseError.classList.add('hidden');
    declineNoteSection.classList.add('hidden');
    cancelDeclineBtn.classList.add('hidden');
    declineNoteInput.value = '';
    inDeclineMode = false;
    proposalResponseModal.classList.remove('hidden');
    setTimeout(() => {
        proposalResponseModal.classList.remove('opacity-0');
        proposalResponseDrawer.classList.remove('translate-y-full');
        proposalResponseDrawer.classList.add('sm:scale-100'); // ADDED for sm+ screen animation
    }, 10);
}
function closeProposalModal() {
    if (!proposalResponseModal || !proposalResponseDrawer) return; // Guard clause
    proposalResponseModal.classList.add('opacity-0');
    proposalResponseDrawer.classList.add('translate-y-full');
    proposalResponseDrawer.classList.remove('sm:scale-100'); // ADDED for sm+ screen animation
    setTimeout(() => {
        proposalResponseModal.classList.add('hidden');
    }, 300);
    currentProposalRequest = null;
    inDeclineMode = false;
}
if (closeProposalModalBtn) closeProposalModalBtn.addEventListener('click', closeProposalModal);
if (cancelDeclineBtn) cancelDeclineBtn.addEventListener('click', () => {
    declineNoteSection.classList.add('hidden');
    cancelDeclineBtn.classList.add('hidden');
    inDeclineMode = false;
});

// Accept/Decline handlers
if (acceptProposalBtn) acceptProposalBtn.addEventListener('click', async () => {
    if (!currentProposalRequest) return;
    acceptProposalBtn.disabled = true;
    const acceptSpinner = document.getElementById('accept-proposal-spinner');
    if(acceptSpinner) acceptSpinner.classList.remove('hidden');
    proposalResponseError.classList.add('hidden');
    
    try {
        // 1. Determine final booking details from the proposal or original request
        const proposedDateStr = currentProposalRequest.proposal.proposedDate;
        const proposedTimeStr = currentProposalRequest.proposal.proposedTime; // This is likely a time string like "HH:mm" or a window like "9am-12pm"

        if (!proposedDateStr || !proposedTimeStr) {
            throw new Error('Proposed date or time is missing in the current proposal.');
        }

        // Convert proposedDate (YYYY-MM-DD string or Timestamp) and proposedTime (HH:mm string) to a startTimestamp
        let startDateTime;
        let tempDate = proposedDateStr;
        if (tempDate && typeof tempDate.toDate === 'function') { // Firestore Timestamp
            tempDate = tempDate.toDate();
        } else if (typeof tempDate === 'string' && tempDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
            tempDate = new Date(tempDate + 'T00:00:00'); // Assume start of day in local timezone for date part
        } else {
            throw new Error('Invalid proposed date format.');
        }

        const timeParts = proposedTimeStr.match(/(\d+):(\d+)/); // Extract HH:mm
        if (timeParts && timeParts.length === 3) {
            tempDate.setHours(parseInt(timeParts[1], 10));
            tempDate.setMinutes(parseInt(timeParts[2], 10));
            tempDate.setSeconds(0);
            tempDate.setMilliseconds(0);
            startDateTime = tempDate;
        } else {
            // Fallback if proposedTimeStr is not HH:mm (e.g., a window like "9am-12pm")
            // For simplicity, we'll just use the start of the date and log a warning.
            // A more robust solution would parse the window or require HH:mm format from housekeeper proposal.
            console.warn(`Could not parse specific time from proposal: '${proposedTimeStr}'. Using start of proposed date.`);
            startDateTime = tempDate; // Already set to start of day if time parsing failed
            startDateTime.setHours(9); // Default to 9 AM if time is a window
        }

        const startTimestamp = firebase.firestore.Timestamp.fromDate(startDateTime);

        let totalDurationMinutes = 0;
        currentServiceRequest.baseServices.forEach(s => totalDurationMinutes += (s.durationMinutes || 0));
        currentServiceRequest.addonServices.forEach(s => totalDurationMinutes += (s.durationMinutes || 0));
        if (totalDurationMinutes === 0 && (currentServiceRequest.baseServices.length > 0 || currentServiceRequest.addonServices.length > 0)) {
            totalDurationMinutes = 120; // Default if services exist but durations are zero
        }

        const endTimestamp = firebase.firestore.Timestamp.fromMillis(startTimestamp.toMillis() + totalDurationMinutes * 60000);

        // Determine frequency and recurring end date
        const finalFrequency = currentProposalRequest.proposal.proposedFrequency || currentProposalRequest.frequency || 'one-time';
        const finalRecurringEndDate = finalFrequency !== 'one-time' ? (currentProposalRequest.proposal.proposedRecurringEndDate || currentProposalRequest.recurringEndDate || null) : null;
        
        const newBookingData = {
            housekeeperId: currentProposalRequest.housekeeperId,
            homeownerId: currentUser.uid, // The current homeowner
            homeownerName: `${currentUser.firstName || 'Homeowner'} ${currentUser.lastName || 'User'}`.trim(), // Construct name from currentUser if available
            clientName: `${currentUser.firstName || 'Homeowner'} ${currentUser.lastName || 'User'}`.trim(), // For consistency in booking records
            address: currentProposalRequest.propertyAddress || 'Not specified', // Assuming propertyAddress was part of original request, or fetch homeowner profile
            
            startTimestamp: startTimestamp,
            endTimestamp: endTimestamp,
            startTimestampMillis: startTimestamp.toMillis(),
            endTimestampMillis: endTimestamp.toMillis(),
            durationMinutes: totalDurationMinutes,
            
            baseServices: currentProposalRequest.baseServices.map(s => ({ id: s.id, name: s.name, price: s.price, durationMinutes: s.durationMinutes || 0 })),
            addonServices: currentProposalRequest.addonServices.map(s => ({ id: s.id, name: s.name, price: s.price, durationMinutes: s.durationMinutes || 0 })),
            estimatedTotal: currentProposalRequest.estimatedTotal, // Use original estimated total
            
            frequency: finalFrequency,
            recurringEndDate: finalRecurringEndDate,
            
            status: 'confirmed', // New bookings from accepted proposals are confirmed
            notes: currentProposalRequest.notes, // Original homeowner notes
            proposalNotes: currentProposalRequest.proposal.housekeeperNotes, // Housekeeper's proposal notes
            source: 'service_request_accepted_proposal',
            originalRequestId: currentProposalRequest.id,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            confirmedAt: firebase.firestore.FieldValue.serverTimestamp(),
        };

        // 2. Create new booking document
        const newBookingRef = await firebase.firestore()
            .collection('users').doc(currentProposalRequest.housekeeperId)
            .collection('bookings').add(newBookingData);

        // 3. Update original bookingRequest status
        await window.firestoreService.updateBookingRequestStatus(
            currentProposalRequest.housekeeperId,
            currentProposalRequest.id,
            'approved_and_scheduled',
            { scheduledBookingId: newBookingRef.id } // Add link to the new booking
        );

        showToast('Proposal accepted and booking confirmed!', 'success');
        closeProposalModal();
        loadMyRequests(); // Refresh the list
    } catch (error) {
        console.error("Error accepting proposal and creating booking:", error);
        proposalResponseError.textContent = error.message || 'Failed to accept proposal and create booking.';
        proposalResponseError.classList.remove('hidden');
    } finally {
        acceptProposalBtn.disabled = false;
        if(acceptSpinner) acceptSpinner.classList.add('hidden');
    }
});
if (declineProposalBtn) declineProposalBtn.addEventListener('click', async () => {
    if (!currentProposalRequest) return;
    if (!inDeclineMode) {
        declineNoteSection.classList.remove('hidden');
        cancelDeclineBtn.classList.remove('hidden');
        inDeclineMode = true;
        return;
    }
    // Confirm decline
    declineProposalBtn.disabled = true;
    proposalResponseError.classList.add('hidden');
    const declineNote = declineNoteInput.value.trim();
    try {
        await window.firestoreService.updateBookingRequestStatus(
            currentProposalRequest.housekeeperId,
            currentProposalRequest.id,
            'declined_by_homeowner',
            declineNote ? { declineNote } : {}
        );
        showToast('Proposal declined. Your housekeeper will be notified.', 'success');
        closeProposalModal();
        loadMyRequests();
    } catch (error) {
        proposalResponseError.textContent = error.message || 'Failed to decline proposal.';
        proposalResponseError.classList.remove('hidden');
    } finally {
        declineProposalBtn.disabled = false;
    }
});

// --- NEW: Modal open/close for Generic Request Details ---
function openRequestDetailsModal() {
    if (!requestDetailsModal || !requestDetailsDrawer) return;
    requestDetailsModal.classList.remove('hidden');
    setTimeout(() => {
        requestDetailsModal.classList.remove('opacity-0');
        requestDetailsDrawer.classList.remove('translate-y-full'); // For small screens, animates from bottom
        // For sm+ screens, relies on sm:scale-95 base class being overridden by sm:scale-100
        requestDetailsDrawer.classList.add('sm:scale-100');     
    }, 10);
}

function closeRequestDetailsModal() {
    if (!requestDetailsModal || !requestDetailsDrawer) return;
    requestDetailsModal.classList.add('opacity-0');
    requestDetailsDrawer.classList.add('translate-y-full');    // For small screens, animates to bottom
    // For sm+ screens, removing sm:scale-100 allows the base sm:scale-95 to take effect
    requestDetailsDrawer.classList.remove('sm:scale-100');  
    setTimeout(() => {
        requestDetailsModal.classList.add('hidden');
    }, 300);
}
// --- END NEW ---

// Add event listeners for the new modal's close buttons
if (closeRequestDetailsModalBtn) {
    closeRequestDetailsModalBtn.addEventListener('click', closeRequestDetailsModal);
}
if (okayRequestDetailsBtn) { // The "Okay" button also closes it
    okayRequestDetailsBtn.addEventListener('click', closeRequestDetailsModal);
}
// Add backdrop click listener for the new modal
if (requestDetailsModal) {
    requestDetailsModal.addEventListener('click', (event) => {
        if (event.target === requestDetailsModal) {
            closeRequestDetailsModal();
        }
    });
} 