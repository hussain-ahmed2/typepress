/**
 * Auth Feature — Handles authentication, sessions, and user identity.
 *
 * Endpoints:
 *   POST /api/auth/login    — Authenticate with email/password, create session
 *   POST /api/auth/logout   — Destroy session
 *   GET  /api/auth/me       — Get current authenticated user
 *
 * Session management uses @fastify/session backed by Redis in production.
 * Password verification uses bcrypt (cost factor 12).
 */
import type { FastifyInstance } from 'fastify';
import type { FeaturePlugin } from '@typepress/core';
import { auth_routes } from './auth.routes';

export const auth_feature: FeaturePlugin = {
  name: 'auth',
  version: '0.1.0',
  dependencies: [],

  async register(app: FastifyInstance) {
    await app.register(auth_routes);
  },
};
