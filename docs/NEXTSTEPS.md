# Next Steps

This file tracks the upcoming major tasks and improvements for the Housekeeping App.

## Tasks

1.  **Switch from Tailwind CSS CDN to Local Build Process:**
    *   **Goal:** Improve performance, enable offline styling, reduce dependency on external CDN, and prepare for potential mobile app wrapping.
    *   **Steps:**
        *   Initialize npm (`package.json`) in the project root.
        *   Install `tailwindcss`, `postcss`, `autoprefixer` as dev dependencies.
        *   Create `tailwind.config.js` and configure `content` paths (HTML/JS files).
        *   Create `postcss.config.js`.
        *   Create a source CSS file (e.g., `src/input.css`) with `@tailwind` directives.
        *   Add a build script to `package.json` (e.g., `"build:css": "tailwindcss -i ./src/input.css -o ./public/css/style.css --watch"`).
        *   Update all HTML files to link to the generated `/css/style.css` instead of the CDN link.
        *   Run the build script during development.

*   **(Placeholder for next task)** 