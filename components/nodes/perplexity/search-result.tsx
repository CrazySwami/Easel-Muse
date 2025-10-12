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
    <div className="mb-3 rounded-lg border bg-card/60 p-3">
      <a href={href ?? '#'} target={href ? '_blank' : undefined} rel={href ? 'noopener noreferrer' : undefined} className="group">
        <div className="flex items-center gap-2">
          {href ? (
            <img
              src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`}
              alt={`${domain} favicon`}
              width={16}
              height={16}
              className="rounded"
            />
          ) : (
            <div className="h-4 w-4 rounded bg-muted" />
          )}
          <p className="truncate text-xs text-muted-foreground group-hover:underline">{domain}</p>
        </div>
        <p className="mt-1 text-sm font-semibold group-hover:text-primary line-clamp-1">{result.title}</p>
      </a>
      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{result.snippet}</p>
    </div>
  );
};
