import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { LocalTime } from '@/app/(unauthenticated)/components/local-time';

export const Footer = () => (
  <div className="mt-16 flex flex-col items-center justify-center px-5 py-16 pb-32 fade-up-in">
    <h2 className="font-serif font-semibold mb-5 text-center text-3xl tracking-[-0.12rem] md:text-5xl">
      Get Started <LocalTime />
    </h2>
    <p className="max-w-2xl text-center text-lg text-muted-foreground tracking-[-0.01rem]">
      Get started for free and start creating your own AI workflows.
    </p>
    <div className="mt-8 flex flex-col items-center justify-center gap-4 md:flex-row">
      <Button asChild size="lg" className="w-full sm:w-auto">
        <Link href="/auth/sign-up">Get started for free</Link>
      </Button>
      <Button
        asChild
        variant="outline"
        size="lg"
        className="w-full sm:w-auto"
      >
        <Link href="/auth/login">Login</Link>
      </Button>
    </div>
  </div>
);
