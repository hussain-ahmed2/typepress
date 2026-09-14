export type ContentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'TRASH';

import type { TaxonomyBrief } from './taxonomy';

export interface ContentMeta {
  excerpt?: string;
  featured_image?: string;
  template?: string;
  [key: string]: unknown;
}

export interface ContentListItem {
  id: string;
  type: string;
  slug: string;
  title: string;
  status: ContentStatus;
  author_name: string;
  created_at: string;
  updated_at: string;
}

export interface ContentDetail extends ContentListItem {
  meta: ContentMeta;
  taxonomies: TaxonomyBrief[];
}

export interface CreateContentInput {
  type: string;
  slug: string;
  title: string;
  status?: ContentStatus;
  meta?: ContentMeta;
  taxonomy_ids?: string[];
}

export interface UpdateContentInput {
  slug?: string;
  title?: string;
  status?: ContentStatus;
  meta?: ContentMeta;
  taxonomy_ids?: string[];
}
