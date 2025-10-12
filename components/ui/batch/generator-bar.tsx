'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ModelSelector } from '@/components/nodes/model-selector';

type GeneratorBarProps = {
  model: string;
  models: Record<string, any>;
  onModelChange: (m: string) => void;
  prompt: string;
  onPromptChange: (v: string) => void;
  onGenerate: () => void;
  generating?: boolean;
  disabled?: boolean;
  className?: string;
};

export function GeneratorBar({ model, models, onModelChange, prompt, onPromptChange, onGenerate, generating, disabled, className }: GeneratorBarProps) {
  const isDisabled = disabled || !prompt.trim() || Boolean(generating);
  return (
    <div className={`flex w-full items-center gap-2 ${className ?? ''}`}>
      <ModelSelector value={model} options={models} className="w-[220px] rounded-full" onChange={onModelChange} />
      <Input className="flex-1" placeholder="Describe questions to generate…" value={prompt} onChange={(e) => onPromptChange(e.target.value)} />
      <Button onClick={onGenerate} disabled={isDisabled}>{generating ? 'Generating…' : 'Generate to Batch'}</Button>
    </div>
  );
}


