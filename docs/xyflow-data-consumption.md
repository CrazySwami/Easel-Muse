# Node Data Flow and `lib/xyflow.ts` Helpers

## SYNOPSIS
This document explains the data flow architecture between nodes in Hustle-Tersa, focusing on helper functions in `lib/xyflow.ts`. It covers how consumer nodes extract structured data from producer nodes, the pattern for data persistence across nodes, and integration with AI tools. Understanding this architecture is essential for developing new nodes that can participate in the data flow ecosystem.

## REFERENCES
- [React Flow Documentation](https://reactflow.dev/learn) - Official documentation for the node flow system
- [Vercel AI SDK Documentation](https://ai-sdk.dev/docs/introduction) - Reference for AI SDK integration
- [Agent Chat Tool Integration](./agent-chat-tool-integration.md) - Master reference for AI tool standards

## Table of Contents
1. [Overview of Data Consumption](#1-overview-of-data-consumption)
2. [The Role of `lib/xyflow.ts`](#2-the-role-of-libxyflowts)
3. [Key Helper Functions](#3-key-helper-functions-in-libxyflowts)
4. [Consumer Node Examples](#4-consumer-node-examples)
5. [Data Persistence and AI Tool Integration](#5-data-persistence-and-ai-tool-integration)

## 1. Overview of Data Consumption

Nodes in the flow canvas can receive data from their "incomer" nodes (nodes connected to their input handles). To process this incoming data, consumer nodes typically:
1.  Get a list of all incomer nodes.
2.  Use specialized helper functions from `lib/xyflow.ts` to extract specific types of data (e.g., text, image URLs, media links) from these incomers.
3.  Filter and process this data according to their own logic (e.g., combining text for a prompt, collecting image URLs for generation).

## 2. The Role of `lib/xyflow.ts`

`lib/xyflow.ts` acts as a central utility library containing functions that abstract the complexities of data extraction from various node types. This approach:
-   **Centralizes Logic:** Avoids redundant data extraction code in each consumer node.
-   **Simplifies Node Code:** Consumer nodes can use simple function calls to get the data they need.
-   **Improves Maintainability:** Changes to how a source node outputs data often only require updates to the relevant helper function(s) in `lib/xyflow.ts`.

## 3. Key Helper Functions in `lib/xyflow.ts`

Below are descriptions of the primary helper functions used for data extraction, particularly concerning `BrandfetchNode` and `FirecrawlNode` integration.

### General Data Extractors:

*   **`getTextFromTextNodes(nodes: Node[])`: string[]**
    *   Extracts and returns an array of text strings from connected `TextNode`s (both their source text and generated text).
*   **`getTranscriptionFromAudioNodes(nodes: Node[])`: string[]**
    *   Extracts and returns an array of transcript strings from connected `AudioNode`s.
*   **`getDescriptionsFromImageNodes(nodes: Node[])`: string[]**
    *   Extracts and returns an array of description strings from connected `ImageNode`s.
*   **`getImagesFromImageNodes(nodes: Node[])`: { url: string; type: string }[]**
    *   Extracts and returns an array of image objects (source and generated) from connected `ImageNode`s.

### `BrandfetchNode` Data Extractors:

*   **`getTextFromBrandfetchNodes(nodes: Node[])`: string[]**
    *   Extracts the `name` and `description` from connected `BrandfetchNode`s.
    *   Used by: `TextNode`, `getMarkdownOrTextContentFromNodes` (and thus `CodeNode`).
*   **`getImagesFromBrandfetchNodes(nodes: Node[])`: { url: string; type: string }[]**
    *   Extracts logo URLs and other image URLs from `BrandfetchNode`s. It formats them as `{ url: string; type: string }` objects.
    *   Used by: `ImageNode`.
*   **`getMediaLinksFromBrandfetchNodes(nodes: Node[])`: { name: string; url: string; type: 'audio' | 'video' | 'unknown' }[]**
    *   Extracts all links from the `links` array within `BrandfetchNode` data. It attempts to determine if a link is `audio`, `video`, or `unknown` based on common file extensions or patterns.
    *   Used by: `AudioNode`, `VideoNode` (which then filter for their specific media type).

### `FirecrawlNode` Data Extractors:

*   **`getContentFromFirecrawlNodes(nodes: Node[])`: string[]**
    *   Extracts the primary textual content from `FirecrawlNode`s. It prioritizes `markdown` if available, otherwise falls back to `content` (plain text/HTML).
    *   Used by: `TextNode`, `getMarkdownOrTextContentFromNodes` (and thus `CodeNode`).
*   **`getImagesFromFirecrawlNodes(nodes: Node[])`: { url: string; type: string }[]**
    *   Parses the `markdown` or `content` from `FirecrawlNode`s to find image URLs (e.g., from `<img>` tags or Markdown image syntax).
    *   Used by: `ImageNode`.
*   **`getMediaLinksFromFirecrawlNodes(nodes: Node[])`: { url: string; type: 'audio' | 'video' | 'unknown' }[]**
    *   Extracts links from the `links` array provided by `FirecrawlNode`s (these are links found on the scraped page). It attempts to determine the media type.
    *   Used by: `AudioNode`, `VideoNode`.

### Aggregated Content Extractor:

*   **`getMarkdownOrTextContentFromNodes(nodes: Node[])`: string[]**
    *   A crucial aggregator function that collects textual content from multiple sources:
        *   Text from `TextNode`s.
        *   Content (markdown/text) from `FirecrawlNode`s.
        *   Name and description from `BrandfetchNode`s.
    *   This provides a comprehensive textual context.
    *   Used by: `CodeNode` (to build its prompt).

### Perplexity Search Extractors (new):

*   **`getTextFromPerplexityNodes(nodes: Node[])`: string[]**
    *   Returns flattened search result texts from Perplexity nodes. Each entry is `title — snippet`.
    *   Backed by `perplexity` node writing `outputTexts` into its `data` on successful searches.
*   **`getLinksFromPerplexityNodes(nodes: Node[])`: string[]**
    *   Returns flattened `url` values from Perplexity search results.
    *   Backed by `perplexity` node writing `outputLinks` into its `data`.

## 4. How Consumer Nodes Use These Helpers

*   **`TextNode`**:
*   **`PerplexityNode`**:
    *   PRODUCES: `outputTexts` (titles/snippets) and `outputLinks` after searches or batch runs. These are simple string arrays intended for downstream nodes.
    *   CONSUMES: Optionally seeds Batch `queries` from incomers via `getTextFromTextNodes`, `getMarkdownFromFirecrawlNodes`, and `getTextFromTiptapNodes` when its list is empty.
    *   Uses `getTextFromTextNodes`, `getContentFromFirecrawlNodes`, and `getTextFromBrandfetchNodes` to gather all textual inputs for its generation prompt.
*   **`ImageNode`**:
    *   Uses `getImagesFromImageNodes`, `getImagesFromBrandfetchNodes`, and `getImagesFromFirecrawlNodes` to collect all available image URLs to use as references or inputs for image generation/editing.
*   **`CodeNode`**:
    *   Uses `getMarkdownOrTextContentFromNodes` to get a rich textual context from various connected nodes (Text, Firecrawl, Brandfetch) to inform its code generation.
*   **`AudioNode`**:
    *   Primarily uses `getTextFromTextNodes`, `getDescriptionsFromImageNodes`, and its own `instructions` for text-to-speech.
    *   Additionally, uses `getMediaLinksFromBrandfetchNodes` and `getMediaLinksFromFirecrawlNodes` to identify a potential `inputAudioUrl` from connected Brandfetch or Firecrawl nodes. (Note: UI/playback for this input URL is a potential future enhancement).
*   **`VideoNode`**:
    *   Primarily uses `getTextFromTextNodes`, `getImagesFromImageNodes`, and its own `instructions` for video generation.
    *   Additionally, uses `getMediaLinksFromBrandfetchNodes` and `getMediaLinksFromFirecrawlNodes` to identify a potential `inputVideoUrl`. (Note: UI/playback for this input URL is a potential future enhancement).

## 5. Data Persistence and AI Tool Integration

When developing AI tools that create or modify nodes, it's essential to understand how data is persisted and passed between nodes in the Hustle-Easel system.

### 5.1 Model IDs and Resource Identifiers

Any resource identifiers (model IDs, voice IDs, etc.) passed through AI tools must be properly serialized to the node's data object:

```typescript
// In AgentChatPanel.tsx onToolCall handler
const reactFlowNode: Node = {
  id: newNodeId,
  type: 'audio',
  position: { x, y },
  data: {
    label,
    source: 'transform',
    model: speechModelId,  // Store the model ID for persistence
    voice: voiceId,        // Store the voice ID for persistence
    // Other parameters
  }
};
```

These properties will be automatically serialized by React Flow's `toObject()` method and stored in the project's `content` JSON via the `useSaveProject` hook. This ensures:

1. The node retains its configuration when the project is saved and reloaded
2. The node can properly use these resources when executed
3. The UI can display the correct selected options

### 5.2 Data Flow Between AI Tools and Nodes

The data flow between AI tools and nodes follows this pattern:

1. User requests node creation via natural language
2. AI uses lookup tools to discover available models or resources
3. AI collects all necessary parameters from the user
4. AI calls the node creation tool with complete parameters
5. Client handler creates the React Flow node with those parameters
6. Node component consumes those parameters when rendering
7. Parameters are saved in project.content JSON

### 5.3 Extending Data Flow with Custom Helper Functions

When implementing a new node type that produces unique data, consider adding appropriate helper functions to `lib/xyflow.ts`:

```typescript
// Example of adding a helper for a new node type
export function getDataFromYourNodes(nodes: Node[]): YourDataType[] {
  return nodes
    .filter((node) => node.type === 'your-node')
    .map((node) => {
      const data = node.data;
      // Extract and format the relevant data
      return {
        someProperty: data.someProperty,
        generated: data.generated?.result || null,
        // Other properties
      };
    })
    .filter((item): item is YourDataType => !!item);
}
```

This ensures that other nodes can consume data from your new node type using a consistent pattern.

### 5.4 Best Practices for Tool and Data Integration

1. **Consistent Property Naming**: Use consistent property names across related nodes and tools
2. **Type Safety**: Define clear TypeScript interfaces for your node data
3. **Progressive Enhancement**: Support partial data to gracefully handle missing properties
4. **Data Transformation**: Convert data to appropriate formats before storing in node data
5. **Resource Validation**: Validate resource IDs before using them in node operations
6. **Documentation**: Document your data structure in the node's component files
