// public/housekeeper/settings/profile.js
document.addEventListener('DOMContentLoaded', () => {
  console.log('Profile settings script loaded');

  // --- UI Element References ---
  const userInitialsSpan = document.getElementById('user-initials');
  const userDisplayNameH2 = document.getElementById('user-display-name');
  const userEmailP = document.getElementById('user-email');
  const inviteCodeDisplaySpan = document.getElementById('invite-code-display');
  const copyInviteCodeBtn = document.getElementById('copy-invite-code-btn');
  const logoutButton = document.getElementById('logout-button'); // Get ref for potential listener attachment if needed
  const editProfileBtn = document.getElementById('edit-profile-btn'); // Added
  
  // Modal Elements
  const modal = document.getElementById('edit-profile-modal');
  const backdrop = document.getElementById('modal-backdrop');
  const closeModalBtn = document.getElementById('close-edit-modal-btn');
  const cancelModalBtn = document.getElementById('cancel-edit-btn');
  const profileForm = document.getElementById('edit-profile-form');
  const saveProfileBtn = document.getElementById('save-profile-btn');
  const modalSavingIndicator = document.getElementById('modal-saving-indicator');
  const modalErrorDiv = document.getElementById('modal-error');
  
  // Form Fields
  const firstNameInput = document.getElementById('edit-firstName');
  const lastNameInput = document.getElementById('edit-lastName');
  const companyNameInput = document.getElementById('edit-companyName');
  const phoneInput = document.getElementById('edit-phone');

  // <<< START Timezone Elements >>>
  const timezoneSelect = document.getElementById('profile-timezone'); 
  const saveTimezoneButton = document.getElementById('save-timezone-button');
  const timezoneSavingIndicator = document.getElementById('timezone-saving-indicator');
  // <<< END Timezone Elements >>>

  // --- State ---
  let currentProfileData = null; // To store loaded profile data
  let currentTimezone = null; // <<< ADD Timezone State >>>
  
  // --- Firebase Services (Assuming global availability) ---
  const auth = firebase.auth();
  const firestoreService = window.firestoreService; 

  // --- Functions ---
  
  // <<< START Timezone Functions (Adapted from account.js) >>>
  function showTimezoneSavingIndicator() {
      console.log('Showing timezone saving indicator');
      if (!timezoneSavingIndicator) return;
      timezoneSavingIndicator.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i> Saving...';
      if (saveTimezoneButton) saveTimezoneButton.disabled = true;
  }

  function hideTimezoneSavingIndicator(success = true) {
      if (!timezoneSavingIndicator) return;
      if (success) {
          timezoneSavingIndicator.innerHTML = '<i class="fas fa-check mr-2 text-green-500"></i> Saved!';
      } else {
          timezoneSavingIndicator.innerHTML = '<i class="fas fa-times mr-2 text-red-500"></i> Error!';
      }
      setTimeout(() => { 
          if (timezoneSavingIndicator) timezoneSavingIndicator.innerHTML = ''; 
      }, 2500);
      if (saveTimezoneButton) saveTimezoneButton.disabled = false;
  }

  function populateTimezoneOptions() {
      if (!timezoneSelect) {
          console.warn("populateTimezoneOptions: timezoneSelect element not found.");
          return;
      }
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
      console.log("Timezone options populated.");
  }

  async function saveTimezoneSetting() {
      console.log("Save Timezone button clicked.");
      showTimezoneSavingIndicator();
      const user = auth.currentUser;
      if (!user) {
          console.error('User not authenticated for saving timezone.');
          hideTimezoneSavingIndicator(false);
          alert('Error: You are not logged in.');
          return;
      }

      const newTimezone = timezoneSelect ? timezoneSelect.value : currentTimezone;
      if (!newTimezone) {
           console.warn("No timezone selected to save.");
           hideTimezoneSavingIndicator(false); // Indicate no action taken or error
           alert('Please select a time zone.');
           return;
      }

      const settingsToSave = {
          timezone: newTimezone,
      };

      console.log('Saving timezone setting:', settingsToSave);

      try {
          await firestoreService.updateUserSettings(user.uid, settingsToSave); 
          console.log('Timezone setting saved successfully.');
          currentTimezone = newTimezone; // Update local state
          hideTimezoneSavingIndicator(true);
      } catch (error) {
          console.error('Error saving timezone setting:', error);
          hideTimezoneSavingIndicator(false);
          alert('Error saving time zone: ' + error.message);
      }
  }
  // <<< END Timezone Functions >>>

  /**
   * Fetches housekeeper profile AND settings, updates the UI.
   */
  async function loadProfileData() {
    console.log('Loading profile and settings data...');
    const user = auth.currentUser;
    if (!user) {
      console.error('Cannot load data, no user logged in');
      // Optionally display error to user
      if (userDisplayNameH2) userDisplayNameH2.textContent = 'Error loading profile';
      if (userEmailP) userEmailP.textContent = 'Please log in again.';
      if (inviteCodeDisplaySpan) inviteCodeDisplaySpan.textContent = 'Error';
      return;
    }

    try {
      // <<< Fetch profile AND settings >>>
      const [profile, settings] = await Promise.all([
          firestoreService.getHousekeeperProfile(user.uid),
          firestoreService.getUserSettings(user.uid) // Fetch settings too
      ]);
      console.log('Profile data fetched:', profile);
      console.log('Settings data fetched:', settings);

      // --- Process Profile Data --- 
      if (profile) {
        currentProfileData = profile; 

        // Display Name and Email
        const displayName = profile.name || `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || user.email;
        const email = profile.email || user.email;
        if (userDisplayNameH2) userDisplayNameH2.textContent = displayName || 'Name not set';
        if (userEmailP) userEmailP.textContent = email || 'Email not set';

        // Display Initials
        let initials = '--';
        if (profile.firstName && profile.lastName) {
          initials = `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase();
        } else if (displayName && displayName.includes(' ')) {
            const names = displayName.split(' ');
            initials = `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
        } else if (displayName) {
            initials = displayName.substring(0, 2).toUpperCase();
        } else if (email) {
            initials = email.substring(0, 2).toUpperCase();
        }
        if (userInitialsSpan) userInitialsSpan.textContent = initials;

        // Display Invite Code
        if (profile.inviteCode) {
          if (inviteCodeDisplaySpan) {
            inviteCodeDisplaySpan.textContent = profile.inviteCode;
          }
          if (copyInviteCodeBtn) {
            copyInviteCodeBtn.disabled = false;
            copyInviteCodeBtn.addEventListener('click', handleCopyInviteCode);
          }
        } else {
          if (inviteCodeDisplaySpan) {
            inviteCodeDisplaySpan.textContent = 'N/A';
            inviteCodeDisplaySpan.classList.remove('text-primary');
            inviteCodeDisplaySpan.classList.add('text-gray-500', 'text-lg');
          }
          if (copyInviteCodeBtn) copyInviteCodeBtn.disabled = true;
        }
      } else {
        console.warn('No profile data found for user.');
        if (userDisplayNameH2) userDisplayNameH2.textContent = user.email || 'Profile not found';
        if (userEmailP) userEmailP.textContent = ''; // Clear email if only showing email in name
        if (userInitialsSpan) userInitialsSpan.textContent = (user.email || '--').substring(0,2).toUpperCase();
        if (inviteCodeDisplaySpan) inviteCodeDisplaySpan.textContent = 'N/A';
        if (copyInviteCodeBtn) copyInviteCodeBtn.disabled = true;
      }
      
      // <<< Apply Timezone Setting >>>
      currentTimezone = settings?.timezone; // Store timezone from settings
      if (timezoneSelect) {
          timezoneSelect.value = currentTimezone || ''; // Set dropdown value
          console.log(`Applied timezone '${currentTimezone || ''}' to dropdown.`);
      } else {
           console.warn("loadProfileData: timezoneSelect element not found when trying to apply setting.");
      }

    } catch (error) {
      console.error('Error loading profile/settings:', error);
      currentProfileData = null; 
      currentTimezone = null;
      if (userDisplayNameH2) userDisplayNameH2.textContent = 'Error loading profile';
      if (userEmailP) userEmailP.textContent = 'Could not load data.';
      if (inviteCodeDisplaySpan) inviteCodeDisplaySpan.textContent = 'Error';
       if (copyInviteCodeBtn) copyInviteCodeBtn.disabled = true;
      // Optionally indicate timezone load error
      if (timezoneSelect) timezoneSelect.value = ''; 
    }
  }

  /**
   * Opens the edit profile modal and populates it.
   */
  function openEditProfileModal() {
    if (!modal || !backdrop || !currentProfileData) return;
    
    // Populate form
    firstNameInput.value = currentProfileData.firstName || '';
    lastNameInput.value = currentProfileData.lastName || '';
    companyNameInput.value = currentProfileData.companyName || '';
    phoneInput.value = currentProfileData.phone || '';
    modalErrorDiv.textContent = '';
    modalErrorDiv.classList.add('hidden');
    
    // Show modal
    backdrop.classList.remove('hidden');
    modal.classList.remove('translate-y-full');
    modal.classList.add('translate-y-0');
  }

  /**
   * Closes the edit profile modal.
   */
  function closeEditProfileModal() {
      if (!modal || !backdrop) return;
      modal.classList.remove('translate-y-0');
      modal.classList.add('translate-y-full');
      backdrop.classList.add('hidden');
  }

  /**
   * Handles profile form submission.
   */
  async function handleProfileSave(event) {
      event.preventDefault(); // Prevent default form submission
      if (!profileForm || !currentProfileData) return;
      
      const user = auth.currentUser;
      if (!user) {
          showModalError('You must be logged in to save changes.');
          return;
      }
      
      showModalSavingIndicator();
      modalErrorDiv.classList.add('hidden'); // Hide previous errors
      
      const updatedData = {
          firstName: firstNameInput.value.trim(),
          lastName: lastNameInput.value.trim(),
          companyName: companyNameInput.value.trim(),
          phone: phoneInput.value.trim()
          // Add other fields as needed
      };

      // Basic validation
      if (!updatedData.firstName || !updatedData.lastName || !updatedData.phone) {
          showModalError('First name, last name, and phone are required.');
          hideModalSavingIndicator(false);
          return;
      }
      
      try {
          // Call a new function in firestoreService to update BOTH user and profile docs
          await firestoreService.updateHousekeeperProfileAndUser(user.uid, updatedData);
          
          console.log('Profile updated successfully');
          hideModalSavingIndicator(true);
          closeEditProfileModal();
          await loadProfileData(); // Reload profile data on the main page
          
      } catch (error) {
          console.error('Error saving profile:', error);
          hideModalSavingIndicator(false);
          showModalError(error.message || 'Failed to save profile. Please try again.');
      }
  }
  
  function showModalSavingIndicator() {
      if (!modalSavingIndicator || !saveProfileBtn) return;
      modalSavingIndicator.textContent = 'Saving...';
      saveProfileBtn.disabled = true;
  }

  function hideModalSavingIndicator(success = true) {
      if (!modalSavingIndicator || !saveProfileBtn) return;
      if (success) {
           modalSavingIndicator.textContent = 'Saved!';
      } else {
           modalSavingIndicator.textContent = 'Error!';
      }
      setTimeout(() => { 
          if (modalSavingIndicator) modalSavingIndicator.textContent = ''; 
          if (saveProfileBtn) saveProfileBtn.disabled = false;
      }, 2500);
      // Keep button disabled only on success 
      if (success && saveProfileBtn) saveProfileBtn.disabled = true; 
  }

  function showModalError(message) {
      if (!modalErrorDiv) return;
      modalErrorDiv.textContent = message;
      modalErrorDiv.classList.remove('hidden');
  }

  /**
   * Handles copying the invite code to the clipboard.
   */
  async function handleCopyInviteCode() {
    if (!inviteCodeDisplaySpan || !navigator.clipboard) return;
    const code = inviteCodeDisplaySpan.textContent;
    if (!code || code === 'LOADING...' || code === 'N/A' || code === 'Error') return;

    try {
      await navigator.clipboard.writeText(code);
      console.log('Invite code copied to clipboard:', code);
      // Optional: Show temporary feedback
      const originalText = copyInviteCodeBtn.innerHTML;
      copyInviteCodeBtn.innerHTML = '<i class="fas fa-check text-green-500"></i>';
      setTimeout(() => {
        copyInviteCodeBtn.innerHTML = originalText;
      }, 1500);
    } catch (err) {
      console.error('Failed to copy invite code: ', err);
      alert('Failed to copy code.'); // Simple feedback
    }
  }

  // --- Initialization ---
  populateTimezoneOptions(); // <<< Call populate function >>>
  auth.onAuthStateChanged((user) => {
    if (user) {
      loadProfileData();
    } else {
      // Should be handled by auth-router, but clear fields just in case
      console.log('User logged out, clearing profile fields.');
       if (userDisplayNameH2) userDisplayNameH2.textContent = 'Logged Out';
       if (userEmailP) userEmailP.textContent = '';
       if (userInitialsSpan) userInitialsSpan.textContent = '--';
       if (inviteCodeDisplaySpan) inviteCodeDisplaySpan.textContent = 'N/A';
       if (copyInviteCodeBtn) {
            copyInviteCodeBtn.removeEventListener('click', handleCopyInviteCode);
            copyInviteCodeBtn.disabled = true;
       }
       // Remove edit button listener if present
       if (editProfileBtn) editProfileBtn.removeEventListener('click', openEditProfileModal);
    }
  });

  // --- Add Modal Listeners ---
  if (editProfileBtn) {
    editProfileBtn.addEventListener('click', openEditProfileModal);
  }
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeEditProfileModal);
  }
  if (cancelModalBtn) {
     cancelModalBtn.addEventListener('click', closeEditProfileModal);
  }
  if (backdrop) {
      backdrop.addEventListener('click', closeEditProfileModal); // Close on backdrop click
  }
  if (profileForm) {
      profileForm.addEventListener('submit', handleProfileSave);
  }

  // <<< Add Timezone Save Listener >>>
  if (saveTimezoneButton) {
      saveTimezoneButton.addEventListener('click', saveTimezoneSetting);
  } else {
       console.error('Save Timezone button (#save-timezone-button) not found!');
  }

}); 