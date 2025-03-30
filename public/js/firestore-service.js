// Firestore Service
const db = firebase.firestore();

const firestoreService = {
    // User methods
    async createUserProfile(userId, userData) {
        try {
            await db.collection('users').doc(userId).set({
                name: userData.name || '',
                email: userData.email,
                phone: userData.phone || '',
                hourly_rate: userData.hourly_rate || 0,
                service_area: userData.service_area || '',
                working_hours: userData.working_hours || {},
                profile_picture: userData.profile_picture || '',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('User profile created successfully');
            return true;
        } catch (error) {
            console.error('Error creating user profile:', error);
            return false;
        }
    },

    async getUserProfile(userId) {
        try {
            const doc = await db.collection('users').doc(userId).get();
            if (doc.exists) {
                return doc.data();
            } else {
                console.log('No user profile found');
                return null;
            }
        } catch (error) {
            console.error('Error getting user profile:', error);
            return null;
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
    
    // Unified method to get user settings (Primary location only)
    async getUserSettings(userId) {
        try {
            console.log('Getting settings for user (Primary Only):', userId);
            
            // Try primary location
            let settings = await this.getSettingsFromPrimaryLocation(userId);
            
            // If still not found, create default settings
            if (!settings) {
                console.log('No settings found, creating defaults');
                settings = this.createStandardSettingsObject();
                
                // Save the default settings (only to primary location)
                await this.saveSettingsToPrimaryLocation(userId, settings);
            }
            
            // Ensure settings have correct structure before returning
            return this.normalizeSettingsObject(settings);
        } catch (error) {
            console.error('Error getting user settings:', error);
            // Return a default structure on error to prevent downstream issues
            return this.createStandardSettingsObject();
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
}; 