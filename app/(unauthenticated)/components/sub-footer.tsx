'use client';

import { Logo } from '@/components/logo';
import { ThemeSwitcher } from '@/components/ui/kibo-ui/theme-switcher';
import { useTheme } from 'next-themes';
import Link from 'next/link';

export const SubFooter = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex flex-col items-start justify-between gap-4 px-8 text-muted-foreground text-sm md:flex-row fade-up-in">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-6">
        <Link href="/">
          <Logo className="h-6 w-auto" />
        </Link>
        <Link href="/pricing">Pricing</Link>
        <Link href="/update-log">Changelog</Link>
        <a
          href="https://github.com/CrazySwami/Easel-Muse/tree/main"
          target="_blank"
          rel="noopener noreferrer"
        >
          Source Code
        </a>
        {/* Temporarily hidden: Privacy, Terms, Acceptable Use, Contact */}
      </div>
      <div className="flex items-center justify-end">
        <ThemeSwitcher
          value={theme as 'light' | 'dark' | 'system'}
          onChange={setTheme}
        />
      </div>
    </div>
  );
};
