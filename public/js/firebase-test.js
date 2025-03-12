// Firebase Test Script
console.log('Firebase Test Script loaded');

document.addEventListener('DOMContentLoaded', function() {
    // Create a test container
    const testContainer = document.createElement('div');
    testContainer.className = 'p-4 m-4 bg-white rounded-lg shadow';
    testContainer.innerHTML = `
        <h2 class="text-xl font-bold mb-4">Firebase Test</h2>
        <div id="firebase-test-results" class="space-y-2">
            <p>Testing Firebase configuration...</p>
        </div>
        <div class="mt-4">
            <button id="run-firebase-test" class="bg-primary text-white px-4 py-2 rounded">Run Test</button>
        </div>
    `;
    document.body.appendChild(testContainer);
    
    // Set up test runner
    document.getElementById('run-firebase-test').addEventListener('click', runFirebaseTest);
    
    // Run the test automatically
    setTimeout(runFirebaseTest, 1000);
});

// Function to run Firebase test
async function runFirebaseTest() {
    const resultsContainer = document.getElementById('firebase-test-results');
    resultsContainer.innerHTML = '<p>Running Firebase tests...</p>';
    
    const testResults = [];
    
    // Test 1: Check if Firebase is defined
    testResults.push({
        name: 'Firebase SDK Loaded',
        passed: typeof firebase !== 'undefined',
        message: typeof firebase !== 'undefined' 
            ? 'Firebase SDK is loaded' 
            : 'Firebase SDK is not loaded'
    });
    
    // If Firebase is not defined, we can't run the other tests
    if (typeof firebase === 'undefined') {
        displayResults(testResults);
        return;
    }
    
    // Test 2: Check if Firebase is initialized
    testResults.push({
        name: 'Firebase Initialized',
        passed: firebase.apps && firebase.apps.length > 0,
        message: firebase.apps && firebase.apps.length > 0 
            ? `Firebase is initialized with ${firebase.apps.length} app(s)` 
            : 'Firebase is not initialized'
    });
    
    // Test 3: Check if Firestore is available
    const firestoreAvailable = typeof firebase.firestore === 'function';
    testResults.push({
        name: 'Firestore Available',
        passed: firestoreAvailable,
        message: firestoreAvailable 
            ? 'Firestore is available' 
            : 'Firestore is not available'
    });
    
    // Test 4: Check if Auth is available
    const authAvailable = typeof firebase.auth === 'function';
    testResults.push({
        name: 'Auth Available',
        passed: authAvailable,
        message: authAvailable 
            ? 'Auth is available' 
            : 'Auth is not available'
    });
    
    // Test 5: Check if user is logged in
    if (authAvailable) {
        try {
            const user = firebase.auth().currentUser;
            testResults.push({
                name: 'User Logged In',
                passed: !!user,
                message: user 
                    ? `User is logged in with UID: ${user.uid}` 
                    : 'No user is logged in'
            });
        } catch (error) {
            testResults.push({
                name: 'User Logged In',
                passed: false,
                message: `Error checking user login: ${error.message}`
            });
        }
    }
    
    // Test 6: Try to access Firestore
    if (firestoreAvailable) {
        try {
            const db = firebase.firestore();
            testResults.push({
                name: 'Firestore Access',
                passed: true,
                message: 'Successfully created Firestore instance'
            });
            
            // Test 7: Try to query Firestore
            try {
                const user = firebase.auth().currentUser;
                if (user) {
                    const clientsRef = db.collection('users').doc(user.uid).collection('clients');
                    const snapshot = await clientsRef.limit(1).get();
                    
                    testResults.push({
                        name: 'Firestore Query',
                        passed: true,
                        message: `Successfully queried Firestore. Found ${snapshot.size} client(s).`
                    });
                } else {
                    testResults.push({
                        name: 'Firestore Query',
                        passed: false,
                        message: 'Cannot query Firestore: No user logged in'
                    });
                }
            } catch (queryError) {
                testResults.push({
                    name: 'Firestore Query',
                    passed: false,
                    message: `Error querying Firestore: ${queryError.message}`
                });
            }
        } catch (error) {
            testResults.push({
                name: 'Firestore Access',
                passed: false,
                message: `Error accessing Firestore: ${error.message}`
            });
        }
    }
    
    // Display the results
    displayResults(testResults);
}

// Function to display test results
function displayResults(testResults) {
    const resultsContainer = document.getElementById('firebase-test-results');
    
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
                </div>
            </div>
        </div>
    `).join('');
    
    // Add a summary
    const passedTests = testResults.filter(result => result.passed).length;
    const totalTests = testResults.length;
    
    resultsContainer.innerHTML += `
        <div class="mt-4 p-3 ${passedTests === totalTests ? 'bg-green-100' : 'bg-yellow-100'} rounded">
            <p class="font-medium">Summary: ${passedTests} of ${totalTests} tests passed</p>
        </div>
    `;
} 