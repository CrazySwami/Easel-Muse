import { ChatPrimitive } from './primitive';

export type UIMessagePart =
  | { type: 'text'; text: string }
  | { type: 'source-url'; url: string };

export type UIMessage = {
  id?: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  parts: UIMessagePart[];
};

export type ChatSession = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  messages: UIMessage[];
};

export type ChatNodeProps = {
  id: string;
  type: string;
  title?: string;
  data: {
    width?: number;
    height?: number;
    resizable?: boolean;
    fullscreenSupported?: boolean;
    fullscreenOnly?: boolean;
    allowIncoming?: boolean;
    allowOutgoing?: boolean;
    sessions?: ChatSession[];
    activeSessionId?: string;
    model?: string;
    webSearch?: boolean;
    sidebarCollapsed?: boolean;
    outputTexts?: string[];
  };
};

export const ChatNode = (props: ChatNodeProps) => {
  return <ChatPrimitive {...props} title={props.title ?? 'Chat'} />;
};


