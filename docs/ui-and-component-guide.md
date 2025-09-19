# UI and Component Guide

This document outlines the key UI patterns, component implementations, and design principles used in the Easel application.

## Core Principles

- **Consistency:** UI elements should be consistent across the application. Reusable components should be preferred over one-off styles.
- **Clarity:** Interfaces should be intuitive and easy to understand.
- **Responsiveness:** All UI components and layouts must be fully responsive and functional on mobile devices.

---

## Key UI Components & Pages

### Projects Page (`/projects`)

The projects page serves as the main dashboard for authenticated users. It has been refactored to use a Shadcn UI data table for a more scalable and feature-rich experience.

- **Layout:** A clean, centered layout with a title, a "New Project" button, and the user's avatar menu.
- **Data Table (`ProjectList`):**
  - **Component:** `app/(authenticated)/projects/components/project-list.tsx`
  - **Features:**
    - **Filtering:** A search bar allows real-time filtering of projects by name.
    - **Clickable Rows:** The project name in each row is a direct link to the canvas.
    - **Actions Menu:** An actions menu (`...`) provides options for renaming and deleting projects.
- **Dialogs:** Project creation, renaming, and deletion are handled through Shadcn dialogs and alert dialogs to provide a non-disruptive user experience.

### Typography

The application uses a combination of sans-serif and serif fonts to create a clear visual hierarchy.

- **Headlines:** Major headlines (like on the homepage and pricing page) use the `Cormorant_Upright` serif font (defined as `font-serif`) with a `font-semibold` weight.
- **Body & UI:** All other text uses the `Geist` sans-serif font.

### Animations

Subtle animations are used to create a more engaging and polished user experience.

- **Pattern:** A standard `fade-up-in` animation is used for most entrance effects.
- **Implementation:** This is defined in `app/globals.css` and applied with staggered `animation-delay` inline styles to create a sequential loading effect on pages like the homepage and pricing page.
