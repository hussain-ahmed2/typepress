/**
 * Global not-found UI for public routes.
 */
import Link from 'next/link';
import { FileQuestion } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function NotFound() {
  return (
    <div className="py-8">
      <Card className="bg-card text-card-foreground">
        <CardHeader className="items-center text-center">
          <div className="mb-2 rounded-md bg-muted p-3 text-muted-foreground">
            <FileQuestion className="size-6" aria-hidden="true" />
          </div>
          <CardTitle className="text-2xl">Page not found</CardTitle>
          <CardDescription>
            The page you requested does not exist or is no longer published.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Link href="/" className={cn(buttonVariants({ variant: 'default' }))}>
            Go home
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
