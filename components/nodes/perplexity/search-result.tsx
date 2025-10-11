'use client';

type SearchResultProps = {
  result: {
    url: string;
    title: string;
    snippet: string;
  };
};

export const SearchResult = ({ result }: SearchResultProps) => {
  const domain = new URL(result.url).hostname;

  return (
    <div className="mb-3 rounded-lg border bg-muted/10 p-3">
      <a href={result.url} target="_blank" rel="noopener noreferrer" className="group">
        <div className="flex items-center gap-2">
          <img
            src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`}
            alt={`${domain} favicon`}
            width={16}
            height={16}
            className="rounded"
          />
          <p className="truncate text-xs text-muted-foreground group-hover:underline">{domain}</p>
        </div>
        <p className="mt-1 text-sm font-semibold group-hover:text-primary line-clamp-1">{result.title}</p>
      </a>
      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{result.snippet}</p>
    </div>
  );
};
