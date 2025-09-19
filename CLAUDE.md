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