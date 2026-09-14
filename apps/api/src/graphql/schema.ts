/**
 * GraphQL Schema — Type-safe GraphQL API for Typepress.
 *
 * Provides a complete GraphQL API alongside the REST API.
 * Auto-generated from Prisma models with manual resolvers.
 */
export const type_defs = `#graphql
  scalar DateTime
  scalar JSON

  type Query {
    content(id: ID, slug: String): Content
    contents(type: String, status: ContentStatus, limit: Int, page: Int): ContentConnection!
    menus(location: String): [Menu!]!
    search(query: String!, type: String, limit: Int): [SearchResult!]!
    health: Health!
  }

  type Mutation {
    createContent(input: CreateContentInput!): Content!
    updateContent(id: ID!, input: UpdateContentInput!): Content!
    deleteContent(id: ID!): Boolean!
  }

  type Subscription {
    contentUpdated(id: ID!): Content!
    presenceChanged(contentId: ID!): [Presence!]!
  }

  enum ContentStatus {
    DRAFT
    PUBLISHED
    ARCHIVED
    TRASH
  }

  enum UserRole {
    ADMIN
    EDITOR
    AUTHOR
    VIEWER
  }

  type Content {
    id: ID!
    type: String!
    slug: String!
    title: String!
    status: ContentStatus!
    meta: JSON
    author: User!
    taxonomies: [Taxonomy!]!
    created_at: DateTime!
    updated_at: DateTime!
  }

  type ContentConnection {
    items: [Content!]!
    total: Int!
    page: Int!
    limit: Int!
    total_pages: Int!
  }

  type User {
    id: ID!
    email: String!
    name: String
    role: UserRole!
    created_at: DateTime!
  }

  type Menu {
    id: ID!
    name: String!
    slug: String!
    location: String
    items: [MenuItem!]!
    created_at: DateTime!
  }

  type MenuItem {
    id: ID!
    label: String!
    url: String!
    target: String
    children: [MenuItem!]!
    order: Int!
  }

  type Taxonomy {
    id: ID!
    name: String!
    slug: String!
    type: String!
  }

  type SearchResult {
    id: ID!
    type: String!
    slug: String!
    title: String!
    excerpt: String
    rank: Float!
  }

  type Health {
    status: String!
    uptime: Float!
    plugins: [String!]!
  }

  type Presence {
    user_id: ID!
    user_name: String!
    color: String!
  }

  input CreateContentInput {
    type: String!
    slug: String!
    title: String!
    status: ContentStatus
    meta: JSON
  }

  input UpdateContentInput {
    slug: String
    title: String
    status: ContentStatus
    meta: JSON
  }
`;
