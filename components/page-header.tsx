'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ReactNode } from 'react';
import { Menu } from './menu';
import { ThemeSwitcher } from './theme-switcher';

type PageHeaderProps = {
  title: string;
  description?: string;
  rightSlot?: ReactNode; // e.g. NewProjectButton
  iconHref?: string; // defaults to /projects
  titleClassName?: string; // override font family/style
};

export const PageHeader = ({
  title,
  description,
  rightSlot,
  iconHref = '/projects',
  titleClassName,
}: PageHeaderProps) => {
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={iconHref} className="inline-flex">
            <Image src="/Easel-Logo.svg" alt="Easel" width={40} height={40} priority />
          </Link>
          <div>
            <h1 className={titleClassName ?? 'font-serif text-4xl font-semibold tracking-tight'}>
              {title}
            </h1>
            {description && (
              <p className="mt-2 text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {rightSlot}
          <Menu />
          <ThemeSwitcher />
        </div>
      </div>
    </div>
  );
};


