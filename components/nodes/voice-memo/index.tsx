import { VoiceMemoPrimitive } from './primitive';

export type VoiceMemoNodeProps = {
  type: string;
  data: {
    content?: {
      url: string;
      type: string;
    };
    transcript?: string;
    updatedAt?: string;
  };
  id: string;
};

export const VoiceMemoNode = (props: VoiceMemoNodeProps) => (
  <VoiceMemoPrimitive {...props} title="Voice Memo" />
);
