'use client';

import { Button } from '@/components/ui/button';

export default function AdminToggle({ isOn }: { isOn: boolean }) {
  const onClick = () => {
    const url = new URL(window.location.href);
    if (isOn) url.searchParams.delete('admin'); else url.searchParams.set('admin', '1');
    window.location.href = url.toString();
  };

  return (
    <Button type="button" onClick={onClick}>{isOn ? 'Exit admin mode' : 'Enter admin mode'}</Button>
  );
}


