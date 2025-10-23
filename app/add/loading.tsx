export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-10 w-32 rounded-md bg-muted animate-pulse" />
      <div className="space-y-4 rounded-lg bg-card p-6 shadow-sm">
        <div className="h-6 w-40 rounded-md bg-muted animate-pulse" />
        <div className="h-9 w-full rounded-md bg-muted animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-9 w-full rounded-md bg-muted animate-pulse" />
          <div className="h-9 w-full rounded-md bg-muted animate-pulse" />
        </div>
        <div className="h-40 w-full rounded-md bg-muted animate-pulse" />
        <div className="h-10 w-full rounded-md bg-muted animate-pulse" />
      </div>
    </div>
  );
}
