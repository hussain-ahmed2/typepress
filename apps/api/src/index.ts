/**
 * API Entry Point — Boots the Fastify server and starts listening.
 *
 * Loads environment variables via dotenv before creating the server.
 * Graceful shutdown on SIGTERM/SIGINT to close DB connections cleanly.
 */
import { create_server } from './server';
import { config } from './config';

async function main() {
  const server = await create_server();

  await server.listen({ port: config.API_PORT, host: config.API_HOST });
  console.log(`API server running on http://${config.API_HOST}:${config.API_PORT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
