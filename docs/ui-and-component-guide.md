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

### 4. Multi-Section Node Layout (Controls + Output)

To create complex nodes with multiple sections (e.g., control inputs, a growing output area, and a footer), a precise flexbox structure is required to prevent layout issues like misaligned connectors.

#### The Golden Rule
The single `div` that is the **direct child** of `<NodeLayout>` **must not** have `flex-1`. It should be a simple `flex flex-col` container. The `flex-1` property should only be used on elements *deeper inside* that container to make a specific section grow and fill the available space.

---

#### Correct Pattern:
This pattern ensures the `NodeLayout` frame correctly wraps the visible content, keeping connectors aligned.

```tsx
<NodeLayout {...props}>
  {/* ✅ CORRECT: Wrapper has flex-col, NO flex-1 */}
  <div className="flex h-full flex-col">
    {/* Section 1: Header/Controls (Fixed Height) */}
    <div className="shrink-0 p-2"> ... </div>

    {/* Section 2: Main Content (Grows and Scrolls) */}
    {/* ✅ CORRECT: flex-1 is used here, on the grandchild */}
    <div className="flex-1 overflow-auto p-2"> ... </div>

    {/* Section 3: Footer (Fixed Height) */}
    <div className="shrink-0 p-2"> ... </div>
  </div>
</NodeLayout>
```

#### Anti-Pattern (Causes Misaligned Connectors):
This incorrect pattern will cause the `NodeLayout` frame to stretch, misaligning the connectors.

```tsx
<NodeLayout {...props}>
  {/* ❌ INCORRECT: flex-1 on the direct child stretches the frame */}
  <div className="flex h-full flex-col flex-1">
    {/* ... content ... */}
  </div>
</NodeLayout>
```
---

#### CSS Class Cheatsheet

| Class      | When to Use                                                                 | Effect                                                         |
| :--------- | :-------------------------------------------------------------------------- | :------------------------------------------------------------- |
| `flex-1`   | On the **one section** you want to grow and fill available space (e.g., the output area). | The element will expand, pushing other sections to the edges.  |
| `shrink-0` | On sections that must maintain a fixed height (e.g., headers, footers, input areas). | The element will not shrink, even if content overflows.         |
| `h-full`   | On the main wrapper inside `NodeLayout`.                                    | Ensures the wrapper tries to fill the node's defined height.     |


-   **Typography**: For generated markdown content, use the `prose` classes for consistent typography (`prose prose-sm dark:prose-invert ...`).
-   **Skeleton Loaders**: Use `Skeleton` components with percentage-based widths (`w-[90%]`, `w-[75%]`) for more realistic loading states.

### 5. Node Resizing

-   **Intended Functionality**: Nodes can be made resizable by passing a `resizable: true` property in their default data. The `NodeResizer` component is implemented in `NodeLayout`. This works best when a node has a defined `width` and `height` in its data, which can be updated during the resize event.
-   **Best Practice**: While nodes *can* be made resizable, our architectural overhaul has shown that a more stable and predictable user experience is achieved with fixed-size nodes. The new best practice is to set `resizable: false` in `lib/node-buttons.ts`.
-   **Constraints**: For special cases where resizing is needed, the `NodeLayout` component now supports `minWidth`, `maxWidth`, `minHeight`, and `maxHeight` properties. These should be defined in the node's `data` prop in `lib/node-buttons.ts` to provide a constrained resizing experience.

---

## 6. Node Creation Guide (End-to-End)

This guide provides the definitive, end-to-end process for creating a new custom node that is fully compliant with the Easel UI system. Following these steps will prevent the common layout, sizing, and connector alignment issues.

### Core Principle: Consistent Sizing

The most common source of layout bugs is a mismatch between a node's initial properties (defined when it's created) and its internal default properties (defined in the component itself). These **must** be kept in sync.

1.  **Creation Properties (`lib/node-buttons.ts`)**: This file defines the node's properties when it's first dragged onto the canvas.
    ```ts
    // lib/node-buttons.ts
    {
      id: 'tiptap',
      label: 'Editor',
      data: {
        width: 680, // <-- Creation Width
        resizable: false,
      },
    },
    ```

