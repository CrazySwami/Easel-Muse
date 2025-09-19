import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { currentUser } from '@/lib/auth';
import Link from 'next/link';
import { env } from '@/lib/env';

export const Header = async () => {
  const user = await currentUser();

  return (
    <header className="flex items-center justify-between px-8">
      <Link
        href="/"
        className="flex items-center gap-2 fade-up-in"
        style={{ animationDelay: '100ms' }}
      >
        <Logo className="h-6 w-auto" />
        <span className="font-medium text-xl tracking-tight">{env.NEXT_PUBLIC_APP_NAME}</span>
      </Link>
      <div className="flex items-center gap-2">
        <Button
          variant="link"
          asChild
          className="text-muted-foreground fade-up-in"
          style={{ animationDelay: '200ms' }}
        >
          <Link href="/pricing">Pricing</Link>
        </Button>
        {user ? (
          <Button
            variant="outline"
            asChild
            className="fade-up-in"
            style={{ animationDelay: '300ms' }}
          >
            <Link href="/">Go to app</Link>
          </Button>
        ) : (
          <>
            <Button
              variant="outline"
              asChild
              className="fade-up-in"
              style={{ animationDelay: '300ms' }}
            >
              <Link href="/auth/login">Login</Link>
            </Button>
            <Button asChild className="fade-up-in" style={{ animationDelay: '400ms' }}>
              <Link href="/auth/sign-up">Sign up</Link>
            </Button>
          </>
        )}
      </div>
    </header>
  );
};
