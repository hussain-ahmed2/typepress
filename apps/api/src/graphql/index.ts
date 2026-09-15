import { create_logger } from "../infrastructure/logger";
const log = create_logger("GraphQL");
/**
 * GraphQL Server — Integrates GraphQL Yoga with Fastify.
 *
 * Provides a /api/graphql endpoint with:
 * - Query, Mutation support
 * - GraphiQL playground in development
 * - Type-safe resolvers
 */
import { createYoga } from 'graphql-yoga';
import { makeExecutableSchema } from '@graphql-tools/schema';
import type { FastifyInstance } from 'fastify';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { type_defs } from './schema';
import { resolvers } from './resolvers';

export async function register_graphql(app: FastifyInstance): Promise<void> {
  const schema = makeExecutableSchema({ typeDefs: type_defs, resolvers });

  const yoga = createYoga({
    schema,
    graphqlEndpoint: '/api/graphql',
    landingPage: true,
  });

  // Handle all requests to /api/graphql
  app.all('/api/graphql', async (request: FastifyRequest, reply: FastifyReply) => {
    const response = await yoga.handle(
      new Request(`http://localhost${request.url}`, {
        method: request.method,
        headers: request.headers as Record<string, string>,
        body: request.method !== 'GET' ? JSON.stringify(request.body) : undefined,
      }),
    );

    const body = await response.text();
    reply.status(response.status);
    response.headers.forEach((value: string, key: string) => {
      reply.header(key, value);
    });
    return reply.send(body);
  });

  log.info('Registered at /api/graphql');
}
