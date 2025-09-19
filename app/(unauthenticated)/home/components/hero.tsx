import { Button } from '@/components/ui/button';
import { ArrowRightIcon } from 'lucide-react';
import Link from 'next/link'; 
import { env } from '@/lib/env';

interface HeroProps {
  announcement?: {
    title: string;
    link: string;
  };
  buttons: {
    title: string;
    link: string;
  }[];
}

export const Hero = ({ announcement, buttons }: HeroProps) => (
  <div className="relative overflow-hidden rounded-2xl">
    {/* Content */}
    <div className="relative mx-auto flex max-w-4xl flex-col items-center px-5 pt-32 pb-12 text-center md:pt-30 md:pb-16 fade-up-in">
      {announcement && (
        <Link
          href={announcement.link}
          className="relative inline-flex items-center justify-between gap-2 rounded-full border border-primary bg-primary/5 px-4 py-1.5 text-sm text-primary tracking-[-0.01rem]"
          target={announcement.link.startsWith('http') ? '_blank' : '_self'}
          rel={
            announcement.link.startsWith('http') ? 'noopener noreferrer' : undefined
          }
        >
          {announcement.title}
          <ArrowRightIcon size={16} />
        </Link>
      )}

      <h1 className="font-serif mt-6 mb-5 text-center font-semibold text-4xl tracking-[-0.12rem] md:text-6xl">
        Collaborative Canvas For Design Thinking With AI
      </h1>

      <p className="mt-2 max-w-2xl text-center text-muted-foreground tracking-[-0.01rem] sm:text-lg">
        {env.NEXT_PUBLIC_APP_NAME} is an open source canvas for building AI workflows. Drag, drop
        connect and run nodes to build your own workflows powered by various
        industry-leading AI models.
      </p>

      <div className="mt-8 flex flex-col items-center justify-center gap-4 md:flex-row">
        {buttons.map((button, index) => (
          <Button
            key={button.title}
            variant={index === 0 ? 'default' : 'outline'}
            asChild
            size="lg"
            className="w-full sm:w-auto"
          >
            <Link href={button.link}>{button.title}</Link>
          </Button>
        ))}
      </div>
    </div>
  </div>
);
