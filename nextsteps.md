# Next Steps for Stripe Integration Debugging (As of End of Day, April 15)

## Current Status

1.  **UI:** The housekeeper settings page (`account.html`) now includes sections for "Subscription & Billing" and "Payouts". The UI correctly displays different states (e.g., "No active subscription" vs. active details, "Not Connected" vs. "Enabled" payouts) based on data fetched from the housekeeper's profile in Firestore.
2.  **Client-Side Logic:**
    *   `account.js` fetches the necessary profile data.
    *   It initializes Stripe.js using the Publishable Key.
    *   Event listeners are attached to the "Subscribe Now", "Manage Subscription", "Set Up Payouts", and "Manage Payouts / View Balance" buttons.
    *   These listeners call the corresponding deployed Firebase Cloud Functions using the V2 `httpsCallable` method.
    *   The correct Price ID is hardcoded for the "Subscribe Now" flow.
3.  **Cloud Functions:**
    *   Four V2 callable functions related to Stripe (`createSubscriptionCheckoutSession`, `createBillingPortalSession`, `createConnectOnboardingLink`, `createExpressDashboardLink`) have been added to `functions/index.js` and deployed successfully.
    *   Stripe SDK is initialized using the Secret Key configured via `firebase functions:config:set`.
4.  **Sample Data:** `populate-sample-data.js` and `dev-tools.html` have been updated to allow populating housekeeper profiles with either `null` Stripe fields or dummy "active"/"enabled" Stripe data for testing UI states.

## Current Problem

*   When logged in as a test housekeeper (with `null` Stripe fields) and clicking the **"Subscribe Now"** button:
    *   The frontend correctly calls the `createSubscriptionCheckoutSession` Cloud Function.
    *   The function call fails.
    *   The browser console shows **CORS errors** and `net::ERR_FAILED` (when testing locally).
    *   The user sees an `alert` box: **"Error starting subscription: internal"**.
*   **Diagnosis:** The CORS/network errors are symptoms related to local testing of a failing function call. The core issue is an **internal error occurring within the `createSubscriptionCheckoutSession` function** itself on the server-side.
*   **Ruled Out:** We've confirmed the test user has an email address in Firebase Auth, and the correct Stripe Price ID seems to be used in `account.js`.

## Immediate Next Step (Tomorrow)

1.  **Examine Detailed Cloud Function Logs:**
    *   Go to the **Firebase Console -> Functions -> Logs** tab OR the **Google Cloud Console Logs Explorer**.
    *   Filter for the **`createSubscriptionCheckoutSession`** function.
    *   Find the logs corresponding to the exact time the error occurred when clicking "Subscribe Now".
    *   **Identify the specific error message** logged *within* the function execution. This error likely comes from the Stripe API (e.g., `stripe.customers.create` or `stripe.checkout.sessions.create`) or indicates another problem within the function's logic.

## Potential Follow-Up Steps (Depending on Log Findings)

*   Adjust parameters passed to Stripe API calls (`stripe.customers.create`, `stripe.checkout.sessions.create`).
*   Verify Stripe API key permissions.
*   Debug any other logic errors within the Cloud Function.
*   Implement the Stripe Webhook handler (`stripeWebhookHandler`) to ensure Firestore data is updated after successful Stripe events. 