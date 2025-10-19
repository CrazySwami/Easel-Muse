'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUser } from '@/hooks/use-user';
import { createClient } from '@/lib/supabase/client';
import { useSubscription } from '@/providers/subscription';
import { ArrowUpRight, ArrowUpRightIcon, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type MouseEventHandler, useState } from 'react';
import { Profile } from './profile';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';

export const Menu = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const router = useRouter();
  const user = useUser();
  const { isSubscribed } = useSubscription();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  const handleOpenProfile: MouseEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    setDropdownOpen(false);

    // shadcn/ui issue: dropdown animation causes profile modal to close immediately after opening
    setTimeout(() => {
      setProfileOpen(true);
    }, 200);
  };

  if (!user) {
    return (
      <Button variant="ghost" size="icon" className="rounded-full" disabled>
        <Loader2 className="animate-spin" size={16} />
      </Button>
    );
  }

  const meta = user.user_metadata || {} as any;
  const avatar = meta.avatar || meta.avatar_url || meta.picture || undefined;
  const displayName = meta.name || meta.full_name || (user.email ? user.email.split('@')[0] : user.id);
  const initials = (displayName || '')
    .split(' ')
    .map((n: string) => n.at(0))
    .join('');

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full">
            <Avatar>
              <AvatarImage src={avatar} />
              <AvatarFallback className="bg-primary text-primary-foreground uppercase">{initials}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="bottom"
          align="end"
          collisionPadding={8}
          sideOffset={16}
          className="w-52"
        >
          <DropdownMenuLabel>
            <Avatar>
              <AvatarImage src={avatar} />
              <AvatarFallback className="bg-primary text-primary-foreground uppercase">{initials}</AvatarFallback>
            </Avatar>
            <p className="mt-2 truncate">
              {displayName}
            </p>
            {displayName && user.email && (
              <p className="truncate font-normal text-muted-foreground text-xs">
                {user.email}
              </p>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleOpenProfile}>
            Profile
          </DropdownMenuItem>
          {isSubscribed && (
            <DropdownMenuItem asChild className="justify-between">
              <a href="/api/portal" target="_blank" rel="noopener noreferrer">
                Billing{' '}
                <ArrowUpRightIcon size={16} className="text-muted-foreground" />
              </a>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link href="/pricing" className="flex items-center justify-between">
              <span>Upgrade</span>
              <ArrowUpRight size={16} className="text-muted-foreground" />
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/roadmap" className="flex items-center justify-between">
              <span>Feedback</span>
              <ArrowUpRight size={16} className="text-muted-foreground" />
            </Link>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={logout}>Logout</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Profile open={profileOpen} setOpen={setProfileOpen} />
    </>
  );
};
