import { SiGithub, SiGoogle } from '@icons-pack/react-simple-icons';
import type { Provider } from '@supabase/supabase-js';

export const socialProviders: {
  name: string;
  icon: typeof SiGithub;
  id: Provider;
}[] = [
  {
    name: 'Github',
    icon: SiGithub,
    id: 'github',
  },
  {
    name: 'Google',
    icon: SiGoogle,
    id: 'google',
  },
];
