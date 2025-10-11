import { SiX } from '@icons-pack/react-simple-icons';
import {
  AudioWaveformIcon,
  FileIcon,
  FileTextIcon,
  MicIcon,
  VideoIcon,
} from 'lucide-react';

import { CodeIcon, ImageIcon, TextIcon } from 'lucide-react';
import { GlobeIcon, MonitorIcon, Maximize2Icon, SearchIcon } from 'lucide-react';
import { PerplexityIcon } from '@/lib/icons';

export const nodeButtons = [
  {
    id: 'text',
    label: 'Text',
    icon: TextIcon,
    data: {
      source: 'primitive',
      text: '',
      width: 680,
      height: 520,
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
    data: { width: 840, height: 560, resizable: false },
  },
  {
    id: 'tiptap',
    label: 'Editor',
    icon: FileTextIcon,
    data: {
      width: 920,
      height: 1160,
      resizable: false,
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
    label: 'Web Renderer (HTML/URL)',
    icon: MonitorIcon,
    data: { resizable: false, width: 1920, height: 1080, fullscreenSupported: true, fullscreenOnly: false },
  },
  {
    id: 'perplexity',
    label: 'Perplexity',
    icon: SearchIcon,
    data: {
      width: 1200,
      height: 800,
      resizable: false,
      minWidth: 400,
      minHeight: 300,
      fullscreenSupported: true,
      fullscreenOnly: false,
    },
  },
  
];
