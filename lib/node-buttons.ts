import { SiX } from '@icons-pack/react-simple-icons';
import {
  AudioWaveformIcon,
  FileIcon,
  FileTextIcon,
  MicIcon,
  VideoIcon,
} from 'lucide-react';

import { CodeIcon, ImageIcon, TextIcon } from 'lucide-react';
import { GlobeIcon } from 'lucide-react';

export const nodeButtons = [
  {
    id: 'text',
    label: 'Text',
    icon: TextIcon,
    data: {
      source: 'primitive',
      text: '',
      width: 560,
      height: 420,
      resizable: false,
    },
    className: 'bg-primary/20 text-primary',
  },
  {
    id: 'image',
    label: 'Image',
    icon: ImageIcon,
  },
  {
    id: 'audio',
    label: 'Audio',
    icon: AudioWaveformIcon,
  },
  {
    id: 'voice-memo',
    label: 'Voice Memo',
    icon: MicIcon,
  },
  {
    id: 'tiptap',
    label: 'Editor',
    icon: FileTextIcon,
    data: {
      resizable: false,
      width: 640,
    },
  },
  {
    id: 'video',
    label: 'Video',
    icon: VideoIcon,
  },
  {
    id: 'code',
    label: 'Code',
    icon: CodeIcon,
    data: {
      content: { language: 'javascript' },
    },
  },
  {
    id: 'firecrawl',
    label: 'Firecrawl',
    icon: GlobeIcon,
    data: {
      mode: 'scrape',
      emit: 'markdown',
      resizable: false,
      width: 840,
      height: 560,
    },
  },
  {
    id: 'file',
    label: 'File',
    icon: FileIcon,
  },
  {
    id: 'tweet',
    label: 'Tweet',
    icon: SiX,
  },
  {
    id: 'web-renderer',
    label: 'Web Renderer',
    icon: GlobeIcon,
    data: { resizable: false, width: 1920, height: 1080 },
  },
  {
    id: 'custom',
    label: 'Custom',
    icon: FileTextIcon,
    data: {
      resizable: false,
      width: 560,
    },
  },
];
