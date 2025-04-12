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
      if (userDisplayNameH2) userDisplayNameH2.textContent = 'Error loading profile';
      if (userEmailP) userEmailP.textContent = 'Could not load data.';
      if (inviteCodeDisplaySpan) inviteCodeDisplaySpan.textContent = 'Error';
       if (copyInviteCodeBtn) copyInviteCodeBtn.disabled = true;
    }
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
    }
  });

}); 