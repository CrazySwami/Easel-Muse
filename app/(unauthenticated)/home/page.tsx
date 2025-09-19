import { GatewayProvider } from '@/providers/gateway';
import type { Metadata } from 'next';
import { env } from '@/lib/env';
// import { Demo } from './components/demo';
// import { Features } from './components/features';
import { Hero } from './components/hero';
// import { Providers } from './components/providers';
// import { Tweets } from './components/tweets';

export const metadata: Metadata = {
  title: `A visual AI playground | ${env.NEXT_PUBLIC_APP_NAME}`,
  description: `${env.NEXT_PUBLIC_APP_NAME} is an open source canvas for building AI workflows. Drag, drop connect and run nodes to build your own workflows powered by various industry-leading AI models.`,
};

const buttons = [
  {
    title: 'Get started for free',
    link: '/auth/sign-up',
  },
  {
    title: 'Login',
    link: '/auth/login',
  },
];

const Home = () => (
  <GatewayProvider>
    <Hero
      announcement={{
        title: 'Easel is now being developed by Mirror Factory',
        link: '', // Empty string disables link behavior in Hero
      }}
      buttons={buttons}
    />
    {/* Essay-style narrative */}
    <section className="prose prose-sm mx-auto mt-4 max-w-3xl px-4 dark:prose-invert sm:mt-8">
      <p className="fade-up-in" style={{ animationDelay: '500ms' }}>
        <strong>Easel</strong> is a space for teams to design with AI together. The tooling
        around models has exploded, but collaboration hasn’t caught up—work is scattered
        across chats, notebooks and ad‑hoc scripts. We’re building the missing layer:
        <em> a shared canvas and design system for AI</em>.
      </p>
      <p className="fade-up-in" style={{ animationDelay: '650ms' }}>
        On Easel, flows are built with <strong>typed nodes</strong> and <strong>reusable patterns</strong> so
        experiments can become shared, dependable building blocks. Presence, comments and
        reviews keep decisions in context, so teams ship together instead of handing off.
      </p>
      <h3 className="fade-up-in" style={{ animationDelay: '800ms' }}>
        Why a design system for AI?
      </h3>
      <p className="fade-up-in" style={{ animationDelay: '950ms' }}>
        Prompts, tools and evaluation criteria are design materials. Treating them as
        components—versioned, documented, and composable—lets organizations <em>scale quality</em>
        without reinventing every run. Easel turns scattered experiments into
        <strong> libraries you can trust</strong>.
      </p>
      <h3 className="fade-up-in" style={{ animationDelay: '1100ms' }}>
        How teams use Easel
      </h3>
      <ul>
        <li className="fade-up-in" style={{ animationDelay: '1250ms' }}>
          <strong>Research</strong>: explore ideas together on a live canvas, annotate outcomes,
          and keep the best threads as templates.
        </li>
        <li className="fade-up-in" style={{ animationDelay: '1400ms' }}>
          <strong>Product</strong>: standardize flows behind features with policies, tests and
          rollout controls.
        </li>
        <li className="fade-up-in" style={{ animationDelay: '1550ms' }}>
          <strong>Design</strong>: prototype with multi‑modal nodes and ship consistent
          experiences across surfaces.
        </li>
      </ul>
      <p className="fade-up-in" style={{ animationDelay: '1700ms' }}>
        Collaboration is the multiplier. Easel gives teams a <em>common language</em> to design,
        evaluate and improve AI together.
      </p>
      {/* CTA removed here; dedicated "Get started today" section follows below */}
    </section>

    {/* Trimmed: only essay content below the hero */}
  </GatewayProvider>
);

export default Home;
