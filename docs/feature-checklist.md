# Feature & Future Enhancements Checklist

A running list of improvements and larger features we may add next. Use this as a planning backlog.

## Audio / Transcription
- Long Recording Mode (hour-long calls)
  - Stream MediaRecorder chunks to server every N seconds (WebM/Opus)
  - Progressive STT per chunk; merge segments
  - Raise upload/object size limits as needed
  - UX: live timer, levels, pause, resume, per-chunk retries
- Speaker diarization & timestamps
- Noise reduction/AGC on client before upload

## File Node & Multimodal
- File type validation per provider (Gemini/OpenAI) with clear errors
- Auto-extract text for unsupported types (DOCX → text/PDF; PPTX → text)
- Optional OCR for images to produce text prompts
- “Send bytes in dev” toggle; URLs or bytes in prod

## Batch / Fan-out Node
- Variants generator (count/dimensions/targets)
- Concurrency queue with pause/cancel and per-item retries
- Credits estimate + guardrails (caps/confirmations)
- Provenance stored in output nodes

## Image / Video
- Parameter presets per model (style/seed/quality)
- Negative prompts and safety controls where supported
- Video chunked upload + resumable storage for large files

## UX & Docs
- Production Go-Live Checklist page
- Environment Matrix (Local vs. Test vs. Live)
- Model Capability Matrix (edit support, sizes, seeds)
- Transcript viewer: export SRT/VTT and search

## Reliability & Observability
- Centralized run logs per node (success/failure, timing, cost)
- Retry budgets and exponential backoff strategies
- Health checks for provider availability; fallback models via Gateway

Add proposals here with a short description, scope, and estimated impact.


---------------------------------------------------------------------------------------------------------------------------------


## Collaboration & Authoring Enhancements

- **Real-time collaborative editing for complex documents**
  - Integrate TipTap (or similar) with real-time presence and cursor support (Liveblocks/Yjs).
  - Show active collaborators, selection highlights, and live cursors in the editor.
  - Support block-level comments and suggestions (track changes).
  - Contextual conversation threads attached to document sections or nodes.

- **Conversation Context & History**
  - Persist and display conversation context alongside document edits
  - Allow referencing previous messages, node outputs, and user comments within the authoring UI.
  - Timeline/history view for document and conversation evolution.

- **Editing & Authoring Workflow**
  - Inline editing of node prompts, instructions, and metadata.
  - Authoring mode toggle: switch between "edit", "review", and "run" states for nodes and flows.
  - Node-level versioning and change tracking.

- **Saving & Reusing Repeatable Nodes**
  - "Save as Template": persist node (prompt, config, connections, context) for reuse.
  - Template library: drag-and-drop saved nodes or subflows into new projects.
  - Support for sharing templates across users/teams.

- **Content Store & File Integration**
  - Connect to multiple file/content stores (e.g., Supabase, S3, Google Drive).
  - Attach files, images, or external content to nodes and flows.
  - Unified content browser for searching and linking assets.

- **Evaluator Node**
  - Add node type for evaluating outputs (e.g., scoring, ranking, or feedback collection).
  - Support for both automated (model-based) and manual (user/peer) evaluation.
  - Store evaluation results as part of node data for downstream use.

- **Weighted Context & Notes**
  - Allow attaching notes, audio notes, or other context to nodes.
  - Enable weighting of context items (e.g., prioritize certain notes or audio clips in prompt assembly).
  - UI for managing and adjusting context weights per node.

- **Persistence & Collaboration**
  - All collaborative and authoring actions are persisted in the project’s content store (see docs/liveblocks-reactflow.md).
  - Ensure `{ nodes, edges }` and all attached context are serializable and rehydratable.
  - Support for real-time sync and offline editing with conflict resolution.

> For implementation details and required patterns, see [docs/liveblocks-reactflow.md](./liveblocks-reactflow.md) and [node-development.md](./node-development.md).

- **Multi-Model Output Evaluation**
  - Enable multiple models to evaluate a node’s output against user-defined review criteria.
  - UI displays a row of green (✔️) and red (✖️) dots per model, indicating whether each model judged the output as correct or incorrect.
  - Support configuring review criteria per evaluation node; criteria are passed to each model as part of the evaluation prompt.
  - Store all model judgments and user feedback in node data for downstream use and auditability.
  - Allow users to override or comment on model decisions for transparency and iterative improvement.
  - See [Evaluator Node](#evaluator-node) and [node-development.md](./node-development.md#evaluator-node) for implementation patterns and data contracts.
