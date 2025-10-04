# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development server**: `pnpm dev` - Starts Next.js with Turbopack, Supabase locally, email dev server, and Stripe webhook listener
- **Build**: `pnpm build` - Build the application with Turbopack
- **Lint**: `pnpm lint` - Run Next.js linter
- **Database migrations**: `pnpm migrate` - Push schema changes using Drizzle Kit
- **Update dependencies**: `pnpm bump-deps` - Update all dependencies to latest versions
- **Update UI components**: `pnpm bump-ui` - Update all shadcn/ui components
- **Generate API types**: `pnpm generate` - Generate OpenAPI types from Black Forest Labs API

## Architecture Overview

Easel is a visual AI playground built with Next.js 15 and React 19, allowing users to create AI workflows by connecting nodes in a drag-and-drop interface.

### Core Technologies
- **Frontend**: Next.js 15 with App Router, React 19, Tailwind CSS
- **UI Components**: shadcn/ui, Kibo UI, Radix UI for accessible components
- **Canvas**: ReactFlow (@xyflow/react) for the visual workflow builder
- **Database**: Supabase with Drizzle ORM for type-safe database operations
- **Authentication**: Supabase Auth with middleware
- **AI Integration**: Vercel AI SDK with multiple model providers
- **Payments**: Stripe integration with webhook handling
- **Email**: React Email with Resend for transactional emails

### Project Structure

#### Database Schema (`schema.ts`)
- `projects` table: Stores workflow projects with content (JSON), user association, and AI model preferences
- `profile` table: User profiles with Stripe customer/subscription data

#### Node System (`components/nodes/`)
Node types available in the workflow builder:
- **TextNode**: Text input/generation with AI models
- **ImageNode**: Image upload/generation/editing with various AI providers
- **VideoNode**: Video generation using Luma, Minimax, Runway, Replicate
- **AudioNode**: Speech synthesis and transcription with Hume/LMNT
- **CodeNode**: Code generation with syntax highlighting and language selection
- **FileNode**: File upload and management
- **TweetNode**: Twitter content integration
- **DropNode**: File drop zone for uploads

#### AI Model Integration (`lib/models/`)
- **Image models**: Black Forest Labs integration (`lib/models/image/black-forest-labs.ts`)
- **Video models**: Multiple providers (Luma, Minimax, Runway, Replicate)
- **Speech models**: Hume and LMNT for voice synthesis
- **Vision models**: For image description and analysis
- **Transcription models**: Audio-to-text conversion

#### Server Actions (`app/actions/`)
Server-side functions for:
- **Project management**: CRUD operations for workflows
- **Media processing**: Image, video, audio generation and manipulation
- **User profile management**: Subscription and credit handling

#### API Routes (`app/api/`)
- `/api/chat` - AI chat completions
- `/api/code` - Code generation endpoint  
- `/api/checkout` - Stripe payment processing
- `/api/portal` - Stripe customer portal
- `/api/webhooks/stripe` - Stripe webhook handling
- `/api/webhooks/resend` - Email webhook handling

### Environment Configuration

Environment variables are managed through `lib/env.ts` with strict typing and validation. Required variables include:
- Supabase credentials (URL, anon key, service role key)
- AI provider API keys (OpenAI, XAI, AWS Bedrock, Hume, LMNT, etc.)
- Stripe configuration (secret key, product IDs, webhook secret)
- Upstash Redis for rate limiting
- Resend for email services

### Data Flow

1. Users create projects containing ReactFlow nodes and edges
2. Node data is stored as JSON in the `projects.content` field
3. When nodes are executed, server actions process the data through appropriate AI models
4. Results are stored back in the node data and automatically saved
5. File uploads are handled through Supabase storage with signed URLs

### Node Connection Logic (`lib/xyflow.ts`)

The system validates node connections based on compatibility:
- Text nodes can connect to most other node types
- Audio nodes only accept text input for speech generation
- Video and drop nodes are typically source nodes
- File nodes are terminal nodes that don't output to others

