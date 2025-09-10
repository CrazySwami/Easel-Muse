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
