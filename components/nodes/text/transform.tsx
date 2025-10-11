import { NodeLayout } from '@/components/nodes/layout';
import { Button } from '@/components/ui/button';
import {
  AIMessage,
  AIMessageContent,
} from '@/components/ui/kibo-ui/ai/message';
import { AIResponse } from '@/components/ui/kibo-ui/ai/response';
import {
  AISource,
  AISources,
  AISourcesContent,
  AISourcesTrigger,
} from '@/components/ui/kibo-ui/ai/source';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useAnalytics } from '@/hooks/use-analytics';
import { useReasoning } from '@/hooks/use-reasoning';
import { handleError } from '@/lib/error/handle';
import {
  getDescriptionsFromImageNodes,
  getFilesFromFileNodes,
  getImagesFromImageNodes,
  getTextFromTextNodes,
  getTranscriptionFromAudioNodes,
  getTweetContentFromTweetNodes,
  getTextFromTiptapNodes,
} from '@/lib/xyflow';
import { useGateway } from '@/providers/gateway/client';
import { useProject } from '@/providers/project';
import { ReasoningTunnel } from '@/tunnels/reasoning';
import { useChat } from '@ai-sdk/react';
import { getIncomers, useReactFlow } from '@xyflow/react';
import { DefaultChatTransport, type FileUIPart } from 'ai';
import {
  ClockIcon,
  CopyIcon,
  PlayIcon,
  RotateCcwIcon,
  SquareIcon,
} from 'lucide-react';
import {
  type ChangeEventHandler,
  type ComponentProps,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { mutate } from 'swr';
import type { TextNodeProps } from '.';
import { ModelSelector } from '../model-selector';

type TextTransformProps = TextNodeProps & {
  title: string;
};

const DEFAULT_TEXT_MODEL_ID = 'gpt-5-mini';
const getDefaultModel = (models: ReturnType<typeof useGateway>['models']) => {
  if (models[DEFAULT_TEXT_MODEL_ID]) return DEFAULT_TEXT_MODEL_ID;
  const entry = Object.entries(models).find(([id]) => id.includes('gpt-5') || id.includes('mini'));
  return entry?.[0] ?? Object.keys(models)[0];
};

export const TextTransform = ({
  data,
  id,
  type,
  title,
}: TextTransformProps) => {
  const { updateNodeData, getNodes, getEdges } = useReactFlow();
  const project = useProject();
  const { models } = useGateway();
  const modelId = data.model ?? getDefaultModel(models);
  const analytics = useAnalytics();
  const [reasoning, setReasoning] = useReasoning();
  const { sendMessage, messages, setMessages, status, stop } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
    onError: (error) => handleError('Error generating text', error),
    onFinish: ({ message }) => {
      updateNodeData(id, {
        generated: {
          text: message.parts.find((part) => part.type === 'text')?.text ?? '',
          sources:
            message.parts?.filter((part) => part.type === 'source-url') ?? [],
        },
        updatedAt: new Date().toISOString(),
      });

      setReasoning((oldReasoning) => ({
        ...oldReasoning,
        isGenerating: false,
      }));

      toast.success('Text generated successfully');

      setTimeout(() => mutate('credits'), 5000);
    },
  });

  // Defensive: if both source and target are text nodes, we keep the UI lightweight
  // by delaying markdown rendering until generation completes.
  const slowRender = status !== 'ready';

  // Global stress trigger: listen for generate-all to fire generation on this node
  useEffect(() => {
    const onGen = () => {
      // Only trigger for transform nodes (has incomers) to simulate pipelines
      void handleGenerate();
    };
    window.addEventListener('easel:generate-all', onGen);
    return () => window.removeEventListener('easel:generate-all', onGen);
  }, []);

  const handleGenerate = useCallback(async () => {
    const incomers = getIncomers({ id }, getNodes(), getEdges());
    const textPrompts = getTextFromTextNodes(incomers);
    const docPrompts = getTextFromTiptapNodes(incomers);
    const audioPrompts = getTranscriptionFromAudioNodes(incomers);
    const images = getImagesFromImageNodes(incomers);
    const imageDescriptions = getDescriptionsFromImageNodes(incomers);
    const tweetContent = getTweetContentFromTweetNodes(incomers);
    const files = getFilesFromFileNodes(incomers);

    if (!textPrompts.length && !docPrompts.length && !audioPrompts.length && !data.instructions) {
      handleError('Error generating text', 'No prompts found');
      return;
    }

    const content: string[] = [];

    if (data.instructions) {
      content.push('--- Instructions ---', data.instructions);
    }

    if (textPrompts.length) {
      content.push('--- Text Prompts ---', ...textPrompts);
    }

    if (docPrompts.length) {
      content.push('--- Doc Content ---', ...docPrompts);
    }

    if (audioPrompts.length) {
      content.push('--- Audio Prompts ---', ...audioPrompts);
    }

    if (imageDescriptions.length) {
      content.push('--- Image Descriptions ---', ...imageDescriptions);
    }

    if (tweetContent.length) {
      content.push('--- Tweet Content ---', ...tweetContent);
    }

    analytics.track('canvas', 'node', 'generate', {
      type,
      promptLength: content.join('\n').length,
      model: modelId,
      instructionsLength: data.instructions?.length ?? 0,
      imageCount: images.length,
      fileCount: files.length,
    });

    const attachments: FileUIPart[] = [];

    for (const image of images) {
      attachments.push({
        mediaType: image.type,
        url: image.url,
        type: 'file',
      });
    }

    for (const file of files) {
      attachments.push({
        mediaType: file.type,
        url: file.url,
        type: 'file',
      });
    }

    setMessages([]);
    await sendMessage(
      {
        text: content.join('\n'),
        files: attachments,
      },
      {
        body: {
          modelId,
        },
      }
    );
  }, [
    sendMessage,
    data.instructions,
    getEdges,
    getNodes,
    id,
    modelId,
    type,
    analytics.track,
    setMessages,
  ]);

  const handleInstructionsChange: ChangeEventHandler<HTMLTextAreaElement> = (
    event
  ) => updateNodeData(id, { instructions: event.target.value });

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  }, []);

  const generatedText = useMemo(() => {
    if (messages.length > 0) {
      return messages
        .filter((m) => m.role === 'assistant')
        .map((m) => m.parts.find((p) => p.type === 'text')?.text ?? '')
        .join('\n');
    }
    return data.generated?.text;
  }, [messages, data.generated?.text]);
  
  const toolbar = useMemo(() => {
    const items: ComponentProps<typeof NodeLayout>['toolbar'] = [];

    items.push({
      children: (
        <ModelSelector
          value={modelId}
          options={models}
          key={id}
          className="w-[200px] rounded-full"
          onChange={(value) => updateNodeData(id, { model: value })}
        />
      ),
    });

    if (status === 'submitted' || status === 'streaming') {
      items.push({
        tooltip: 'Stop',
        children: (
          <Button
            size="icon"
            className="rounded-full"
            onClick={stop}
            disabled={!project?.id}
          >
            <SquareIcon size={12} />
          </Button>
        ),
      });
    } else if (generatedText) {
      items.push({
        tooltip: 'Regenerate',
        children: (
          <Button
            size="icon"
            className="rounded-full"
            onClick={handleGenerate}
            disabled={!project?.id}
          >
            <RotateCcwIcon size={12} />
          </Button>
        ),
      });
      items.push({
        tooltip: 'Copy',
        children: (
          <Button
            size="icon"
            className="rounded-full"
            disabled={!generatedText}
            onClick={() => handleCopy(generatedText ?? '')}
            variant="ghost"
          >
            <CopyIcon size={12} />
          </Button>
        ),
      });
    } else {
      items.push({
        tooltip: 'Generate',
        children: (
          <Button
            size="icon"
            className="rounded-full"
            onClick={handleGenerate}
            disabled={!project?.id}
          >
            <PlayIcon size={12} />
          </Button>
        ),
      });
    }

    if (data.updatedAt) {
      items.push({
        tooltip: `Last updated: ${new Intl.DateTimeFormat('en-US', {
          dateStyle: 'short',
          timeStyle: 'short',
        }).format(new Date(data.updatedAt))}`,
        children: (
          <Button size="icon" variant="ghost" className="rounded-full">
            <ClockIcon size={12} />
          </Button>
        ),
      });
    }

    return items;
  }, [
    generatedText,
    data.updatedAt,
    handleGenerate,
    updateNodeData,
    modelId,
    id,
    messages,
    project?.id,
    status,
    stop,
    handleCopy,
    models,
  ]);

  const nonUserMessages = messages.filter((message) => message.role !== 'user');

  useEffect(() => {
    const hasReasoning = messages.some((message) =>
      message.parts.some((part) => part.type === 'reasoning')
    );

    if (hasReasoning && !reasoning.isReasoning && status === 'streaming') {
      setReasoning({ isReasoning: true, isGenerating: true });
    }
  }, [messages, reasoning, status, setReasoning]);

  return (
    <NodeLayout
      id={id}
      data={{ ...data, width: 560, height: 420, resizable: false }}
      type={type}
      title={title}
      toolbar={toolbar}
    >
      {/* "Fill Frame" Pattern: Direct child has h-full */}
      <div className="flex h-full flex-col">

        {/* 1. Main Content Area (Scrollable) */}
        <div className="nowheel flex-1 bg-secondary/50 p-4 overflow-auto">
          {status === 'submitted' && (
            <div className="flex flex-col gap-2 py-2">
              <Skeleton className="h-3 w-[90%] animate-pulse rounded-md" />
              <Skeleton className="h-3 w-[75%] animate-pulse rounded-md" />
              <Skeleton className="h-3 w-[85%] animate-pulse rounded-md" />
            </div>
          )}

          {status !== 'submitted' && !generatedText && (
             <div className="flex h-full items-center justify-center">
               <p className="text-xs text-muted-foreground">
                 Press <PlayIcon size={10} className="-translate-y-px inline" /> to generate text
               </p>
             </div>
          )}
          
          {generatedText && (
             <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-0 prose-p:leading-snug prose-headings:font-semibold prose-pre:bg-muted prose-pre:border prose-pre:border-border">
               <ReactMarkdown>{generatedText}</ReactMarkdown>
             </div>
          )}
        </div>

        {/* 2. Instructions (Fixed Height) */}
        <Textarea
          value={data.instructions ?? ''}
          onChange={handleInstructionsChange}
          placeholder="Add additional context or guidance"
          rows={4}
          className="shrink-0 resize-none rounded-none border-x-0 border-b-0 border-t border-border bg-muted/30 px-4 py-3 text-sm placeholder:text-muted-foreground/60 shadow-none transition-colors focus-visible:bg-muted/50 focus-visible:ring-0"
        />
        
        <ReasoningTunnel.In>
          {messages.flatMap((message) =>
            message.parts
              .filter((part) => part.type === 'reasoning')
              .flatMap((part) => part.text ?? '')
          )}
        </ReasoningTunnel.In>
      </div>
    </NodeLayout>
  );
};
