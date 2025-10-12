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
- “Fullscreen button does not appear”: the control only renders when `data.fullscreenSupported === true`.
  - Set the flag in BOTH places to be safe:
    - Palette defaults in `lib/node-buttons.ts` (so newly created nodes have it)
    - Component defaults in the node’s primitive via the `<NodeLayout data={...}>` call (so runtime always has it)
  - Existing nodes keep their original persisted `data`. Re‑add the node (or programmatically update its data) to pick up new flags.

---

## Node Data I/O (Incoming and Outgoing)

This section explains the minimal setup every node needs to output data for others to consume and to consume data from its incomers. It complements the deep dive in `docs/xyflow-data-consumption.md` and standardizes how nodes interoperate.

### Concepts
- Each node owns its `data` shape. The “Show data” dialog simply renders `JSON.stringify(node.data)`.
- Outputs are written by the node itself to `data` via `updateNodeData`. Consumers never reach into component state; they only read `node.data`.
- Consumption is done by reading incomers and using shared extractors in `lib/xyflow.ts` to return typed arrays (text, links, images, code, etc.).

### Producer (Outgoing) pattern
1) Pick a clear, stable data shape for what your node produces (e.g., `generated`, `outputTexts`, `outputLinks`).
2) Write results to `data` using `updateNodeData(id, { ... })` when work completes.
3) If you want other nodes to consume your output, add a small extractor to `lib/xyflow.ts` that returns a simple typed array.

Example: node writes an array of strings for downstream text consumption
```tsx
// inside your node component
updateNodeData(id, {
  outputTexts: titlesAndSnippets, // string[]
});
```

```ts
// lib/xyflow.ts — add an extractor
export const getTextFromYourNodes = (nodes: Node[]) =>
  nodes
    .filter((n) => n.type === 'your-node')
    .flatMap((n) => (n.data as any).outputTexts ?? [])
    .filter(Boolean) as string[];
```

Guidelines for producers
- Keep outputs small and typed (prefer arrays of strings/URLs/ids). Include rich detail elsewhere (e.g., in `generated`) but expose simple arrays for easy reuse.
- Namespaced fields prevent collisions (e.g., `generated`, `outputTexts`, `outputLinks`).
- Update palette defaults in `lib/node-buttons.ts` and keep component fallbacks identical (see “Consistent Sizing”).

### Consumer (Incoming) pattern
1) Read incomers.
2) Call one or more extractors from `lib/xyflow.ts`.
3) Combine/guard; handle partial data.

Example: seeding from incomers
```tsx
import { getIncomers } from '@xyflow/react';
import { getTextFromTextNodes, getMarkdownFromFirecrawlNodes, getTextFromTiptapNodes } from '@/lib/xyflow';

const incomers = getIncomers({ id }, getNodes(), getEdges());
const seedText = [
  ...getTextFromTextNodes(incomers),
  ...getMarkdownFromFirecrawlNodes(incomers),
  ...getTextFromTiptapNodes(incomers),
].filter(Boolean);
// use seedText as needed
```

Example: consuming a custom producer (texts + links)
```ts
import { getTextFromYourNodes } from '@/lib/xyflow';

const texts = getTextFromYourNodes(incomers); // string[]
```

### Where schemas live
- There is no global schema registry. Each node defines its own `data` interface in its component file, and writes to it with `updateNodeData`.
- Shared extractors in `lib/xyflow.ts` are the contract between producers and consumers. If you add a new producer type, add (or extend) an extractor there.

### Persistence and the Show Data dialog
- Whatever you put in `node.data` is saved with the project (React Flow’s `toObject()`), rehydrated on load, and shown in the “Show data” dialog.
- Design `data` for stability and backward compatibility. Prefer adding fields over renaming.

### Checklist for new nodes
- [ ] Define a clear `data` interface in the component
- [ ] Seed defaults in `lib/node-buttons.ts` and keep runtime fallbacks identical
- [ ] Write outputs into `data` (e.g., `generated`, `outputTexts`, `outputLinks`)
- [ ] Add/extend a `lib/xyflow.ts` extractor for any new output type
- [ ] Consume incomers with existing extractors; add new ones if needed
- [ ] Verify “Show data” displays the expected JSON

