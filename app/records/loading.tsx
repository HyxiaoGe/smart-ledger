export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-56 rounded-md bg-muted animate-pulse" />
        <div className="h-9 w-40 rounded-md bg-muted animate-pulse" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-32 w-full rounded-lg bg-muted animate-pulse" />
        <div className="h-32 w-full rounded-lg bg-muted animate-pulse" />
      </div>
      <div className="space-y-3">
        <div className="h-5 w-32 rounded-md bg-muted animate-pulse" />
        <div className="h-56 w-full rounded-lg bg-muted animate-pulse" />
      </div>
    </div>
  );
}
