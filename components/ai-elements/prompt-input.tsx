'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { ComponentProps, HTMLAttributes } from 'react';

export type PromptInputMessage = { text?: string; files?: File[] };

export type PromptInputProps = HTMLAttributes<HTMLFormElement> & {
  onSubmit: (message: PromptInputMessage) => void;
};

export const PromptInput = ({ className, onSubmit, ...props }: PromptInputProps) => (
  <form
    className={cn('w-full rounded-xl border bg-background shadow-sm', className)}
    onSubmit={(e) => { e.preventDefault(); const form = e.currentTarget; const textarea = form.querySelector('textarea[name="prompt"]') as HTMLTextAreaElement | null; onSubmit({ text: textarea?.value }); }}
    {...props}
  />
);

export const PromptInputBody = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('p-2', className)} {...props} />
);

export const PromptInputTextarea = (props: ComponentProps<typeof Textarea>) => (
  <Textarea name="prompt" className={cn('w-full resize-none border-none shadow-none outline-none ring-0 focus-visible:ring-0', props.className)} rows={2} {...props} />
);

export const PromptInputToolbar = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex items-center justify-between p-2', className)} {...props} />
);

export const PromptInputTools = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex items-center gap-1', className)} {...props} />
);

export const PromptInputButton = (props: ComponentProps<typeof Button>) => (
  <Button type="button" variant="ghost" size="default" {...props} />
);

export const PromptInputSubmit = ({ status, ...props }: ComponentProps<typeof Button> & { status?: 'submitted' | 'streaming' | 'ready' | 'error' }) => (
  <Button type="submit" {...props} />
);

export const PromptInputActionMenu = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('inline-flex items-center', className)} {...props} />
);
export const PromptInputActionMenuTrigger = (props: ComponentProps<typeof Button>) => (
  <Button type="button" variant="ghost" size="icon" {...props} />
);
export const PromptInputActionMenuContent = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('hidden', className)} {...props} />
);
export const PromptInputActionAddAttachments = () => null;
export const PromptInputAttachments = ({ children }: { children: (f: any) => any }) => null;
export const PromptInputAttachment = ({ data }: { data: any }) => null;

export const PromptInputModelSelect = (props: ComponentProps<typeof Select>) => <Select {...props} />;
export const PromptInputModelSelectTrigger = (props: ComponentProps<typeof SelectTrigger>) => <SelectTrigger {...props} />;
export const PromptInputModelSelectValue = (props: ComponentProps<typeof SelectValue>) => <SelectValue {...props} />;
export const PromptInputModelSelectContent = (props: ComponentProps<typeof SelectContent>) => <SelectContent {...props} />;
export const PromptInputModelSelectItem = (props: ComponentProps<typeof SelectItem>) => <SelectItem {...props} />;