2.  **Internal Defaults (`primitive.tsx`)**: The component itself has fallback values. These must match the creation properties.
    ```ts
    // components/nodes/editor/tiptap/primitive.tsx
    const width = (props.data as any)?.width ?? 680; // <-- Internal Fallback Width
    ```

**The Rule**: The `width` in `node-buttons.ts` must be identical to the fallback `width` in the component file. A mismatch will cause the node's outer frame and inner content to have different sizes, leading to alignment bugs.

### The Two Node Layout Patterns

Every node in Easel falls into one of two layout patterns. The first step is to decide which pattern your node needs.

1.  **Hug Content Pattern**: Use this when your node's size should be determined by its content. The node will grow or shrink vertically to fit what's inside it. Most nodes (`Text`, `Custom`, `Generator`) use this pattern.
2.  **Fill Frame Pattern**: Use this when your node needs to have a specific, fixed size, and the content inside should stretch to fill that frame. This is for special cases like the `Web Renderer` or `Tiptap` editor.

---

### Pattern 1: How to Build a "Hug Content" Node

Use this for nodes that should resize based on their content.

#### 1. The Golden Rule of Hug Content

> The single `div` that is the **direct child** of `<NodeLayout>` **must not** have `h-full` or `flex-1`. It must be a simple `flex flex-col` container. This allows the layout to correctly measure the content's height.

#### 2. Layout Skeleton

Your component's JSX structure must follow this skeleton.

```tsx
// components/nodes/your-node/primitive.tsx
import { NodeLayout } from '@/components/nodes/layout';

export const YourNodePrimitive = (props) => {
  return (
    <NodeLayout {...props} data={{ ...props.data, resizable: true /* or false */ }}>
      {/* Direct child: NO h-full or flex-1 */}
      <div className="flex flex-col gap-3 p-3">
        
        {/* Section 1 (Fixed height) */}
        <div className="shrink-0">
          {/* ... your controls, inputs, etc. ... */}
        </div>

        {/* Section 2 (Content-sized) */}
        <div className="min-h-[60px]">
          {/* ... your main content area ... */}
        </div>

        {/* Section 3 (Fixed height) */}
        <div className="shrink-0">
          {/* ... your footer, textareas, etc. ... */}
        </div>

      </div>
    </NodeLayout>
  );
};
```

#### 3. `NodeLayout` Contract

When calling `<NodeLayout>`, you **must not** pass a `height` in the `data` prop. The width is optional.

- **DO**: `<NodeLayout data={{ width: 480, resizable: false }}>`
- **DO NOT**: `<NodeLayout data={{ width: 480, height: 600, resizable: false }}>`

---

### Pattern 2: How to Build a "Fill Frame" Node

Use this for nodes that need a fixed size (e.g., an iframe or a fixed-size editor).

#### 1. The Golden Rule of Fill Frame

> The single `div` that is the **direct child** of `<NodeLayout>` **must** have `h-full`. This tells the content to stretch to the frame's height.

#### 2. Layout Skeleton

Your component's JSX structure must follow this skeleton.

```tsx
// components/nodes/your-node/primitive.tsx
import { NodeLayout } from '@/components/nodes/layout';

export const YourNodePrimitive = (props) => {
  // Pass the desired width and height to NodeLayout
  const nodeWidth = 1920;
  const nodeHeight = 1080;

  return (
    <NodeLayout {...props} data={{ ...props.data, width: nodeWidth, height: nodeHeight, resizable: false }}>
      {/* Direct child: MUST have h-full */}
      <div className="flex h-full flex-col gap-3 p-3">
        
        {/* Section 1 (Fixed height) */}
        <div className="shrink-0">
          {/* ... your controls, inputs, etc. ... */}
        </div>

        {/* Section 2 (Stretching Content) */}
        <div className="flex-1 overflow-auto rounded-xl border">
          {/* ... your iframe, editor, or other filling content ... */}
        </div>

      </div>
    </NodeLayout>
  );
};
```

