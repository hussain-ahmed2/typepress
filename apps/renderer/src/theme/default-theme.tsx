/**
 * Default renderer theme.
 *
 * Implements the Theme SDK slot contract using shadcn/ui primitives and
 * semantic design tokens so the public surface stays consistent and themeable.
 */
import Link from 'next/link';
import type { ComponentType } from 'react';
import { CalendarDays, User } from 'lucide-react';
import { define_theme, type SlotProps } from '@typepress/theme-sdk';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { BuilderBlocksRenderer, sanitize_builder_blocks } from '@/components/builder/block_renderer';

/** Format ISO date strings for public display. */
function format_public_date(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** Resolve author display name with a safe fallback. */
function get_author_name(author_name: string | null | undefined): string {
  if (typeof author_name === 'string' && author_name.trim().length > 0) {
    return author_name;
  }
  return 'Unknown author';
}

/** Resolve optional excerpt from content meta. */
function get_excerpt(meta: Record<string, unknown> | undefined): string | null {
  const excerpt = meta?.excerpt;
  return typeof excerpt === 'string' && excerpt.trim().length > 0 ? excerpt : null;
}

const DefaultHeader: ComponentType<SlotProps> = ({ site_title, site_description }) => {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <p className="text-2xl font-bold tracking-tight text-primary-foreground">{site_title}</p>
      <p className="text-sm text-primary-foreground/80">{site_description}</p>
    </div>
  );
};

const DefaultFooter: ComponentType<SlotProps> = ({ site_title }) => {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 text-center text-sm text-muted-foreground">
      <p>&copy; {new Date().getFullYear()} {site_title}. Built with TypeScript.</p>
    </div>
  );
};

const DefaultPostList: ComponentType<SlotProps> = ({ contents = [] }) => {
  if (contents.length === 0) {
    return (
      <Card className="border-dashed bg-card text-card-foreground">
        <CardHeader>
          <CardTitle>No published content yet</CardTitle>
          <CardDescription>
            Published posts will appear here once content is available from the API.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {contents.map((item) => {
        // ContentListItem may carry meta in API payloads; read defensively.
        const item_with_meta = item as typeof item & { meta?: Record<string, unknown> };
        const excerpt = get_excerpt(item_with_meta.meta);

        return (
          <Card key={item.id} className="bg-card text-card-foreground transition-colors">
            <CardHeader className="gap-3">
              <div className="space-y-2">
                <CardTitle className="text-2xl leading-tight">
                  <Link
                    href={`/${item.slug}`}
                    className="rounded-sm text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {item.title}
                  </Link>
                </CardTitle>
                {excerpt ? <CardDescription className="text-base">{excerpt}</CardDescription> : null}
              </div>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <User className="size-4" aria-hidden="true" />
                <span>{get_author_name(item.author_name)}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-4" aria-hidden="true" />
                <time dateTime={item.created_at}>{format_public_date(item.created_at)}</time>
              </span>
              <Badge variant="secondary" className="capitalize">
                {item.type}
              </Badge>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

const DefaultSinglePost: ComponentType<SlotProps> = ({ content }) => {
  if (!content) return null;

  const meta = content.meta as Record<string, unknown> | undefined;
  const excerpt = get_excerpt(meta);
  const builder_blocks = sanitize_builder_blocks(meta?.builder_data);
  const has_builder_content = builder_blocks.length > 0;

  return (
    <article className="mx-auto max-w-4xl">
      <header className="space-y-4">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-wide text-primary">{content.type}</p>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            {content.title}
          </h1>
          {excerpt ? <p className="text-lg text-muted-foreground">{excerpt}</p> : null}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <User className="size-4" aria-hidden="true" />
            <span>{get_author_name(content.author_name)}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-4" aria-hidden="true" />
            <time dateTime={content.created_at}>{format_public_date(content.created_at)}</time>
          </span>
          {content.updated_at !== content.created_at ? (
            <span className="text-muted-foreground">
              Updated <time dateTime={content.updated_at}>{format_public_date(content.updated_at)}</time>
            </span>
          ) : null}
        </div>

        {content.taxonomies.length > 0 ? (
          <div className="flex flex-wrap gap-2" aria-label="Taxonomies">
            {content.taxonomies.map((taxonomy) => (
              <Badge key={taxonomy.id} variant="outline">
                {taxonomy.name}
              </Badge>
            ))}
          </div>
        ) : null}
      </header>

      <Separator className="my-8" />

      {has_builder_content ? (
        <div className="text-base leading-7 text-foreground">
          <BuilderBlocksRenderer blocks={builder_blocks} />
        </div>
      ) : (
        <div className="space-y-4 text-base leading-7 text-foreground">
          {excerpt ? (
            <p>{excerpt}</p>
          ) : (
            <p className="text-muted-foreground">
              This content does not have body fields exposed to the public renderer yet.
            </p>
          )}
        </div>
      )}
    </article>
  );
};

/** Default theme definition used by the renderer. */
export const default_theme = define_theme({
  name: 'typepress-default',
  version: '0.1.0',
  description: 'Default Typepress renderer theme using shadcn semantic tokens.',
  slots: {
    header: DefaultHeader,
    footer: DefaultFooter,
    post_list: DefaultPostList,
    single_post: DefaultSinglePost,
  },
});
