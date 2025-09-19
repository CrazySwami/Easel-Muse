'use client';

import { generateShareLinks } from '@/app/actions/project/share';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShareIcon, CopyIcon, MailIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
// Live viewers disabled in this branch
const useOthers: any = () => [];
const useSelf: any = () => null;

const ViewersList = () => {
  const others = useOthers();
  const me = useSelf();
  const viewers = [
    ...(me
      ? [{
          id: me.connectionId,
          name: (me.info as any)?.name ?? 'You',
          email: (me.info as any)?.email as string | undefined,
          color: (me.info as any)?.color as string | undefined,
          avatar: (me.info as any)?.avatar as string | undefined,
        }]
      : []),
    ...others.map((u) => ({
      id: u.connectionId,
      name: (u.info as any)?.name ?? (u.info as any)?.email ?? 'User',
      email: (u.info as any)?.email as string | undefined,
      color: (u.info as any)?.color as string | undefined,
      avatar: (u.info as any)?.avatar as string | undefined,
    })),
  ];

  return (
    <div className="space-y-2">
      <Label>Active viewers</Label>
      {viewers.length === 0 ? (
        <p className="text-xs text-muted-foreground">No one else is viewing right now.</p>
      ) : (
        <div className="flex flex-col gap-2 max-h-48 overflow-auto">
          {viewers.map((u) => (
            <div key={u.id} className="flex items-center gap-2">
              {u.avatar ? (
                <img src={u.avatar} alt={u.name} className="h-5 w-5 rounded-full" />
              ) : (
                <div
                  className="h-5 w-5 rounded-full"
                  style={{ background: u.color ?? '#06f', boxShadow: '0 0 0 2px white' }}
                />
              )}
              <span className="text-xs">{u.name}</span>
              {u.email ? (
                <span className="text-[10px] text-muted-foreground">{u.email}</span>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

type ShareDialogProps = {
  projectId: string;
};

export const ShareDialog = ({ projectId }: ShareDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [links, setLinks] = useState<{ readOnlyUrl: string; inviteUrl: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerateLinks = async () => {
    setIsLoading(true);
    try {
      const result = await generateShareLinks(projectId);
      if ('error' in result) {
        toast.error(result.error);
      } else {
        setLinks(result);
        toast.success('Share links generated');
      }
    } catch (error) {
      toast.error('Failed to generate share links');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyReadOnly = () => {
    if (links?.readOnlyUrl) {
      navigator.clipboard.writeText(links.readOnlyUrl);
      toast.success('Read-only link copied');
    }
  };

  const handleCopyInvite = () => {
    if (links?.inviteUrl) {
      navigator.clipboard.writeText(links.inviteUrl);
      toast.success('Invite link copied');
    }
  };

  const Inner = (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ShareIcon className="h-4 w-4 mr-2" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Project</DialogTitle>
          <DialogDescription>
            Generate links to share this project with others.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <ViewersList />

          {!links ? (
            <Button onClick={handleGenerateLinks} disabled={isLoading} className="w-full">
              {isLoading ? 'Generating...' : 'Generate Share Links'}
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="readonly">Read-only Link</Label>
                <div className="flex gap-2">
                  <Input
                    id="readonly"
                    value={links.readOnlyUrl}
                    readOnly
                    className="text-xs"
                  />
                  <Button size="sm" variant="outline" onClick={handleCopyReadOnly}>
                    <CopyIcon className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Anyone with this link can view the project but cannot edit.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="invite">Invite Link</Label>
                <div className="flex gap-2">
                  <Input
                    id="invite"
                    value={links.inviteUrl}
                    readOnly
                    className="text-xs"
                  />
                  <Button size="sm" variant="outline" onClick={handleCopyInvite}>
                    <CopyIcon className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Send this link to invite someone to collaborate. They'll be added as a member when they click it.
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );

  // Providers are handled by the page; render directly
  return Inner;
};
