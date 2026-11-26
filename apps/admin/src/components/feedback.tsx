/**
 * Feedback primitives — shadcn-based loading, empty, and alert states.
 *
 * These exports keep legacy names/signatures used across admin pages while
 * delegating rendering to shadcn/ui primitives for consistent theming.
 */
import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner as UiSpinner } from '@/components/ui/spinner';

/** Props for the legacy Spinner wrapper. */
interface SpinnerProps {
  /** Icon size in pixels; preserved for backward compatibility. */
  size?: number;
  /** Optional className forwarded to the underlying icon. */
  className?: string;
}

/** Props for the legacy EmptyState wrapper. */
interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
}

/** Props for simple message alerts. */
interface MessageAlertProps {
  message: string;
}

/**
 * Page-level skeleton loader used while dashboard data is loading.
 */
export function Loading() {
  return (
    <div className="space-y-4" role="status" aria-live="polite" aria-label="Loading content">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

/**
 * Spinner wrapper that preserves the legacy `size` prop while using the shadcn spinner.
 */
export function Spinner({ size = 16, className }: SpinnerProps) {
  return <UiSpinner className={className} style={{ width: size, height: size }} />;
}

/**
 * Empty state wrapper mapped to shadcn Empty primitives.
 */
export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <Empty className="py-12">
      <EmptyHeader>
        <EmptyMedia className="text-muted-foreground [&_svg]:size-10">{icon}</EmptyMedia>
        <EmptyTitle className="text-lg font-medium text-foreground">{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

/**
 * Destructive alert for actionable errors.
 */
export function ErrorAlert({ message }: MessageAlertProps) {
  return (
    <Alert variant="destructive" className="border-destructive/20 bg-destructive/10">
      <AlertCircle className="size-4" aria-hidden="true" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

/**
 * Success alert using semantic tokens with a green status accent.
 */
export function SuccessAlert({ message }: MessageAlertProps) {
  return (
    <Alert className="border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
      <CheckCircle2 className="size-4" aria-hidden="true" />
      <AlertTitle>Success</AlertTitle>
      <AlertDescription className="text-emerald-700/90 dark:text-emerald-400/90">
        {message}
      </AlertDescription>
    </Alert>
  );
}