#### 3. `NodeLayout` Contract

When calling `<NodeLayout>`, you **must** pass a `height` and `width` in the `data` prop.

- **DO**: `<NodeLayout data={{ width: 1920, height: 1080, resizable: false }}>`
- **DO NOT**: `<NodeLayout data={{ width: 1920, resizable: false }}>`

---

### Post-Implementation Checklist

After creating or editing a node, verify the following:

- [ ] **Pattern Choice**: Did I choose the correct pattern ("Hug Content" or "Fill Frame")?
- [ ] **Golden Rule**: Is the direct child `div` of `<NodeLayout>` styled correctly for my chosen pattern?
- [ ] **`NodeLayout` Data**: Am I passing (or not passing) `height` in the `data` prop correctly for my chosen pattern?
- [ ] **Connectors & Label**: Are the left/right connectors and the bottom title label perfectly aligned with the node's frame, with no extra space?
- [ ] **Resizing (if applicable)**: If `resizable: true`, does dragging the handle correctly resize the node and its content?
- [ ] **No Visual Glitches**: Is there any unexpected empty space inside or outside the node's frame?

---

## Scrolling, Canvas Pan, and Size Constraints

Misconfigured scroll containers are a common source of bugs: the canvas pans instead of the node scrolling, node sections expand unexpectedly, or connectors misalign due to unconstrained growth. Use the patterns below to make scrolling predictable and keep the canvas static while interacting with a node.

### Why this happens
- The canvas listens to pointer/gesture events. If inner scrollable areas do not stop propagation, the canvas interprets wheel/drag as pan/zoom.
- Flex children without proper constraints (min-h-0, overflow-auto) will stretch instead of scroll, pushing the node frame and connectors.
- Nodes without min/max limits can grow beyond intended bounds during content spikes.

### Rules to follow (always)
- Direct child of `NodeLayout`:
  - Hug Content pattern: `flex flex-col` (no `h-full` / `flex-1`).
  - Fill Frame pattern: `flex h-full flex-col`.
- Scrollable sections:
  - Add `min-h-0 overflow-auto` to the scroll region.
  - Add `nowheel nodrag nopan` and stop propagation on pointer down.
- Prevent page/canvas gestures inside nodes:
  - On scrollable wrappers and text inputs, add `onPointerDown={(e) => e.stopPropagation()}`.
- Keep sizes consistent across creation and runtime:
  - Define `width`, `height`, `resizable`, and (when needed) `minWidth`, `maxWidth`, `minHeight`, `maxHeight` in both `lib/node-buttons.ts` and the node component defaults.

### Canonical Fill Frame layout with scrolling
```tsx
<NodeLayout id={id} data={{ width: 680, height: 520, resizable: false }}>
  {/* Direct child must fill the frame */}
  <div className="flex h-full flex-col min-h-0 p-3">
    {/* Fixed header */}
    <div className="shrink-0 rounded-2xl border bg-white p-2">…</div>

    {/* Scrollable content area */}
    <div
      className="nowheel nodrag nopan flex-1 min-h-0 overflow-auto rounded-2xl border bg-white p-3"
      onPointerDown={(e) => e.stopPropagation()}
    >
      …
    </div>

    {/* Fixed footer / inputs (may scroll if tall) */}
    <Textarea
      className="nowheel nodrag nopan shrink-0 max-h-48 overflow-auto rounded-none border-x-0 border-b-0 border-t"
      onPointerDown={(e) => e.stopPropagation()}
      rows={5}
    />
  </div>
</NodeLayout>
```

### Canonical Hug Content layout with a scrollable section
```tsx
<NodeLayout id={id} data={{ width: 560, resizable: false }}>
  {/* Direct child hugs content; do NOT add flex-1/h-full here */}
  <div className="flex flex-col gap-3 p-3">
    <div className="shrink-0">…controls…</div>
    <div
      className="nowheel nodrag nopan max-h-80 overflow-auto rounded-xl border bg-white"
      onPointerDown={(e) => e.stopPropagation()}
    >
      …content…
    </div>
    <div className="shrink-0">…footer…</div>
  </div>
</NodeLayout>
```

