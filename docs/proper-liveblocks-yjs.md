Collaborative Flowchart
This example shows how to build a collaborative flowchart with Liveblocks, Zustand, React Flow, and Next.js.

Directory structure:
└── zustand-flowchart/
    ├── README.md
    ├── next.config.js
    ├── package.json
    ├── tsconfig.json
    ├── pages/
    │   ├── _app.tsx
    │   ├── _document.tsx
    │   ├── index.module.css
    │   └── index.tsx
    ├── src/
    │   ├── edges.ts
    │   ├── nodes.ts
    │   └── store.ts
    └── styles/
        └── globals.css


================================================
FILE: examples/zustand-flowchart/README.md
================================================
<p align="center">
  <a href="https://liveblocks.io#gh-light-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-light.svg" alt="Liveblocks" />
  </a>
  <a href="https://liveblocks.io#gh-dark-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-dark.svg" alt="Liveblocks" />
  </a>
</p>

# Collaborative Flowchart

<p>
  <a href="https://liveblocks.io/examples/collaborative-flowchart/zustand-flowchart/preview">
    <img src="https://img.shields.io/badge/live%20preview-message?style=flat&logo=data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTE2Ljg0OSA0Ljc1SDBsNC44NDggNS4wNzV2Ny4wMDhsMTItMTIuMDgzWk03LjE1IDE5LjI1SDI0bC00Ljg0OS01LjA3NVY3LjE2N2wtMTIgMTIuMDgzWiIgZmlsbD0iI2ZmZiIvPjwvc3ZnPg==&color=333" alt="Live Preview" />
  </a>
  <a href="https://codesandbox.io/s/github/liveblocks/liveblocks/tree/main/examples/zustand-flowchart">
    <img src="https://img.shields.io/badge/open%20in%20codesandbox-message?style=flat&logo=codesandbox&color=333&logoColor=fff" alt="Open in CodeSandbox" />
  </a>
  <img src="https://img.shields.io/badge/react-message?style=flat&logo=react&color=0bd&logoColor=fff" alt="React" />
  <img src="https://img.shields.io/badge/next.js-message?style=flat&logo=next.js&color=07f&logoColor=fff" alt="Next.js" />
  <img src="https://img.shields.io/badge/zustand-message?style=flat&color=e47" alt="Zustand" />
</p>

