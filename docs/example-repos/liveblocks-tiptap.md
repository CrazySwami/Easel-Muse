================================================
FILE: examples/nextjs-tiptap/README.md
================================================
<p align="center">
  <a href="https://liveblocks.io#gh-light-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-light.svg" alt="Liveblocks" />
  </a>
  <a href="https://liveblocks.io#gh-dark-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-dark.svg" alt="Liveblocks" />
  </a>
</p>

# Collaborative Rich Text Editor (TipTap)

<p>
  <a href="https://liveblocks.io/examples/collaborative-text-editor/nextjs-tiptap">
    <img src="https://img.shields.io/badge/live%20preview-message?style=flat&logo=data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTE2Ljg0OSA0Ljc1SDBsNC44NDggNS4wNzV2Ny4wMDhsMTItMTIuMDgzWk03LjE1IDE5LjI1SDI0bC00Ljg0OS01LjA3NVY3LjE2N2wtMTIgMTIuMDgzWiIgZmlsbD0iI2ZmZiIvPjwvc3ZnPg==&color=333" alt="Live Preview" />
  </a>
  <a href="https://codesandbox.io/s/github/liveblocks/liveblocks/tree/main/examples/nextjs-tiptap">
    <img src="https://img.shields.io/badge/open%20in%20codesandbox-message?style=flat&logo=codesandbox&color=333&logoColor=fff" alt="Open in CodeSandbox" />
  </a>
  <img src="https://img.shields.io/badge/react-message?style=flat&logo=react&color=0bd&logoColor=fff" alt="React" />
  <img src="https://img.shields.io/badge/next.js-message?style=flat&logo=next.js&color=07f&logoColor=fff" alt="Next.js" />
  <img src="https://img.shields.io/badge/TipTap-message?style=flat&color=7bf" alt="TipTap" />
</p>