### Testing Strategy

Run tests using the standard Next.js testing approach. The project uses Biome for linting with ultracite configuration, ignoring UI component folders.

### Key Patterns

- **Server Actions**: All data mutations use Next.js server actions with proper error handling
- **Type Safety**: Drizzle ORM provides full type safety for database operations  
- **Error Handling**: Centralized error parsing in `lib/error/parse.ts`
- **File Uploads**: Handled through Supabase storage with proper access controls
- **State Management**: Jotai for client-side state, ReactFlow for canvas state
- **Authentication**: Middleware-based auth with Supabase integration

---

## Current Issues: Node UI Layout and Structure (2025-10-01)

### Problem Synopsis

The text transform node is experiencing multiple UI/UX issues related to layout, toolbar positioning, and the instructions textarea visibility. These issues stem from inconsistent implementation patterns compared to working nodes like Firecrawl.

### Issues Identified

1. **Toolbar Overlapping Content**
   - The floating toolbar (with model selector and play button) is positioned inside the node content area instead of floating below it
   - Toolbar position changes with zoom level
   - The toolbar offset mechanism isn't working correctly

2. **Missing Instructions Textarea**
   - The instructions textarea ("Add additional context or guidance") is not visible in the transform mode
   - This textarea should appear below the output area with a divider between them

3. **Incorrect Layout Structure**
   - The node was using nested containers with extra rounded borders creating a "UI within a UI" effect
   - Content wasn't following the established pattern from working nodes

4. **Independent Scrolling Issues**
   - The instructions textarea was scrolling independently instead of being part of the overall node layout
   - Content area wasn't properly constrained with max-height

### Root Causes

1. **Inconsistent Child Structure in NodeLayout**
   - Text transform was wrapping children in a Fragment or extra div
   - Should pass multiple direct children to NodeLayout (like Firecrawl does)
   - NodeLayout uses `flex-col divide-y` to stack children vertically with dividers

2. **Missing Height Constraints**
   - Content area needs `h-full max-h-[30rem]` to prevent infinite growth
   - Without max-height, content pushes toolbar off-screen

3. **Incorrect CSS Classes**
   - Using `flex-1` without proper height constraints
   - Missing `nowheel` class for scroll behavior
   - Incorrect rounded corner classes

### Correct Pattern (from Firecrawl Node)

```tsx
<NodeLayout id={id} data={data} title={title} type={type} toolbar={toolbar}>
  {/* First child: Content area */}
  <div className="nowheel h-full max-h-[30rem] flex-1 overflow-auto rounded-t-3xl rounded-b-xl bg-secondary p-4">
    {/* Output content here */}
  </div>
  
  {/* Second child: Instructions textarea */}
  <Textarea
    value={data.instructions ?? ''}
    onChange={handleInstructionsChange}
    placeholder="Add additional context or guidance"
    className="shrink-0 resize-none rounded-none border-none bg-transparent shadow-none focus-visible:ring-0"
  />
</NodeLayout>
```

### Key Requirements

1. **Multiple Direct Children**: Pass content div and textarea as separate children to NodeLayout (NOT wrapped in Fragment or div)
2. **Height Constraints**: Content area must have `h-full max-h-[30rem]` to prevent toolbar overlap
3. **No Extra Wrappers**: Don't add extra divs or rounded containers between NodeLayout and content
4. **Proper Classes**: Use `nowheel` for scroll areas, `shrink-0` for fixed elements
5. **Toolbar Offset**: NodeLayout already handles toolbar positioning with `offset={40}` (see `components/nodes/layout.tsx` line 171)

### Files to Reference

**Primary Files:**
- **Working Example**: `components/nodes/firecrawl/transform.tsx` - Correct implementation pattern (lines 91-135)
- **Problem File**: `components/nodes/text/transform.tsx` - Currently being fixed to match Firecrawl pattern
- **Layout Component**: `components/nodes/layout.tsx` - Lines 165-181 (toolbar), 218-251 (children rendering)