### Node constraints (min/max) and resizing
- If a node is resizable, pass limits through `data` and let `NodeLayout` forward them to `NodeResizer`:
```ts
// lib/node-buttons.ts
{
  id: 'example',
  label: 'Example',
  data: { width: 720, height: 480, resizable: true, minWidth: 480, maxWidth: 1280, minHeight: 360, maxHeight: 960 }
}
```
```tsx
// components/nodes/example/primitive.tsx
<NodeLayout data={{ ...data, width: data.width ?? 720, height: data.height ?? 480, resizable: true, minWidth: 480, maxWidth: 1280, minHeight: 360, maxHeight: 960 }}>
  …
</NodeLayout>
```
- Keep these values identical between creation defaults and component fallbacks to avoid frame/content mismatches.

### Prevent whole‑page zoom when pinching on the canvas
If two‑finger pinch gestures zoom the browser instead of the canvas:
- Wrap the canvas in `touch-none overscroll-contain` and add non‑passive wheel/gesture listeners to prevent default when `e.ctrlKey` (macOS pinch reports as ctrl+wheel) or Safari `gesture*` events fire.

```tsx
const containerRef = useRef<HTMLDivElement>(null);
useEffect(() => {
  const el = containerRef.current; if (!el) return;
  const onWheel = (e: WheelEvent) => { if (e.ctrlKey) e.preventDefault(); };
  const onGesture = (e: Event) => e.preventDefault();
  el.addEventListener('wheel', onWheel, { passive: false });
  el.addEventListener('gesturestart', onGesture as any, { passive: false });
  el.addEventListener('gesturechange', onGesture as any, { passive: false });
  el.addEventListener('gestureend', onGesture as any, { passive: false });
  return () => {
    el.removeEventListener('wheel', onWheel as any);
    el.removeEventListener('gesturestart', onGesture as any);
    el.removeEventListener('gesturechange', onGesture as any);
    el.removeEventListener('gestureend', onGesture as any);
  };
}, []);
```

Following these rules eliminates canvas‑pan on scroll, keeps nodes within predictable bounds, and maintains connector alignment across all node types.

---

## Node Toolbar (Toggle) and Node Registry

The vertical toggle palette on the canvas is fully data‑driven. Adding/removing a node type involves two places:

1) The palette list (what appears in the toggle) — `lib/node-buttons.ts`
2) The node registry (how a type id resolves to a React component) — `components/nodes/index.tsx`

### 1) Add a node to the palette
Edit `lib/node-buttons.ts` and add an entry to the exported `nodeButtons` array. Each entry defines:
- `id`: unique type id (used by React Flow and the registry)
- `label`: display name in the palette tooltip/menu
- `icon`: a `lucide-react` (or app) icon component
- `data`: default node data at creation time (width/height/constraints/etc.)

Example (Hug Content):
```ts
// lib/node-buttons.ts
import { FileTextIcon } from 'lucide-react';

export const nodeButtons = [
  // …existing nodes…
  {
    id: 'my-node',
    label: 'My Node',
    icon: FileTextIcon,
    data: {
      // Hug Content → omit height, only width
      width: 560,
      resizable: false,
    },
  },
];
```

Example (Fill Frame):
```ts
{
  id: 'renderer',
  label: 'Renderer',
  icon: GlobeIcon,
  data: {
    width: 1280,
    height: 720,
    resizable: true,
    minWidth: 640,
    maxWidth: 1920,
    minHeight: 360,
    maxHeight: 1080,
  },
}
```

Sizing must match your component’s internal defaults (see “Consistent Sizing” above). If the palette says `width: 1280` and the component falls back to `width: 1024`, you will see frame/content mismatches.

### 2) Register the node component
Map the `id` to a component in `components/nodes/index.tsx` so the canvas can render it:
```tsx
// components/nodes/index.tsx
import { MyNode } from './my-node';

export const nodeTypes = {
  // …existing types…
  'my-node': MyNode,
};
```

