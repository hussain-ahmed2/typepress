/**
 * Socket.IO Integration — Real-time collaboration for Typepress.
 *
 * Handles:
 *   - Room-based editing sessions (one room per content item)
 *   - User presence tracking (who's editing what)
 *   - Cursor position broadcasting
 *   - Content change notifications
 *
 * Architecture:
 *   Client → Socket.IO → Room → Redis Pub/Sub → Other Clients
 */
import { Server as SocketIOServer } from 'socket.io';
import type { Server } from 'http';

interface EditorPresence {
  user_id: string;
  user_name: string;
  color: string;
  cursor_position?: number;
  last_active: number;
}

const PRESENCE_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

let color_index = 0;

function get_next_color(): string {
  const color = PRESENCE_COLORS[color_index % PRESENCE_COLORS.length]!;
  color_index++;
  return color;
}

/**
 * Create and configure the Socket.IO server.
 * Attaches to an existing HTTP server (Fastify's underlying server).
 */
export function create_socket_server(http_server: Server): SocketIOServer {
  const io = new SocketIOServer(http_server, {
    cors: {
      origin: process.env.ADMIN_URL || 'http://localhost:4000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Join an editing room for a specific content item
    socket.on('join:editing', (data: { content_id: string; user_id: string; user_name: string }) => {
      const room = `editing:${data.content_id}`;
      socket.join(room);

      // Track presence in the room
      const presence: EditorPresence = {
        user_id: data.user_id,
        user_name: data.user_name,
        color: get_next_color(),
        last_active: Date.now(),
      };

      // Store presence on socket data
      socket.data.presence = presence;
      socket.data.room = room;

      // Broadcast updated presence to room
      const room_sockets = io.sockets.adapter.rooms.get(room);
      const presences: EditorPresence[] = [];
      if (room_sockets) {
        for (const id of room_sockets) {
          const s = io.sockets.sockets.get(id);
          if (s?.data.presence) {
            presences.push(s.data.presence);
          }
        }
      }

      io.to(room).emit('presence:update', presences);
      console.log(`[Socket] ${data.user_name} joined room ${room} (${presences.length} editors)`);
    });

    // Broadcast cursor position
    socket.on('cursor:move', (data: { content_id: string; position: number }) => {
      const room = `editing:${data.content_id}`;
      if (socket.data.presence) {
        socket.data.presence.cursor_position = data.position;
        socket.data.presence.last_active = Date.now();
      }
      socket.to(room).emit('cursor:update', {
        user_id: socket.data.presence?.user_id,
        position: data.position,
        color: socket.data.presence?.color,
      });
    });

    // Broadcast content changes
    socket.on('content:change', (data: { content_id: string; delta: unknown }) => {
      const room = `editing:${data.content_id}`;
      socket.to(room).emit('content:sync', data);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      const room = socket.data.room;
      const presence = socket.data.presence;

      if (room && presence) {
        // Broadcast updated presence (user removed)
        const room_sockets = io.sockets.adapter.rooms.get(room);
        const presences: EditorPresence[] = [];
        if (room_sockets) {
          for (const id of room_sockets) {
            if (id === socket.id) continue;
            const s = io.sockets.sockets.get(id);
            if (s?.data.presence) {
              presences.push(s.data.presence);
            }
          }
        }

        io.to(room).emit('presence:update', presences);
        console.log(`[Socket] ${presence.user_name} left room ${room} (${presences.length} editors)`);
      }
    });
  });

  console.log('[Socket] Socket.IO server initialized');
  return io;
}
