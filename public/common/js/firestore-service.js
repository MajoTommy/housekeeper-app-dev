// Firestore Service
const db = firebase.firestore();

const firestoreService = {
    // User methods
    async createUserProfile(userId, userData) {
        console.log('[createUserProfile] Attempting to set document for userId:', userId);
        try {
            await db.collection('users').doc(userId).set({
                name: userData.name || '',
                email: userData.email,
                phone: userData.phone || '',
                role: userData.role,
                hourly_rate: userData.hourly_rate || 0,
                service_area: userData.service_area || '',
                working_hours: userData.working_hours || {},
                profile_picture: userData.profile_picture || '',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('[createUserProfile] Firestore set operation successful for userId:', userId);
            return true;
        } catch (error) {
            console.error('[createUserProfile] Error during Firestore set operation:', error);
            return false;
        }
    },

    async getUserProfile(userId) {
        try {
            console.log('[Firestore] Getting user profile for ID:', userId);
            
            if (!userId) {
                console.error('[Firestore] getUserProfile called with invalid userId');
                return null;
            }
            
            const doc = await db.collection('users').doc(userId).get();
            
            if (doc.exists) {
                const userData = doc.data();
                console.log('[Firestore] User profile found:', userData);
                
                // Ensure role is set
                if (!userData.role) {
                    console.warn('[Firestore] User has no role defined, defaulting to housekeeper');
                    userData.role = 'housekeeper';
                    
                    // Update the user document with the default role
                    try {
                        await db.collection('users').doc(userId).update({
                            role: 'housekeeper',
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                        console.log('[Firestore] Updated user document with default role');
                    } catch (updateError) {
                        console.error('[Firestore] Failed to update user with default role:', updateError);
                    }
                }
                
                return userData;
            } else {
                console.warn('[Firestore] No user profile found for ID:', userId);
                return null;
            }
        } catch (error) {
            console.error('[Firestore] Error getting user profile:', error);
            return null;
        }
    },

    // ---- HOMEOWNER PROFILE -----
    async getHomeownerProfile(userId) {
        console.log('[Firestore] Getting homeowner profile for ID:', userId);
        if (!userId) {
            console.error('[Firestore] getHomeownerProfile called with invalid userId');
            return null;
        }
        try {
            const doc = await db.collection('homeowner_profiles').doc(userId).get();
            if (doc.exists) {
                const profileData = doc.data();
                console.log('[Firestore] Raw homeowner profile data fetched:', profileData);
                
                // Check for the RENAMED field
                console.log('[Firestore] Checking HomeownerInstructions within raw data:', profileData.HomeownerInstructions);
                
                console.log('[Firestore] Homeowner profile found (returning):', profileData);
                return profileData;
            } else {
                console.warn('[Firestore] No homeowner profile found for ID:', userId);
                return null;
            }
        } catch (error) {
            console.error('[Firestore] Error getting homeowner profile:', error);
            return null;
        }
    },

    // --- NEW: Get Specific Client Details from Housekeeper's List ---
    async getClientDetails(housekeeperId, clientId) {
        console.log(`[Firestore] Getting client details for housekeeper ${housekeeperId}, client ${clientId}`);
        if (!housekeeperId || !clientId) {
            console.error('[Firestore] getClientDetails called with invalid IDs');
            return null;
        }
        try {
            const clientRef = db.collection('users').doc(housekeeperId).collection('clients').doc(clientId);
            const doc = await clientRef.get();
            if (doc.exists) {
                console.log('[Firestore] Client details found:', doc.data());
                return { id: doc.id, ...doc.data() };
            } else {
                console.warn(`[Firestore] No client document found at users/${housekeeperId}/clients/${clientId}`);
                return null;
            }
        } catch (error) {
            console.error('[Firestore] Error getting client details:', error);
            return null;
        }
    },
    // --- END NEW ---

    // NEW: Update Homeowner Profile
    async updateHomeownerProfile(homeownerId, profileData) {
        console.log(`[Firestore] Updating homeowner profile for ID: ${homeownerId}`);
        if (!homeownerId || !profileData) {
            console.error('[Firestore] updateHomeownerProfile requires homeownerId and profileData.');
            throw new Error('Invalid input for profile update.');
        }
        try {
            const profileRef = db.collection('homeowner_profiles').doc(homeownerId);
            
            // Ensure we have an update timestamp
            const dataToUpdate = {
                ...profileData,
                // Make sure profileData includes HomeownerInstructions if it was edited
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            // Remove undefined fields
            Object.keys(dataToUpdate).forEach(key => dataToUpdate[key] === undefined && delete dataToUpdate[key]);

            await profileRef.update(dataToUpdate);
            console.log(`[Firestore] Homeowner profile updated successfully for ID: ${homeownerId}`);
            return true;
        } catch (error) {
            console.error('[Firestore] Error updating homeowner profile:', error);
            throw error;
        }
    },

    // NEW: Update Homeowner Location Details
    async updateHomeownerLocation(homeownerId, locationData) {
        console.log(`[Firestore] Updating location for homeowner ID: ${homeownerId}`);
        if (!homeownerId || !locationData || !locationData.address || !locationData.city || !locationData.state || !locationData.zip) {
            console.error('[Firestore] updateHomeownerLocation requires homeownerId and complete locationData (address, city, state, zip).');
            throw new Error('Invalid input for location update.');
        }
        try {
            const profileRef = db.collection('homeowner_profiles').doc(homeownerId);
            const dataToUpdate = {
                address: locationData.address,
                city: locationData.city,
                state: locationData.state,
                zip: locationData.zip,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await profileRef.update(dataToUpdate);
            console.log(`[Firestore] Homeowner location updated successfully for ID: ${homeownerId}`);
            return true; // Indicate success
        } catch (error) {
            console.error('[Firestore] Error updating homeowner location:', error);
            throw error; // Re-throw the error
        }
    },

    // ---- HOUSEKEEPER PROFILE -----
    async getHousekeeperProfile(housekeeperId) {
        console.log('[Firestore] Getting housekeeper profile for ID:', housekeeperId);
        if (!housekeeperId) {
            console.error('[Firestore] getHousekeeperProfile called with invalid housekeeperId');
            return null;
        }
        try {
            const doc = await db.collection('housekeeper_profiles').doc(housekeeperId).get();
            if (doc.exists) {
                console.log('[Firestore] Housekeeper profile found:', doc.data());
                return { id: doc.id, ...doc.data() }; // Include ID with data
            } else {
                console.warn('[Firestore] No housekeeper profile found for ID:', housekeeperId);
                return null;
            }
        } catch (error) {
            console.error('[Firestore] Error getting housekeeper profile:', error);
            return null;
        }
    },

    // NEW: Get ONLY public-facing housekeeper details
    async getHousekeeperPublicProfile(housekeeperId) {
        console.log('[Firestore] Getting housekeeper PUBLIC profile for ID:', housekeeperId);
        try {
            const profile = await this.getHousekeeperProfile(housekeeperId); // Use existing function
            if (!profile) {
                console.warn('[Firestore] No housekeeper profile found for ID in public profile fetch:', housekeeperId);
                return null;
            }

            // Extract only the fields safe for homeowners to see
            const publicProfile = {
                id: profile.id, // Keep the ID
                firstName: profile.firstName || '' , // From housekeeper_profiles
                lastName: profile.lastName || '', // From housekeeper_profiles
                companyName: profile.companyName || '' , // From housekeeper_profiles
                profilePictureUrl: profile.profilePictureUrl || null // From housekeeper_profiles
                // Add any other relevant public fields here, e.g., service area if applicable
            };

            console.log('[Firestore] Returning public housekeeper profile:', publicProfile);
            return publicProfile;

        } catch (error) {
            console.error('[Firestore] Error getting housekeeper public profile:', error);
            return null;
        }
    },

    // NEW: Update Housekeeper Profile AND User doc atomically
    async updateHousekeeperProfileAndUser(housekeeperId, profileData) {
        console.log(`[Firestore] Updating housekeeper profile & user doc for ID: ${housekeeperId}`);
        if (!housekeeperId || !profileData) {
            console.error('[Firestore] updateHousekeeperProfileAndUser requires housekeeperId and profileData.');
            throw new Error('Invalid input for profile update.');
        }
        
        const batch = db.batch();
        const userRef = db.collection('users').doc(housekeeperId);
        const profileRef = db.collection('housekeeper_profiles').doc(housekeeperId);

        const timestamp = firebase.firestore.FieldValue.serverTimestamp();

        // Data for /users/{userId}
        const userDataToUpdate = {
            firstName: profileData.firstName,
            lastName: profileData.lastName,
            phone: profileData.phone,
            companyName: profileData.companyName || null, // Ensure companyName is also in user doc if needed
            updatedAt: timestamp
        };
        // Remove undefined fields
        Object.keys(userDataToUpdate).forEach(key => userDataToUpdate[key] === undefined && delete userDataToUpdate[key]);
        batch.update(userRef, userDataToUpdate);

        // Data for /housekeeper_profiles/{userId}
        // Make sure profileData from argument only contains fields for housekeeper_profiles
        // e.g., { bio, serviceZipCodes, etc. }
        // We will explicitly NOT update firstName, lastName, phone here as they are part of userDataToUpdate
        const housekeeperProfileDataToUpdate = {
            ...profileData, // Spread all incoming profile data
            updatedAt: timestamp
        };
        // Remove fields that are managed in the /users collection to avoid duplication or conflict
        delete housekeeperProfileDataToUpdate.firstName; 
        delete housekeeperProfileDataToUpdate.lastName;
        delete housekeeperProfileDataToUpdate.phone;
        delete housekeeperProfileDataToUpdate.companyName; // Also managed in /users now

        batch.update(profileRef, housekeeperProfileDataToUpdate);
        
        await batch.commit();
        console.log(`[Firestore] Batch update for housekeeper profile & user doc successful for ID: ${housekeeperId}`);
        return true;
    },

    // --- NEW FUNCTION TO UPDATE ARBITRARY FIELDS IN /users/{uid} ---
    async updateUserDocument(userId, dataToUpdate) {
        console.log(`[Firestore] Updating user document for ID: ${userId} with data:`, dataToUpdate);
        if (!userId || !dataToUpdate) {
            console.error('[Firestore] updateUserDocument requires userId and dataToUpdate.');
            throw new Error('Invalid input for user document update.');
        }
        try {
            const userRef = db.collection('users').doc(userId);
            // Ensure we have an update timestamp
            const updatePayload = {
                ...dataToUpdate,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            // Remove undefined fields to prevent Firestore errors
            Object.keys(updatePayload).forEach(key => updatePayload[key] === undefined && delete updatePayload[key]);

            await userRef.update(updatePayload);
            console.log(`[Firestore] User document updated successfully for ID: ${userId}`);
            return true;
        } catch (error) {
            console.error('[Firestore] Error updating user document:', error);
            throw error;
        }
    },
    // --- END NEW FUNCTION ---

    // ---- HOMEOWNER-HOUSEKEEPER LINKING ----
    async linkHomeownerToHousekeeper(homeownerId, inviteCode) {
        console.log(`[Link] Attempting to link homeowner ${homeownerId} using code ${inviteCode}`);
        const normalizedCode = inviteCode.toUpperCase(); // Ensure case-insensitivity

        if (!homeownerId || !normalizedCode || normalizedCode.length !== 6) {
            console.error('[Link] Invalid homeownerId or invite code format.');
            return { success: false, message: 'Invalid code format.' };
        }

        try {
            // 1. Find housekeeper profile with the matching invite code
            const housekeeperProfilesRef = db.collection('housekeeper_profiles');
            const querySnapshot = await housekeeperProfilesRef.where('inviteCode', '==', normalizedCode).limit(1).get();

            if (querySnapshot.empty) {
                console.warn('[Link] No housekeeper found with invite code:', normalizedCode);
                return { success: false, message: 'Invite code not found.' };
            }

            // Should only be one match due to the code generation logic (ideally)
            const housekeeperDoc = querySnapshot.docs[0];
            const housekeeperId = housekeeperDoc.id;
            console.log('[Link] Found housekeeper:', housekeeperId);

            // 2. Update homeowner profile with the linkedHousekeeperId
            const homeownerProfileRef = db.collection('homeowner_profiles').doc(homeownerId);
            await homeownerProfileRef.update({
                linkedHousekeeperId: housekeeperId,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            console.log('[Link] Homeowner profile updated successfully.');
            return { success: true, housekeeperId: housekeeperId };

        } catch (error) {
            console.error('[Link] Error linking homeowner to housekeeper:', error);
            if (error.code === 'permission-denied') {
                 return { success: false, message: 'Permission denied. Check Firestore rules.' };
            }
            return { success: false, message: 'An unexpected error occurred.' };
        }
    },

    // NEW: Function to unlink homeowner
    async unlinkHomeownerFromHousekeeper(homeownerId) {
        console.log(`[Firestore] Unlinking homeowner ${homeownerId}`);
        if (!homeownerId) {
            throw new Error('Missing homeowner ID for unlink operation.');
        }
        
        const homeownerProfileRef = db.collection('homeowner_profiles').doc(homeownerId);
        
        try {
            // Use update to set linkedHousekeeperId to null or delete it
            // Setting to null is often cleaner than deleting
            await homeownerProfileRef.update({
                linkedHousekeeperId: null 
            });
            console.log(`[Firestore] Successfully unlinked homeowner ${homeownerId}.`);
            return { success: true };
        } catch (error) {
            console.error(`[Firestore] Error unlinking homeowner ${homeownerId}:`, error);
             // Provide a more specific error message if possible
            if (error.code === 'not-found') {
                throw new Error('Homeowner profile not found.');
            } else if (error.code === 'permission-denied') {
                 throw new Error('Permission denied to update profile.');
            } else {
                throw new Error('Failed to unlink homeowner due to a server error.');
            }
        }
    },

    // ----- SETTINGS METHODS (SINGLE SOURCE OF TRUTH) -----
    
    // Primary location for settings
    get PRIMARY_SETTINGS_PATH() {
        return 'settings/app'; // Collection/document path under user document
    },
    
    // Legacy location
    get LEGACY_SETTINGS_FIELD() {
        return 'settings'; // Field directly in user document
    },
    
    // Standard days for settings
    get STANDARD_DAYS() {
        return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    },
    
    // Create a standard settings object with correct structure
    createStandardSettingsObject() {
        return {
            workingDays: {
                monday: { isWorking: false },
                tuesday: { isWorking: false },
                wednesday: { isWorking: false },
                thursday: { isWorking: false },
                friday: { isWorking: false },
                saturday: { isWorking: false },
                sunday: { isWorking: false }
            },
            autoSendReceipts: false,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
    },
    
    // Ensure a settings object has the correct structure
    normalizeSettingsObject(settings) {
        if (!settings) {
            return this.createStandardSettingsObject();
        }
        
        // Create a deep copy to avoid modifying the original
        const normalizedSettings = JSON.parse(JSON.stringify(settings));
        
        // Ensure workingDays exists
        if (!normalizedSettings.workingDays) {
            normalizedSettings.workingDays = {};
        }
        
        // Clean up any numeric string indexed properties (like "0", "1", "2", etc.)
        // This fixes the corruption issue where "jobsPerDay" characters get saved as individual properties
        if (normalizedSettings.workingDays) {
            this.STANDARD_DAYS.forEach(day => {
                if (normalizedSettings.workingDays[day]) {
                    const daySettings = normalizedSettings.workingDays[day];
                    
                    // Create a new cleaned object with only the valid properties
                    const cleanedDaySettings = {
                        isWorking: daySettings.isWorking,
                        jobsPerDay: daySettings.jobsPerDay,
                        startTime: daySettings.startTime,
                        breakTime: daySettings.breakTime,
                        breakDurations: Array.isArray(daySettings.breakDurations) ? daySettings.breakDurations.filter(d => typeof d === 'number') : [],
                        jobDurations: Array.isArray(daySettings.jobDurations) ? daySettings.jobDurations.filter(d => typeof d === 'number') : []
                    };
                    
                    // Replace the original object with the cleaned one
                    normalizedSettings.workingDays[day] = cleanedDaySettings;
                }
            });
        }
        
        // Ensure all days exist with correct structure, preserving nulls from DB
        this.STANDARD_DAYS.forEach(day => {
            if (!normalizedSettings.workingDays[day]) {
                // If day doesn't exist at all, initialize with nulls/defaults
                const isWeekday = !['saturday', 'sunday'].includes(day);
                normalizedSettings.workingDays[day] = {
                    isWorking: isWeekday, // Default isWorking for new days
                    jobsPerDay: null,
                    startTime: null,
                    breakTime: null,
                    breakDurations: [],
                    jobDurations: []
                };
            } else {
                // Ensure core properties exist, but keep DB values (including null)
                const daySettings = normalizedSettings.workingDays[day];
                
                // Only set default if property is truly missing (undefined), not if it's null
                if (daySettings.isWorking === undefined) {
                    daySettings.isWorking = !['saturday', 'sunday'].includes(day);
                }
                
                if (daySettings.jobsPerDay === undefined) {
                    daySettings.jobsPerDay = null; // Default to null if missing
                }
                
                if (daySettings.startTime === undefined) {
                    daySettings.startTime = null; // Default to null if missing
                }
                
                if (daySettings.breakTime === undefined) {
                    daySettings.breakTime = null; // Default to null if missing
                }
                
                if (daySettings.breakDurations === undefined) {
                    daySettings.breakDurations = []; // Default to empty array if missing
                }
                
                if (daySettings.jobDurations === undefined) {
                    daySettings.jobDurations = []; // Default to empty array if missing
                }
            }
        });
        
        // Ensure other standard fields
        if (typeof normalizedSettings.autoSendReceipts !== 'boolean') {
            normalizedSettings.autoSendReceipts = false;
        }
        
        // **** ADDED: Preserve timezone ****
        if (typeof settings.timezone === 'string' && settings.timezone) {
             normalizedSettings.timezone = settings.timezone;
        } else if (!normalizedSettings.timezone) { // Only add default if missing entirely
             // Optionally set a default timezone if none exists, or leave it null/undefined
             normalizedSettings.timezone = null; // Or e.g., 'America/Los_Angeles'
        }
        // **** END ADDED ****
        
        // Create compatibility object for schedule.js
        normalizedSettings.workingDaysCompat = {
            0: normalizedSettings.workingDays.sunday?.isWorking === true,
            1: normalizedSettings.workingDays.monday?.isWorking === true,
            2: normalizedSettings.workingDays.tuesday?.isWorking === true,
            3: normalizedSettings.workingDays.wednesday?.isWorking === true,
            4: normalizedSettings.workingDays.thursday?.isWorking === true,
            5: normalizedSettings.workingDays.friday?.isWorking === true,
            6: normalizedSettings.workingDays.saturday?.isWorking === true
        };
        
        return normalizedSettings;
    },
    
    // Get settings from the primary location
    async getSettingsFromPrimaryLocation(userId) {
        try {
            const doc = await db.collection('users').doc(userId)
                .collection('settings').doc('app')
                .get();
                
            if (doc.exists) {
                console.log('Found settings in primary location');
                return doc.data();
            }
            
            return null;
        } catch (error) {
            console.error('Error getting settings from primary location:', error);
            return null;
        }
    },
    
    // Get settings from the legacy location
    async getSettingsFromLegacyLocation(userId) {
        try {
            const doc = await db.collection('users').doc(userId).get();
            
            if (doc.exists && doc.data().settings) {
                console.log('Found settings in legacy location');
                return doc.data().settings;
            }
            
            return null;
        } catch (error) {
            console.error('Error getting settings from legacy location:', error);
            return null;
        }
    },
    
    // Save settings to the primary location
    async saveSettingsToPrimaryLocation(userId, settings) {
        try {
            console.log('[FIREBASE-SAVE] Saving settings to primary location for user:', userId);
            console.log('[FIREBASE-SAVE] Settings payload:', JSON.stringify(settings, null, 2));
            
            // Normalize the settings object to ensure correct structure
            const normalizedSettings = this.normalizeSettingsObject(settings);
            
            // Add metadata
            normalizedSettings.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
            
            console.log('[FIREBASE-SAVE] Normalized settings to save:', JSON.stringify(normalizedSettings, null, 2));
            
            // Save to primary location
            await db.collection('users').doc(userId)
                .collection('settings').doc('app')
                .set(normalizedSettings);
            
            console.log('[FIREBASE-SAVE] Settings saved successfully to primary location');
            return true;
        } catch (error) {
            console.error('[FIREBASE-SAVE] Error saving settings:', error);
            console.error('[FIREBASE-SAVE] Error details:', error.code, error.message, error.stack);
            return false;
        }
    },
    
    // Retrieves settings, attempting primary location first, then legacy.
    // IMPORTANT: Only creates default settings if the *requester* is the owner of the settings.
    async getUserSettings(userId, requesterId = null) {
        console.log(`Getting settings for user ${userId}${requesterId ? ' (requested by ' + requesterId + ')' : ''}`);
        const isOwnerRequest = requesterId === null || userId === requesterId;

        try {
            let settings = await this.getSettingsFromPrimaryLocation(userId);
            if (settings) {
                console.log('Settings found in primary location');
                return this.normalizeSettingsObject(settings); // Normalize before returning
            }

            console.warn('Settings not found in primary location, checking legacy field...');
            settings = await this.getSettingsFromLegacyLocation(userId);
            if (settings) {
                console.log('Settings found in legacy field, migrating...');
                const normalized = this.normalizeSettingsObject(settings);
                // Migrate to primary location (don't await, let it happen in background)
                this.saveSettingsToPrimaryLocation(userId, normalized).catch(err => {
                    console.error('Error migrating legacy settings:', err);
                });
                return normalized; 
            }

            // Only create defaults if the request is from the owner
            if (isOwnerRequest) {
                console.warn('No settings found anywhere, creating and returning defaults.');
                const defaultSettings = this.createStandardSettingsObject(); 
                const normalizedDefaults = this.normalizeSettingsObject(defaultSettings);
                 // Attempt to save defaults (don't await)
                 this.saveSettingsToPrimaryLocation(userId, normalizedDefaults).catch(err => {
                     console.error('Error saving default settings:', err);
                 });
                return normalizedDefaults;
            } else {
                console.warn(`Settings not found for user ${userId} and requester ${requesterId} is not owner. Returning null.`);
                return null; // Not owner, don't create defaults
            }

        } catch (error) {
            console.error(`Error in getUserSettings for ${userId}:`, error);
            // Don't create defaults on error if not owner
            if (isOwnerRequest) {
                 console.error('Returning default settings due to error during fetch for owner.');
                 return this.normalizeSettingsObject(this.createStandardSettingsObject());
            } else {
                return null; // Return null on error if not owner
            }
        }
    },
    
    // Update settings (Public API)
    async updateUserSettings(userId, settingsData) {
        console.log('[FIREBASE-UPDATE] updateUserSettings called for user:', userId);
        console.log('[FIREBASE-UPDATE] Settings data received:', JSON.stringify(settingsData, null, 2));
        
        if (!userId) {
            console.error('[FIREBASE-UPDATE] Missing userId, cannot update settings');
            return false;
        }
        
        if (!settingsData || typeof settingsData !== 'object') {
            console.error('[FIREBASE-UPDATE] Invalid settings data:', settingsData);
            return false;
        }
        
        try {
            // This function now directly calls the save function for the primary location
            const result = await this.saveSettingsToPrimaryLocation(userId, settingsData);
            console.log('[FIREBASE-UPDATE] Save operation result:', result);
            return result;
        } catch (error) {
            console.error('[FIREBASE-UPDATE] Unexpected error in updateUserSettings:', error);
            return false;
        }
    },

    // Client methods
    async createClient(userId, clientData) {
        try {
            const clientRef = await db.collection('users').doc(userId).collection('clients').add({
                name: clientData.name,
                email: clientData.email || '',
                phone: clientData.phone || '',
                address: clientData.address || '',
                property_details: clientData.property_details || '',
                notes: clientData.notes || '',
                cleaning_preferences: clientData.cleaning_preferences || '',
                key_information: clientData.key_information || '',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('Client created successfully');
            return clientRef.id;
        } catch (error) {
            console.error('Error creating client:', error);
            return null;
        }
    },

    async getClients(userId) {
        try {
            const snapshot = await db.collection('users').doc(userId).collection('clients').get();
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting clients:', error);
            return [];
        }
    },

    // Cleaning/Appointment methods
    async createAppointment(userId, appointmentData) {
        try {
            const appointmentRef = await db.collection('users').doc(userId).collection('appointments').add({
                client_id: appointmentData.client_id,
                client_name: appointmentData.client_name,
                date: appointmentData.date,
                start_time: appointmentData.start_time,
                end_time: appointmentData.end_time,
                status: appointmentData.status || 'scheduled',
                notes: appointmentData.notes || '',
                payment_status: appointmentData.payment_status || 'pending',
                payment_amount: appointmentData.payment_amount || 0,
                frequency: appointmentData.frequency || 'one_time',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('Appointment created successfully');
            return appointmentRef.id;
        } catch (error) {
            console.error('Error creating appointment:', error);
            return null;
        }
    },

    async getAppointmentsByDateRange(userId, startDate, endDate) {
        try {
            const snapshot = await db.collection('users').doc(userId).collection('appointments')
                .where('date', '>=', startDate)
                .where('date', '<=', endDate)
                .orderBy('date')
                .orderBy('start_time')
                .get();
            
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting appointments:', error);
            return [];
        }
    },

    async updateAppointmentStatus(userId, appointmentId, status) {
        try {
            await db.collection('users').doc(userId).collection('appointments').doc(appointmentId).update({
                status: status,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('Appointment status updated successfully');
            return true;
        } catch (error) {
            console.error('Error updating appointment status:', error);
            return false;
        }
    },

    // ---- ROLE SPECIFIC PROFILE CREATION ----
    // Accept inviteCode as an optional parameter
    async createRoleSpecificProfile(userId, role, inviteCode = null) { 
        console.log(`[createRoleSpecificProfile] Attempting to create ${role} profile for userId:`, userId);
        const profileCollection = role === 'housekeeper' ? 'housekeeper_profiles' : 'homeowner_profiles';
        
        // Base data
        const initialProfileData = {
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Add invite code only for housekeepers
        if (role === 'housekeeper' && inviteCode) {
            initialProfileData.inviteCode = inviteCode;
            console.log(`[createRoleSpecificProfile] Storing invite code ${inviteCode} for housekeeper.`);
        }
        
        try {
            // Use the specific data object
            await db.collection(profileCollection).doc(userId).set(initialProfileData); 
            console.log(`[createRoleSpecificProfile] ${role} profile document created successfully for userId:`, userId);
            return true;
        } catch (error) {
            console.error(`[createRoleSpecificProfile] Error creating ${role} profile document:`, error);
            // This might not be critical for initial signup flow, depending on requirements
            return false; 
        }
    },
    
    // ----- BOOKING METHODS -----
    // Adds a new booking document under the specified housekeeper's bookings subcollection
    async addBooking(housekeeperId, bookingData) {
        console.log(`[Firestore] Adding new booking for housekeeper ${housekeeperId}...`, bookingData);
        if (!housekeeperId || !bookingData) {
            console.error('[Firestore] addBooking requires housekeeperId and bookingData.');
            return null;
        }
        // --- UPDATED Validation --- 
        if (!bookingData.clientId || 
            !(bookingData.startTimestamp instanceof firebase.firestore.Timestamp) || 
            !(bookingData.endTimestamp instanceof firebase.firestore.Timestamp) || 
            !bookingData.status) {
            console.error('[Firestore] Booking data is missing required fields (clientId, startTimestamp, endTimestamp, status) or fields have incorrect types.');
            // Log the invalid data for debugging
            console.error('[Firestore] Invalid bookingData received:', bookingData);
            return null;
        }
        // Optional: Check if start is before end
        if (bookingData.startTimestamp.toMillis() >= bookingData.endTimestamp.toMillis()) {
            console.error('[Firestore] Booking startTimestamp must be before endTimestamp.');
            return null;
        }
        // --- END UPDATED Validation ---

        try {
            const bookingsRef = db.collection('users').doc(housekeeperId).collection('bookings');
            
            // --- Create Document with New Structure --- 
            // Only include fields that should be in the booking document
            const bookingDoc = {
                clientId: bookingData.clientId,
                housekeeperId: housekeeperId, // Ensure housekeeperId is stored
                startTimestamp: bookingData.startTimestamp, // Already a Timestamp
                endTimestamp: bookingData.endTimestamp,     // Already a Timestamp
                startTimestampMillis: bookingData.startTimestamp.toMillis(), // Add milliseconds version
                endTimestampMillis: bookingData.endTimestamp.toMillis(),     // Add milliseconds version
                status: bookingData.status,
                // Optional fields from bookingData
                clientName: bookingData.clientName || null,
                frequency: bookingData.frequency || 'one-time',
                BookingNote: bookingData.BookingNote || '',
                address: bookingData.address || null,
                // System fields
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp() // Add updatedAt too
            };
            // --- END Create Document ---

            console.log('[Firestore] Saving booking document (Timestamp format):', bookingDoc);
            const docRef = await bookingsRef.add(bookingDoc);
            console.log(`[Firestore] Booking added successfully with ID: ${docRef.id}`);
            return docRef.id; // Return the new booking ID
        } catch (error) {
            console.error('[Firestore] Error adding booking:', error);
            return null;
        }
    },

    // NEW: Get ALL bookings for a specific housekeeper within a date range
    async getBookingsForHousekeeperInRange(housekeeperId, startDate, endDate) {
        console.log(`[Firestore] Getting bookings for housekeeper ${housekeeperId} from ${startDate.toISOString()} to ${endDate.toISOString()}`);
        if (!housekeeperId || !startDate || !endDate) {
            console.error('[Firestore] getBookingsForHousekeeperInRange requires housekeeperId, startDate, and endDate.');
            return [];
        }

        try {
            const bookingsRef = db.collection('users').doc(housekeeperId).collection('bookings');
            
            // Convert JS Dates to Firestore Timestamps for querying
            const startTimestamp = firebase.firestore.Timestamp.fromDate(startDate);
            // Use the provided end date directly (assuming it's already end of day or we query <=)
            const endTimestamp = firebase.firestore.Timestamp.fromDate(endDate);

            // --- UPDATED Query based on startTimestamp ---
            const q = bookingsRef
                .where('startTimestamp', '>=', startTimestamp)
                .where('startTimestamp', '<=', endTimestamp) // Include bookings STARTING on the end date
                // Consider .where('status', '!=', 'cancelled') if needed
                .orderBy('startTimestamp'); // Order by start time
            // --- END UPDATED Query ---

            const querySnapshot = await q.get();
            const bookings = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                // --- REMOVED jsDate conversion ---
                // Convert createdAt/updatedAt if needed by caller
                if (data.createdAt && data.createdAt.toDate) {
                    data.jsCreatedAt = data.createdAt.toDate();
                }
                 if (data.updatedAt && data.updatedAt.toDate) {
                     data.jsUpdatedAt = data.updatedAt.toDate();
                }
                bookings.push({ id: doc.id, ...data });
            });

            console.log(`[Firestore] Found ${bookings.length} bookings in range for housekeeper ${housekeeperId}.`);
            return bookings;

        } catch (error) {
            console.error(`[Firestore] Error getting bookings in range for housekeeper ${housekeeperId}:`, error);
             if (error.code === 'permission-denied') {
                 console.error('Permission denied fetching bookings. Check Firestore rules.');
             } else if (error.code === 'failed-precondition') {
                 console.warn('Firestore requires a composite index for this query (likely on startTimestamp). Please create it using the link provided in the error message in the browser console.'); // Updated index field
            }
            return []; // Return empty array on error
        }
    },
    
    // Get upcoming bookings for a specific homeowner linked to a specific housekeeper
    async getUpcomingHomeownerBookings(homeownerId, housekeeperId, limit = null) {
        console.log(`[Firestore] Getting upcoming bookings for homeowner ${homeownerId} linked to housekeeper ${housekeeperId}`);
        if (!homeownerId || !housekeeperId) {
            console.error('[Firestore] getUpcomingHomeownerBookings requires homeownerId and housekeeperId.');
            return [];
        }
        try {
                // --- UPDATED Query ---
                const nowTimestamp = firebase.firestore.Timestamp.now();
            let query = db.collection('users').doc(housekeeperId).collection('bookings')
                .where('clientId', '==', homeownerId)
                    .where('startTimestamp', '>=', nowTimestamp) // Bookings starting now or later
                    .orderBy('startTimestamp'); // Order by start time
                // --- END UPDATED Query ---
                
            if (limit && typeof limit === 'number' && limit > 0) {
                query = query.limit(limit); // Apply limit if provided
            }

            const snapshot = await query.get();

            const bookings = [];
            snapshot.forEach(doc => {
                    // Convert Timestamps if needed by caller (example for createdAt)
                     const data = doc.data();
                     if (data.createdAt && data.createdAt.toDate) {
                         data.jsCreatedAt = data.createdAt.toDate();
                     }
                     if (data.updatedAt && data.updatedAt.toDate) {
                         data.jsUpdatedAt = data.updatedAt.toDate();
                     }
                     // Return start/end timestamps as they are
                    bookings.push({ id: doc.id, ...data });
            });
            console.log(`[Firestore] Found ${bookings.length} upcoming bookings.`);
            return bookings;
        } catch (error) {
            console.error('[Firestore] Error getting upcoming homeowner bookings:', error);
            // Check if it's an index error and provide guidance
            if (error.code === 'failed-precondition') {
                     console.warn('Firestore requires a composite index for this query (clientId, startTimestamp). Please create it using the link provided in the error message in the browser console.');
            }
            return [];
        }
    },
    
    // NEW: Function to get past homeowner bookings
       async getPastHomeownerBookings(homeownerId, housekeeperId, limit = 5, startDate = null) {
        console.log(`[Firestore] Getting past bookings for homeowner ${homeownerId} linked to housekeeper ${housekeeperId}`);
        if (!homeownerId || !housekeeperId) {
            console.error('[Firestore] getPastHomeownerBookings requires homeownerId and housekeeperId.');
            return [];
        }
        try {
            const nowTimestamp = firebase.firestore.Timestamp.now();
            let query = db.collection('users').doc(housekeeperId).collection('bookings')
                .where('clientId', '==', homeownerId)
                .where('status', '==', 'completed') // Filter for completed status
                .where('startTimestamp', '<', nowTimestamp); // Bookings started before now

            // Add start date filter if provided
            if (startDate instanceof Date) {
                 const startTimestamp = firebase.firestore.Timestamp.fromDate(startDate);
                 console.log(`[Firestore] Adding date filter: startTimestamp >= ${startDate.toISOString()}`);
                 query = query.where('startTimestamp', '>=', startTimestamp);
                 // IMPORTANT: Ordering must match the inequality filter field first if using inequality
                 query = query.orderBy('startTimestamp', 'desc'); 
            } else {
                 // If no start date, just order by most recent first
                 query = query.orderBy('startTimestamp', 'desc'); 
            }
                
            if (limit && typeof limit === 'number' && limit > 0) {
                query = query.limit(limit);
            }

            const snapshot = await query.get();

            const bookings = [];
            snapshot.forEach(doc => {
                 const data = doc.data();
                 if (data.createdAt && data.createdAt.toDate) {
                     data.jsCreatedAt = data.createdAt.toDate();
                 }
                 if (data.updatedAt && data.updatedAt.toDate) {
                     data.jsUpdatedAt = data.updatedAt.toDate();
                 }
                bookings.push({ id: doc.id, ...data });
            });
            console.log(`[Firestore] Found ${bookings.length} past bookings matching criteria.`);
            return bookings;
        } catch (error) {
            console.error('[Firestore] Error getting past homeowner bookings:', error);
            // Check if it's an index error and provide guidance 
            if (error.code === 'failed-precondition') {
                 console.warn('Firestore requires a composite index for this query (likely involving clientId, status, and startTimestamp). Please check the browser console for the Firestore index creation link if this error persists.');
            }
            return [];
        }
    },

    async addBookings(userId, bookings) {
        // Implementation of addBookings method
    },

    // Add Client method
    async addClient(housekeeperId, clientData) {
        console.log(`[Firestore] Adding new client for housekeeper ${housekeeperId}...`, clientData);
        if (!housekeeperId || !clientData) {
            console.error('[Firestore] addClient requires housekeeperId and clientData.');
            return null;
        }
        // Basic validation (adjust as needed)
        if (!clientData.firstName || !clientData.lastName) {
            console.error('[Firestore] Client data is missing required fields (firstName, lastName).');
            return null;
        }

        try {
            const clientsRef = db.collection('users').doc(housekeeperId).collection('clients');
            // Ensure createdAt timestamp is added
            const clientDoc = {
                ...clientData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            const docRef = await clientsRef.add(clientDoc);
            console.log(`[Firestore] Client added successfully with ID: ${docRef.id}`);
            return docRef.id; // Return the new client ID
        } catch (error) {
            console.error('[Firestore] Error adding client:', error);
            return null;
        }
    },

    // NEW: Update Booking Status
    async updateBookingStatus(housekeeperId, bookingId, newStatus) {
        console.log(`[Firestore] Updating status for booking ${bookingId} for housekeeper ${housekeeperId} to ${newStatus}`);
        if (!housekeeperId || !bookingId || !newStatus) {
            console.error('[Firestore] updateBookingStatus requires housekeeperId, bookingId, and newStatus.');
            throw new Error('Missing required parameters for updating booking status.');
        }

        const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed', 'rejected']; // Add other valid statuses as needed
        if (!validStatuses.includes(newStatus)) {
            console.error(`[Firestore] Invalid status provided: ${newStatus}`);
            throw new Error('Invalid booking status provided.');
        }

        try {
            const bookingRef = db.collection('users').doc(housekeeperId).collection('bookings').doc(bookingId);
            await bookingRef.update({
                status: newStatus,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log(`[Firestore] Booking ${bookingId} status updated successfully to ${newStatus}.`);
            return { success: true };
        } catch (error) {
            console.error(`[Firestore] Error updating booking status for ${bookingId}:`, error);
            // Check for not-found error
            if (error.code === 'not-found') {
                 throw new Error('Booking not found.');
            }
            throw error; // Re-throw other errors
        }
    },

    // --- NEW: Update Booking Note --- 
    async updateBookingNote(housekeeperId, bookingId, newNote) {
        console.log(`[Firestore] Updating BookingNote for housekeeper ${housekeeperId}, booking ${bookingId}`);
        if (!housekeeperId || !bookingId || newNote === undefined || newNote === null) {
            console.error('[Firestore] updateBookingNote called with invalid IDs or note');
            throw new Error('Invalid arguments for updating booking note.');
        }
        try {
            const bookingRef = db.collection('users').doc(housekeeperId).collection('bookings').doc(bookingId);
            await bookingRef.update({
                BookingNote: newNote,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('[Firestore] BookingNote updated successfully');
            return true;
        } catch (error) {
            console.error('[Firestore] Error updating BookingNote:', error);
            throw error;
        }
    },

    // --- NEW: Update Housekeeper Internal Note (on Client doc) --- 
    async updateHousekeeperInternalNote(housekeeperId, clientId, newNote) {
        console.log(`[Firestore] Updating HousekeeperInternalNote for housekeeper ${housekeeperId}, client ${clientId}`);
        if (!housekeeperId || !clientId || newNote === undefined || newNote === null) {
            console.error('[Firestore] updateHousekeeperInternalNote called with invalid IDs or note');
            throw new Error('Invalid arguments for updating housekeeper internal note.');
        }
        try {
            const clientRef = db.collection('users').doc(housekeeperId).collection('clients').doc(clientId);
            await clientRef.update({
                HousekeeperInternalNote: newNote,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('[Firestore] HousekeeperInternalNote updated successfully');
            return true;
        } catch (error) {
            console.error('[Firestore] Error updating HousekeeperInternalNote:', error);
            throw error;
        }
    },

    // ---- TIME OFF ----
    async getTimeOffDates(userId, startDateString, endDateString) {
        console.log(`[Firestore] Getting time off dates for ${userId} between ${startDateString} and ${endDateString}`);
        if (!userId || !startDateString || !endDateString) {
            console.error('[Firestore] getTimeOffDates requires userId, startDateString, and endDateString.');
            throw new Error('Invalid input for getting time off dates.');
        }
        try {
            const timeOffRef = db.collection('users').doc(userId).collection('timeOffDates');
            // Firestore queries on document IDs require range filters
            const snapshot = await timeOffRef
                .where(firebase.firestore.FieldPath.documentId(), '>=', startDateString)
                .where(firebase.firestore.FieldPath.documentId(), '<=', endDateString)
                .get();
            
            const dates = [];
            snapshot.forEach(doc => {
                // Optionally check a field if the document might exist but represent something else
                // if (doc.data()?.isTimeOff === true) { 
                   dates.push(doc.id); // doc.id is the 'YYYY-MM-DD' string
                // }
            });
            console.log('[Firestore] Found time off dates:', dates);
            return dates;
        } catch (error) {
            console.error('[Firestore] Error getting time off dates:', error);
            throw error; // Re-throw the error
        }
    },

    async addTimeOffDate(userId, dateString) {
        console.log(`[Firestore] Adding time off for ${userId} on ${dateString}`);
        if (!userId || !dateString) {
             console.error('[Firestore] addTimeOffDate requires userId and dateString.');
            throw new Error('Invalid input for adding time off date.');
        }
        // Validate dateString format YYYY-MM-DD (basic check)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
             console.error('[Firestore] Invalid dateString format for addTimeOffDate:', dateString);
             throw new Error('Invalid date format. Use YYYY-MM-DD.');
        }
         try {
            const timeOffDocRef = db.collection('users').doc(userId).collection('timeOffDates').doc(dateString);
            // Set document with a field indicating it's time off
            await timeOffDocRef.set({ 
                isTimeOff: true, 
                addedAt: firebase.firestore.FieldValue.serverTimestamp() 
            }); 
            console.log('[Firestore] Successfully added time off date.');
            return true;
        } catch (error) {
            console.error('[Firestore] Error adding time off date:', error);
            throw error;
        }
    },

    async removeTimeOffDate(userId, dateString) {
        console.log(`[Firestore] Removing time off for ${userId} on ${dateString}`);
         if (!userId || !dateString) {
             console.error('[Firestore] removeTimeOffDate requires userId and dateString.');
            throw new Error('Invalid input for removing time off date.');
        }
         // Validate dateString format YYYY-MM-DD (basic check)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
             console.error('[Firestore] Invalid dateString format for removeTimeOffDate:', dateString);
             throw new Error('Invalid date format. Use YYYY-MM-DD.');
        }
        try {
            const timeOffDocRef = db.collection('users').doc(userId).collection('timeOffDates').doc(dateString);
            await timeOffDocRef.delete();
            console.log('[Firestore] Successfully removed time off date.');
            return true;
        } catch (error) {
            console.error('[Firestore] Error removing time off date:', error);
             // Handle specific errors like 'not-found' if needed, otherwise re-throw
             if (error.code === 'not-found') {
                console.warn('[Firestore] Tried to remove time off date that did not exist:', dateString);
                return false; // Or true depending on desired behavior (idempotency)
            }
            throw error;
        }
    },
    
    // ---- SETTINGS ----
    // Constants for settings structure

    // --- NEW: Get Booking Details ---
    async getBookingDetails(housekeeperId, bookingId) {
        console.log(`[Firestore] Getting booking details for housekeeper ${housekeeperId}, booking ${bookingId}`);
        if (!housekeeperId || !bookingId) {
            console.error('[Firestore] getBookingDetails called with invalid IDs');
            return null;
        }
        try {
            const bookingRef = db.collection('users').doc(housekeeperId).collection('bookings').doc(bookingId);
            const doc = await bookingRef.get();
            if (doc.exists) {
                console.log('[Firestore] Booking details found:', doc.data());
                // Return data including the ID
                return { id: doc.id, ...doc.data() }; 
            } else {
                console.warn(`[Firestore] No booking document found at users/${housekeeperId}/bookings/${bookingId}`);
                return null;
            }
        } catch (error) {
            console.error('[Firestore] Error getting booking details:', error);
            return null;
        }
    },

    // NEW FUNCTION for booking REQUESTS status update
    async updateBookingRequestStatus(housekeeperId, requestId, newStatus, additionalData = {}) {
        console.log(`[Firestore] Updating booking REQUEST status for housekeeper ${housekeeperId}, request ${requestId} to ${newStatus}`);
        if (!housekeeperId || !requestId || !newStatus) {
            console.error('[Firestore] updateBookingRequestStatus called with invalid IDs or status');
            throw new Error('Missing required fields to update booking request status.');
        }
        try {
            const requestRef = db.collection('users').doc(housekeeperId)
                                 .collection('bookingRequests').doc(requestId);
            
            const updatePayload = {
                status: newStatus,
                lastUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                ...additionalData
            };

            await requestRef.update(updatePayload);
            console.log(`[Firestore] Booking request ${requestId} status updated to ${newStatus} successfully.`);
            return { success: true, requestId: requestId, newStatus: newStatus };
        } catch (error) {
            console.error(`[Firestore] Error updating booking request ${requestId} status:`, error);
            throw error; // Re-throw to be caught by caller
        }
    },

    // NEW: Get a single service document for a housekeeper
    async getServiceDetails(housekeeperId, serviceId) {
        console.log(`[Firestore] Getting service details for housekeeper ${housekeeperId}, service ${serviceId}`);
        if (!housekeeperId || !serviceId) {
            console.error('[Firestore] getServiceDetails called with invalid IDs');
            return null;
        }
        try {
            const serviceRef = db.collection('users').doc(housekeeperId).collection('services').doc(serviceId);
            const doc = await serviceRef.get();
            if (doc.exists) {
                const serviceData = { id: doc.id, ...doc.data() };
                console.log('[Firestore] Service details found:', serviceData);
                return serviceData;
            } else {
                console.warn(`[Firestore] No service document found at users/${housekeeperId}/services/${serviceId}`);
                return null;
            }
        } catch (error) {
            console.error('[Firestore] Error getting service details:', error);
            return null;
        }
    },
};

// Ensure firestoreService is available globally if that is the project pattern
if (typeof window !== 'undefined' && !window.firestoreService) {
    window.firestoreService = firestoreService;
    console.log('[Firestore Service] Attached to window object.');
} 