**Documentation Files (docs/):**
- `docs/node-development.md` - **CRITICAL**: Comprehensive guide for creating and customizing nodes (lines 397-434 show transform pattern)
- `docs/ui-and-component-guide.md` - UI standards, component patterns, and design principles
- `docs/xyflow-data-consumption.md` - How nodes consume and pass data between each other
- `docs/node-locking.md` - Node locking system for collaboration
- `docs/firecrawl-node.md` - Firecrawl node implementation details
- `docs/liveblocks-integration.md` - Real-time collaboration setup
- `docs/liveblocks-reactflow.md` - ReactFlow integration with Liveblocks
- `docs/model-management.md` - AI model configuration and management
- `docs/supabase-workflow.md` - Database and Supabase setup workflow
- `docs/billing-and-usage.md` - Stripe billing and credit system
- `docs/getting-started.md` - Project setup and onboarding
- `docs/feature-checklist.md` - Feature implementation checklist
- `docs/changelog-policy.md` - How to maintain changelog
- `docs/progress-tracking.md` - Development progress tracking
- `docs/example-repos/` - Example repository references

**Related Node Files (for comparison):**
- `components/nodes/text/primitive.tsx` - Text node primitive mode
- `components/nodes/text/index.tsx` - Text node entry point
- `components/nodes/code/transform.tsx` - Code node transform (similar structure)
- `components/nodes/image/transform.tsx` - Image node transform (similar structure)

**Configuration Files:**
- `lib/node-buttons.ts` - Node default sizes and toolbar button definitions
- `lib/xyflow.ts` - Helper functions for data extraction between nodes

**Database/Schema:**
- `supabase/migrations/20250929200543_add_profile_background_fields.sql` - Profile table schema
- `supabase/migrations/20251001235403_add_storage_buckets.sql` - Storage buckets setup
- `supabase/migrations/20251001235853_add_profile_debug_field.sql` - Debug field (if created)

**Styling:**
- `app/globals.css` - Global styles and animations
- `components/ui/textarea.tsx` - Textarea component used in instructions

### Node Layout Architecture

From `components/nodes/layout.tsx`:

1. **Outer Container** (line 222): `flex-col divide-y rounded-[28px] bg-card p-2`
   - Stacks children vertically
   - Adds dividers between children
   - Provides node chrome (border, padding, selection)

2. **Inner Wrapper** (line 240-250): `overflow-hidden rounded-3xl bg-card`
   - Contains `{children}`
   - Handles overflow and rounding
   - Height set to 100%

3. **Toolbar** (line 165-181): `NodeToolbarRaw` with `position={Position.Bottom}` and `offset={40}`
   - Floats below node
   - Only visible when node is selected
   - Should NOT overlap content if content has proper height constraints

### Solution Applied

Updated `components/nodes/text/transform.tsx` to:
1. Remove Fragment wrapper
2. Pass content div and Textarea as direct children to NodeLayout
3. Add proper height constraints (`h-full max-h-[30rem]`)
4. Match Firecrawl's class structure exactly
5. Set node sizing: `className="w-80 min-h-[300px]"` on NodeLayout

### Testing Checklist

- [ ] Instructions textarea is visible below output area
- [ ] Toolbar floats below node without overlapping
- [ ] Toolbar position is stable across zoom levels
- [ ] Content area scrolls when content exceeds max-height
- [ ] Instructions textarea does NOT scroll independently
- [ ] Divider line appears between output and instructions
- [ ] Node has proper minimum size (320x300px)
- [ ] No "UI within UI" nested border effect

### Related Memories

- Memory `6e57bfe5`: NodeToolbar overlap issue, offset={20} solution
- Memory `cc4fe72c`: Node sizing standards and minimum dimensions
- Memory `f5381b8e`: Node layout fixes and sizing consistency
- Memory `aeb7633b`: Project overview and node architecture