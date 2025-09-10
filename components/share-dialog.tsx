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

  return (
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
};
