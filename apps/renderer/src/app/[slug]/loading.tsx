/**
 * Content detail loading skeleton.
 */
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

export default function ContentLoading() {
  return (
    <article className="mx-auto max-w-4xl space-y-4" aria-label="Loading content">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-12 w-full max-w-3xl" />
      <Skeleton className="h-6 w-full max-w-2xl" />
      <div className="flex gap-4">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Separator className="my-8" />
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    </article>
  );
}