This example shows how to build a collaborative text editor with [Liveblocks](https://liveblocks.io), [TipTap](https://tiptap.dev/), and [Next.js](https://nextjs.org/).

As users edit the document, changes will be automatically persisted and synced—allowing for an editor that updates in real-time across clients. Users will also be able to see who see each other’s cursors in the document.

<img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/examples/text-editor.png" width="536" alt="Collaborative Text Editor" />

## Getting started

Run the following command to try this example locally:

```bash
npx create-liveblocks-app@latest --example nextjs-tiptap --api-key
```

This will download the example and ask permission to open your browser, enabling you to automatically get your API key from your [liveblocks.io](https://liveblocks.io) account.

### Manual setup

<details><summary>Read more</summary>

<p></p>

Alternatively, you can set up your project manually:

- Install all dependencies with `npm install`
- Create an account on [liveblocks.io](https://liveblocks.io/dashboard)
- Copy your **secret** key from the [dashboard](https://liveblocks.io/dashboard/apikeys)
- Create an `.env.local` file and add your **secret** key as the `LIVEBLOCKS_SECRET_KEY` environment variable
- Run `npm run dev` and go to [http://localhost:3000](http://localhost:3000)

</details>

### Deploy on Vercel

<details><summary>Read more</summary>

<p></p>

To both deploy on [Vercel](https://vercel.com), and run the example locally, use the following command:

```bash
npx create-liveblocks-app@latest --example nextjs-tiptap --vercel
```

This will download the example and ask permission to open your browser, enabling you to deploy to Vercel.

</details>

### Develop on CodeSandbox

<details><summary>Read more</summary>

<p></p>

After forking [this example](https://codesandbox.io/s/github/liveblocks/liveblocks/tree/main/examples/nextjs-tiptap) on CodeSandbox, create the `LIVEBLOCKS_SECRET_KEY` environment variable as a [secret](https://codesandbox.io/docs/secrets).

</details>



================================================
FILE: examples/nextjs-tiptap/liveblocks.config.ts
================================================
declare global {
  interface Liveblocks {
    UserMeta: {
      id: string;
      info: {
        name: string;
        avatar: string;
        color: string;
      };
    };
  }
}

export {};



================================================
FILE: examples/nextjs-tiptap/next.config.js
================================================
/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = nextConfig;



================================================
FILE: examples/nextjs-tiptap/package.json
================================================
{
  "name": "@liveblocks-examples/nextjs-tiptap",
  "description": "This example shows how to build a collaborative text editor with Liveblocks, TipTap, and Next.js.",
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
    "@liveblocks/node": "^3.7.1",
    "@liveblocks/react": "^3.7.1",
    "@liveblocks/react-tiptap": "^3.7.1",
    "@liveblocks/react-ui": "^3.7.1",
    "@liveblocks/yjs": "^3.7.1",
    "@radix-ui/react-dialog": "^1.1.2",
    "@radix-ui/react-popover": "^1.0.7",
    "@tiptap/pm": "^2.6.6",
    "@tiptap/react": "^2.6.6",
    "@tiptap/starter-kit": "^2.6.6",
    "@types/node": "^18.11.18",
    "@types/react": "^18.0.27",
    "@types/react-dom": "^18.0.10",
    "next": "^14.2.4",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "typescript": "^5.2.2"
  },
  "devDependencies": {
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.4"
  }
}



================================================
FILE: examples/nextjs-tiptap/postcss.config.js
================================================
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};



================================================
FILE: examples/nextjs-tiptap/tailwind.config.js
================================================
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
    },
  },
};



================================================
FILE: examples/nextjs-tiptap/tsconfig.json
================================================
{
  "compilerOptions": {
    "target": "es2018",
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
    "plugins": [
      {
        "name": "next"
      }
    ]
  },
  "include": ["next-env.d.ts", ".next/types/**/*.ts", "**/*.ts", "**/*.tsx", "tailwind.config.js"],
  "exclude": ["node_modules"]
}



================================================
FILE: examples/nextjs-tiptap/.prettierrc
================================================
{
  "semi": true,
  "tabWidth": 2,
  "useTabs": false,
  "singleQuote": false,
  "jsxSingleQuote": false,
  "arrowParens": "always",
  "bracketSpacing": true,
  "bracketSameLine": false,
  "trailingComma": "es5"
}



================================================
FILE: examples/nextjs-tiptap/app/globals.css
================================================
@import "@liveblocks/react-ui/styles.css";
@import "@liveblocks/react-ui/styles/dark/media-query.css";

@import "@liveblocks/react-tiptap/styles.css";

@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  --card: 0 0% 100%;
  --card-foreground: 240 10% 3.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 240 10% 3.9%;
  --primary: 240 5.9% 10%;
  --primary-foreground: 0 0% 98%;
  --secondary: 240 4.8% 95.9%;
  --secondary-foreground: 240 5.9% 10%;
  --muted: 240 4.8% 95.9%;
  --muted-foreground: 240 3.8% 46.1%;
  --accent: 240 4.8% 95.9%;
  --accent-foreground: 240 5.9% 10%;
  --destructive: 0 72.22% 50.59%;
  --destructive-foreground: 0 0% 98%;
  --border: 240 5.9% 90%;
  --input: 240 5.9% 90%;
  --ring: 240 5% 64.9%;
  --radius: 0.5rem;
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
    --card: 240 10% 3.9%;
    --card-foreground: 0 0% 98%;
    --popover: 240 10% 3.9%;
    --popover-foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    --primary-foreground: 240 5.9% 10%;
    --secondary: 240 3.7% 15.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;
    --accent: 240 3.7% 15.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 85.7% 97.3%;
    --border: 240 3.7% 15.9%;
    --input: 240 3.7% 15.9%;
    --ring: 240 4.9% 83.9%;
  }
}

.lb-portal {
  @apply z-30;
}

h1 {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.2;
}

h2 {
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 1.2;
}

