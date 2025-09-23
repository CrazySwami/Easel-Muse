import { SiX } from '@icons-pack/react-simple-icons';
import {
  AudioWaveformIcon,
  FileIcon,
  FileTextIcon,
  MicIcon,
  VideoIcon,
} from 'lucide-react';

import { CodeIcon, ImageIcon, TextIcon } from 'lucide-react';

export const nodeButtons = [
  {
    id: 'text',
    label: 'Text',
    icon: TextIcon,
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
      resizable: true,
      width: 1440,
      height: 1600,
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
    id: 'file',
    label: 'File',
    icon: FileIcon,
  },
  {
    id: 'tweet',
    label: 'Tweet',
    icon: SiX,
  },
];
