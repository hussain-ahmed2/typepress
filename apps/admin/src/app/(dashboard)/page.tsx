/**
 * Dashboard Page — Landing page showing real overview stats.
 *
 * Fetches counts from existing APIs with per-card loading and error states.
 * Uses semantic theme tokens and shadcn primitives for consistent styling.
 */
'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, FileText, Image, Tags, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { api } from '@/lib/api_client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/** Pagination metadata returned by list endpoints. */
interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

/** Paginated API response shape used by content/media/users list endpoints. */
interface PaginatedListResponse<T> {
  success: boolean;
  data?: T[];
  pagination?: PaginationMeta;
  error?: {
    code: string;
    message: string;
  };
}

/** Non-paginated list response shape used by taxonomy endpoint. */
interface ListResponse<T> {
  success: boolean;
  data?: T[];
  error?: {
    code: string;
    message: string;
  };
}

/** Dashboard stat card view model. */
interface DashboardStat {
  label: string;
  description: string;
  icon: LucideIcon;
  value: number | null;
  loading: boolean;
  error: string | null;
}

/** Props for a single stat card. */
interface StatCardProps {
  stat: DashboardStat;
}

/** Renders a single dashboard stat card with loading and error states. */
function StatCard({ stat }: StatCardProps) {
  const Icon = stat.icon;

  return (
    <Card className="rounded-md drop-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
        <Icon size={20} className="text-primary" aria-hidden="true" />
      </CardHeader>
      <CardContent>
        {stat.loading ? (
          <Skeleton
            className="mt-1 h-9 w-16 rounded-md"
            aria-label={`Loading ${stat.label.toLowerCase()} count`}
          />
        ) : stat.error ? (
          <div className="mt-2 flex items-center gap-2 text-sm text-destructive" role="status">
            <AlertCircle size={16} aria-hidden="true" />
            <span>Unavailable</span>
          </div>
        ) : (
          <p className="text-3xl font-bold text-primary">{stat.value ?? 0}</p>
        )}

        <p className="mt-1 text-sm text-muted-foreground">{stat.error ?? stat.description}</p>
      </CardContent>
    </Card>
  );
}

/** Extracts total count from a paginated list response. */
function get_paginated_total<T>(result: PaginatedListResponse<T>): number | null {
  if (!result.success) return null;
  if (typeof result.pagination?.total === 'number') return result.pagination.total;
  if (Array.isArray(result.data)) return result.data.length;
  return null;
}

/** Extracts count from a plain list response. */
function get_list_total<T>(result: ListResponse<T>): number | null {
  if (!result.success || !Array.isArray(result.data)) return null;
  return result.data.length;
}

/** Dashboard home page with real stats from API endpoints. */
export default function DashboardPage() {
  const [stats, set_stats] = useState<DashboardStat[]>([
    {
      label: 'Content',
      description: 'Total posts and pages',
      icon: FileText,
      value: null,
      loading: true,
      error: null,
    },
    {
      label: 'Media',
      description: 'Uploaded files',
      icon: Image,
      value: null,
      loading: true,
      error: null,
    },
    {
      label: 'Users',
      description: 'Registered users',
      icon: Users,
      value: null,
      loading: true,
      error: null,
    },
    {
      label: 'Taxonomy',
      description: 'Categories and tags',
      icon: Tags,
      value: null,
      loading: true,
      error: null,
    },
  ]);

  useEffect(() => {
    let cancelled = false;

    /** Updates a single stat card by label. */
    function update_stat(label: string, patch: Partial<DashboardStat>): void {
      set_stats((current) =>
        current.map((stat) => (stat.label === label ? { ...stat, ...patch } : stat)),
      );
    }

    async function load_stats(): Promise<void> {
      const [content_result, media_result, users_result, taxonomy_result] = await Promise.allSettled([
        api.get('/api/content?limit=1') as Promise<PaginatedListResponse<unknown>>,
        api.get('/api/media?limit=1') as Promise<PaginatedListResponse<unknown>>,
        api.get('/api/users?limit=1') as Promise<PaginatedListResponse<unknown>>,
        api.get('/api/taxonomy') as Promise<ListResponse<unknown>>,
      ]);

      if (cancelled) return;

      if (content_result.status === 'fulfilled') {
        const total = get_paginated_total(content_result.value);
        update_stat('Content', {
          loading: false,
          value: total,
          error:
            total === null
              ? content_result.value.error?.message ?? 'Failed to load content count'
              : null,
        });
      } else {
        update_stat('Content', { loading: false, error: 'Failed to load content count' });
      }

      if (media_result.status === 'fulfilled') {
        const total = get_paginated_total(media_result.value);
        update_stat('Media', {
          loading: false,
          value: total,
          error:
            total === null
              ? media_result.value.error?.message ?? 'Failed to load media count'
              : null,
        });
      } else {
        update_stat('Media', { loading: false, error: 'Failed to load media count' });
      }

      if (users_result.status === 'fulfilled') {
        const total = get_paginated_total(users_result.value);
        update_stat('Users', {
          loading: false,
          value: total,
          error:
            total === null ? users_result.value.error?.message ?? 'Failed to load user count' : null,
        });
      } else {
        update_stat('Users', { loading: false, error: 'Failed to load user count' });
      }

      if (taxonomy_result.status === 'fulfilled') {
        const total = get_list_total(taxonomy_result.value);
        update_stat('Taxonomy', {
          loading: false,
          value: total,
          error:
            total === null
              ? taxonomy_result.value.error?.message ?? 'Failed to load taxonomy count'
              : null,
        });
      } else {
        update_stat('Taxonomy', { loading: false, error: 'Failed to load taxonomy count' });
      }
    }

    void load_stats();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Dashboard</h1>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </div>
    </div>
  );
}
