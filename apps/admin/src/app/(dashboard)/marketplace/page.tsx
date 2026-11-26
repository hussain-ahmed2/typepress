/**
 * Marketplace Page — Plugin management and catalog view.
 *
 * Plugins are fetched from the admin-protected plugin state API and can be
 * enabled/disabled persistently. Theme entries remain a local catalog until a
 * theme runtime/management API exists.
 */
'use client';

import { useCallback, useEffect, useState } from 'react';
import { Info, Loader2, Package, Palette, Search } from 'lucide-react';
import type { PluginStateRecord } from '@typepress/shared-types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { api } from '@/lib/api_client';

/** Static theme catalog item until theme management is backend-driven. */
interface ThemeCatalogItem {
  name: string;
  description: string;
  version: string;
  author: string;
  category: string;
}

/** Supported catalog filters. */
type MarketplaceFilter = 'all' | 'plugin' | 'theme';

/** Static theme catalog; themes are not managed by the plugin state API. */
const theme_catalog: ThemeCatalogItem[] = [
  { name: 'Default', description: 'Clean, minimal theme', version: '1.0.0', author: 'Typepress', category: 'Blog' },
  { name: 'Business', description: 'Professional business theme', version: '1.0.0', author: 'Typepress', category: 'Business' },
  { name: 'Blog', description: 'Blog theme with sidebar', version: '1.0.0', author: 'Typepress', category: 'Blog' },
  { name: 'Portfolio', description: 'Creative portfolio theme', version: '1.0.0', author: 'Typepress', category: 'Portfolio' },
  { name: 'E-commerce', description: 'Online store theme', version: '1.0.0', author: 'Typepress', category: 'E-commerce' },
  { name: 'Magazine', description: 'Magazine-style theme', version: '1.0.0', author: 'Typepress', category: 'Blog' },
  { name: 'Landing', description: 'Landing page theme', version: '1.0.0', author: 'Typepress', category: 'Landing' },
];

function get_plugin_status_label(record: PluginStateRecord): string {
  if (record.status === 'failed') return 'Failed';
  if (record.status === 'disabled') return 'Disabled';
  if (record.status === 'loaded') return 'Loaded';
  return 'Not loaded';
}

function get_plugin_status_text(record: PluginStateRecord): string {
  if (record.status === 'failed') return record.error ?? 'Failed to load';
  if (record.enabled && record.status !== 'loaded') return 'Enabled (restart required)';
  if (!record.enabled && record.status === 'loaded') return 'Disabled (restart required)';
  if (record.enabled) return 'Enabled';
  return 'Disabled';
}

function get_plugin_status_class(record: PluginStateRecord): string {
  if (record.status === 'failed') return 'border-transparent bg-destructive/10 text-destructive';
  if (record.status === 'loaded' && record.enabled) {
    return 'border-transparent bg-emerald-500/10 text-emerald-700 dark:text-emerald-400';
  }
  if (record.enabled) return 'border-transparent bg-amber-500/10 text-amber-700 dark:text-amber-400';
  return 'border-transparent bg-muted text-muted-foreground';
}

