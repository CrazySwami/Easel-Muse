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

---

## Node Component Design

All nodes on the canvas should follow a consistent architectural and styling pattern to ensure a cohesive user experience. The foundation of this pattern is the `NodeLayout` component.

### 1. Architectural Pattern (`NodeLayout`)

The `NodeLayout` component (`components/nodes/layout.tsx`) provides the essential "chrome" for all nodes, including the title, selection border, context menu, and toolbar. To achieve a flexible, content-driven height, nodes **must** pass their content as multiple direct children to `NodeLayout`.

**Correct Implementation:**

-   The first child should be the main content `div`.
-   The second child should be the `Textarea` for instructions.
-   **Do not** wrap these children in a single `div` or React `Fragment`, as this breaks the vertical stacking and divider logic provided by `NodeLayout`.

**Example (`text/transform.tsx`):**

```tsx
<NodeLayout id={id} data={data} title={title} type={type} toolbar={toolbar} className="w-80">
  {/* 1. Main Content Area */}
  <div className="nowheel h-full max-h-[30rem] flex-1 overflow-auto rounded-t-3xl rounded-b-xl bg-secondary/50 p-4">
    {/* Node-specific content (e.g., generated text, image, etc.) goes here */}
  </div>

  {/* 2. Instructions Textarea */}
  <Textarea
    placeholder="Add additional context or guidance"
    rows={3}
    className="shrink-0 resize-none rounded-none border-none bg-muted/30 ..."
  />
</NodeLayout>
```

### 2. Sizing and Spacing

-   **Content-Driven Height**: Nodes should **not** have a fixed `min-height`. `NodeLayout`'s height will be determined by the content within it.
-   **Flexible Content Area**: The main content `div` uses `flex-1`, allowing it to expand and fill any available vertical space.
-   **Fixed Instructions Area**: The `Textarea` uses `shrink-0` to maintain a fixed height (determined by its `rows` prop) and prevent it from being compressed.
-   **Empty State**: For transform nodes, the empty state `div` should have a `min-height` (e.g., `min-h-[180px]`) to ensure the node has a reasonable default size before content is generated.

### 3. Styling Conventions

-   **Backgrounds**: Use semi-transparent backgrounds to create a sense of depth.
    -   Main content: `bg-secondary/50`
    -   Instructions Textarea: `bg-muted/30`
-   **Typography**: For generated markdown content, use the `prose` classes for consistent typography (`prose prose-sm dark:prose-invert ...`).
-   **Skeleton Loaders**: Use `Skeleton` components with percentage-based widths (`w-[90%]`, `w-[75%]`) for more realistic loading states.

### 4. Node Resizing (Known Issue)

-   **Intended Functionality**: Nodes can be made resizable by passing a `resizable: true` property in their default data. The `NodeResizer` component is implemented in `NodeLayout`.
-   **Current Status**: As of the latest review, the resizing functionality is **not working as expected**. The resizer handles appear, but dragging them does not update the node's dimensions. This is a known issue pending further investigation.
