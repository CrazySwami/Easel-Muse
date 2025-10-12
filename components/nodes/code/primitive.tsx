import Editor, { type OnMount } from '@monaco-editor/react';
import { useReactFlow } from '@xyflow/react';
import { type ComponentProps, useCallback, useEffect, useRef } from 'react';
import type { CodeNodeProps } from '.';
import { NodeLayout } from '../layout';
import { LanguageSelector } from './language-selector';
import { useLocks } from '@/providers/locks';

type CodePrimitiveProps = CodeNodeProps & {
  title: string;
};

export const CodePrimitive = ({
  data,
  id,
  type,
  title,
}: CodePrimitiveProps) => {
  const { updateNodeData } = useReactFlow();
  const { getLock } = useLocks();
  const lock = getLock(id);
  const isEditLocked = lock?.level === 'edit';
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);

  const handleCodeChange = (value: string | undefined) => {
    updateNodeData(id, {
      content: { text: value, language: data.content?.language },
    });
  };

  const handleLanguageChange = (value: string) => {
    updateNodeData(id, {
      content: { text: data.content?.text, language: value },
    });
  };

  const toolbar: ComponentProps<typeof NodeLayout>['toolbar'] = [
    {
      children: (
        <LanguageSelector
          value={data.content?.language ?? 'javascript'}
          onChange={handleLanguageChange}
          className="w-[200px] rounded-full"
        />
      ),
    },
  ];

  const handleEditorMount = useCallback<OnMount>((editorInstance) => {
    editorRef.current = editorInstance;
    editorInstance.updateOptions({
      scrollbar: {
        alwaysConsumeMouseWheel: false,
      },
      readOnly: isEditLocked,
    });

    const domNode = editorInstance.getDomNode();

    if (domNode) {
      domNode.style.touchAction = 'pan-x pan-y pinch-zoom';
      domNode.style.overscrollBehavior = 'contain';

      const scrollables = domNode.querySelectorAll<HTMLElement>(
        '.monaco-scrollable-element'
      );

      scrollables.forEach((element) => {
        element.style.touchAction = 'pan-x pan-y pinch-zoom';
        element.style.overscrollBehavior = 'contain';
      });
    }
  }, [isEditLocked]);

  useEffect(() => {
    if (!editorRef.current) {
      return;
    }

    editorRef.current.updateOptions({ readOnly: isEditLocked });
  }, [isEditLocked]);

  return (
    <NodeLayout id={id} data={{ ...data, width: data.width ?? 920, height: data.height ?? 640, resizable: false }} title={title} type={type} toolbar={toolbar}>
      <div className="h-full min-h-[640px] overflow-hidden group-data-[selected=true]:overflow-auto group-data-[lock-level=edit]:overflow-hidden">
        <div
          className="pointer-events-none group-data-[selected=true]:pointer-events-auto group-data-[selected=true]:nodrag group-data-[selected=true]:nopan group-data-[lock-level=edit]:pointer-events-none group-data-[lock-level=edit]:select-none"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <Editor
            className="h-[640px] min-h-[640px] w-full"
            language={data.content?.language}
            value={data.content?.text}
            onChange={handleCodeChange}
            onMount={handleEditorMount}
            theme="vs-dark"
            options={{
              minimap: {
                enabled: false,
              },
              scrollBeyondLastLine: false,
              mouseWheelZoom: false,
              disableLayerHinting: true,
              scrollbar: {
                alwaysConsumeMouseWheel: false,
              },
              readOnly: isEditLocked,
            }}
          />
        </div>
      </div>
    </NodeLayout>
  );
};