/** Marketplace/catalog page with real plugin state management. */
export default function MarketplacePage() {
  const [filter, set_filter] = useState<MarketplaceFilter>('all');
  const [search, set_search] = useState('');
  const [plugins, set_plugins] = useState<PluginStateRecord[]>([]);
  const [is_loading, set_is_loading] = useState(true);
  const [error_message, set_error_message] = useState<string | null>(null);
  const [toggling_names, set_toggling_names] = useState<Set<string>>(new Set());

  const load_plugins = useCallback(async (): Promise<void> => {
    set_is_loading(true);
    set_error_message(null);
    const response = await api.get<PluginStateRecord[]>('/api/plugins');
    if (response.success && response.data) {
      set_plugins(response.data);
    } else {
      set_error_message(response.error?.message ?? 'Failed to load plugin state');
    }
    set_is_loading(false);
  }, []);

  useEffect(() => {
    void load_plugins();
  }, [load_plugins]);

  const handle_toggle = useCallback(async (plugin_name: string, enabled: boolean): Promise<void> => {
    set_toggling_names((current) => new Set(current).add(plugin_name));
    set_error_message(null);

    const response = await api.patch<PluginStateRecord>(`/api/plugins/${encodeURIComponent(plugin_name)}`, { enabled });
    if (response.success && response.data) {
      const updated = response.data;
      set_plugins((current) => current.map((item) => (item.name === plugin_name ? updated : item)));
    } else {
      set_error_message(response.error?.message ?? `Failed to update plugin "${plugin_name}"`);
    }

    set_toggling_names((current) => {
      const next = new Set(current);
      next.delete(plugin_name);
      return next;
    });
  }, []);

  const normalized_search = search.trim().toLowerCase();
  const filtered_plugins = plugins.filter((plugin) => {
    if (filter === 'theme') return false;
    if (!normalized_search) return true;
    const haystack = `${plugin.name} ${plugin.description ?? ''} ${plugin.author ?? ''}`.toLowerCase();
    return haystack.includes(normalized_search);
  });

  const filtered_themes = theme_catalog.filter((theme) => {
    if (filter === 'plugin') return false;
    if (!normalized_search) return true;
    const haystack = `${theme.name} ${theme.description} ${theme.author}`.toLowerCase();
    return haystack.includes(normalized_search);
  });

  const total_visible = filtered_plugins.length + filtered_themes.length;

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Marketplace</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage plugins and browse available themes.</p>
      </div>

      <Alert className="mb-6 rounded-md">
        <Info aria-hidden="true" />
        <AlertTitle>Plugin state is persisted</AlertTitle>
        <AlertDescription>
          Plugin enable/disable changes are saved in the database. Runtime loading changes take effect on the next server restart.
        </AlertDescription>
      </Alert>

      {error_message ? (
        <Alert variant="destructive" className="mb-6 rounded-md">
          <AlertTitle>Plugin action failed</AlertTitle>
          <AlertDescription>{error_message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Marketplace filters">
          {(['all', 'plugin', 'theme'] as const).map((filter_option) => {
            const is_active = filter === filter_option;
            return (
              <Button
                key={filter_option}
                type="button"
                variant={is_active ? 'default' : 'secondary'}
                size="sm"
                onClick={() => set_filter(filter_option)}
                aria-pressed={is_active}
              >
                {filter_option === 'all' ? 'All' : filter_option === 'plugin' ? 'Plugins' : 'Themes'}
              </Button>
            );
          })}
        </div>

        <div className="relative w-full max-w-md">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={search}
            onChange={(event) => set_search(event.target.value)}
            placeholder="Search catalog..."
            aria-label="Search marketplace catalog"
            className="pl-9"
          />
        </div>
      </div>

      {is_loading ? (
        <Card className="rounded-md drop-shadow">
          <CardContent className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Loading plugin state...
          </CardContent>
        </Card>
      ) : total_visible === 0 ? (
        <Card className="rounded-md drop-shadow">
          <CardContent className="p-0">
            <Empty className="border-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Search aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>No catalog items found</EmptyTitle>
                <EmptyDescription>No plugins or themes match your search.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered_plugins.map((plugin) => {
            const is_toggling = toggling_names.has(plugin.name);
            const status_label = get_plugin_status_label(plugin);
            const status_text = get_plugin_status_text(plugin);
            const status_class = get_plugin_status_class(plugin);
            const display_name = plugin.admin?.display_name ?? plugin.name;
            const category = plugin.admin?.category ?? 'Plugin';

            return (
              <Card key={`plugin-${plugin.name}`} className="rounded-md drop-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Package size={24} className="text-primary" aria-hidden="true" />
                      <div className="min-w-0">
                        <CardTitle className="truncate text-base">{display_name}</CardTitle>
                        <CardDescription>
                          {plugin.author ?? 'Unknown author'} · v{plugin.version}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="secondary" className={`shrink-0 ${status_class}`}>
                      {status_label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{plugin.description ?? 'No description provided.'}</p>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <Badge variant="outline">{category}</Badge>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">{status_text}</span>
                      {is_toggling ? <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" /> : null}
                      <Switch
                        checked={plugin.enabled}
                        onCheckedChange={(checked) => void handle_toggle(plugin.name, checked)}
                        disabled={is_toggling}
                        aria-label={`Enable ${display_name}`}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {filtered_themes.map((theme) => (
            <Card key={`theme-${theme.name}`} className="rounded-md drop-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Palette size={24} className="text-muted-foreground" aria-hidden="true" />
                    <div className="min-w-0">
                      <CardTitle className="truncate text-base">{theme.name}</CardTitle>
                      <CardDescription>
                        {theme.author} · v{theme.version}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="secondary" className="shrink-0 border-transparent bg-muted text-muted-foreground">
                    Catalog
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{theme.description}</p>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <Badge variant="outline">{theme.category}</Badge>
                  <span className="text-xs font-medium text-primary">Theme catalog</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