h3 {
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.2;
}

h4 {
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.2;
}

h5 {
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.2;
}

blockquote {
  box-sizing: border-box;
  border-left: 0.25rem solid rgba(209, 213, 219);
  padding-left: 1rem;
}

ul {
  display: block;
  list-style-type: disc;
  margin-block-start: 1rem;
  margin-block-end: 1rem;
  margin-inline-start: 0px;
  margin-inline-end: 0px;
  padding-inline-start: 40px;
  unicode-bidi: isolate;
}

ol {
  display: block;
  list-style-type: decimal;
  margin-block-start: 1rem;
  margin-block-end: 1rem;
  margin-inline-start: 0px;
  margin-inline-end: 0px;
  padding-inline-start: 40px;
  unicode-bidi: isolate;
}

li {
  display: list-item;
  text-align: -webkit-match-parent;
  unicode-bidi: isolate;
}

li::marker {
  unicode-bidi: isolate;
  font-variant-numeric: tabular-nums;
  text-transform: none;
  text-indent: 0px !important;
  text-align: start !important;
  text-align-last: start !important;
}



================================================
FILE: examples/nextjs-tiptap/app/layout.tsx
================================================
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Liveblocks",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://liveblocks.io/favicon-32x32.png"
          rel="icon"
          sizes="32x32"
          type="image/png"
        />
        <link
          href="https://liveblocks.io/favicon-16x16.png"
          rel="icon"
          sizes="16x16"
          type="image/png"
        />
      </head>
      <body className={inter.className}>
        <main className="text-base bg-background/95 text-foreground">
          {children}
        </main>
      </body>
    </html>
  );
}



================================================
FILE: examples/nextjs-tiptap/app/loading.tsx
================================================
export default function Loading() {
  return (
    <div className="absolute flex w-full h-full items-center justify-center flex-1 p-4">
      <img
        src="https://liveblocks.io/loading.svg"
        alt="Loading"
        className="size-16 opacity-20"
      />
    </div>
  );
}



================================================
FILE: examples/nextjs-tiptap/app/notifications-popover.tsx
================================================
import {
  useInboxNotifications,
  useMarkAllInboxNotificationsAsRead,
  useUnreadInboxNotificationsCount,
} from "@liveblocks/react/suspense";
import { InboxNotification, InboxNotificationList } from "@liveblocks/react-ui";
import * as Popover from "@radix-ui/react-popover";
import { Suspense } from "react";
import Loading from "./loading";

