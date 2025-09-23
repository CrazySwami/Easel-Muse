'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MonitorIcon, MoonIcon, SunIcon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

const themes = [
  {
    label: 'Light',
    icon: SunIcon,
    value: 'light',
  },
  {
    label: 'Dark',
    icon: MoonIcon,
    value: 'dark',
  },
  {
    label: 'System',
    icon: MonitorIcon,
    value: 'system',
  },
];

export const ThemeSwitcher = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // During SSR (or before hydration), render a stable placeholder to avoid
  // hydration mismatches when the resolved theme differs on the client.
  const CurrentIcon = theme === 'light' ? SunIcon : theme === 'dark' ? MoonIcon : MonitorIcon;

  return (
    <div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Select theme"
            className="rounded-full"
          >
            {mounted ? <CurrentIcon size={16} /> : <MonitorIcon size={16} />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-32">
          {themes.map((item) => (
            <DropdownMenuItem
              key={item.value}
              onClick={() => setTheme(item.value)}
            >
              <item.icon
                size={16}
                strokeWidth={2}
                className="opacity-60"
                aria-hidden="true"
              />
              <span>{item.label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
