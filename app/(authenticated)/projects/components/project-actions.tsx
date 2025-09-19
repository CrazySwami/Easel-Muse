'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { handleError } from '@/lib/error/handle';
import type { projects } from '@/schema';
import { MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  type FormEventHandler,
  useCallback,
  useState,
  useTransition,
} from 'react';
import { deleteProjectAction } from '@/app/actions/project/delete';
import { updateProjectAction } from '@/app/actions/project/update';

type Project = typeof projects.$inferSelect;

export const ProjectActions = ({ project }: { project: Project }) => {
  const [name, setName] = useState(project.name);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleRenameProject = useCallback<FormEventHandler<HTMLFormElement>>(
    async (event) => {
      event.preventDefault();
      startTransition(async () => {
        try {
          const response = await updateProjectAction(project.id, {
            name: name.trim(),
          });
          if ('error' in response) throw new Error(response.error);
          router.refresh();
        } catch (error) {
          handleError('Error renaming project', error);
        }
      });
    },
    [project.id, name, router],
  );

  const handleDeleteProject = useCallback(async () => {
    startTransition(async () => {
      try {
        const response = await deleteProjectAction(project.id);
        if ('error' in response) throw new Error(response.error);
        router.refresh();
      } catch (error) {
        handleError('Error deleting project', error);
      }
    });
  }, [project.id, router]);

  return (
    <Dialog>
      <AlertDialog>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link href={`/projects/${project.id}`}>Open</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DialogTrigger asChild>
              <DropdownMenuItem>Rename</DropdownMenuItem>
            </DialogTrigger>
            <AlertDialogTrigger asChild>
              <DropdownMenuItem className="text-destructive">
                Delete
              </DropdownMenuItem>
            </AlertDialogTrigger>
          </DropdownMenuContent>
        </DropdownMenu>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename project</DialogTitle>
            <DialogDescription>
              Enter a new name for your project.
            </DialogDescription>
            <form
              onSubmit={handleRenameProject}
              className="mt-2 flex items-center gap-2"
              aria-disabled={isPending}
            >
              <Input
                value={name}
                onChange={({ target }) => setName(target.value)}
              />
              <Button type="submit" disabled={isPending || !name.trim()}>
                Save
              </Button>
            </form>
          </DialogHeader>
        </DialogContent>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              project.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProject}
              disabled={isPending}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};
