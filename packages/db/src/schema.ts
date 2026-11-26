/**
 * Drizzle schema — source of truth for database tables.
 *
 * Mirrors the previous Prisma schema to preserve existing data shape.
 * Uses snake_case column names and preserves enum values for compatibility.
 */
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const user_role_enum = pgEnum('UserRole', ['ADMIN', 'EDITOR', 'AUTHOR', 'VIEWER']);
export const content_status_enum = pgEnum('ContentStatus', ['DRAFT', 'PUBLISHED', 'ARCHIVED', 'TRASH']);
export const comment_status_enum = pgEnum('CommentStatus', ['PENDING', 'APPROVED', 'SPAM', 'TRASH']);
export const auth_token_type_enum = pgEnum('AuthTokenType', ['PASSWORD_RESET', 'EMAIL_VERIFICATION']);

/** App-level enum constants for compatibility with existing Prisma-era imports. */
export const UserRole = {
  ADMIN: 'ADMIN',
  EDITOR: 'EDITOR',
  AUTHOR: 'AUTHOR',
  VIEWER: 'VIEWER',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const ContentStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
  TRASH: 'TRASH',
} as const;
export type ContentStatus = (typeof ContentStatus)[keyof typeof ContentStatus];

export const CommentStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  SPAM: 'SPAM',
  TRASH: 'TRASH',
} as const;
export type CommentStatus = (typeof CommentStatus)[keyof typeof CommentStatus];

export const AuthTokenType = {
  PASSWORD_RESET: 'PASSWORD_RESET',
  EMAIL_VERIFICATION: 'EMAIL_VERIFICATION',
} as const;
export type AuthTokenType = (typeof AuthTokenType)[keyof typeof AuthTokenType];

export const users = pgTable('User', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  password_hash: text('password_hash').notNull(),
  role: user_role_enum('role').notNull().default('AUTHOR'),
  capabilities: jsonb('capabilities').$type<string[]>().notNull().default([]),
  email_verified: boolean('email_verified').notNull().default(false),
  email_verified_at: timestamp('email_verified_at', { withTimezone: false, mode: 'date' }),
  created_at: timestamp('created_at', { withTimezone: false, mode: 'date' }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: false, mode: 'date' }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const contents = pgTable(
  'Content',
  {
    id: text('id').primaryKey(),
    type: text('type').notNull(),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    status: content_status_enum('status').notNull().default('DRAFT'),
    meta: jsonb('meta').$type<Record<string, unknown>>().notNull().default({}),
    author_id: text('author_id')
      .notNull()
      .references(() => users.id),
    created_at: timestamp('created_at', { withTimezone: false, mode: 'date' }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: false, mode: 'date' }).notNull().defaultNow().$onUpdate(() => new Date()),
    published_at: timestamp('published_at', { withTimezone: false, mode: 'date' }),
    password: text('password'),
    is_sticky: boolean('is_sticky').notNull().default(false),
    format: text('format').notNull().default('standard'),
  },
  (t) => [
    index('Content_type_status_idx').on(t.type, t.status),
    index('Content_author_id_idx').on(t.author_id),
    index('Content_published_at_idx').on(t.published_at),
    index('Content_is_sticky_idx').on(t.is_sticky),
  ],
);

export const media = pgTable('Media', {
  id: text('id').primaryKey(),
  filename: text('filename').notNull(),
  mimetype: text('mimetype').notNull(),
  size: integer('size').notNull(),
  url: text('url').notNull(),
  storage_key: text('storage_key'),
  width: integer('width'),
  height: integer('height'),
  variants: jsonb('variants').$type<unknown[]>().notNull().default([]),
  uploader_id: text('uploader_id')
    .notNull()
    .references(() => users.id),
  created_at: timestamp('created_at', { withTimezone: false, mode: 'date' }).notNull().defaultNow(),
});

export const taxonomies = pgTable(
  'Taxonomy',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    type: text('type').notNull(),
    parent_id: text('parent_id'),
  },
  (t) => [index('Taxonomy_type_idx').on(t.type)],
);