This example shows how to build a collaborative flowchart with
[Liveblocks](https://liveblocks.io),
[Zustand](https://github.com/pmndrs/zustand),
[React Flow](https://reactflow.dev/) and [Next.js](https://nextjs.org/).

<img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/examples/collaborative-flowchart.png" width="536" alt="Collaborative Flowchart" />

## Getting started

Run the following command to try this example locally:

```bash
npx create-liveblocks-app@latest --example zustand-flowchart --api-key
```

This will download the example and ask permission to open your browser, enabling
you to automatically get your API key from your
[liveblocks.io](https://liveblocks.io) account.

### Manual setup

<details><summary>Read more</summary>

<p></p>

Alternatively, you can set up your project manually:

- Install all dependencies with `npm install`
- Create an account on [liveblocks.io](https://liveblocks.io/dashboard)
- Copy your **public** key from the
  [dashboard](https://liveblocks.io/dashboard/apikeys)
- Create an `.env.local` file and add your **public** key as the
  `NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY` environment variable
- Run `npm run dev` and go to [http://localhost:3000](http://localhost:3000)

</details>

### Deploy on Vercel

<details><summary>Read more</summary>

<p></p>

To both deploy on [Vercel](https://vercel.com), and run the example locally, use
the following command:

```bash
npx create-liveblocks-app@latest --example zustand-flowchart --vercel
```

This will download the example and ask permission to open your browser, enabling
you to deploy to Vercel.

</details>

### Develop on CodeSandbox

<details><summary>Read more</summary>

<p></p>

After forking
[this example](https://codesandbox.io/s/github/liveblocks/liveblocks/tree/main/examples/zustand-flowchart)
on CodeSandbox, create the `NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY` environment
variable as a [secret](https://codesandbox.io/docs/secrets).

</details>



================================================
FILE: examples/zustand-flowchart/next.config.js
================================================
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = nextConfig;



================================================
FILE: examples/zustand-flowchart/package.json
================================================
{
  "name": "@liveblocks-examples/zustand-flowchart",
  "description": "This example shows how to build a collaborative flowchart with Liveblocks, Zustand, React Flow, and Next.js.",
  "license": "Apache-2.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@liveblocks/client": "^3.7.1",
    "@liveblocks/zustand": "^3.7.1",
    "@types/node": "18.13.0",
    "@types/react": "18.3.3",
    "@types/react-dom": "18.0.11",
    "next": "13.1.6",
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "reactflow": "^11.11.4",
    "zustand": "^5.0.1"
  },
  "devDependencies": {
    "prettier": "^3.3.2",
    "typescript": "^5.4.5"
  }
}



================================================
FILE: examples/zustand-flowchart/tsconfig.json
================================================
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "baseUrl": "."
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}



================================================
FILE: examples/zustand-flowchart/pages/_app.tsx
================================================
import "../styles/globals.css";
import "reactflow/dist/base.css";
import "reactflow/dist/style.css";
import type { AppProps } from "next/app";

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}



================================================
FILE: examples/zustand-flowchart/pages/_document.tsx
================================================
import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link
          href="https://liveblocks.io/favicon-32x32.png"
          rel="icon"
          sizes="32x32"
          type="image/png"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}



================================================
FILE: examples/zustand-flowchart/pages/index.module.css
================================================
.wrapper {
  position: fixed;
  inset: 0;
}

.loading {
  position: absolute;
  width: 100vw;
  height: 100vh;
  display: flex;
  place-content: center;
  place-items: center;
}

.loading img {
  width: 64px;
  height: 64px;
  opacity: 0.2;
}



================================================
FILE: examples/zustand-flowchart/pages/index.tsx
================================================
import React, { useEffect, useMemo } from "react";
import ReactFlow, { Controls, MiniMap } from "reactflow";
import useStore from "../src/store";
import { useRouter } from "next/router";
import styles from "./index.module.css";

/**
 * This example shows how to build a collaborative flowchart
 * using Liveblocks, Zustand and React Flow
 */
export default function Index() {
  // The store is defined in src/store.ts
  const {
    liveblocks: { enterRoom, leaveRoom, isStorageLoading },
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
  } = useStore();

  const roomId = useExampleRoomId("zustand-flowchart");

  // Enter the Liveblocks room on load
  useEffect(() => {
    enterRoom(roomId);
    return () => leaveRoom();
  }, [enterRoom, leaveRoom, roomId]);

  if (isStorageLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <img src="https://liveblocks.io/loading.svg" alt="Loading" />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <MiniMap />
        <Controls />
      </ReactFlow>
    </div>
  );
}

export async function getStaticProps() {
  const API_KEY = process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY;
  const API_KEY_WARNING = process.env.CODESANDBOX_SSE
    ? `Add your public key from https://liveblocks.io/dashboard/apikeys as the \`NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY\` secret in CodeSandbox.\n` +
      `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/nextjs-live-cursors#codesandbox.`
    : `Create an \`.env.local\` file and add your public key from https://liveblocks.io/dashboard/apikeys as the \`NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY\` environment variable.\n` +
      `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/nextjs-live-cursors#getting-started.`;

  if (!API_KEY) {
    console.warn(API_KEY_WARNING);
  }

  return { props: {} };
}

/**
 * This function is used when deploying an example on liveblocks.io.
 * You can ignore it completely if you run the example locally.
 */
function useExampleRoomId(roomId: string) {
  const { query } = useRouter();
  const exampleRoomId = useMemo(() => {
    return query?.exampleId ? `${roomId}-${query.exampleId}` : roomId;
  }, [query, roomId]);

  return exampleRoomId;
}



================================================
FILE: examples/zustand-flowchart/src/edges.ts
================================================
import { Edge } from "reactflow";

export default [
  { id: "e1-2", source: "1", target: "2", type: "smoothstep" },
  { id: "e2-3", source: "2", target: "3", label: "with" },
  { id: "e3-4", source: "3", target: "4", label: "and", animated: true },
] as Edge[];



================================================
FILE: examples/zustand-flowchart/src/nodes.ts
================================================
import { Node } from "reactflow";

export default [
  {
    id: "1",
    type: "input",
    data: { label: "Multiplayer" },
    position: { x: 250, y: 25 },
  },
  {
    id: "2",
    data: { label: "flowcharts" },
    position: { x: 100, y: 125 },
  },
  {
    id: "3",
    data: { label: "React Flow" },
    position: { x: 250, y: 225 },
    style: { borderColor: "#FF0072" },
  },
  {
    id: "4",
    type: "output",
    data: { label: "Liveblocks" },
    position: { x: 100, y: 325 },
    style: { borderColor: "#944DFA" },
  },
] as Node[];



================================================
FILE: examples/zustand-flowchart/src/store.ts
================================================
import { create } from "zustand";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  OnConnect,
  OnEdgesChange,
  OnNodesChange,
} from "reactflow";
import { createClient } from "@liveblocks/client";
import type { EnsureJson } from "@liveblocks/client";
import { liveblocks } from "@liveblocks/zustand";
import type { WithLiveblocks } from "@liveblocks/zustand";
import nodes from "./nodes";
import edges from "./edges";

declare global {
  interface Liveblocks {
    // The Storage tree for the room, for useMutation, useStorage, etc.
    Storage: Storage;
  }
}

/**
 * This file contains the Zustand store & Liveblocks middleware
 * https://liveblocks.io/docs/api-reference/liveblocks-zustand
 */

// Create a Liveblocks client with your API key
const client = createClient({
  publicApiKey: process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY as string,
  throttle: 16, // Updates every 16ms === 60fps animation
});

type FlowState = {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
};

type Storage = EnsureJson<{
  nodes: FlowState["nodes"];
  edges: FlowState["edges"];
}>;

// Define your fully-typed Zustand store
const useStore = create<WithLiveblocks<FlowState>>()(
  liveblocks(
    (set, get) => ({
      // Initial values for nodes and edges
      nodes,
      edges,

      // Apply changes to React Flow when the flowchart is interacted with
      onNodesChange: (changes: NodeChange[]) => {
        set({
          nodes: applyNodeChanges(changes, get().nodes),
        });
      },
      onEdgesChange: (changes: EdgeChange[]) => {
        set({
          edges: applyEdgeChanges(changes, get().edges),
        });
      },
      onConnect: (connection: Connection) => {
        set({
          edges: addEdge(connection, get().edges),
        });
      },
    }),
    {
      // Add Liveblocks client
      client,

      // Define the store properties that should be shared in real-time
      storageMapping: {
        nodes: true,
        edges: true,
      },
    }
  )
);

export default useStore;



================================================
FILE: examples/zustand-flowchart/styles/globals.css
================================================
html {
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    Segoe UI,
    Roboto,
    Oxygen,
    Ubuntu,
    Cantarell,
    Fira Sans,
    Droid Sans,
    Helvetica Neue,
    sans-serif;
  overflow: hidden;
}


