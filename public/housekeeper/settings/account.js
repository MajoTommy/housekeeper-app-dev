// public/housekeeper/settings/account.js
document.addEventListener('DOMContentLoaded', () => {
  console.log('Account settings script loaded');

  // --- Firebase Services (Assuming global availability) ---
  const auth = firebase.auth();
  const firestoreService = window.firestoreService;

  // --- UI Element References ---
  const timezoneSelect = document.getElementById('timezone');
  const autoSendReceiptsToggle = document.getElementById('auto-send-receipts');
  const saveButton = document.getElementById('save-account-settings-button');
  const savingIndicator = document.getElementById('account-saving-indicator');

  // --- State Variables ---
  let currentSettings = {
      timezone: null,
      autoSendReceipts: false
  };

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
    currentSettings.autoSendReceipts = !!settings.autoSendReceipts;

    if (timezoneSelect) {
        timezoneSelect.value = currentSettings.timezone || '';
    }
    if (autoSendReceiptsToggle) {
        autoSendReceiptsToggle.checked = currentSettings.autoSendReceipts;
        // Manually trigger style update for toggle if needed (Tailwind peer-checked might handle it)
    }
  }

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
    const newAutoSend = autoSendReceiptsToggle ? autoSendReceiptsToggle.checked : currentSettings.autoSendReceipts;

    const settingsToSave = {
        timezone: newTimezone,
        autoSendReceipts: newAutoSend
    };

    console.log('Saving account settings:', settingsToSave);

    try {
        await firestoreService.updateUserSettings(user.uid, settingsToSave);
        console.log('Account settings saved successfully.');
        // Update local state after successful save
        currentSettings.timezone = newTimezone;
        currentSettings.autoSendReceipts = newAutoSend;
        hideSavingIndicator(true);
    } catch (error) {
        console.error('Error saving account settings:', error);
        hideSavingIndicator(false);
        alert('Error saving account settings: ' + error.message);
    }
  }

  // --- Initialization ---
  populateTimezoneOptions(); // Populate dropdown immediately

  auth.onAuthStateChanged(async (user) => {
    if (user) {
      console.log('User logged in on account settings page.');
      try {
          const settings = await firestoreService.getUserSettings(user.uid);
          applyAccountSettings(settings || {}); // Apply loaded or default empty
      } catch (error) {
          console.error('Failed to load initial account settings:', error);
          applyAccountSettings({}); // Apply defaults on error
          alert('Could not load your account settings.');
      }
      // Add listener to the save button
      if (saveButton) {
          saveButton.addEventListener('click', saveAccountSettings);
      } else {
           console.error('Save button (#save-account-settings-button) not found!');
      }
    } else {
      // Handle logged out state
      console.log('User logged out on account settings page.');
      applyAccountSettings({}); // Reset UI to defaults
       if (saveButton) saveButton.disabled = true;
    }
  });

}); 