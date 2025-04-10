# Next Steps & Known Issues

This document tracks planned enhancements and known issues.

## Planned Enhancements

1.  **Tailwind CSS Build Process:**
    -   **Goal:** Switch from CDN to a local build process for Tailwind CSS for performance and purging.
    -   **Approach:** Set up `npm`, `tailwindcss`, `postcss`, `autoprefixer`. Configure `tailwind.config.js` and build scripts.
    -   **Status:** Pending.

2.  **(Minor)** **Tailwind CDN Warning:** The browser console shows a warning about using the Tailwind CDN in production. This will be resolved when switching to the local build process.