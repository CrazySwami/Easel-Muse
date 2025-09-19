import { Button } from '@/components/ui/button';
import { ArrowRightIcon } from 'lucide-react';
import Link from 'next/link'; 
import { env } from '@/lib/env';

type HeroProps = {
  announcement?: {
    title: string;
    link: string;
  };
  buttons: {
    title: string;
    link: string;
  }[];
};

export const Hero = ({ announcement, buttons }: HeroProps) => (
  <div className="relative overflow-hidden full-bleed -mt-16 md:-mt-20" style={{ marginTop: 0 }}>
    {/* Animated background */}
    <div className="absolute inset-0 animated-gradient" aria-hidden="true" />
    <div className="hero-bottom-fade" aria-hidden="true" />

    {/* Content */}
    <div className="relative mx-auto flex max-w-4xl flex-col items-center px-5 py-10 text-center md:py-14 fade-up-in">
      {announcement && (
        <Link
          href={announcement.link}
          className="relative inline-flex items-center justify-between gap-2 rounded-full border px-4 py-1.5 text-sm tracking-[-0.01rem] transition-all duration-300 ease-in-out hover:border-primary hover:bg-primary/5 hover:text-primary"
          target={announcement.link.startsWith('http') ? '_blank' : '_self'}
          rel={announcement.link.startsWith('http') ? 'noopener noreferrer' : undefined}
        >
          {announcement.title}
          <ArrowRightIcon size={16} />
        </Link>
      )}

      <h1 className="mt-6 mb-5 text-center font-medium text-4xl tracking-[-0.12rem] md:text-6xl">
        Collaborative canvas for designing with AI
      </h1>

      <p className="mt-14 max-w-2xl text-center text-muted-foreground tracking-[-0.01rem] sm:text-lg">
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
