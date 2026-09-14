/**
 * Database Package — Prisma client wrapper and type re-exports.
 *
 * Provides a singleton PrismaClient instance with dev-mode global caching
 * to prevent multiple instances during hot reload.
 *
 * Re-exports all model types and enums for convenient access from other packages.
 */
export { prisma } from './client';
export { PrismaClient } from '@prisma/client';
export type { Content, User, Media, Taxonomy, TaxonomyRelation, Session } from '@prisma/client';
export { ContentStatus, UserRole } from '@prisma/client';
