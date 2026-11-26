import { create_logger } from "../infrastructure/logger";
const log = create_logger("GraphQL");
/**
 * GraphQL Server — Integrates GraphQL Yoga with Fastify.
 *
 * Provides a /api/graphql endpoint with:
 * - Query, Mutation support
 * - GraphiQL playground in development
 * - Per-request auth context bridged from Fastify session
 */
import { createYoga, type Plugin } from 'graphql-yoga';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { NoSchemaIntrospectionCustomRule } from 'graphql';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../config';
import { type_defs } from './schema';
import { resolvers } from './resolvers';
import { build_graphql_context, type GraphQLContext } from './context';
import {
  MAX_QUERY_COMPLEXITY,
  MAX_QUERY_DEPTH,
  create_complexity_limit_rule,
  create_depth_limit_rule,
} from './limits';

interface GraphQLServerContext {
  fastifyRequest: FastifyRequest;
  fastifyReply: FastifyReply;
}

function disable_introspection_plugin(): Plugin {
  return {
    onValidate({ addValidationRule }) {
      addValidationRule(NoSchemaIntrospectionCustomRule);
    },
  };
}

/** Enforce query depth/complexity limits to mitigate abusive GraphQL operations. */
function abuse_limits_plugin(): Plugin {
  return {
    onValidate({ addValidationRule }) {
      addValidationRule(create_depth_limit_rule({ max_depth: MAX_QUERY_DEPTH }));
      addValidationRule(create_complexity_limit_rule({ max_complexity: MAX_QUERY_COMPLEXITY }));
    },
  };
}

export async function register_graphql(app: FastifyInstance): Promise<void> {
  const schema = makeExecutableSchema({ typeDefs: type_defs, resolvers });
  const is_production = config.NODE_ENV === 'production';

  const plugins: Plugin[] = [abuse_limits_plugin()];
  if (is_production) {
    plugins.push(disable_introspection_plugin());
  }

  const yoga = createYoga<GraphQLServerContext>({
    schema,
    graphqlEndpoint: '/api/graphql',
    landingPage: !is_production,
    graphiql: !is_production,
    plugins,
    context: ({ fastifyRequest, fastifyReply }): GraphQLContext =>
      build_graphql_context(fastifyRequest, fastifyReply),
  });

  // Handle all requests to /api/graphql
  app.all('/api/graphql', async (request: FastifyRequest, reply: FastifyReply) => {
    const response = await yoga.handle(
      new Request(`http://localhost${request.url}`, {
        method: request.method,
        headers: request.headers as Record<string, string>,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? JSON.stringify(request.body) : undefined,
      }),
      { fastifyRequest: request, fastifyReply: reply },
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