export default function NotificationsPopover() {
  return (
    <Popover.Root>
      <Popover.Trigger className="inline-flex relative items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground w-8 h-8">
        <svg
          width="20"
          height="20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="m3.6 9.8 1.9-4.6A2 2 0 0 1 7.3 4h5.4a2 2 0 0 1 1.8 1.2l2 4.6V13a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2V9.8Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M3.5 10h3c.3 0 .6.1.8.4l.9 1.2c.2.3.5.4.8.4h2c.3 0 .6-.1.8-.4l.9-1.2c.2-.3.5-.4.8-.4h3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>

        <Suspense fallback={null}>
          <UnreadNotificationsCount />
        </Suspense>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="end"
          className="rounded-xl border border-border bg-card text-card-foreground shadow text-sm overflow-hidden w-[500px] min-h-[200px] z-20"
        >
          <Suspense fallback={<Loading />}>
            <Inbox />
          </Suspense>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function UnreadNotificationsCount() {
  const { count } = useUnreadInboxNotificationsCount();

  if (count <= 0) return null;

  return (
    <span className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 text-[10px] inline-flex items-center p-1 bg-blue-500 text-white justify-center rounded-full w-4 h-4">
      {count}
    </span>
  );
}

function Inbox() {
  const { inboxNotifications } = useInboxNotifications();
  const markAllNotificationsAsRead = useMarkAllInboxNotificationsAsRead();

  return (
    <>
      <div className="flex p-3 border-b border-border justify-end bg-muted/50">
        <button
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-8 px-4 py-2"
          disabled={inboxNotifications.length === 0}
          onClick={markAllNotificationsAsRead}
        >
          Mark all as read
        </button>
      </div>

      <div className="max-h-[500px] overflow-auto">
        {inboxNotifications.length === 0 ? (
          <div className="flex items-center justify-center p-6 text-muted-foreground">
            No notifications yet
          </div>
        ) : (
          <InboxNotificationList>
            {inboxNotifications.map((inboxNotification) => {
              return (
                <InboxNotification
                  key={inboxNotification.id}
                  inboxNotification={inboxNotification}
                />
              );
            })}
          </InboxNotificationList>
        )}
      </div>
    </>
  );
}



================================================
FILE: examples/nextjs-tiptap/app/page.tsx
================================================
"use client";

import Loading from "./loading";
import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
} from "@liveblocks/react/suspense";
import { useSearchParams } from "next/navigation";
import Editor from "./tiptap/editor";

// Learn how to structure your collaborative Next.js app
// https://liveblocks.io/docs/guides/how-to-use-liveblocks-with-nextjs-app-directory

export default function Page() {
  const roomId = useExampleRoomId("liveblocks:examples:nextjs-tiptap");

  return (
    <LiveblocksProvider
      authEndpoint="/api/liveblocks-auth"
      resolveUsers={async ({ userIds }) => {
        const searchParams = new URLSearchParams(
          userIds.map((userId) => ["userIds", userId])
        );
        const response = await fetch(`/api/users?${searchParams}`);

        if (!response.ok) {
          throw new Error("Problem resolving users");
        }

        const users = await response.json();
        return users;
      }}
      resolveMentionSuggestions={async ({ text }) => {
        const response = await fetch(
          `/api/users/search?text=${encodeURIComponent(text)}`
        );

        if (!response.ok) {
          throw new Error("Problem resolving mention suggestions");
        }

        const userIds = await response.json();
        return userIds;
      }}
    >
      <RoomProvider
        id={roomId}
        initialPresence={{
          cursor: null,
        }}
      >
        <ClientSideSuspense fallback={<Loading />}>
          <Editor />
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}

/**
 * This function is used when deploying an example on liveblocks.io.
 * You can ignore it completely if you run the example locally.
 */
function useExampleRoomId(roomId: string) {
  const params = useSearchParams();
  const exampleId = params?.get("exampleId");
  return exampleId ? `${roomId}-${exampleId}` : roomId;
}



================================================
FILE: examples/nextjs-tiptap/app/version-history-dialog.tsx
================================================
import * as Dialog from "@radix-ui/react-dialog";
import { useCallback, useMemo, useState } from "react";
import { Editor } from "@tiptap/react";
import Loading from "./loading";
import {
  HistoryVersionSummaryList,
  HistoryVersionSummary,
} from "@liveblocks/react-ui";
import { useHistoryVersions } from "@liveblocks/react";
import { HistoryVersionPreview } from "@liveblocks/react-tiptap";

export default function VersionsDialog({ editor }: { editor: Editor | null }) {
  const [isOpen, setOpen] = useState(false);

  const onVersionRestore = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <Dialog.Root open={isOpen} onOpenChange={setOpen}>
      <Dialog.Trigger className="inline-flex relative items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground w-8 h-8">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          x="0px"
          y="0px"
          width="16"
          height="16"
          viewBox="0 0 24 24"
        >
          <path
            fill="currentColor"
            d="M 12 2 C 6.4889971 2 2 6.4889971 2 12 C 2 17.511003 6.4889971 22 12 22 C 17.511003 22 22 17.511003 22 12 C 22 6.4889971 17.511003 2 12 2 z M 12 4 C 16.430123 4 20 7.5698774 20 12 C 20 16.430123 16.430123 20 12 20 C 7.5698774 20 4 16.430123 4 12 C 4 7.5698774 7.5698774 4 12 4 z M 11 6 L 11 12.414062 L 15.292969 16.707031 L 16.707031 15.292969 L 13 11.585938 L 13 6 L 11 6 z"
          />
        </svg>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="bg-black/50 fixed inset-0 cursor-pointer" />
        <Dialog.Content className="rounded-xl border border-border bg-card text-card-foreground shadow text-sm overflow-hidden fixed top-[50%] left-[50%] h-[85vh] w-[90vw] translate-x-[-50%] translate-y-[-50%] outline-none z-20">
          <Dialog.Title className="sr-only">Versions</Dialog.Title>
          <Dialog.Description className="sr-only">
            Previous versions of this document
          </Dialog.Description>
          {editor && <Versions onVersionRestore={onVersionRestore} editor={editor} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Versions({ onVersionRestore, editor }: { onVersionRestore: () => void, editor: Editor }) {
  const [selectedVersionId, setSelectedVersionId] = useState<string>();
  const { versions, isLoading } = useHistoryVersions();
  const selectedVersion = useMemo(
    () => versions?.find((version) => version.id === selectedVersionId),
    [selectedVersionId, versions]
  );

  return isLoading ? <Loading /> : versions?.length === 0 ? (
    <div className="flex h-full items-center justify-center p-6 text-muted-foreground">
      No versions yet
    </div>
  ) : (
    <div className="flex h-full">
      <div className="flex-1 h-full min-w-0">
        {selectedVersion ? (
          <HistoryVersionPreview
            className="w-full h-full" onVersionRestore={onVersionRestore} version={selectedVersion} editor={editor} />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-muted-foreground">
            No version selected
          </div>
        )}
      </div>
      <div className="text-sm relative w-[250px] h-full overflow-auto border-l border-border/80">
        <HistoryVersionSummaryList>
          {versions?.map((version) => (
            <HistoryVersionSummary
              onClick={() => {
                setSelectedVersionId(version.id);
              }}
              key={version.id}
              version={version}
              selected={version.id === selectedVersionId}
            />
          ))}
        </HistoryVersionSummaryList>
      </div>
    </div>
  );
}



================================================
FILE: examples/nextjs-tiptap/app/api/database.ts
================================================
// A mock database with example users
const USER_INFO: Liveblocks["UserMeta"][] = [
  {
    id: "charlie.layne@example.com",
    info: {
      name: "Charlie Layne",
      color: "#D583F0",
      avatar: "https://liveblocks.io/avatars/avatar-1.png",
    },
  },
  {
    id: "mislav.abha@example.com",
    info: {
      name: "Mislav Abha",
      color: "#F08385",
      avatar: "https://liveblocks.io/avatars/avatar-2.png",
    },
  },
  {
    id: "tatum.paolo@example.com",
    info: {
      name: "Tatum Paolo",
      color: "#F0D885",
      avatar: "https://liveblocks.io/avatars/avatar-3.png",
    },
  },
  {
    id: "anjali.wanda@example.com",
    info: {
      name: "Anjali Wanda",
      color: "#85EED6",
      avatar: "https://liveblocks.io/avatars/avatar-4.png",
    },
  },
  {
    id: "jody.hekla@example.com",
    info: {
      name: "Jody Hekla",
      color: "#85BBF0",
      avatar: "https://liveblocks.io/avatars/avatar-5.png",
    },
  },
  {
    id: "emil.joyce@example.com",
    info: {
      name: "Emil Joyce",
      color: "#8594F0",
      avatar: "https://liveblocks.io/avatars/avatar-6.png",
    },
  },
  {
    id: "jory.quispe@example.com",
    info: {
      name: "Jory Quispe",
      color: "#85DBF0",
      avatar: "https://liveblocks.io/avatars/avatar-7.png",
    },
  },
  {
    id: "quinn.elton@example.com",
    info: {
      name: "Quinn Elton",
      color: "#87EE85",
      avatar: "https://liveblocks.io/avatars/avatar-8.png",
    },
  },
];

export function getRandomUser() {
  return USER_INFO[Math.floor(Math.random() * 10) % USER_INFO.length];
}

export function getUser(id: string) {
  return USER_INFO.find((u) => u.id === id) || undefined;
}

export async function getUsers(ids: string[]) {
  return ids.map((id) => getUser(id));
}

export function getAllUsers() {
  return USER_INFO;
}



================================================
FILE: examples/nextjs-tiptap/app/api/liveblocks-auth/route.ts
================================================
import { Liveblocks } from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";
import { getRandomUser } from "../database";

/**
 * Authenticating your Liveblocks application
 * https://liveblocks.io/docs/authentication
 */

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

export async function POST(request: NextRequest) {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return new NextResponse("Missing LIVEBLOCKS_SECRET_KEY", { status: 403 });
  }

  // Get the current user's unique id and info from your database
  const user = getRandomUser();

  // Create a session for the current user (access token auth)
  const session = liveblocks.prepareSession(`${user.id}`, {
    userInfo: user.info,
  });

  // Use a naming pattern to allow access to rooms with a wildcard
  session.allow(`liveblocks:examples:*`, session.FULL_ACCESS);

  // Authorize the user and return the result
  const { status, body } = await session.authorize();

  return new NextResponse(body, { status });
}



================================================
FILE: examples/nextjs-tiptap/app/api/users/route.ts
================================================
import { getUser } from "../database";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userIds = searchParams.getAll("userIds");

  if (!userIds || !Array.isArray(userIds)) {
    return new NextResponse("Missing or invalid userIds", { status: 400 });
  }

  return NextResponse.json(
    userIds.map((userId) => getUser(userId)?.info || null),
    { status: 200 }
  );
}



================================================
FILE: examples/nextjs-tiptap/app/api/users/search/route.ts
================================================
import { NextRequest, NextResponse } from "next/server";
import { getAllUsers } from "../../database";

/**
 * Returns a list of user IDs from a partial search input
 * For `resolveMentionSuggestions` in liveblocks.config.ts
 */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get("text") as string;

  const filteredUserIds = getAllUsers()
    .filter((user) => {
      return user.info.name.toLowerCase().includes(text.toLowerCase());
    })
    .map((user) => user.id);

  return NextResponse.json(filteredUserIds);
}



================================================
FILE: examples/nextjs-tiptap/app/tiptap/classnames.ts
================================================
export function classNames(
  ...args: (string | number | boolean | undefined | null)[]
) {
  return args
    .filter((arg) => typeof arg === "string" || typeof arg === "number")
    .join(" ");
}



================================================
FILE: examples/nextjs-tiptap/app/tiptap/editor.tsx
================================================
"use client";

import NotificationsPopover from "../notifications-popover";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import {
  useLiveblocksExtension,
  FloatingComposer,
  FloatingThreads,
  AnchoredThreads,
  Toolbar,
  FloatingToolbar,
} from "@liveblocks/react-tiptap";
import StarterKit from "@tiptap/starter-kit";
import { useThreads } from "@liveblocks/react";
import { useIsMobile } from "./use-is-mobile";
import VersionsDialog from "../version-history-dialog";

export default function TiptapEditor() {
  const liveblocks = useLiveblocksExtension();

  const editor = useEditor({
    editorProps: {
      attributes: {
        // Add styles to editor element
        class: "outline-none flex-1 transition-all",
      },
    },
    extensions: [
      StarterKit.configure({
        history: false,
      }),
      liveblocks,
    ],
  });

  return (
    <div className="relative min-h-screen flex flex-col">
      <div className="h-[60px] flex items-center justify-end px-4 border-b border-border/80 bg-background">
        <VersionsDialog editor={editor} />
        <NotificationsPopover />
      </div>
      <div className="border-b border-border/80 bg-background">
        <Toolbar editor={editor} className="w-full" />
      </div>
      <div className="relative flex flex-row justify-between w-full py-16 xl:pl-[250px] pl-[100px] gap-[50px]">
        <div className="relative flex flex-1 flex-col gap-2">
          <EditorContent editor={editor} />
          <FloatingComposer editor={editor} className="w-[350px]" />
          <FloatingToolbar editor={editor} />
        </div>

        <div className="xl:[&:not(:has(.lb-tiptap-anchored-threads))]:pr-[200px] [&:not(:has(.lb-tiptap-anchored-threads))]:pr-[50px]">
          <Threads editor={editor} />
        </div>
      </div>
    </div>
  );
}

function Threads({ editor }: { editor: Editor | null }) {
  const { threads } = useThreads();
  const isMobile = useIsMobile();

  if (!threads || !editor) {
    return null;
  }

  return isMobile ? (
    <FloatingThreads threads={threads} editor={editor} />
  ) : (
    <AnchoredThreads
      threads={threads}
      editor={editor}
      className="w-[350px] xl:mr-[100px] mr-[50px]"
    />
  );
}



================================================
FILE: examples/nextjs-tiptap/app/tiptap/use-is-mobile.tsx
================================================
import { useSyncExternalStore } from "react";

export function useIsMobile() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

function subscribe(callback: () => void) {
  const query = window.matchMedia("(max-width: 1024px)");

  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function getSnapshot() {
  const query = window.matchMedia("(max-width: 1024px)");
  return query.matches;
}



================================================
FILE: examples/nextjs-tiptap/app/tiptap/icons/blockquote-icon.tsx
================================================
import React from "react";
import { SVGAttributes } from "react";

export default function BlockQuoteIcon(props: SVGAttributes<SVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M17 6H3" />
      <path d="M21 12H8" />
      <path d="M21 18H8" />
      <path d="M3 12v6" />
    </svg>
  );
}



================================================
FILE: examples/nextjs-tiptap/app/tiptap/icons/bold-icon.tsx
================================================
import React from "react";
import { SVGAttributes } from "react";

export default function BoldIcon(props: SVGAttributes<SVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8" />
    </svg>
  );
}



