'use client';

type SearchResultProps = {
  result: {
    url?: string;
    title?: string;
    snippet?: string;
  };
  variant?: 'card' | 'pill';
};

export const SearchResult = ({ result, variant = 'pill' }: SearchResultProps) => {
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

  if (variant === 'pill') {
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
  }

  // Card variant: bigger result with title/snippet and green accent hover
  return (
    <a
      href={href ?? '#'}
      target={href ? '_blank' : undefined}
      rel={href ? 'noopener noreferrer' : undefined}
      className="group block rounded-xl border bg-card/60 p-3 hover:border-emerald-500/60 hover:shadow-sm"
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
        <span className="truncate">{domain}</span>
      </div>
      <div className="mt-1 line-clamp-2 text-sm font-semibold group-hover:text-emerald-700">
        {result.title ?? domain}
      </div>
      {result.snippet ? (
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{result.snippet}</p>
      ) : null}
    </a>
  );
};
