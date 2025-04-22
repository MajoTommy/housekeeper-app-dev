# Next Steps & Known Issues

This document tracks planned enhancements and known issues.

## Planned Enhancements

# Next Steps & Tasks

This document outlines the next development priorities and specific tasks.

## Immediate Priorities

1.  **Implement Stripe Connect Payouts Flow:**
    *   Add Payouts UI card back to `account.html`.
    *   Implement `updatePayoutsUI` function in `account.js` to display Stripe Connect account status from Firestore.
    *   Implement `handleManagePayoutsClick` function in `account.js`.
    *   Verify backend Cloud Functions (`createConnectOnboardingLink`, `createExpressDashboardLink`) are correctly implemented and configured (including dynamic return URLs and emulator `.env` secrets).
    *   Ensure webhook handler correctly processes `account.updated` events to update Firestore (`housekeeper_profiles`) with `stripeAccountId` and `stripeAccountStatus`.

*   **Error Handling & Edge Cases (Stripe):**
    *   Enhance error handling in the webhook handler.
    *   Handle various subscription statuses (`past_due`, `canceled`, etc.) in the backend and frontend UI.
*   **Production Deployment:**
    *   Replace test Stripe API keys (Publishable & Secret) with live keys.
    *   Configure the Live mode Stripe webhook endpoint.
*   **Build Process:**
    *   Address the Tailwind CSS CDN warning by integrating it into the build process (PostCSS or Tailwind CLI).