export const taxonomy_relations = pgTable(
  'TaxonomyRelation',
  {
    content_id: text('content_id')
      .notNull()
      .references(() => contents.id, { onDelete: 'cascade' }),
    taxonomy_id: text('taxonomy_id')
      .notNull()
      .references(() => taxonomies.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.content_id, t.taxonomy_id] })],
);

export const sessions = pgTable(
  'Session',
  {
    id: text('id').primaryKey(),
    user_id: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expires_at: timestamp('expires_at', { withTimezone: false, mode: 'date' }).notNull(),
  },
  (t) => [index('Session_user_id_idx').on(t.user_id)],
);

export const menus = pgTable('Menu', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  location: text('location'),
  created_at: timestamp('created_at', { withTimezone: false, mode: 'date' }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: false, mode: 'date' }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const menu_items = pgTable(
  'MenuItem',
  {
    id: text('id').primaryKey(),
    menu_id: text('menu_id')
      .notNull()
      .references(() => menus.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    url: text('url').notNull(),
    target: text('target'),
    parent_id: text('parent_id'),
    order: integer('order').notNull().default(0),
  },
  (t) => [index('MenuItem_menu_id_idx').on(t.menu_id)],
);

export const revisions = pgTable(
  'Revision',
  {
    id: text('id').primaryKey(),
    content_id: text('content_id')
      .notNull()
      .references(() => contents.id, { onDelete: 'cascade' }),
    data: jsonb('data').$type<Record<string, unknown>>().notNull(),
    author_id: text('author_id')
      .notNull()
      .references(() => users.id),
    created_at: timestamp('created_at', { withTimezone: false, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [index('Revision_content_id_idx').on(t.content_id)],
);

export const settings = pgTable('Setting', {
  key: text('key').primaryKey(),
  value: jsonb('value').$type<unknown>().notNull(),
  created_at: timestamp('created_at', { withTimezone: false, mode: 'date' }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: false, mode: 'date' }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const auth_tokens = pgTable(
  'AuthToken',
  {
    id: text('id').primaryKey(),
    user_id: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token_hash: text('token_hash').notNull().unique(),
    type: auth_token_type_enum('type').notNull(),
    expires_at: timestamp('expires_at', { withTimezone: false, mode: 'date' }).notNull(),
    used_at: timestamp('used_at', { withTimezone: false, mode: 'date' }),
    created_at: timestamp('created_at', { withTimezone: false, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    index('AuthToken_user_id_type_idx').on(t.user_id, t.type),
    index('AuthToken_expires_at_idx').on(t.expires_at),
  ],
);

export const comments = pgTable(
  'Comment',
  {
    id: text('id').primaryKey(),
    content_id: text('content_id')
      .notNull()
      .references(() => contents.id, { onDelete: 'cascade' }),
    user_id: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    author_name: text('author_name'),
    author_email: text('author_email'),
    body: text('body').notNull(),
    status: comment_status_enum('status').notNull().default('PENDING'),
    parent_id: text('parent_id'),
    created_at: timestamp('created_at', { withTimezone: false, mode: 'date' }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: false, mode: 'date' }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [
    index('Comment_content_id_idx').on(t.content_id),
    index('Comment_user_id_idx').on(t.user_id),
    index('Comment_parent_id_idx').on(t.parent_id),
    index('Comment_status_idx').on(t.status),
  ],
);

export const plugin_states = pgTable('PluginState', {
  name: text('name').primaryKey(),
  enabled: boolean('enabled').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: false, mode: 'date' }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: false, mode: 'date' }).notNull().defaultNow().$onUpdate(() => new Date()),
});

// Compatibility type aliases for gradual migration
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Content = typeof contents.$inferSelect;
export type NewContent = typeof contents.$inferInsert;
export type Media = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;
export type Taxonomy = typeof taxonomies.$inferSelect;
export type TaxonomyRelation = typeof taxonomy_relations.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Menu = typeof menus.$inferSelect;
export type MenuItem = typeof menu_items.$inferSelect;
export type Revision = typeof revisions.$inferSelect;
export type Setting = typeof settings.$inferSelect;
export type AuthToken = typeof auth_tokens.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type PluginState = typeof plugin_states.$inferSelect;
