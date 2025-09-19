'use client';

import { createProjectAction } from '@/app/actions/project/create';
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
import { handleError } from '@/lib/error/handle';
import { PlusIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type FormEventHandler, useCallback, useState } from 'react';

export const NewProjectButton = () => {
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleCreateProject = useCallback<FormEventHandler<HTMLFormElement>>(
    async (event) => {
      event.preventDefault();

      if (isCreating) {
        return;
      }

      setIsCreating(true);

      try {
        const response = await createProjectAction(name.trim());

        if ('error' in response) {
          throw new Error(response.error);
        }

        setOpen(false);
        setName('');
        router.push(`/projects/${response.id}`);
      } catch (error) {
        handleError('Error creating project', error);
      } finally {
        setIsCreating(false);
      }
    },
    [isCreating, name, router],
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create new project</DialogTitle>
          <DialogDescription>
            What would you like to call your new project?
          </DialogDescription>
          <form
            onSubmit={handleCreateProject}
            className="mt-2 flex items-center gap-2"
            aria-disabled={isCreating}
          >
            <Input
              placeholder="My new project"
              value={name}
              onChange={({ target }) => setName(target.value)}
            />
            <Button type="submit" disabled={isCreating || !name.trim()}>
              Create
            </Button>
          </form>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};
