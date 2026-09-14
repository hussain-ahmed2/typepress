/**
 * GraphQL Resolvers — Type-safe resolvers for the GraphQL API.
 */
import { prisma } from '@typepress/db';
import { SearchService } from '../features/search/search.service';

const search_service = new SearchService();

export const resolvers = {
  Query: {
    content: async (_parent: unknown, args: { id?: string; slug?: string }) => {
      if (args.id) {
        return prisma.content.findUnique({
          where: { id: args.id },
          include: { author: true, taxonomies: { include: { taxonomy: true } } },
        });
      }
      if (args.slug) {
        return prisma.content.findUnique({
          where: { slug: args.slug },
          include: { author: true, taxonomies: { include: { taxonomy: true } } },
        });
      }
      return null;
    },

    contents: async (_parent: unknown, args: { type?: string; status?: string; limit?: number; page?: number }) => {
      const limit = args.limit ?? 20;
      const page = args.page ?? 1;
      const skip = (page - 1) * limit;

      const where: Record<string, unknown> = {};
      if (args.type) where.type = args.type;
      if (args.status) where.status = args.status;

      const [items, total] = await Promise.all([
        prisma.content.findMany({
          where,
          skip,
          take: limit,
          orderBy: { created_at: 'desc' },
          include: { author: true, taxonomies: { include: { taxonomy: true } } },
        }),
        prisma.content.count({ where }),
      ]);

      return {
        items,
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      };
    },

    menus: async (_parent: unknown, args: { location?: string }) => {
      const where: Record<string, unknown> = {};
      if (args.location) where.location = args.location;

      return prisma.menu.findMany({
        where,
        include: {
          items: {
            orderBy: { order: 'asc' },
            include: { children: { orderBy: { order: 'asc' } } },
          },
        },
      });
    },

    search: async (_parent: unknown, args: { query: string; type?: string; limit?: number }) => {
      const result = await search_service.search(args.query, args.type, 1, args.limit ?? 20);
      return result.data ?? [];
    },

    health: async () => ({
      status: 'ok',
      uptime: process.uptime(),
      plugins: [],
    }),
  },

  Mutation: {
    createContent: async (_parent: unknown, args: { input: { type: string; slug: string; title: string; status?: string; meta?: unknown } }) => {
      return prisma.content.create({
        data: {
          type: args.input.type,
          slug: args.input.slug,
          title: args.input.title,
          status: (args.input.status as never) ?? 'DRAFT',
          meta: (args.input.meta as never) ?? {},
          author_id: 'system', // TODO: Get from auth context
        },
      });
    },

    updateContent: async (_parent: unknown, args: { id: string; input: { slug?: string; title?: string; status?: string; meta?: unknown } }) => {
      const update_data: Record<string, unknown> = {};
      if (args.input.slug) update_data.slug = args.input.slug;
      if (args.input.title) update_data.title = args.input.title;
      if (args.input.status) update_data.status = args.input.status;
      if (args.input.meta) update_data.meta = args.input.meta;

      return prisma.content.update({
        where: { id: args.id },
        data: update_data as never,
      });
    },

    deleteContent: async (_parent: unknown, args: { id: string }) => {
      await prisma.content.update({
        where: { id: args.id },
        data: { status: 'TRASH' },
      });
      return true;
    },
  },
};
