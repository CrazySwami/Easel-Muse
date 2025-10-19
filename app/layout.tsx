import { Toaster } from '@/components/ui/sonner';
import './globals.css';
import { TooltipProvider } from '@/components/ui/tooltip';
import { mono, sans, serif } from '@/lib/fonts';
import { cn } from '@/lib/utils';
import { PostHogProvider } from '@/providers/posthog-provider';
import { ThemeProvider } from '@/providers/theme';
import { Analytics } from '@vercel/analytics/next';
import type { ReactNode } from 'react';
import DevDiagnostics from '@/components/dev-diagnostics';
import Script from 'next/script';

type RootLayoutProps = {
  children: ReactNode;
};

const RootLayout = ({ children }: RootLayoutProps) => (
  <html lang="en" suppressHydrationWarning>
    <body
      className={cn(
        sans.variable,
        serif.variable,
        mono.variable,
        'bg-background text-foreground antialiased [scrollbar-width:none] [&_*::-webkit-scrollbar]:hidden'
      )}
    >
      {process.env.NODE_ENV !== 'production' ? (
        <>
          {/* Small, in-app signals and local instrumentation */}
          <DevDiagnostics />
          {/* Hard-load React Scan from CDN to ensure overlay initializes in dev */}
          {String(process.env.NEXT_PUBLIC_ENABLE_RENDER_DIAGS || '').toLowerCase() === '1' ? (
            <>
              <Script src="https://unpkg.com/react-scan/dist/install-hook.global.js" strategy="afterInteractive" />
              <Script src="https://unpkg.com/react-scan/dist/auto.global.js" strategy="afterInteractive" />
            </>
          ) : null}
        </>
      ) : null}
      <PostHogProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster className="z-[99999999]" />
        </ThemeProvider>
        <Analytics />
      </PostHogProvider>
    </body>
  </html>
);

export default RootLayout;
