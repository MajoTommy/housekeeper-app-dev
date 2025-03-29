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

    // User Settings methods
    async getUserSettings(userId) {
        try {
            console.log('Getting settings for user:', userId);
            const doc = await db.collection('users').doc(userId).get();
            
            if (!doc.exists) {
                console.log('No user document found');
                return null;
            }
            
            const userData = doc.data();
            
            // Check if settings are in a nested field or directly in the document
            if (userData.settings) {
                console.log('Found settings in nested field');
                return userData.settings;
            } else {
                // For backward compatibility, return the parts of userData that would be settings
                console.log('Using settings from main document for backward compatibility');
                const settings = {
                    workingDays: userData.workingDays || {},
                    workingDaysCompat: userData.workingDaysCompat || {},
                    calculatedTimeSlots: userData.calculatedTimeSlots || [],
                    hourlyRate: userData.hourlyRate || 30,
                    autoSendReceipts: userData.autoSendReceipts || false
                };
                return settings;
            }
        } catch (error) {
            console.error('Error getting user settings:', error);
            return null;
        }
    },
    
    async updateUserSettings(userId, settingsData) {
        try {
            console.log('Updating settings for user:', userId);
            console.log('Settings data:', settingsData);
            
            // Include a timestamp
            const dataToUpdate = {
                settings: {
                    ...settingsData,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }
            };
            
            await db.collection('users').doc(userId).update(dataToUpdate);
            console.log('User settings updated successfully');
            return true;
        } catch (error) {
            console.error('Error updating user settings:', error);
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
                status: status
            });
            console.log('Appointment status updated successfully');
            return true;
        } catch (error) {
            console.error('Error updating appointment status:', error);
            return false;
        }
    },

    // Payment methods
    async createPayment(userId, paymentData) {
        try {
            const paymentRef = await db.collection('users').doc(userId).collection('payments').add({
                client_id: paymentData.client_id,
                client_name: paymentData.client_name,
                appointment_id: paymentData.appointment_id,
                amount: paymentData.amount,
                date: paymentData.date,
                status: paymentData.status || 'pending',
                payment_method: paymentData.payment_method || '',
                notes: paymentData.notes || '',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('Payment created successfully');
            return paymentRef.id;
        } catch (error) {
            console.error('Error creating payment:', error);
            return null;
        }
    },

    async getPendingPayments(userId) {
        try {
            const snapshot = await db.collection('users').doc(userId).collection('payments')
                .where('status', '==', 'pending')
                .orderBy('date', 'desc')
                .get();
            
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting pending payments:', error);
            return [];
        }
    }
}; 