### Optional: custom connectors and UI interactions
- You can tailor how a node interacts with connected data and which connectors it exposes.
- Visual presentation is up to the node UI: e.g., display incoming sources, aggregate previews, or action buttons. Keep these read-only unless explicitly editable.

#### Connector toggles (per node)
`NodeLayout` supports two optional flags in `data` to control handles:

```ts
// In your node's `<NodeLayout data={...}>`
data={{
  ...props.data,
  allowIncoming: true,   // default true; set false to hide the left (target) handle
  allowOutgoing: true,   // default true; set false to hide the right (source) handle
}}
```

Example: make a node “output-only”

```tsx
<NodeLayout
  {...props}
  data={{ ...props.data, allowIncoming: false, allowOutgoing: true }}
>
  {/* … */}
</NodeLayout>
```

This is useful for nodes that only produce data (e.g., a search/fetch node) and should not accept incomers.

---

## SerpApi node (Google Search + AI Overview)

- Fill Frame pattern; defaults: `width: 1200`, `height: 800`, `resizable: false`.
- Modes: Single, Batch, AI Overview.
- Writes producer outputs:
  - `outputTexts`: array of `title — snippet`
  - `outputLinks`: array of URLs
- API proxies live under `/api/serpapi/*`. Set `SERPAPI_API_KEY` in env.
- Consumers can use helpers in `lib/xyflow.ts`:
  - `getTextFromSerpapiNodes(nodes)`
  - `getLinksFromSerpapiNodes(nodes)`

---

## Audio node UI and behavior

The `audio` node follows the Fill Frame pattern and provides two primary inputs with matched styling and a taller content area:

- Record column (left)
- Upload column (right)

Both sit inside a scrollable middle section with a fixed header and footer:

- Header: an "Auto transcribe" `Switch` (`data.autoTranscribe`), and a transient "Transcribing…" pill while work is in progress (`data.transcribing`).
- Footer: an audio preview (from `data.content.url`) and a transcript viewer (from `data.transcript`) with copy button.

Behavior:
- Recording writes an audio file to `data.content` and, if `autoTranscribe` is true, triggers transcription and writes `data.transcript`.
- Uploading validates type/size immediately in-node, writes to `data.content`, and, if `autoTranscribe` is true, transcribes and writes `data.transcript`.
- Allowed types shown in‑UI and enforced: MP3, WAV, WEBM, M4A/MP4, OGG. Max size 10MB.

Outputs and extractors:
- `data.content` is the produced audio file `{ url, type }`.
- `data.transcript` is the produced text.
- `lib/xyflow.ts#getAudioFromAudioNodes` returns audio files from `data.content`.
- `lib/xyflow.ts#getTranscriptionFromAudioNodes` returns transcripts.

Sizing defaults:
- Palette (`lib/node-buttons.ts`): `{ width: 840, height: 480, resizable: false }`.
- Component fallbacks mirror the same sizing in both `audio/primitive.tsx` and `audio/transform.tsx`.

---

## Image, Video, and Code node sizes

Keep palette defaults in `lib/node-buttons.ts` in sync with component fallbacks in the node primitives:

- Image: `width: 840`, `height: 560`, `resizable: false`
  - Palette: `image.data = { width: 840, height: 560, resizable: false }`
  - Component: `<NodeLayout data={{ ...data, width: data.width ?? 840, height: data.height ?? 560, resizable: false }}>`
- Video: `width: 1280`, `height: 720`, `resizable: false`
  - Palette: `video.data = { width: 1280, height: 720, resizable: false }`
  - Component: `<NodeLayout data={{ ...data, width: data.width ?? 1280, height: data.height ?? 720, resizable: false }}>`
- Code: `width: 920`, `height: 640`, `resizable: false`
  - Palette: `code.data = { width: 920, height: 640, resizable: false }`
  - Component: `<NodeLayout data={{ ...data, width: data.width ?? 920, height: data.height ?? 640, resizable: false }}>`

