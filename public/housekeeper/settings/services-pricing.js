// Import necessary functions from shared modules
// REMOVED: Incorrect imports as auth.js exports nothing and getAuthenticatedUser is not the pattern.
// import { getAuthenticatedUser, redirectToLogin } from '../../common/js/auth.js';
// REMOVED: Incorrect import from firestore-service.js as it doesn't export these generic functions
// import { getFirestoreCollection, addFirestoreDocument, updateFirestoreDocument, deleteFirestoreDocument } from '../../common/js/firestore-service.js';

// --- DOM Elements ---
const baseServicesList = document.getElementById('base-services-list');
const addonServicesList = document.getElementById('addon-services-list');
const baseServicesError = document.getElementById('base-services-error');
const addonServicesError = document.getElementById('addon-services-error');
const addBaseServiceBtn = document.getElementById('add-base-service-btn');
const addAddonServiceBtn = document.getElementById('add-addon-service-btn');

// Modal Elements
const serviceModal = document.getElementById('service-modal');
const modalBackdrop = document.getElementById('modal-backdrop');
const closeModalBtn = document.getElementById('close-modal-btn');
const cancelModalBtn = document.getElementById('cancel-modal-btn');
const saveServiceBtn = document.getElementById('save-service-btn');
const serviceForm = document.getElementById('service-form');
const modalTitle = document.getElementById('modal-title');
const modalError = document.getElementById('modal-error');
const modalSavingIndicator = document.getElementById('modal-saving-indicator');

// --- NEW: Delete Confirmation Modal Elements ---
const deleteConfirmModal = document.getElementById('delete-confirm-modal');
const deleteConfirmBackdrop = document.getElementById('delete-confirm-backdrop');
const deleteConfirmMessage = document.getElementById('delete-confirm-message');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const cancelDeleteBtnX = document.getElementById('cancel-delete-btn-x'); // Close X button
const serviceIdToDeleteInput = document.getElementById('service-id-to-delete');
const deleteConfirmError = document.getElementById('delete-confirm-error');
const deleteConfirmIndicator = document.getElementById('delete-confirm-indicator');
// --- END: Delete Confirmation Modal Elements ---

// Form Fields
const editServiceIdInput = document.getElementById('edit-service-id');
const serviceNameInput = document.getElementById('service-name');
const serviceTypeBaseRadio = document.getElementById('service-type-base');
const serviceTypeAddonRadio = document.getElementById('service-type-addon');
const servicePriceInput = document.getElementById('service-price');
const serviceDescriptionInput = document.getElementById('service-description');
const serviceActiveCheckbox = document.getElementById('service-active');

// --- NEW: Modal Delete Button --- 
const deleteServiceBtn = document.getElementById('delete-service-btn');

// --- State ---
let currentUser = null;

// --- Modal Management ---
const openModal = (serviceType = 'base', serviceToEdit = null) => {
    modalError.textContent = '';
    modalError.classList.add('hidden');
    serviceForm.reset(); // Clear previous form data
    editServiceIdInput.value = ''; // Clear edit ID
    modalSavingIndicator.textContent = '';
    saveServiceBtn.disabled = false;

    // Show/Hide Delete button based on whether we are editing
    if (serviceToEdit) {
        deleteServiceBtn.classList.remove('hidden'); // Show delete button
        // Populate form fields
        modalTitle.textContent = 'Edit Service';
        editServiceIdInput.value = serviceToEdit.id;
        serviceNameInput.value = serviceToEdit.serviceName || '';
        servicePriceInput.value = serviceToEdit.basePrice || '';
        serviceDescriptionInput.value = serviceToEdit.description || '';
        serviceActiveCheckbox.checked = serviceToEdit.isActive !== false; // Default to true if undefined
        if (serviceToEdit.type === 'addon') {
            serviceTypeAddonRadio.checked = true;
        } else {
            serviceTypeBaseRadio.checked = true;
        }
    } else {
        deleteServiceBtn.classList.add('hidden'); // Hide delete button
        // Set title for adding new
        modalTitle.textContent = serviceType === 'base' ? 'Add Base Service' : 'Add Add-on Service';
        if (serviceType === 'addon') {
            serviceTypeAddonRadio.checked = true;
        } else {
            serviceTypeBaseRadio.checked = true;
        }
        serviceActiveCheckbox.checked = true; // Default new services to active
    }

    modalBackdrop.classList.remove('hidden');
    serviceModal.classList.remove('translate-y-full');
};

