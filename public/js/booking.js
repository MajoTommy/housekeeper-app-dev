// Booking states
const BOOKING_STEPS = {
    CLIENT_SELECTION: 'client_selection',
    NEW_CLIENT: 'new_client',
    FREQUENCY: 'frequency',
    CONFIRMATION: 'confirmation'
};

class BookingManager {
    constructor() {
        this.currentStep = BOOKING_STEPS.CLIENT_SELECTION;
        this.bookingData = {
            dateTime: null,
            clientId: null,
            clientName: null,
            frequency: null,
            duration: 120 // default 2 hours
        };
        
        // Elements
        this.mainContent = document.querySelector('.p-4');
        this.contextCard = null;
        
        // Bind all methods to this instance
        this.initialize = this.initialize.bind(this);
        this.createContextCard = this.createContextCard.bind(this);
        this.updateContextCard = this.updateContextCard.bind(this);
        this.showClientSelection = this.showClientSelection.bind(this);
        this.handleExistingClientClick = this.handleExistingClientClick.bind(this);
        this.handleNewClientClick = this.handleNewClientClick.bind(this);
        this.selectClient = this.selectClient.bind(this);
        this.showFrequencySelection = this.showFrequencySelection.bind(this);
        this.selectFrequency = this.selectFrequency.bind(this);
        this.showConfirmation = this.showConfirmation.bind(this);
        
        // Initialize after binding
        this.initialize();
    }
    
    initialize() {
        // Get date and time from URL parameters
        const params = new URLSearchParams(window.location.search);
        const date = params.get('date');
        const startTime = params.get('start');
        const endTime = params.get('end');
        
        console.log('URL Parameters:', { date, startTime, endTime });
        console.log('Current path:', window.location.pathname);
        
        if (date && startTime && endTime) {
            this.bookingData.dateTime = {
                date: date,
                startTime: decodeURIComponent(startTime),
                endTime: decodeURIComponent(endTime)
            };
            
            console.log('Booking data initialized:', this.bookingData);
            
            // Create context card
            this.createContextCard();
            
            // Show initial step
            this.showClientSelection();
        } else {
            console.error('Missing required parameters:', { date, startTime, endTime });
            // Use absolute path
            window.location.href = '/index.html';
        }
    }
    
    createContextCard() {
        const contextCard = document.createElement('div');
        contextCard.className = 'bg-primary text-white rounded-lg shadow-sm p-4 mb-6';
        this.contextCard = contextCard;
        this.updateContextCard();
        this.mainContent.insertBefore(contextCard, this.mainContent.firstChild);
    }
    
