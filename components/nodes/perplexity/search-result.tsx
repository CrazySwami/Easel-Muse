'use client';

type SearchResultProps = {
  result: {
    url?: string;
    title: string;
    snippet: string;
  };
};

export const SearchResult = ({ result }: SearchResultProps) => {
  let domain = 'source';
  let href: string | undefined = undefined;
  try {
    if (result.url) {
      const u = new URL(result.url);
      domain = u.hostname;
      href = result.url;
    }
  } catch {
    // leave defaults
  }

  return (
    <a
      href={href ?? '#'}
      target={href ? '_blank' : undefined}
      rel={href ? 'noopener noreferrer' : undefined}
      className="group inline-flex max-w-full items-center gap-2 rounded-full border bg-card/60 px-2 py-1 hover:bg-muted"
      style={{ fontSize: 12 }}
    >
      {href ? (
        <img
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`}
          alt={`${domain} favicon`}
          width={14}
          height={14}
          className="rounded"
        />
      ) : (
        <div className="h-3.5 w-3.5 rounded bg-muted" />
      )}
      <span className="truncate text-xs text-muted-foreground group-hover:underline">{domain}</span>
    </a>
  );
};
