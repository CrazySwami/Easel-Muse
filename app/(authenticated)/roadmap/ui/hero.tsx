export default function RoadmapHero() {
  return (
    <div className="rounded-xl border bg-card p-6">
      <h1 className="text-3xl font-semibold">Roadmap & Feedback</h1>
      <p className="mt-2 text-muted-foreground">
        Track upcoming features and bug fixes. Use the green button to submit a new feature request or bug report. Attach a single screenshot if helpful.
      </p>
      <ul className="mt-3 list-disc pl-6 text-muted-foreground text-sm">
        <li>New: items we’re reviewing and prioritizing.</li>
        <li>In progress: actively being built or investigated.</li>
        <li>Resolved: shipped, fixed, or otherwise completed.</li>
      </ul>
    </div>
  );
}


