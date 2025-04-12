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

  // --- State ---
  let currentProfileData = null; // To store loaded profile data
  
  // --- Firebase Services (Assuming global availability) ---
  const auth = firebase.auth();
  const firestoreService = window.firestoreService; 

  // --- Functions ---
  
  /**
   * Fetches housekeeper profile and updates the UI.
   */
  async function loadProfileData() {
    console.log('Loading profile data...');
    const user = auth.currentUser;
    if (!user) {
      console.error('Cannot load profile, no user logged in');
      // Optionally display error to user
      if (userDisplayNameH2) userDisplayNameH2.textContent = 'Error loading profile';
      if (userEmailP) userEmailP.textContent = 'Please log in again.';
      if (inviteCodeDisplaySpan) inviteCodeDisplaySpan.textContent = 'Error';
      return;
    }

    try {
      const profile = await firestoreService.getHousekeeperProfile(user.uid);
      console.log('Profile data fetched:', profile);

      if (profile) {
        // Assign fetched data to state variable
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

    } catch (error) {
      console.error('Error loading profile:', error);
      currentProfileData = null; // Reset on error
      if (userDisplayNameH2) userDisplayNameH2.textContent = 'Error loading profile';
      if (userEmailP) userEmailP.textContent = 'Could not load data.';
      if (inviteCodeDisplaySpan) inviteCodeDisplaySpan.textContent = 'Error';
       if (copyInviteCodeBtn) copyInviteCodeBtn.disabled = true;
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

}); 