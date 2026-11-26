export type ContentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'TRASH';

import type { TaxonomyBrief } from './taxonomy';

/** Supported block types for the page builder. */
export type BuilderBlockType = 'heading' | 'text' | 'image' | 'button' | 'divider' | 'container';

/** Allowed primitive prop values for safe builder block serialization/rendering. */
export type BuilderBlockPropValue = string | number | boolean | null;

/** Serializable builder block stored in content meta. */
export interface BuilderBlock {
  id: string;
  type: BuilderBlockType;
  props: Record<string, BuilderBlockPropValue>;
}

export interface ContentMeta {
  excerpt?: string;
  featured_image?: string;
  template?: string;
  /** Optional page-builder blocks; rendered by renderer when present. */
  builder_data?: BuilderBlock[];
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
