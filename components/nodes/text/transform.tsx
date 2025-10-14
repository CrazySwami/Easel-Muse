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
  getTextFromPerplexityNodes,
  getLinksFromPerplexityNodes,
  getAnswersFromPerplexityNodes,
  getLinksFromSerpapiNodes,
  getLinksFromFirecrawlNodes,
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
    const perplexityTexts = getTextFromPerplexityNodes(incomers);
    const perplexityLinks = getLinksFromPerplexityNodes(incomers);
    const serpLinks = getLinksFromSerpapiNodes(incomers);
    const firecrawlLinks = getLinksFromFirecrawlNodes(incomers);
    const perplexityAnswers = getAnswersFromPerplexityNodes(incomers);
    const files = getFilesFromFileNodes(incomers);

    if (!textPrompts.length && !docPrompts.length && !audioPrompts.length && !perplexityTexts.length && !data.instructions && !(perplexityLinks.length || serpLinks.length || firecrawlLinks.length)) {
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

    if (perplexityTexts.length) {
      content.push('--- Search Results ---', ...perplexityTexts);
    }

    if (perplexityAnswers.length) {
      content.push('--- Answer ---', ...perplexityAnswers);
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

    const allLinks = Array.from(new Set([ ...perplexityLinks, ...serpLinks, ...firecrawlLinks ]));
    if (allLinks.length) content.push('--- Sources ---', ...allLinks);

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
      data={{ ...data, width: 680, height: 520, resizable: false, dualModeSupported: true, titleOverride: 'Text generation' }}
      type={type}
      title={title}
      toolbar={toolbar}
    >
      {/* "Fill Frame" Pattern: Direct child has h-full */}
      <div className="flex h-full flex-col">

        {/* 1. Main Content Area (Scrollable) */}
        <div
          className="nowheel nodrag nopan flex-1 bg-secondary/50 p-4 overflow-auto"
          onPointerDown={(e) => e.stopPropagation()}
        >
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

        {/* 1b. Sources from connected nodes (SerpApi, Perplexity, Firecrawl) */}
        {(() => {
          try {
            const incomers = getIncomers({ id }, getNodes(), getEdges());
            const links = [
              ...getLinksFromPerplexityNodes(incomers),
              ...getLinksFromSerpapiNodes(incomers),
              ...getLinksFromFirecrawlNodes(incomers),
            ].filter(Boolean);
            const unique = Array.from(new Set(links));
            if (!unique.length) return null;
            return (
              <div className="nowheel nodrag nopan mx-4 my-2 shrink-0 rounded-xl border border-border bg-card/60 p-3 text-xs"
                   onPointerDown={(e) => e.stopPropagation()}>
                <p className="mb-1 font-medium text-foreground/80">Sources</p>
                <div className="max-h-24 overflow-auto space-y-1">
                  {unique.map((u, i) => {
                    let hostname = '';
                    try { hostname = new URL(String(u)).hostname; } catch {}
                    const favicon = hostname ? `https://www.google.com/s2/favicons?domain=${hostname}&sz=16` : undefined;
                    return (
                      <a key={i} href={u as any} target="_blank" rel="noreferrer" className="flex items-center gap-2 truncate text-primary hover:underline">
                        {favicon ? <img src={favicon} alt="" width={14} height={14} className="rounded"/> : <span className="h-3.5 w-3.5 rounded bg-muted inline-block"/>}
                        <span className="truncate text-foreground/90">{String(u)}</span>
                      </a>
                    );
                  })}
                </div>
              </div>
            );
          } catch {
            return null;
          }
        })()}

        {/* 2. Instructions (Fixed Height) */}
        <Textarea
          value={data.instructions ?? ''}
          onChange={handleInstructionsChange}
          placeholder="Add additional context or guidance"
          rows={5}
          className="nowheel nodrag nopan shrink-0 resize-none rounded-none border-x-0 border-b-0 border-t border-border bg-muted/30 px-4 py-3 text-sm placeholder:text-muted-foreground/60 shadow-none transition-colors focus-visible:bg-muted/50 focus-visible:ring-0 max-h-48 overflow-auto"
          onPointerDown={(e) => e.stopPropagation()}
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
