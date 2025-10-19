'use client';

import { Uploader } from '@/components/uploader';
import { useUser } from '@/hooks/use-user';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export default function FeedbackClient({ onSubmitted }: { onSubmitted?: () => void }) {
  const user = useUser();
  const [kind, setKind] = useState<'feature' | 'bug'>('feature');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [type, setType] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, title, message, imageUrl }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to submit');
      }
      setSubmitted(true);
      onSubmitted?.();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const meta = (user?.user_metadata || {}) as any;
  const avatar = meta.avatar || meta.avatar_url || meta.picture || undefined;
  const displayName = meta.name || meta.full_name || (user?.email ? user.email.split('@')[0] : user?.id);
  const initials = (displayName || '').split(' ').map((n: string) => n.at(0)).join('');

  return (
    <div className="mx-auto max-w-2xl p-6">
      {/* Type toggle above user info */}
      <div className="mb-4 inline-flex items-center gap-2 rounded-md border p-1" role="tablist" aria-label="Feedback type">
        <Button aria-pressed={kind === 'feature'} role="tab" variant={kind === 'feature' ? 'default' : 'outline'} onClick={() => setKind('feature')}>Feature request</Button>
        <Button aria-pressed={kind === 'bug'} role="tab" variant={kind === 'bug' ? 'default' : 'outline'} onClick={() => setKind('bug')}>Bug</Button>
      </div>
      {user && (
        <div className="mb-4 flex items-center gap-3 text-sm">
          <Avatar>
            <AvatarImage src={avatar} />
            <AvatarFallback className="bg-primary text-primary-foreground uppercase">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{displayName}</div>
            <div className="text-muted-foreground">{user.email}</div>
          </div>
        </div>
      )}
      <div className="space-y-3">
        <Input placeholder={`${kind === 'feature' ? 'Feature' : 'Bug'} title`} value={title} onChange={(e) => setTitle(e.target.value)} />
        {/* Email no longer editable; saved from profile */}
        <Textarea placeholder="Description" rows={10} className="max-h-[40vh]" value={message} onChange={(e) => setMessage(e.target.value)} />
        <div>
          <p className="text-sm text-muted-foreground mb-2">Attach one image (max 5MB)</p>
          <div className="rounded-md border p-3">
            <Uploader
              accept={{ 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] }}
              onUploadCompleted={(url, t) => { setImageUrl(url); setType(t); }}
              maxSizeBytes={1024 * 1024 * 5}
            >
              <div className={cn('h-28 flex items-center justify-center text-sm text-muted-foreground')}>
                {imageUrl ? 'Image uploaded' : 'Drop image or click to upload'}
              </div>
            </Uploader>
          </div>
        </div>
        <div className="pt-2">
          <Button disabled={submitting || submitted || !message.trim()} onClick={onSubmit}>
            {submitted ? 'Submitted' : submitting ? 'Submitting…' : 'Submit'}
          </Button>
        </div>
      </div>
    </div>
  );
}



