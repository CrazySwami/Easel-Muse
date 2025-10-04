# Node Locking System

The node locking system in Easel-Muse is designed to prevent conflicting edits in a collaborative environment and to allow users to protect nodes from accidental changes. The system is built around a manual locking mechanism that gives users explicit control over the state of each node.

## Core Concepts

The locking system is managed by the `LocksProvider` and is driven by a central state in `components/canvas.tsx`. The key principles are:

1.  **Manual Control:** A node's lock state is determined solely by the user's actions in the UI. There is no automatic locking or unlocking based on user actions like dragging.
2.  **Single Source of Truth:** The `locks` state in `canvas.tsx` is the one and only record of a node's lock status. This simplifies the logic and prevents state conflicts.
3.  **Persistent States:** The lock state you set on a node will persist until you explicitly change it again.

## Lock Levels

There are three manual lock levels that a user can apply to a node:

*   **Unlocked:** The node is fully interactive. It can be moved, edited, and connected to other nodes.
*   **Lock Position Only:** The node cannot be moved, but its content can still be edited.
*   **Lock Position and Editing:** The node is fully locked. It cannot be moved or edited.

## Implementation Details

### State Management

*   The lock state is managed by a `useState` hook in `components/canvas.tsx`. This ensures that any change to a node's lock state triggers a re-render of all affected components.
*   The `LocksProvider` makes the lock state and the functions to modify it (`acquire` and `release`) available to all components in the canvas.

### The `NodeLayout` Component

*   The `components/nodes/layout.tsx` component is responsible for rendering the lock UI and enforcing the lock state.
*   It uses the `useLocks` hook to get the current lock state for the node.
*   It displays a lock icon and a label that indicate the current lock state.
*   It provides a dropdown menu that allows the user to change the lock state.
*   It applies the appropriate CSS classes (`nodrag`, `nopan`, `pointer-events-none`) to the node to enforce the lock.

### Editor Integration

*   The primitive components for each node type (e.g., `text/primitive.tsx`, `code/primitive.tsx`) are responsible for enforcing the edit lock.
*   They use the `useLocks` hook to get the current lock state.
*   When a node is fully locked, they set the `editable` or `readOnly` prop on the editor component to `false`.

### Decoupling from Drag Events

*   The automatic locking system that was previously tied to drag events has been completely removed.
*   The drag handlers in `components/canvas.tsx` no longer acquire or release any locks. This ensures that moving a node does not affect its manual lock state.

This simplified, manual-only locking system provides a more predictable and reliable user experience.
