import type { ContentDetail, TaxonomyBrief } from '@typepress/shared-types';

export interface ThemeSlotProps {
  content?: ContentDetail;
  taxonomies?: TaxonomyBrief[];
  siteTitle?: string;
  siteDescription?: string;
}

export interface ThemeConfig {
  name: string;
  version: string;
  slots: Record<string, React.ComponentType<ThemeSlotProps>>;
  styles?: Record<string, string>;
}

export interface ThemeManifest {
  name: string;
  version: string;
  description?: string;
  slots: string[];
}
