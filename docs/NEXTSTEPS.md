# Next Steps & Known Issues

This document tracks planned enhancements and known issues.

## Planned Enhancements

# Next Steps & Tasks

This document outlines the next development priorities and specific tasks.

## Stripe Integration Completion (Subscription & Billing)

We have successfully implemented the initial Stripe Checkout flow for subscriptions. The following tasks remain to fully complete this feature:

1.  **Implement Stripe Webhook Handler:**
    *   Uncomment and complete the `stripeWebhookHandler` function skeleton in `functions/index.js`.
    *   Configure a Stripe Webhook Endpoint in the Stripe Dashboard (Test & Live modes) pointing to the function URL.
    *   Configure the Stripe Webhook Secret using Firebase Secret Manager.
    *   Implement Stripe webhook signature verification in the handler.
    *   Handle necessary events (`customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, etc.) to update Firestore (`housekeeper_profiles` collection) with `stripeSubscriptionStatus`, `stripePriceId`, `stripeSubscriptionId`, `stripeCurrentPeriodEnd`.

2.  **Refine Frontend Subscription Display (`account.js`):**
    *   Update `updateSubscriptionUI` to primarily use Firestore data (`stripeSubscriptionStatus`, etc.) for persistent display, not just the temporary URL parameter check.
    *   Map `stripePriceId` to a user-friendly plan name in the UI.
    *   Replace the `alert('Subscription successful!')` with a better UI notification.

3.  **Error Handling & Edge Cases:**
    *   Enhance error handling in the webhook handler.
    *   Handle various subscription statuses (`past_due`, `canceled`, etc.) in the backend and frontend UI.

4.  **Production Deployment:**
    *   Replace test Stripe API keys (Publishable & Secret) with live keys.
    *   Configure the Live mode Stripe webhook endpoint.

5.  **Build Process:**
    *   Address the Tailwind CSS CDN warning by integrating it into the build process (PostCSS or Tailwind CLI).

## Other Potential Tasks

*   [Add other future tasks or feature ideas here]
