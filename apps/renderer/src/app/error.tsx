'use client';

/**
 * Route error boundary for public renderer pages.
 */
import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log for client-side observability; avoid rendering raw error details.
    console.error('Renderer route error:', error);
  }, [error]);

  return (
    <div className="py-8">
      <Card className="bg-card text-card-foreground">
        <CardHeader className="items-center text-center">
          <div className="mb-2 rounded-md bg-destructive/10 p-3 text-destructive">
            <AlertCircle className="size-6" aria-hidden="true" />
          </div>
          <CardTitle className="text-2xl">Something went wrong</CardTitle>
          <CardDescription>
            The page could not be rendered right now. Please try again.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button type="button" onClick={reset} variant="outline">
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
