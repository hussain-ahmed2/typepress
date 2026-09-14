/**
 * API Entry Point — Boots the Fastify server with Socket.IO.
 */
import { start_server } from './server';

start_server().catch((err) => {
  console.error(err);
  process.exit(1);
});