================================================
FILE: examples/nextjs-tiptap/app/tiptap/icons/comment-icon.tsx
================================================
import React from "react";
import { SVGAttributes } from "react";

export default function CommentIcon(props: SVGAttributes<SVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}



================================================
FILE: examples/nextjs-tiptap/app/tiptap/icons/heading-one-icon.tsx
================================================
import React from "react";
import { SVGAttributes } from "react";

export default function HeadingOneIcon(props: SVGAttributes<SVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4 12h8" />
      <path d="M4 18V6" />
      <path d="M12 18V6" />
      <path d="m17 12 3-2v8" />
    </svg>
  );
}



================================================
FILE: examples/nextjs-tiptap/app/tiptap/icons/heading-three-icon.tsx
================================================
import React from "react";
import { SVGAttributes } from "react";

export default function HeadingThreeIcon(props: SVGAttributes<SVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4 12h8" />
      <path d="M4 18V6" />
      <path d="M12 18V6" />
      <path d="M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2" />
      <path d="M17 17.5c2 1.5 4 .3 4-1.5a2 2 0 0 0-2-2" />
    </svg>
  );
}



================================================
FILE: examples/nextjs-tiptap/app/tiptap/icons/heading-two-icon.tsx
================================================
import React from "react";
import { SVGAttributes } from "react";

export default function HeadingTwoIcon(props: SVGAttributes<SVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4 12h8" />
      <path d="M4 18V6" />
      <path d="M12 18V6" />
      <path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1" />
    </svg>
  );
}



================================================
FILE: examples/nextjs-tiptap/app/tiptap/icons/LICENSE.md
================================================
Lucide License
ISC License

Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2022.

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.


