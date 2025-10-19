### useEffect hygiene for Easel

This project uses React Flow and many custom nodes. Effects should sync with the outside world, not drive rendering. Follow these patterns to avoid render loops (React error 185).

- Use effects for: subscriptions, timers, network, imperative DOM.
- Don’t use effects for: deriving render values, mirroring props to state, or graph transformations that can run in handlers.

Guard any state writes inside effects:

```tsx
useEffect(() => {
  if (data.model) return;
  updateNodeData(id, { model: 'gpt-5-mini' });
}, [id, data.model, updateNodeData]);
```

Avoid unstable dependencies:

```tsx
// Bad: re-creates object each render
const options = { a: props.a };
useEffect(() => subscribe(options), [options]);

// Good: memoize
const options = useMemo(() => ({ a: props.a }), [props.a]);
useEffect(() => subscribe(options), [options]);
```

React Flow specific:
- Prefer onNodesChange/onEdgesChange for graph updates.
- If an effect depends on nodes/edges, do not also set nodes/edges without a strict equality guard.

Audit checklist:
- Can this run in an event handler instead?
- Are dependencies minimal and stable?
- Will this write the same state repeatedly? Add a guard.

