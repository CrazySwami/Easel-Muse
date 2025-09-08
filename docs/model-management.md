# Documentation: AI Model Management

This document explains the "Model Catalog" architecture and provides a guide for adding, removing, and managing the AI models used throughout the application.

## 1. Overview: The AI Gateway & Model Catalog

The application uses a concept we call an "AI Gateway." Instead of calling AI provider APIs directly from the application logic, actions on the server (in `app/actions/`) look up a model from a central "catalog." This catalog defines the model's properties, which provider to use, and how to calculate costs.

This approach has several advantages:
-   **Centralized Management:** All models are defined in one place.
-   **Extensibility:** It's easy to add new models or even new AI providers without changing the core application logic.
-   **Consistency:** All models of a certain type (e.g., image) share a common interface.

The core directory for this system is **`lib/models/`**.

## 2. Managing Image Models

Image models are the most complex, with multiple providers and configuration options.

**Location:** `lib/models/image/index.ts` is the main catalog file. It imports model definitions from other files in the same directory, like `lib/models/image/black-forest-labs.ts`.

**Structure of an Image Model Object:**

Each image model is an object with the following structure:

```typescript
export const dallE3: ImageModel = {
  id: 'dall-e-3',
  name: 'DALL·E 3',
  provider: 'openai',
  // Is the model available for use?
  isAvailable: true,
  // Does it support different sizes?
  features: ['size'],
  // Which providers/APIs can be used for this model
  providers: [
    {
      id: 'openai',
      // The specific model ID for the provider's API
      model: openai('dall-e-3'),
      // A function to calculate the cost based on usage
      getCost: ({ size }) => {
        // ... cost calculation logic
      },
    },
  ],
};
```

### How to Add a New Image Model:

1.  **Define the Model:** Go to one of the files like `lib/models/image/index.ts` or create a new one (e.g., `lib/models/image/my-new-provider.ts`).
2.  **Create the Object:** Create a new `ImageModel` object following the structure above. You'll need to define its `id`, `name`, and configure its `providers` array with the correct Vercel AI SDK provider object and a cost function.
3.  **Add to the Catalog:** If you created a new file, make sure to import your new model object into `lib/models/image/index.ts`.
4.  **Export it:** Add your new model variable to the `imageModels` object at the bottom of `lib/models/image/index.ts`.

### How to Remove or Disable an Image Model:

-   **To temporarily disable:** Set `isAvailable: false` on the model object. It will no longer appear in the UI.
-   **To permanently remove:** Delete the model object definition and remove it from the exported `imageModels` object.

## 3. Managing Other Model Types

Other model types follow the same catalog pattern but have simpler structures.

-   **Vision Models (Image Analysis):**
    -   **Location:** `lib/models/vision.ts`
    -   **Purpose:** Used to describe or analyze images (e.g., GPT-4o Vision).
    -   **Structure:** Similar to image models but without features like `size`.

-   **Speech Models (Text-to-Speech):**
    -   **Location:** `lib/models/speech.ts`
    -   **Purpose:** Used to generate audio from text.

-   **Transcription Models (Speech-to-Text):**
    -   **Location:** `lib/models/transcription.ts`
    -   **Purpose:** Used to transcribe audio to text.

The process for adding or removing these models is the same: edit the relevant file and add or remove the model object from the exported catalog.

## 4. A Note on Text & Chat Models

You correctly noticed that general text/chat models are handled differently.

The main chat interface (`app/api/chat/route.ts`) does **not** use the catalog system. It calls the Vercel AI SDK directly with a hardcoded model ID (e.g., `openai('gpt-4o')`).

This is a simpler, more direct approach suitable for a single chat interface. The more complex catalog system is used for the canvas nodes, where users can select from a variety of specialized models for specific tasks.
