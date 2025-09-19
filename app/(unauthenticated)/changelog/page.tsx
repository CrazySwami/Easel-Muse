import { readFile } from 'node:fs/promises';
import path from 'node:path';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

type Section = { id: string; title: string; dateRange?: string; body: string };

function parseSections(md: string): Section[] {
  const sections: Section[] = [];
  const rawSections = md.split(/^##\s+/m).slice(1); // Split by H2s

  for (const raw of rawSections) {
    const lines = raw.trim().split('\n');
    const titleLine = lines[0].trim();
    const body = lines.slice(1).join('\n').trim();
    const dateMatch = titleLine.match(/\((\d{4}-\d{2}-\d{2}).*?(\d{4}-\d{2}-\d{2})\)/);
    const dateRange = dateMatch ? `${dateMatch[1]} → ${dateMatch[2]}` : undefined;
    const id = slugify(titleLine);
    sections.push({ id, title: titleLine, dateRange, body });
  }

  return sections;
}

export default async function UpdateLogPage() {
  let md = '# Change log\n\n_No changelog found._';
  try {
    const file = path.join(process.cwd(), 'CHANGELOG.md');
    md = await readFile(file, 'utf8');
  } catch {}

  const sections = parseSections(md);

  return (
    <div className="mx-auto w-full max-w-4xl px-6">
      <div className="mb-12 pt-12">
        <h1 className="text-4xl font-semibold">Change Log</h1>
        <p className="text-sm text-muted-foreground mt-1">Releases, improvements, and behind-the-scenes changes.</p>
      </div>

      <div className="space-y-16">
        {sections.length > 0 ? (
          sections.map((s) => (
            <section key={s.id} id={s.id} className="lg:grid lg:grid-cols-[240px,1fr] lg:gap-8">
              <aside className="lg:sticky lg:top-0 bg-background z-10 py-2">
                <div className="pr-4">
                  <p className="text-sm font-medium leading-tight">{s.title.split('(')[0].trim()}</p>
                  {s.dateRange && (
                    <p className="text-xs text-primary mt-1">{s.dateRange}</p>
                  )}
                </div>
              </aside>
              <article className="prose dark:prose-invert max-w-none mt-4 lg:mt-0 border-l pl-8">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{s.body}</ReactMarkdown>
              </article>
            </section>
          ))
        ) : (
          <article className="prose dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{md}</ReactMarkdown>
          </article>
        )}
      </div>
    </div>
  );
}



