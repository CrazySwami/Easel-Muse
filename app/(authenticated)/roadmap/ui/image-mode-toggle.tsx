'use client';

import { Button } from '@/components/ui/button';

export default function ImageModeToggle({ on }: { on: boolean }) {
  const toggle = () => {
    const url = new URL(window.location.href);
    const current = url.searchParams.get('images') === '1';
    url.searchParams.set('images', current ? '0' : '1');
    window.location.href = url.toString();
  };

  return (
    <Button variant="outline" size="sm" type="button" onClick={toggle}>
      {on ? 'Images: On' : 'Images: Off'}
    </Button>
  );
}