These sizes expand the working area while keeping frame/content sizes consistent to avoid connector misalignment. Adjust if needed, but always keep palette and component fallbacks identical.

---

## Dual‑Mode Nodes (Plain vs Generate)

Many nodes support two interaction modes:

- Plain mode: a lightweight input or preview UI (e.g., Text textarea, Image/Video upload, Code editor).
- Generate mode: a model‑driven UI with model selectors, actions, and progress.

Pattern overview
- Each dual‑mode node stores a boolean `data.generateMode` flag.
- The node’s `index.tsx` decides which component to render based on:
  - Connected incomers (transform mode implied), or
  - Local `generateMode` flag (user‑toggled).
- The toolbar exposes a “Generate” switch in BOTH modes so users can switch back and forth without hunting for it.

Labels and window chrome
- The green window bar shows a title derived from `title` or `data.titleOverride`.
- Use descriptive labels per mode so users know where they are:
  - Plain: e.g., `Text`, `Image`, `Video`, `Audio`.
  - Generate: e.g., `Text generation`, `Image generation`, `Video generation`, `Audio generation`.
- Add `data.titleOverride` to control the visible title without changing the component name.

Implementation checklist
1) State flag
```ts
// data.generateMode?: boolean
```

2) Index switch
```tsx
const connections = useNodeConnections({ id: props.id, handleType: 'target' });
const hasIncomers = connections.length > 0;
const Component = hasIncomers || props.data.generateMode ? Transform : Primitive;
return <Component key={(hasIncomers || props.data.generateMode) ? 'transform' : 'primitive'} {...props} />;
```

3) Toolbar toggle (in both Primitive and Transform)
```tsx
{
  children: (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>Generate</span>
      <Switch
        checked={Boolean(data.generateMode)}
        onCheckedChange={(v) => updateNodeData(id, { generateMode: v })}
      />
    </div>
  ),
}
```

4) Layout rules by mode
- Plain nodes can be Hug Content or Fill Frame; keep the direct child contract.
- Generate nodes are typically Fill Frame:
  - Direct child: `flex h-full flex-col min-h-0`
  - Main panel: `flex-1 min-h-0 overflow-auto` (or a centered container with `object-contain`)
  - Inputs: `shrink-0 max-h-48 overflow-auto nowheel nodrag nopan` + `onPointerDown(e.stopPropagation())`

5) Bottom toolbar placement
- Place model selectors and actions (Play/Stop/Regenerate) in the node’s floating toolbar.
- Order: left → model/size selectors; right → action button.
- The toolbar is visible on selection and is width‑constrained to the node.

6) Enabling at the layout level
- Set `dualModeSupported: true` in the node’s `data` to surface the top‑bar Plain/Generate toggle.
- The toggle updates both `data.mode` and `data.generateMode` for backward compatibility.
- Keep per‑node toggles removed to avoid duplicated controls.

7) Size variance by mode
- It’s OK for modes to have different internal compositions (e.g., editor vs preview), but keep the frame size consistent across modes by passing `width`/`height` in both components.

Troubleshooting
- Toggle missing in generate mode: ensure the switch is included in the transform toolbar.
- Canvas panning while scrolling prompts: add `nowheel nodrag nopan` and stop propagation on pointer down.
- Duplicate toggles: if you see both a top‑bar toggle and an in‑node/toolbar toggle, remove the per‑node toggles. The layout‑level toggle is canonical.
- Per‑node action vs toolbar: some nodes (e.g., Firecrawl) keep their primary action inside the node; remove the floating Play button from the toolbar to avoid duplication.

---

## Canvas controls location

The floating zoom/theme/lock control stack has been moved into the top toolbar as a compact menu next to Share:

- Component: `components/controls.tsx` exports `ControlsMenu` for the top bar.
- Mounted in `components/top-bar.tsx` beside `ShareDialog` in a rounded group.
- The old floating `Controls` panel is removed from `components/toolbar.tsx`.
