// public/housekeeper/settings/account.js
document.addEventListener('DOMContentLoaded', () => {
  console.log('Account settings script loaded');

  // --- Firebase Services (Assuming global availability) ---
  const auth = firebase.auth();
  const functions = firebase.functions(); // Initialize Functions service
  const firestoreService = window.firestoreService;
  // TODO: Assuming cloudFunctions will be available globally or via a service
  // const cloudFunctions = window.cloudFunctions;

  // --- NEW: Stripe Initialization ---
  // !!! REPLACE with your actual Stripe PUBLISHABLE key !!!
  const STRIPE_PUBLISHABLE_KEY = "pk_test_51IwWFsA4dTeEbcXnp2lQGJMZPilbD4KE5FTV4mWOr2ZJQSTRNayfKZbXHKBlpHvcw9j3i0sulyHQabVGUdZMpiWo00Xb7A9wnT"; 
  let stripe = null;
  try {
    stripe = Stripe(STRIPE_PUBLISHABLE_KEY);
    if (!stripe) throw new Error('Stripe failed to initialize.');
    console.log('Stripe.js initialized successfully.');
  } catch (error) {
    console.error('Error initializing Stripe.js:', error);
    alert('Payment system could not be initialized. Please refresh.');
    // Disable payment-related buttons if Stripe fails? Handle appropriately.
  }
  // --- END NEW ---

  // --- UI Element References ---
  // const timezoneSelect = document.getElementById('timezone'); // REMOVED
  // const saveButton = document.getElementById('save-account-settings-button'); // REMOVED (only saved timezone)
  // const savingIndicator = document.getElementById('account-saving-indicator'); // REMOVED (tied to saveButton)

  // NEW: Stripe UI Elements
  const subscriptionLoading = document.getElementById('subscription-loading');
  const subscriptionDetails = document.getElementById('subscription-details');
  const subscriptionStatusEl = document.getElementById('subscription-status');
  const subscriptionPlanEl = document.getElementById('subscription-plan');
  const subscriptionPeriodEndEl = document.getElementById('subscription-period-end');
  const manageSubscriptionButton = document.getElementById('manage-subscription-button');
  const subscriptionInactive = document.getElementById('subscription-inactive');

  const payoutsLoading = document.getElementById('payouts-loading');
  const payoutsDetails = document.getElementById('payouts-details');
  const payoutAccountStatusEl = document.getElementById('payout-account-status');
  const managePayoutsButton = document.getElementById('manage-payouts-button');
  const payoutsError = document.getElementById('payouts-error');
  // NEW: Subscribe Button
  const subscribeButton = document.getElementById('subscribe-button');
  // END NEW

  // --- State Variables ---
  // REMOVED currentSettings as it only held timezone
  // NEW: Add state for profile data
  let currentProfile = null;
  // END NEW

  // --- Functions ---

  // REMOVED showSavingIndicator / hideSavingIndicator as they were tied to the removed save button
  /* 
  function showSavingIndicator() { ... }
  function hideSavingIndicator(success = true) { ... }
  */
  
  // REMOVED populateTimezoneOptions
  /*
  function populateTimezoneOptions() { ... }
  */

  // REMOVED applyAccountSettings as it only handled timezone
  /*
  function applyAccountSettings(settings) { ... }
  */

  // --- NEW: Stripe UI Update Functions ---
  function updateSubscriptionUI(profileData) {
      console.log("Updating Subscription UI with profile data:", profileData);
      if (!profileData) return;
      console.log("Updating Subscription UI with profile data:", profileData); // Add log (already added, ensuring it's here)

      if (subscriptionLoading) subscriptionLoading.classList.add('hidden');

      const status = profileData.stripeSubscriptionStatus;
      const priceId = profileData.stripePriceId; // Get the price ID
      const isActive = status === 'active' || status === 'trialing';

      if (isActive) {
          if (subscriptionStatusEl) subscriptionStatusEl.textContent = formatStripeStatus(status);
          if (subscriptionPlanEl) {
              // --- Display Plan Name from Firestore --- 
              const planName = profileData.stripePlanName; // <<< READ FROM PROFILE
              subscriptionPlanEl.textContent = planName || 'Processing...'; // Show name or placeholder
              // --- END --- 
          }
          if (subscriptionPeriodEndEl) {
              // Convert Firestore Timestamp to Date object if necessary
              const periodEndTimestamp = profileData.stripeCurrentPeriodEnd;
              let endDate = null;
              if (periodEndTimestamp && typeof periodEndTimestamp.toDate === 'function') {
                 endDate = periodEndTimestamp.toDate();
              }
              // Format the date or show placeholder
              subscriptionPeriodEndEl.textContent = endDate ? endDate.toLocaleDateString() : '--';
          }
          if (subscriptionDetails) subscriptionDetails.classList.remove('hidden');
          if (subscriptionInactive) subscriptionInactive.classList.add('hidden');
      } else {
          console.log("Subscription is not active, hiding details."); // Add log
          if (subscriptionDetails) subscriptionDetails.classList.add('hidden');
          if (subscriptionInactive) subscriptionInactive.classList.remove('hidden');
      }
  }

  function updatePayoutsUI(profileData) {
      if (!profileData) {
          if (payoutsLoading) payoutsLoading.classList.add('hidden');
          if (payoutsError) payoutsError.classList.remove('hidden');
          return;
      }

      if (payoutsLoading) payoutsLoading.classList.add('hidden');
      if (payoutsError) payoutsError.classList.add('hidden');

      const connectStatus = profileData.stripeAccountStatus;
      if (payoutAccountStatusEl) payoutAccountStatusEl.textContent = formatStripeStatus(connectStatus || 'Not Connected');
      
      // Adjust button text/action based on status
      if (managePayoutsButton) {
          if (connectStatus === 'enabled') {
              managePayoutsButton.innerHTML = '<i class="fas fa-external-link-alt mr-2"></i> Manage Payouts / View Balance';
          } else {
              managePayoutsButton.innerHTML = '<i class="fas fa-university mr-2"></i> Set Up Payouts';
          }
      }

      if (payoutsDetails) payoutsDetails.classList.remove('hidden');
  }

  function formatStripeStatus(status) {
    if (!status) return 'Unknown';
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()); // Capitalize words
  }
  // --- END NEW ---

  // REMOVED saveAccountSettings as it only handled timezone
  /*
  async function saveAccountSettings() { ... }
  */

  // --- NEW: Stripe Button Click Handlers ---
  async function handleManageSubscriptionClick() {
      console.log('Manage Subscription button clicked');
      // Show loading state (optional, good UX)
      manageSubscriptionButton.disabled = true;
      manageSubscriptionButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Loading...';

      try {
          // Get the callable function reference
          const createBillingPortalSession = functions.httpsCallable('createBillingPortalSession');
          // Call the function
          const result = await createBillingPortalSession();
          
          // Redirect to the Stripe portal URL
          if (result.data && result.data.url) {
              console.log('Redirecting to Stripe Billing Portal...');
              window.location.href = result.data.url;
          } else {
              throw new Error('Invalid response from Cloud Function');
          }
          // No need to re-enable button if redirecting
      } catch (error) {
          console.error('Error calling createBillingPortalSession function:', error);
          alert(`Error opening subscription manager: ${error.message}`);
           // Re-enable button on error
          manageSubscriptionButton.disabled = false;
          manageSubscriptionButton.innerHTML = '<i class="fas fa-credit-card mr-2"></i> Manage Subscription';
      }
  }

  async function handleManagePayoutsClick() {
      console.log('Manage Payouts button clicked');
      managePayoutsButton.disabled = true;

      const connectStatus = currentProfile?.stripeAccountStatus;
      let functionName = '';
      let buttonLoadingText = '';

      if (connectStatus === 'enabled') {
          functionName = 'createExpressDashboardLink';
          buttonLoadingText = '<i class="fas fa-spinner fa-spin mr-2"></i> Loading Dashboard...';
          managePayoutsButton.innerHTML = buttonLoadingText;
         console.log('Calling createExpressDashboardLink...');
      } else {
          functionName = 'createConnectOnboardingLink';
          buttonLoadingText = '<i class="fas fa-spinner fa-spin mr-2"></i> Starting Setup...';
          managePayoutsButton.innerHTML = buttonLoadingText;
           console.log('Calling createConnectOnboardingLink...');
      }

      try {
          const stripeConnectFunction = functions.httpsCallable(functionName);
          const result = await stripeConnectFunction();

          if (result.data && result.data.url) {
               console.log(`Redirecting to Stripe (${functionName === 'createExpressDashboardLink' ? 'Dashboard' : 'Onboarding'})...`);
               window.location.href = result.data.url;
          } else {
              throw new Error('Invalid response from Cloud Function');
          }
           // No need to re-enable button if redirecting

      } catch (error) {
          console.error(`Error calling ${functionName} function:`, error);
          alert(`Error setting up/managing payouts: ${error.message}`);
          // Re-enable button on error and restore correct text
          managePayoutsButton.disabled = false;
          if (connectStatus === 'enabled') {
              managePayoutsButton.innerHTML = '<i class="fas fa-external-link-alt mr-2"></i> Manage Payouts / View Balance';
          } else {
              managePayoutsButton.innerHTML = '<i class="fas fa-university mr-2"></i> Set Up Payouts';
          }
      }
  }

  // --- NEW: Subscribe Button Click Handler ---
  async function handleSubscribeClick() {
    console.log('Subscribe button clicked');
    if (!stripe) {
      alert('Payment system not initialized. Please refresh.');
      return;
    }
    
    // --- TODO: Define your Price ID --- 
    // You need to create a Product and Price in your Stripe Dashboard (Test mode)
    // Example: Monthly Subscription Price ID
    const priceId = "price_1Iwv3XA4dTeEbcXnFtHBICO8"; // !!! User replaced placeholder !!!
    
    // Show loading state
    subscribeButton.disabled = true;
    subscribeButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Processing...';

    try {
      // Get the callable function reference
      const createSubscriptionCheckoutSession = functions.httpsCallable('createSubscriptionCheckoutSession');
      
      // Call the function, passing the selected Price ID
      const result = await createSubscriptionCheckoutSession({ priceId: priceId });

      // Redirect to Stripe Checkout
      if (result.data && result.data.sessionId) {
        console.log('Redirecting to Stripe Checkout...');
        const { error } = await stripe.redirectToCheckout({
          sessionId: result.data.sessionId,
        });
        // If redirectToCheckout fails due to browser/network issues, display the error
        if (error) {
          console.error('Stripe redirectToCheckout error:', error);
          alert(`Could not redirect to checkout: ${error.message}`);
          // Re-enable button if redirect fails
          subscribeButton.disabled = false;
          subscribeButton.innerHTML = '<i class="fas fa-rocket mr-2"></i> Subscribe Now';
        }
      } else {
        throw new Error('Invalid response from Cloud Function (missing sessionId)');
      }
    } catch (error) {
      console.error('Error calling createSubscriptionCheckoutSession function:', error);
      alert(`Error starting subscription: ${error.message}`);
      // Re-enable button on error
      subscribeButton.disabled = false;
      subscribeButton.innerHTML = '<i class="fas fa-rocket mr-2"></i> Subscribe Now';
    }
  }
  // --- END NEW ---

  async function loadInitialData(user) {
      console.log('Loading initial data for user:', user.uid);
      showLoadingStates(); // Show loading indicators
      try {
          // Fetch settings and profile in parallel
          // REMOVED settingsData fetch - no longer needed on this page
          const profileData = await firestoreService.getHousekeeperProfile(user.uid); // Fetch profile for stripe info
          
          // --- Add try/catch around processing --- 
          try {
              // console.log('Initial settings data:', settingsData); // REMOVED
              // applyAccountSettings(settingsData); // REMOVED
              
              // Log only keys to avoid potential console issues with the object itself
              console.log('Initial profile data keys:', profileData ? Object.keys(profileData) : 'null or undefined'); 
              console.log('<<< CHECKPOINT AFTER LOGGING PROFILE DATA KEYS >>>'); // <<< Add simple checkpoint log
              
              console.log('Attempting to process profile data...'); 
              
              currentProfile = profileData; 
              updateSubscriptionUI(profileData); // Call UI update
              updatePayoutsUI(profileData); 
              
              console.log('Finished processing profile data.'); // Add log after processing

              // --- Check for Stripe Success Redirect --- 
              const urlParams = new URLSearchParams(window.location.search);
              if (urlParams.has('subscription_success')) {
                  console.log('Detected successful subscription redirect.');
                  alert('Subscription successful!'); 
                  const newUrl = window.location.pathname + window.location.hash; 
                  history.replaceState(null, '', newUrl);
                  console.log('Removed subscription_success parameter from URL.');
              }
              // --- END CHECK --- 
          } catch (processingError) {
              console.error('Error occurred *during* processing of initial data:', processingError);
              alert('An error occurred displaying account data: ' + processingError.message);
          }
          // --- End try/catch ---

      } catch (fetchError) {
          // This outer catch handles errors from the Promise.all fetch itself
          console.error('Error loading initial account data (fetch stage):', fetchError);
          alert('Error loading account data: ' + fetchError.message);
          // Hide loading indicators even on error
          if (subscriptionLoading) subscriptionLoading.classList.add('hidden');
          if (payoutsLoading) payoutsLoading.classList.add('hidden');
      }
  }

  function showLoadingStates() {
    if (subscriptionLoading) subscriptionLoading.classList.remove('hidden');
    if (subscriptionDetails) subscriptionDetails.classList.add('hidden');
    if (subscriptionInactive) subscriptionInactive.classList.add('hidden');
    
    if (payoutsLoading) payoutsLoading.classList.remove('hidden');
    if (payoutsDetails) payoutsDetails.classList.add('hidden');
    if (payoutsError) payoutsError.classList.add('hidden');
  }

  // --- Initialization ---
  // populateTimezoneOptions(); // REMOVED
  // Initial data load is now triggered by onAuthStateChanged

  // --- Event Listeners ---
  // REMOVED listener for saveButton
  /*
  if (saveButton) {
    saveButton.addEventListener('click', saveAccountSettings);
  }
  */
  // NEW: Add listeners for Stripe buttons
  if (manageSubscriptionButton) {
    manageSubscriptionButton.addEventListener('click', handleManageSubscriptionClick);
  }
  if (managePayoutsButton) {
    managePayoutsButton.addEventListener('click', handleManagePayoutsClick);
  }
  if (subscribeButton) {
      subscribeButton.addEventListener('click', handleSubscribeClick);
  }

  auth.onAuthStateChanged(async (user) => {
    if (user) {
      console.log('User logged in on account settings page.');
      try {
          // Load profile data ONLY
          await loadInitialData(user);
      } catch (error) {
          console.error('Failed to load initial account data:', error);
          // applyAccountSettings({}); // REMOVED
          // NEW: Handle Stripe UI loading errors
          if (subscriptionLoading) subscriptionLoading.classList.add('hidden');
          if (subscriptionInactive) subscriptionInactive.classList.remove('hidden'); // Show inactive by default on error
          if (payoutsLoading) payoutsLoading.classList.add('hidden');
          if (payoutsError) payoutsError.classList.remove('hidden');
          // END NEW
          alert('Could not load your account settings and profile.');
      }
      // REMOVED listener for saveButton
      /*
      if (saveButton) {
          saveButton.addEventListener('click', saveAccountSettings);
      } else {
           console.error('Save button (#save-account-settings-button) not found!');
      }
      */
      
      // NEW: Add listeners for Stripe buttons
      if (manageSubscriptionButton) {
          manageSubscriptionButton.addEventListener('click', handleManageSubscriptionClick);
      } else {
          console.error('Manage Subscription button not found!');
      }
       if (managePayoutsButton) {
          managePayoutsButton.addEventListener('click', handleManagePayoutsClick);
      } else {
          console.error('Manage Payouts button not found!');
      }
      // NEW: Add listener for Subscribe button
      if (subscribeButton) {
        subscribeButton.addEventListener('click', handleSubscribeClick);
      } else {
          console.error('Subscribe button not found!');
      }
      // END NEW

    } else {
      // Handle logged out state
      console.log('User logged out on account settings page.');
      // applyAccountSettings({}); // REMOVED
       // if (saveButton) saveButton.disabled = true; // REMOVED
       // NEW: Reset Stripe UI on logout
       if (subscriptionLoading) subscriptionLoading.classList.remove('hidden');
       if (subscriptionDetails) subscriptionDetails.classList.add('hidden');
       if (subscriptionInactive) subscriptionInactive.classList.remove('hidden');
       if (payoutsLoading) payoutsLoading.classList.remove('hidden');
       if (payoutsDetails) payoutsDetails.classList.add('hidden');
       if (payoutsError) payoutsError.classList.add('hidden');
       // END NEW
    }
  });

}); 