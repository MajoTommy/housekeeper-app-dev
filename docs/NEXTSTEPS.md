# Next Steps

This file tracks the upcoming major tasks and improvements for the Housekeeping App.

## Tasks

1.  **Switch from Tailwind CSS CDN to Local Build Process:**
    *   **Goal:** Improve performance, enable offline styling, reduce dependency on external CDN, and prepare for potential mobile app wrapping.
    *   **Status:** Pending
    *   **Steps:**
        *   Initialize npm (`package.json`) in the project root.
        *   Install `tailwindcss`, `postcss`, `autoprefixer` as dev dependencies.
        *   Create `tailwind.config.js` and configure `content` paths (HTML/JS files).
        *   Create `postcss.config.js`.
        *   Create a source CSS file (e.g., `src/input.css`) with `@tailwind` directives.
        *   Add a build script to `package.json` (e.g., `"build:css": "tailwindcss -i ./src/input.css -o ./public/css/style.css --watch"`).
        *   Update all HTML files to link to the generated `/css/style.css` instead of the CDN link.
        *   Run the build script during development.

2.  **Initial Mobile App Wrapper Test (iOS/Android):**
    *   **Goal:** Validate the core tech stack (JS + Firebase + Local Tailwind Build) within a native WebView environment early to identify blockers before further feature development.
    *   **Status:** Pending (Dependent on Task 1)
    *   **Prerequisites:** Task 1 completed (local Tailwind build).
    *   **Steps:**
        *   Choose a wrapper framework (Capacitor recommended).
        *   Install and configure the framework in the project.
        *   Perform basic builds for iOS (Xcode) and Android (Android Studio).
        *   Run the app on emulators/devices.
        *   **Verify:**
            *   App loads correctly.
            *   Styling (from local build) renders correctly.
            *   Basic Authentication (Login) works.
            *   Core data fetching from Firestore works (e.g., dashboard loads).
            *   Basic internal navigation/links function.

*   **(Placeholder for next task)** 