# Firecrawl Node

This node integrates Firecrawl’s Scrape, Crawl, Map, and Search features into the Easel canvas as a single multi‑mode source node. It requires no upstream inputs and emits markdown/links/JSON/screenshots for downstream nodes.

- Firecrawl docs reference: https://docs.firecrawl.dev/introduction

## Modes
- Scrape: Single URL → markdown/html/metadata/links or JSON (prompted)

## UI
- Inputs
  - Scrape: URL, emit type (Markdown, HTML, Links, JSON)
- Output viewer
  - Renders a preview based on the selected emit type.

## Data
- mode: 'scrape'
- url, formats, options, emit
- status, error, updatedAt
- generated: doc (scrape); markdown/html/links convenience fields

## API
- Route: POST /api/firecrawl (server)
- Requires FIRECRAWL_API_KEY in env
- Normalizes Firecrawl scrape responses to node generated fields.

## Extractors
- getMarkdownFromFirecrawlNodes(nodes): string[]
- getLinksFromFirecrawlNodes(nodes): string[]

## Downstream usage
- Text/Code nodes can use markdown from this node
- Image/Video may use extracted links for references

## Defaults
- Scrape emits markdown

## Notes
- To add JSON extraction prompt, set options.prompt and include json in formats.