The component is expected to follow one of the two patterns:
- Hug Content: `<NodeLayout data={{ ...data, width, resizable }}>` and direct child is `flex flex-col`
- Fill Frame: `<NodeLayout data={{ ...data, width, height, resizable }}>` and direct child is `flex h-full flex-col`

### 3) Verify in the palette
The toggle palette reads directly from `nodeButtons`. If your node doesn’t appear:
- Ensure the `id` is unique
- Ensure the icon is imported and valid
- Ensure the `nodeTypes` registry includes your id
- Check that any feature flags aren’t filtering the item (if you add such logic)

### Quick checklist when adding a node
- [ ] Add to `nodeButtons` with matching size defaults (and min/max if resizable)
- [ ] Register in `components/nodes/index.tsx`
- [ ] Choose correct pattern and apply the Golden Rule for the direct child
- [ ] Configure scroll regions with `min-h-0 overflow-auto` + `nowheel nodrag nopan` + `onPointerDown` stopPropagation
- [ ] Confirm connectors/label align, and that the canvas doesn’t pan when scrolling inside the node

---

## Window Chrome and Fullscreen Mode

NodeLayout provides optional window chrome and a true fullscreen mode that overlays the entire page. This is controlled per‑node via simple data flags. You can enable it at creation time (in `lib/node-buttons.ts`) and/or in the node’s component defaults.

### Flags (data)
- `fullscreenSupported?: boolean` (default: true)
  - Enables the window control (↗︎) and context‑menu item to enter fullscreen.
  - Set to `false` to hide fullscreen controls entirely.
- `fullscreenOnly?: boolean` (default: false)
  - When true, the node shows a gate screen until the user enters fullscreen. Useful for nodes that require maximum canvas space.

These flags live in the node’s `data` object alongside `width`, `height`, and `resizable`.

### How it behaves
- Enter/exit fullscreen via:
  - The inline window control (top‑right of the node) OR
  - The node’s context menu → “Enter fullscreen” / “Exit fullscreen”
- Fullscreen renders in a React portal to `document.body` (not inside the canvas), so it truly overlays the app with a green frame and a circular green exit button (white X) in the top‑right.
- While fullscreen is active, inline chrome and the floating toolbar are hidden to avoid stacked buttons.
- Fill Frame nodes expand to the overlay bounds; Hug Content nodes keep content sized as authored.

### Example: enable fullscreen for a node (palette defaults)
```ts
// lib/node-buttons.ts
{
  id: 'renderer',
  label: 'Renderer',
  icon: GlobeIcon,
  data: {
    width: 1280,
    height: 720,
    resizable: false,
    fullscreenSupported: true,   // enable in chrome and context menu
    fullscreenOnly: false,       // show content without gating
  },
}
```

### Example: enable fullscreen‑only from the component
```tsx
// components/nodes/your-node/primitive.tsx
export const YourNode = (props: Props) => {
  const width = props.data?.width ?? 800;
  const height = props.data?.height ?? 600;
  return (
    <NodeLayout
      {...props}
      data={{
        ...props.data,
        width,
        height,
        fullscreenSupported: true,
        fullscreenOnly: true,   // gate until user chooses fullscreen
      }}
    >
      {/* Your content goes here */}
    </NodeLayout>
  );
};
```

### UX guidelines
- Use `fullscreenOnly: true` for experiences that need uninterrupted focus (e.g., complex editors, renderers).
- Keep sizing rules consistent: the palette (`lib/node-buttons.ts`) width/height must match your internal component defaults to avoid frame/content mismatch.
- Fill Frame nodes typically work best in fullscreen. Ensure the direct child `div` of `<NodeLayout>` uses `flex h-full flex-col`.

### Troubleshooting
- “Fullscreen only fills the node, not the page”: ensure the overlay is not blocked by transforms. NodeLayout renders the fullscreen overlay into a portal (`document.body`) for this reason.
- “I see two X buttons in the corner”: the inline chrome is hidden during fullscreen; if you implement additional buttons, hide them when fullscreen is active.
