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
  const timezoneSelect = document.getElementById('timezone');
  const saveButton = document.getElementById('save-account-settings-button');
  const savingIndicator = document.getElementById('account-saving-indicator');

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
  let currentSettings = {
      timezone: null,
  };
  // NEW: Add state for profile data
  let currentProfile = null;
  // END NEW

  // --- Functions ---

  function showSavingIndicator() {
      console.log('Showing account saving indicator');
      if (!savingIndicator) return;
      savingIndicator.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i> Saving...';
      if (saveButton) saveButton.disabled = true;
  }

  function hideSavingIndicator(success = true) {
      if (!savingIndicator) return;
      if (success) {
          savingIndicator.innerHTML = '<i class="fas fa-check mr-2 text-green-500"></i> Saved!';
      } else {
          savingIndicator.innerHTML = '<i class="fas fa-times mr-2 text-red-500"></i> Error!';
      }
      setTimeout(() => { 
          if (savingIndicator) savingIndicator.innerHTML = ''; 
      }, 2500);
      if (saveButton) saveButton.disabled = false;
  }
  
  function populateTimezoneOptions() {
      if (!timezoneSelect) return;
      // Use a predefined list of North American timezones
      const northAmericanTimezones = [
          "America/New_York", "America/Chicago", "America/Denver", "America/Phoenix",
          "America/Los_Angeles", "America/Vancouver", "America/Edmonton", "America/Winnipeg",
          "America/Toronto", "America/Halifax", "America/St_Johns", "America/Anchorage",
          "Pacific/Honolulu"
      ];
      timezoneSelect.innerHTML = '<option value="">Select Time Zone</option>'; 
      northAmericanTimezones.forEach(tz => {
          const option = document.createElement('option');
          option.value = tz;
          const displayName = tz.split('/').pop().replace(/_/g, ' '); 
          const region = tz.split('/')[0];
          option.textContent = `${displayName} (${region === 'Pacific' || region === 'Atlantic' ? region : 'America'})`; 
          timezoneSelect.appendChild(option);
      });
  }

  function applyAccountSettings(settings) {
    if (!settings) return;
    console.log('Applying account settings:', settings);
    currentSettings.timezone = settings.timezone;

    if (timezoneSelect) {
        timezoneSelect.value = currentSettings.timezone || '';
    }
  }

  // --- NEW: Stripe UI Update Functions ---
  function updateSubscriptionUI(profileData) {
      if (!profileData) return;

      if (subscriptionLoading) subscriptionLoading.classList.add('hidden');

      const status = profileData.stripeSubscriptionStatus;
      const isActive = status === 'active' || status === 'trialing';

      if (isActive) {
          if (subscriptionStatusEl) subscriptionStatusEl.textContent = formatStripeStatus(status);
          if (subscriptionPlanEl) {
              // TODO: Map stripePriceId to a user-friendly plan name
              subscriptionPlanEl.textContent = profileData.stripePriceId || 'Unknown Plan';
          }
          if (subscriptionPeriodEndEl) {
              const endDate = profileData.stripeCurrentPeriodEnd?.toDate();
              subscriptionPeriodEndEl.textContent = endDate ? endDate.toLocaleDateString() : '--';
          }
          if (subscriptionDetails) subscriptionDetails.classList.remove('hidden');
          if (subscriptionInactive) subscriptionInactive.classList.add('hidden');
      } else {
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

  async function saveAccountSettings() {
    showSavingIndicator();
    const user = auth.currentUser;
    if (!user) {
        console.error('User not authenticated.');
        hideSavingIndicator(false);
        alert('Error: You are not logged in.');
        return;
    }

    const newTimezone = timezoneSelect ? timezoneSelect.value : currentSettings.timezone;

    const settingsToSave = {
        timezone: newTimezone,
    };

    console.log('Saving account settings:', settingsToSave);

    try {
        // Note: firestoreService.updateUserSettings might need updating if 
        // these settings are moved to the 'settings' subcollection
        await firestoreService.updateUserSettings(user.uid, settingsToSave); 
        console.log('Account settings saved successfully.');
        // Update local state after successful save
        currentSettings.timezone = newTimezone;
        hideSavingIndicator(true);
    } catch (error) {
        console.error('Error saving account settings:', error);
        hideSavingIndicator(false);
        alert('Error saving account settings: ' + error.message);
    }
  }

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
          const [settingsData, profileData] = await Promise.all([
              firestoreService.getUserSettings(user.uid), // Assuming settings are directly under user doc
              firestoreService.getHousekeeperProfile(user.uid) // Fetch profile for stripe info
          ]);
          
          console.log('Initial settings data:', settingsData);
          applyAccountSettings(settingsData);
          
          console.log('Initial profile data:', profileData);
          currentProfile = profileData; // Store profile data
          updateSubscriptionUI(profileData);
          updatePayoutsUI(profileData);

          // --- ADDED: Check for Stripe Success Redirect --- 
          const urlParams = new URLSearchParams(window.location.search);
          if (urlParams.has('subscription_success')) {
              console.log('Detected successful subscription redirect.');
              
              // 1. Immediately update UI to show active state (even if data might be stale)
              if (subscriptionDetails) subscriptionDetails.classList.remove('hidden');
              if (subscriptionInactive) subscriptionInactive.classList.add('hidden');
              if (subscriptionStatusEl) subscriptionStatusEl.textContent = 'Active'; // Show generic active status
              // Optionally clear plan/date until next proper load?
              // if (subscriptionPlanEl) subscriptionPlanEl.textContent = 'Processing...';
              // if (subscriptionPeriodEndEl) subscriptionPeriodEndEl.textContent = '...';
              
              // 2. Show a success message (e.g., using an alert or a dedicated UI element)
              alert('Subscription successful!'); // Simple alert for now
              
              // 3. Remove the parameter from URL to prevent re-triggering
              const newUrl = window.location.pathname + window.location.hash; // Keep path and hash, remove query
              history.replaceState(null, '', newUrl);
              console.log('Removed subscription_success parameter from URL.');
          }
           // --- END ADDED --- 

      } catch (error) {
          console.error('Error loading initial account data:', error);
          alert('Error loading account data: ' + error.message);
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
  populateTimezoneOptions();
  // Initial data load is now triggered by onAuthStateChanged

  // --- Event Listeners ---
  if (saveButton) {
    saveButton.addEventListener('click', saveAccountSettings);
  }
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
          // Load BOTH settings and profile data
          await loadInitialData(user);
      } catch (error) {
          console.error('Failed to load initial account data:', error);
          applyAccountSettings({}); // Apply defaults on error
          // NEW: Handle Stripe UI loading errors
          if (subscriptionLoading) subscriptionLoading.classList.add('hidden');
          if (subscriptionInactive) subscriptionInactive.classList.remove('hidden'); // Show inactive by default on error
          if (payoutsLoading) payoutsLoading.classList.add('hidden');
          if (payoutsError) payoutsError.classList.remove('hidden');
          // END NEW
          alert('Could not load your account settings and profile.');
      }
      // Add listener to the save button
      if (saveButton) {
          saveButton.addEventListener('click', saveAccountSettings);
      } else {
           console.error('Save button (#save-account-settings-button) not found!');
      }
      
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
      applyAccountSettings({}); // Reset UI to defaults
       if (saveButton) saveButton.disabled = true;
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