const closeModal = () => {
    modalBackdrop.classList.add('hidden');
    serviceModal.classList.add('translate-y-full');
    serviceForm.reset();
    modalError.textContent = '';
    modalError.classList.add('hidden');
    modalSavingIndicator.textContent = '';
    saveServiceBtn.disabled = false;
};

// --- NEW: Delete Confirmation Modal Management ---
const openDeleteConfirmModal = (serviceId, serviceName) => {
    if (!serviceId) {
        console.error("Cannot open delete confirmation: Service ID is missing.");
        return;
    }
    serviceIdToDeleteInput.value = serviceId; // Store the ID
    deleteConfirmMessage.textContent = `Are you sure you want to delete the service "${serviceName}"? This action cannot be undone.`;
    deleteConfirmError.classList.add('hidden');
    deleteConfirmIndicator.textContent = '';
    confirmDeleteBtn.disabled = false;

    deleteConfirmBackdrop.classList.remove('hidden');
    deleteConfirmModal.classList.remove('hidden');
};

const closeDeleteConfirmModal = () => {
    deleteConfirmBackdrop.classList.add('hidden');
    deleteConfirmModal.classList.add('hidden');
    serviceIdToDeleteInput.value = ''; // Clear stored ID
    deleteConfirmError.classList.add('hidden');
    deleteConfirmIndicator.textContent = '';
    confirmDeleteBtn.disabled = false;
};
// --- END: Delete Confirmation Modal Management ---

// --- Firestore Operations & UI Updates ---

const displayService = (service) => {
    const serviceItem = document.createElement('div');
    serviceItem.className = 'border p-3 rounded-md flex justify-between items-center bg-gray-50';
    serviceItem.dataset.serviceId = service.id;

    const nameAndPrice = document.createElement('div');
    nameAndPrice.className = 'flex-grow mr-2';

    const nameEl = document.createElement('span');
    nameEl.className = 'font-medium text-gray-800';
    nameEl.textContent = service.serviceName;
    nameAndPrice.appendChild(nameEl);

    const priceEl = document.createElement('span');
    priceEl.className = 'ml-2 text-sm text-gray-600';
    priceEl.textContent = `($${parseFloat(service.basePrice).toFixed(2)})`;
    nameAndPrice.appendChild(priceEl);

    if (!service.isActive) {
        const inactiveBadge = document.createElement('span');
        inactiveBadge.className = 'ml-2 text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded';
        inactiveBadge.textContent = 'Inactive';
        nameAndPrice.appendChild(inactiveBadge);
    }

    if (service.description) {
        const descriptionEl = document.createElement('p');
        descriptionEl.className = 'text-xs text-gray-500 mt-1';
        descriptionEl.textContent = service.description;
        nameAndPrice.appendChild(descriptionEl);
    }

    serviceItem.appendChild(nameAndPrice);

    const actionsWrapper = document.createElement('div');
    actionsWrapper.className = 'flex-shrink-0 space-x-2';

    const editButton = document.createElement('button');
    editButton.className = 'text-primary hover:text-primary-dark text-sm';
    editButton.innerHTML = '<i class="fas fa-pencil-alt"></i>';
    editButton.title = 'Edit Service';
    editButton.addEventListener('click', () => {
        openModal(service.type, service); // Pass the full service object for editing
    });
    actionsWrapper.appendChild(editButton);

    serviceItem.appendChild(actionsWrapper);

    if (service.type === 'base') {
        baseServicesList.appendChild(serviceItem);
    } else if (service.type === 'addon') {
        addonServicesList.appendChild(serviceItem);
    }
};

