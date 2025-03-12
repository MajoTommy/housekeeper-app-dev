// Test script for data integrity
document.addEventListener('DOMContentLoaded', function() {
    console.log('Data integrity test script loaded');
    
    // Check if we're in test mode
    const urlParams = new URLSearchParams(window.location.search);
    const testMode = urlParams.get('test');
    
    if (testMode !== 'data-integrity') {
        console.log('Not in test mode. Add ?test=data-integrity to URL to run tests.');
        return;
    }
    
    // Create test container
    const testContainer = document.createElement('div');
    testContainer.className = 'p-4 m-4 bg-white rounded-lg shadow';
    testContainer.innerHTML = `
        <h2 class="text-xl font-bold mb-4">Data Integrity Tests</h2>
        <div id="test-results" class="space-y-2"></div>
        <div class="mt-4">
            <button id="run-tests" class="bg-primary text-white px-4 py-2 rounded">Run Tests</button>
        </div>
    `;
    document.body.appendChild(testContainer);
    
    // Set up test runner
    document.getElementById('run-tests').addEventListener('click', runTests);
});

// Function to run all tests
async function runTests() {
    const resultsContainer = document.getElementById('test-results');
    resultsContainer.innerHTML = '<p>Running tests...</p>';
    
    const testResults = [];
    
    // Test client validation
    testResults.push(await testClientValidation());
    
    // Test booking validation
    testResults.push(await testBookingValidation());
    
    // Test client references in bookings
    testResults.push(await testClientReferences());
    
    // Display results
    resultsContainer.innerHTML = testResults.map(result => `
        <div class="p-3 ${result.passed ? 'bg-green-100 border-green-300' : 'bg-red-100 border-red-300'} border rounded">
            <div class="flex items-center">
                <div class="mr-2">
                    ${result.passed 
                        ? '<i class="fas fa-check-circle text-green-500"></i>' 
                        : '<i class="fas fa-times-circle text-red-500"></i>'}
                </div>
                <div>
                    <h3 class="font-medium">${result.name}</h3>
                    <p class="text-sm">${result.message}</p>
                    ${result.details ? `<pre class="mt-2 text-xs bg-gray-100 p-2 rounded">${result.details}</pre>` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

// Test client validation
async function testClientValidation() {
    try {
        console.log('Testing client validation...');
        
        // Import the validation function if it exists
        if (typeof validateClientData !== 'function') {
            return {
                name: 'Client Validation',
                passed: false,
                message: 'validateClientData function not found'
            };
        }
        
        // Test cases
        const testCases = [
            {
                data: {
                    firstName: 'John',
                    lastName: 'Doe',
                    phone: '555-123-4567',
                    email: 'john.doe@example.com'
                },
                shouldPass: true,
                description: 'Valid client data'
            },
            {
                data: {
                    firstName: '',
                    lastName: 'Doe',
                    phone: '555-123-4567',
                    email: 'john.doe@example.com'
                },
                shouldPass: false,
                description: 'Missing first name'
            },
            {
                data: {
                    firstName: 'John',
                    lastName: 'Doe',
                    phone: 'invalid-phone',
                    email: 'john.doe@example.com'
                },
                shouldPass: false,
                description: 'Invalid phone number'
            },
            {
                data: {
                    firstName: 'John',
                    lastName: 'Doe',
                    phone: '555-123-4567',
                    email: 'invalid-email'
                },
                shouldPass: false,
                description: 'Invalid email'
            }
        ];
        
        // Run test cases
        const results = testCases.map(testCase => {
            const validation = validateClientData(testCase.data);
            const passed = validation.isValid === testCase.shouldPass;
            
            return {
                description: testCase.description,
                passed: passed,
                validation: validation
            };
        });
        
        // Check if all tests passed
        const allPassed = results.every(result => result.passed);
        
        return {
            name: 'Client Validation',
            passed: allPassed,
            message: allPassed ? 'All client validation tests passed' : 'Some client validation tests failed',
            details: JSON.stringify(results, null, 2)
        };
    } catch (error) {
        console.error('Error testing client validation:', error);
        return {
            name: 'Client Validation',
            passed: false,
            message: 'Error testing client validation',
            details: error.toString()
        };
    }
}

// Test booking validation
async function testBookingValidation() {
    try {
        console.log('Testing booking validation...');
        
        // Import the validation function if it exists
        if (typeof validateBookingData !== 'function') {
            return {
                name: 'Booking Validation',
                passed: false,
                message: 'validateBookingData function not found'
            };
        }
        
        // Test cases
        const testCases = [
            {
                data: {
                    date: '2023-05-15',
                    startTime: '9:00 AM',
                    endTime: '12:00 PM',
                    frequency: 'weekly'
                },
                shouldPass: true,
                description: 'Valid booking data'
            },
            {
                data: {
                    date: '',
                    startTime: '9:00 AM',
                    endTime: '12:00 PM',
                    frequency: 'weekly'
                },
                shouldPass: false,
                description: 'Missing date'
            },
            {
                data: {
                    date: '2023-05-15',
                    startTime: '9:00',
                    endTime: '12:00 PM',
                    frequency: 'weekly'
                },
                shouldPass: false,
                description: 'Invalid start time format'
            },
            {
                data: {
                    date: '2023-05-15',
                    startTime: '12:00 PM',
                    endTime: '9:00 AM',
                    frequency: 'weekly'
                },
                shouldPass: false,
                description: 'End time before start time'
            }
        ];
        
        // Run test cases
        const results = testCases.map(testCase => {
            const validation = validateBookingData(testCase.data);
            const passed = validation.isValid === testCase.shouldPass;
            
            return {
                description: testCase.description,
                passed: passed,
                validation: validation
            };
        });
        
        // Check if all tests passed
        const allPassed = results.every(result => result.passed);
        
        return {
            name: 'Booking Validation',
            passed: allPassed,
            message: allPassed ? 'All booking validation tests passed' : 'Some booking validation tests failed',
            details: JSON.stringify(results, null, 2)
        };
    } catch (error) {
        console.error('Error testing booking validation:', error);
        return {
            name: 'Booking Validation',
            passed: false,
            message: 'Error testing booking validation',
            details: error.toString()
        };
    }
}

// Test client references in bookings
async function testClientReferences() {
    try {
        console.log('Testing client references in bookings...');
        
        // This test requires Firebase access, so we'll simulate it
        const mockSaveBooking = async (clientId) => {
            // Simulate the saveBooking function
            const user = firebase.auth().currentUser;
            if (!user) {
                throw new Error('User not logged in');
            }
            
            // Get client details
            let clientDetails = {};
            if (clientId) {
                try {
                    const clientDoc = await firebase.firestore().collection('users').doc(user.uid)
                        .collection('clients').doc(clientId).get();
                    
                    if (clientDoc.exists) {
                        const clientData = clientDoc.data();
                        
                        // Check if we're using the enhanced client details structure
                        clientDetails = {
                            clientId: clientId,
                            clientFirstName: clientData.firstName || '',
                            clientLastName: clientData.lastName || '',
                            clientAddress: clientData.address || 
                                `${clientData.street || ''}, ${clientData.city || ''}, ${clientData.state || ''} ${clientData.zip || ''}`.trim(),
                            clientPhone: clientData.phone || '',
                            clientEmail: clientData.email || '',
                            accessInfo: clientData.accessInfo || clientData.notes || '',
                            propertyDetails: clientData.propertyDetails || '',
                            specialInstructions: clientData.specialInstructions || clientData.notes || '',
                            frequency: clientData.frequency || 'one-time',
                            price: clientData.price || null
                        };
                        
                        return {
                            success: true,
                            clientDetails: clientDetails
                        };
                    } else {
                        return {
                            success: false,
                            error: 'Client not found'
                        };
                    }
                } catch (error) {
                    return {
                        success: false,
                        error: error.toString()
                    };
                }
            } else {
                return {
                    success: true,
                    clientDetails: {}
                };
            }
        };
        
        // Try to get a real client ID for testing
        let testClientId = null;
        let testResult = null;
        
        try {
            const user = firebase.auth().currentUser;
            if (user) {
                const clientsSnapshot = await firebase.firestore().collection('users').doc(user.uid)
                    .collection('clients').limit(1).get();
                
                if (!clientsSnapshot.empty) {
                    testClientId = clientsSnapshot.docs[0].id;
                    testResult = await mockSaveBooking(testClientId);
                } else {
                    testResult = {
                        success: false,
                        error: 'No clients found for testing'
                    };
                }
            } else {
                testResult = {
                    success: false,
                    error: 'User not logged in'
                };
            }
        } catch (error) {
            testResult = {
                success: false,
                error: error.toString()
            };
        }
        
        // Evaluate the test result
        const passed = testResult.success && 
                      testResult.clientDetails && 
                      testResult.clientDetails.clientId === testClientId &&
                      testResult.clientDetails.clientFirstName !== undefined &&
                      testResult.clientDetails.clientLastName !== undefined;
        
        return {
            name: 'Client References in Bookings',
            passed: passed,
            message: passed ? 'Client references are correctly structured' : 'Client references test failed',
            details: JSON.stringify(testResult, null, 2)
        };
    } catch (error) {
        console.error('Error testing client references:', error);
        return {
            name: 'Client References in Bookings',
            passed: false,
            message: 'Error testing client references',
            details: error.toString()
        };
    }
} 