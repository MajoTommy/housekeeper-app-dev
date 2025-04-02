# UI Components

### Key UI Principles

- **Mobile-first responsive design:** Design primarily for small screens, using Tailwind's responsive prefixes (`sm:`, `md:`, etc.) to adapt layout and styling for larger viewports.
- **Large touch targets:** Ensure interactive elements like buttons and list items are easy to tap by using sufficient padding utilities (e.g., `p-3`, `py-2 px-4`).
- **Clear visual hierarchy:** Use Tailwind's typography (size, weight) and spacing utilities (`m-`, `p-`) consistently.
- **Consistent navigation patterns:** Use standardized components for navigation (like the footer menu).
- **Minimal cognitive load:** Keep interfaces clean and focused.

### 1. Simplicity
- Minimal interface, leveraging Tailwind's utility-first approach to avoid unnecessary custom CSS.
- Essential features only.
- Clear navigation.
- One-handed operation considerations (e.g., bottom actions).

### 2. Mobile First
- Touch-friendly interface (see Large Touch Targets).
- Bottom-positioned primary actions where appropriate.
- Ensure content is scrollable (`overflow-y-auto`) within containers if needed.

### 3. Quick Access
- Minimal taps to complete tasks.
- Important info visible without scrolling where possible.
- Clear call-to-action buttons (see Component Examples).
- Intuitive navigation.

### Interaction Principles
- Card-based list view (`bg-white rounded shadow p-4`).
- Detailed profiles possibly using tabs or sections.
- Quick action buttons.
- Inline editing capabilities (potentially using JS to toggle states/classes).
- Visual indicators for status (e.g., badges using `bg-green-100 text-green-700`).

### Common UI Elements
- Client/Appointment cards (See Component Examples).
- Action buttons (primary/secondary) (See Component Examples).
- Form inputs with labels (See Component Examples).
- Toggle switches (consider a JS library or custom styled checkbox).
- Search bars (`<input type="search">` styled like other inputs).
- Notification badges (`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium`).
- Blue date/time cards (`bg-blue-600 text-white p-3 rounded-lg`).
- Modals (potentially full screen or drawer style on mobile).

### Colors (Tailwind Palette Mapping)

Leverage the standard [Tailwind CSS color palette](https://tailwindcss.com/docs/customizing-colors#default-color-palette). Define custom colors in `tailwind.config.js` only if necessary.

- **Primary Interactive:** Blue shades (e.g., `bg-blue-600`, `text-white`, `hover:bg-blue-700`, `focus:ring-blue-500`). Adjust shade (500-700) based on visual need.
- **Secondary/Info Accents:** Lighter blues (e.g., `text-blue-700`, `bg-blue-100`, `border-blue-500`).
- **Backgrounds:** `bg-white` (cards, modals), `bg-gray-100` or `bg-slate-100` (page body).
- **Text:** `text-gray-900` or `text-slate-900` (primary), `text-gray-600` or `text-slate-600` (secondary), `text-gray-500` or `text-slate-500` (muted/placeholders).
- **Borders/Dividers:** `border-gray-200` or `divide-gray-200` (or slate equivalents).
- **Success:** `bg-green-100`, `text-green-700`, `border-green-300`.
- **Error/Danger:** `bg-red-100`, `text-red-700`, `border-red-300`.
- **Warning:** `bg-yellow-100`, `text-yellow-700`, `border-yellow-300`.

*Note: Specific shades (e.g., gray-100 vs slate-100) should be chosen and used consistently project-wide.* 

### Typography (Tailwind Utilities)

- **Font Family:** `font-sans` (Recommended). This uses the system default fonts stack (like SF Pro, Segoe UI, Roboto, etc.) which improves performance, avoids font loading issues (especially relevant for wrapped apps), and feels more native on each platform.
  *(If explicitly using Roboto, ensure it's loaded reliably - ideally self-hosted or via build process, not CDN - and configured in `tailwind.config.js` under `theme.extend.fontFamily.sans`)*
- **Weights:**
  - Regular: `font-normal` (Typically default for body text).
  - Medium: `font-medium` (Good for emphasis, subheadings, card titles).
  - Bold: `font-bold` (Good for main headings, primary button text).
- **Sizes (adjust based on visual hierarchy):**
  - Page Headings: `text-xl` (`1.25rem`), `text-2xl` (`1.5rem`).
  - Subheadings/Section Titles: `text-lg` (`1.125rem`).
  - Body/Standard: `text-base` (`1rem`, Default).
  - Small/Muted: `text-sm` (`0.875rem`).
  - Extra Small/Captions: `text-xs` (`0.75rem`).
- **Line Height:** `leading-normal` (1.5) or `leading-relaxed` (1.625). Apply where needed for readability, especially on longer text blocks.
- **Letter Spacing:** Default (`tracking-normal`) is usually best. Avoid excessive tracking changes.

### Key Component Examples

*These examples use placeholder color/spacing utilities. Refer to the defined palette and desired spacing.* 

#### Primary Button
```html
<button class="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
  Save Changes
</button>
```

#### Secondary Button (Outline)
```html
<button class="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
  Cancel
</button>
```

#### Input Field with Label
```html
<div class="mb-4">
  <label for="user-email" class="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
  <input type="email" id="user-email" name="email"
         class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
         placeholder="you@example.com">
</div>
```

#### Basic Card
```html
<div class="bg-white shadow rounded-lg p-4 mb-4">
  <h3 class="text-lg font-medium text-gray-900 mb-2">Client Name or Appointment</h3>
  <p class="text-sm text-gray-600 mb-1">Detail line 1 (e.g., Address or Date/Time)</p>
  <p class="text-sm text-gray-500">Detail line 2 (e.g., Phone or Status)</p>
  <!-- Optional Actions -->
  <div class="mt-3">
    <a href="#" class="text-blue-600 hover:text-blue-800 text-sm font-medium">View Details</a>
  </div>
</div>
```

### Build Process Note (Future)

*(This section to be finalized after switching from CDN)*
Currently using Tailwind via CDN. The plan is to switch to a local build process using `npm`, `tailwindcss`, `postcss`, and `autoprefixer`. This will involve:
- Generating a purged CSS file (`public/css/style.css`) based on class usage in HTML/JS files.
- Configuring `tailwind.config.js` (especially the `content` array).
- Running a build script (`npm run build:css`) during development.
This change is crucial for performance, offline capability, and preparing for mobile app wrapping.