const loadServices = async () => {
    if (!currentUser) return;

    baseServicesList.innerHTML = '<p class="text-gray-500 text-sm">Loading base services...</p>';
    addonServicesList.innerHTML = '<p class="text-gray-500 text-sm">Loading add-on services...</p>';
    baseServicesError.classList.add('hidden');
    addonServicesError.classList.add('hidden');

    try {
        const servicesPath = `users/${currentUser.uid}/services`;
        const servicesCollection = firebase.firestore().collection(servicesPath);
        const snapshot = await servicesCollection.orderBy('serviceName', 'asc').get(); // Use core SDK

        // Clear loading messages
        baseServicesList.innerHTML = '';
        addonServicesList.innerHTML = '';

        const services = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (services.length === 0) {
            baseServicesList.innerHTML = '<p class="text-gray-500 text-sm">No base services defined yet.</p>';
            addonServicesList.innerHTML = '<p class="text-gray-500 text-sm">No add-on services defined yet.</p>';
        }

        let hasBase = false;
        let hasAddon = false;

        services.forEach(service => {
            displayService(service);
            if (service.type === 'base') hasBase = true;
            if (service.type === 'addon') hasAddon = true;
        });

        // Show 'no services' message if lists are still empty after filtering
        if (!hasBase && services.length > 0) {
             baseServicesList.innerHTML = '<p class="text-gray-500 text-sm">No base services defined yet.</p>';
        }
         if (!hasAddon && services.length > 0) {
             addonServicesList.innerHTML = '<p class="text-gray-500 text-sm">No add-on services defined yet.</p>';
        }


    } catch (error) {
        console.error('Error loading services:', error);
        baseServicesList.innerHTML = ''; // Clear loading message on error
        addonServicesList.innerHTML = '';
        baseServicesError.textContent = 'Failed to load base services. Please try again.';
        addonServicesError.textContent = 'Failed to load add-on services. Please try again.';
        baseServicesError.classList.remove('hidden');
        addonServicesError.classList.remove('hidden');
    }
};

const handleSaveService = async (event) => {
    event.preventDefault(); // Prevent default form submission
    if (!currentUser) {
        modalError.textContent = 'User not authenticated.';
        modalError.classList.remove('hidden');
        return;
    }

    modalSavingIndicator.textContent = 'Saving...';
    saveServiceBtn.disabled = true;
    modalError.classList.add('hidden');

    const serviceData = {
        serviceName: serviceNameInput.value.trim(),
        type: serviceTypeAddonRadio.checked ? 'addon' : 'base',
        basePrice: parseFloat(servicePriceInput.value) || 0,
        description: serviceDescriptionInput.value.trim(),
        isActive: serviceActiveCheckbox.checked,
        // Store owner ID for potential future rules/queries although path already contains it
        ownerId: currentUser.uid,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp() // Add update timestamp
    };

    const serviceIdToEdit = editServiceIdInput.value;
    const servicesCollection = firebase.firestore().collection(`users/${currentUser.uid}/services`);

    try {
        if (serviceIdToEdit) {
            // Update existing service
            const serviceRef = servicesCollection.doc(serviceIdToEdit);
            await serviceRef.update(serviceData); // Use core SDK update
            console.log('Service updated successfully:', serviceIdToEdit);
        } else {
            // Add new service
            // Add creation timestamp for new documents
            serviceData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            const addedDocRef = await servicesCollection.add(serviceData); // Use core SDK add
            console.log('Service added successfully:', addedDocRef.id);
        }
        
        closeModal();
        await loadServices(); // Reload the list to show changes

    } catch (error) {
        console.error('Error saving service:', error);
        modalError.textContent = `Failed to save service: ${error.message || 'Please try again.'}`;
        modalError.classList.remove('hidden');
    } finally {
        modalSavingIndicator.textContent = '';
        saveServiceBtn.disabled = false;
    }
};