    updateContextCard() {
        if (!this.contextCard) return;
        
        const { date, startTime, endTime } = this.bookingData.dateTime;
        const displayDate = new Date(date).toLocaleDateString('en-US', { 
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
        
        let content = `
            <div class="flex items-center mb-2">
                <i class="fas fa-calendar-day mr-2"></i>
                <span class="font-medium">${displayDate}</span>
            </div>
            <div class="flex items-center">
                <i class="fas fa-clock mr-2"></i>
                <span class="font-medium">${startTime} - ${endTime}</span>
            </div>
        `;
        
        // Add client info if selected
        if (this.bookingData.clientName) {
            content += `
                <div class="flex items-center mt-2">
                    <i class="fas fa-user mr-2"></i>
                    <span class="font-medium">${this.bookingData.clientName}</span>
                </div>
            `;
        }
        
        // Add frequency if selected
        if (this.bookingData.frequency) {
            const frequency = DEFAULT_SETTINGS.frequencies.find(f => f.id === this.bookingData.frequency);
            if (frequency) {
                content += `
                    <div class="flex items-center mt-2">
                        <i class="fas fa-redo mr-2"></i>
                        <span class="font-medium">${frequency.label}</span>
                    </div>
                `;
            }
        }
        
        this.contextCard.innerHTML = content;
    }
    
    showClientSelection() {
        this.currentStep = BOOKING_STEPS.CLIENT_SELECTION;
        
        const content = `
            <div class="space-y-4">
                <h2 class="text-lg font-medium text-gray-900">Who is this cleaning for?</h2>
                
                <!-- Existing Customer Option -->
                <button class="block w-full" data-action="existing-client">
                    <div class="bg-white rounded-lg border border-gray-200 p-6 hover:border-primary hover:shadow-md transition-all">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-4">
                                <div class="bg-primary-light rounded-full p-3">
                                    <i class="fas fa-users text-primary text-xl"></i>
                                </div>
                                <div>
                                    <h3 class="text-lg font-medium text-gray-900">Existing Customer</h3>
                                    <p class="text-gray-600">Schedule for someone you've cleaned for before</p>
                                </div>
                            </div>
                            <i class="fas fa-chevron-right text-gray-400"></i>
                        </div>
                    </div>
                </button>
                
                <!-- New Customer Option -->
                <button class="block w-full" data-action="new-client">
                    <div class="bg-white rounded-lg border border-gray-200 p-6 hover:border-primary hover:shadow-md transition-all">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-4">
                                <div class="bg-primary-light rounded-full p-3">
                                    <i class="fas fa-user-plus text-primary text-xl"></i>
                                </div>
                                <div>
                                    <h3 class="text-lg font-medium text-gray-900">New Customer</h3>
                                    <p class="text-gray-600">Add a new customer to your list</p>
                                </div>
                            </div>
                            <i class="fas fa-chevron-right text-gray-400"></i>
                        </div>
                    </div>
                </button>
            </div>
        `;
        
        this.mainContent.innerHTML = this.contextCard.outerHTML + content;
        
        // Add event listeners
        this.mainContent.querySelector('[data-action="existing-client"]').addEventListener('click', this.handleExistingClientClick);
        this.mainContent.querySelector('[data-action="new-client"]').addEventListener('click', this.handleNewClientClick);
    }
    
    async handleExistingClientClick() {
        // Load recent clients from Firestore
        const user = firebase.auth().currentUser;
        if (!user) return;
        
        try {
            const clientsSnapshot = await firebase.firestore()
                .collection('clients')
                .where('userId', '==', user.uid)
                .orderBy('lastCleaning', 'desc')
                .limit(5)
                .get();
            
            let clientsHtml = '';
            clientsSnapshot.forEach(doc => {
                const client = doc.data();
                clientsHtml += `
                    <button data-client-id="${doc.id}" data-client-name="${client.name}"
                            class="block w-full p-4 hover:bg-gray-50">
                        <div class="flex justify-between items-center">
                            <div>
                                <h3 class="text-lg font-medium text-gray-900">${client.name}</h3>
                                <p class="text-sm text-gray-500">${client.address}</p>
                            </div>
                            <i class="fas fa-chevron-right text-gray-400"></i>
                        </div>
                    </button>
                `;
            });
            
            const content = `
                <div class="divide-y divide-gray-200 bg-white">
                    <h2 class="text-base font-medium text-gray-500 p-4">Recent Customers</h2>
                    ${clientsHtml}
                </div>
            `;
            
            this.mainContent.innerHTML = this.contextCard.outerHTML + content;
            
            // Add event listeners to client buttons
            this.mainContent.querySelectorAll('[data-client-id]').forEach(button => {
                button.addEventListener('click', (e) => {
                    const clientId = e.currentTarget.dataset.clientId;
                    const clientName = e.currentTarget.dataset.clientName;
                    this.selectClient(clientId, clientName);
                });
            });
            
        } catch (error) {
            console.error('Error loading clients:', error);
            // Show error message to user
        }
    }
    
    handleNewClientClick() {
        this.currentStep = BOOKING_STEPS.NEW_CLIENT;
        // We'll implement this next
        console.log('New client form coming next');
    }
    
    selectClient(clientId, clientName) {
        this.bookingData.clientId = clientId;
        this.bookingData.clientName = clientName;
        this.updateContextCard();
        this.showFrequencySelection();
    }
    
    showFrequencySelection() {
        this.currentStep = BOOKING_STEPS.FREQUENCY;
        
        const frequencyOptions = DEFAULT_SETTINGS.frequencies.map(freq => `
            <button data-frequency="${freq.id}" class="block w-full">
                <div class="bg-white rounded-lg border border-gray-200 p-6 hover:border-primary hover:shadow-md transition-all">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-4">
                            <div class="bg-primary-light rounded-full p-3">
                                <i class="fas fa-redo text-primary text-xl"></i>
                            </div>
                            <div>
                                <h3 class="text-lg font-medium text-gray-900">${freq.label}</h3>
                                <p class="text-gray-600">Every ${freq.days} days</p>
                            </div>
                        </div>
                        <i class="fas fa-chevron-right text-gray-400"></i>
                    </div>
                </div>
            </button>
        `).join('');
        
        const content = `
            <div class="space-y-4">
                <h2 class="text-lg font-medium text-gray-900">How often should we clean?</h2>
                ${frequencyOptions}
                
                <!-- One-time option -->
                <button data-frequency="one-time" class="block w-full">
                    <div class="bg-white rounded-lg border border-gray-200 p-6 hover:border-primary hover:shadow-md transition-all">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-4">
                                <div class="bg-primary-light rounded-full p-3">
                                    <i class="fas fa-calendar-day text-primary text-xl"></i>
                                </div>
                                <div>
                                    <h3 class="text-lg font-medium text-gray-900">One-time Cleaning</h3>
                                    <p class="text-gray-600">Just this once</p>
                                </div>
                            </div>
                            <i class="fas fa-chevron-right text-gray-400"></i>
                        </div>
                    </div>
                </button>
            </div>
        `;
        
        this.mainContent.innerHTML = this.contextCard.outerHTML + content;
        
        // Add event listeners to frequency buttons
        this.mainContent.querySelectorAll('[data-frequency]').forEach(button => {
            button.addEventListener('click', (e) => {
                const frequencyId = e.currentTarget.dataset.frequency;
                this.selectFrequency(frequencyId === 'one-time' ? null : frequencyId);
            });
        });
    }
    
    selectFrequency(frequencyId) {
        this.bookingData.frequency = frequencyId;
        this.updateContextCard();
        this.showConfirmation();
    }
    
    showConfirmation() {
        this.currentStep = BOOKING_STEPS.CONFIRMATION;
        // We'll implement this next
        console.log('Confirmation page coming next');
    }
}

// Initialize booking manager when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.bookingManager = new BookingManager();
}); 