// --- Refactored Delete Logic ---
const executeDelete = async () => {
    const serviceId = serviceIdToDeleteInput.value;
    if (!currentUser || !serviceId) {
        console.error('Execute Delete Error: Missing user or service ID.');
        deleteConfirmError.textContent = 'Could not delete service. User or service ID missing.';
        deleteConfirmError.classList.remove('hidden');
        return;
    }

    console.log(`Executing delete for service: ${serviceId}`);
    deleteConfirmIndicator.textContent = 'Deleting...';
    confirmDeleteBtn.disabled = true;
    deleteConfirmError.classList.add('hidden');

    try {
        const serviceRef = firebase.firestore().collection(`users/${currentUser.uid}/services`).doc(serviceId);
        await serviceRef.delete();
        console.log('Service deleted successfully from executeDelete:', serviceId);

        closeDeleteConfirmModal(); // Close confirmation modal
        closeModal(); // Also close the edit modal if it was open
        await loadServices(); // Reload the list

    } catch (error) {
        console.error('Error executing delete:', error);
        deleteConfirmError.textContent = `Failed to delete: ${error.message || 'Please try again.'}`;
        deleteConfirmError.classList.remove('hidden');
        deleteConfirmIndicator.textContent = '';
        confirmDeleteBtn.disabled = false;
    }
};

// This function now just handles the confirmation prompt
const handleDeleteService = async (serviceId, serviceName) => {
    // REMOVED: window.confirm logic
    // REMOVED: Firestore deletion logic (moved to executeDelete)
    // Instead, open the custom confirmation modal
    openDeleteConfirmModal(serviceId, serviceName);
};
// --- End Delete Logic ---

// --- Initialization ---
const initializePage = async () => {
    // Use onAuthStateChanged to wait for auth state
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            // User is signed in.
            currentUser = user; // Set the global currentUser variable
            console.log('User authenticated:', currentUser.uid);

            try {
                // Now that we have the user, load their services
                await loadServices();

                // Add Event Listeners only after user is confirmed and services might be loaded
                addBaseServiceBtn.addEventListener('click', () => openModal('base'));
                addAddonServiceBtn.addEventListener('click', () => openModal('addon'));
                closeModalBtn.addEventListener('click', closeModal);
                cancelModalBtn.addEventListener('click', closeModal);
                modalBackdrop.addEventListener('click', closeModal);
                serviceForm.addEventListener('submit', handleSaveService);

                // MODIFIED: Event Listener for Edit Modal Delete Button -> Opens Confirm Modal
                deleteServiceBtn.addEventListener('click', () => {
                    const serviceId = editServiceIdInput.value;
                    const serviceName = serviceNameInput.value;
                    if (serviceId) {
                        // Call function that OPENS the confirm modal
                        openDeleteConfirmModal(serviceId, serviceName);
                    } else {
                        console.error('Delete button clicked but no service ID found.');
                        // Display error in the *edit* modal
                        modalError.textContent = 'Could not initiate delete. Service ID not found.';
                        modalError.classList.remove('hidden');
                    }
                });

                // --- ADD: Event Listeners for Delete Confirmation Modal ---
                confirmDeleteBtn.addEventListener('click', executeDelete);
                cancelDeleteBtn.addEventListener('click', closeDeleteConfirmModal);
                cancelDeleteBtnX.addEventListener('click', closeDeleteConfirmModal); // X button
                deleteConfirmBackdrop.addEventListener('click', closeDeleteConfirmModal);
                // --- END ADD ---
                
                console.log('Services loaded and event listeners attached.');

            } catch (error) {
                console.error('Error during authenticated initialization:', error);
                baseServicesError.textContent = 'Failed to load services after authentication. Please refresh.';
                baseServicesError.classList.remove('hidden');
                addonServicesError.textContent = 'Failed to load services after authentication. Please refresh.';
                addonServicesError.classList.remove('hidden');
            }
        } else {
            // User is signed out.
            console.log('User not authenticated, redirecting to login.');
            currentUser = null;
            // Redirect to login page (root)
            window.location.href = '/'; 
        }
    });
};

// --- Run Initialization --- 
// Call initializePage, which now sets up the listener
initializePage(); 