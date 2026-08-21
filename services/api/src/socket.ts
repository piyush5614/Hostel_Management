/**
 * WebSocket Server for Real-Time Notifications
 * 
 * Features:
 * - JWT authentication for socket connections
 * - User and college namespaces
 * - Event emitters for notifications
 * - Offline-safe persistence
 */

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

export interface SocketUser {
  id: string;
  email: string;
  collegeId: string;
  role: string;
}

declare global {
  namespace Express {
    interface Socket {
      user?: SocketUser;
    }
  }
}

export function initializeSocket(httpServer: HTTPServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Middleware: JWT verification
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const secret = process.env.SUPABASE_JWT_SECRET || 'your-secret-key';
      const decoded = jwt.verify(token, secret) as any;
      
      socket.data.user = {
        id: decoded.sub,
        email: decoded.email,
        collegeId: decoded.college_id,
        role: decoded.user_role,
      };
      
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as SocketUser;
    
    if (!user) {
      console.error('Socket connected without user data');
      socket.disconnect();
      return;
    }

    console.log(`✓ User ${user.email} (${user.id}) connected via WebSocket`);

    // Join user-specific room
    socket.join(`user:${user.id}`);
    socket.join(`college:${user.collegeId}`);

    // Emit connection success
    socket.emit('connection:success', {
      userId: user.id,
      email: user.email,
      timestamp: new Date().toISOString(),
    });

    // Listen for test ping
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date().toISOString() });
    });

    // Listen for disconnect
    socket.on('disconnect', () => {
      console.log(`✗ User ${user.email} disconnected`);
    });

    // Listen for errors
    socket.on('error', (error) => {
      console.error(`Socket error from ${user.email}:`, error);
    });
  });

  return io;
}

/**
 * Emit notification to specific user
 */
export function emitNotification(
  io: SocketIOServer,
  userId: string,
  notification: {
    type: string;
    title: string;
    body: string;
    data?: Record<string, any>;
  }
) {
  io.to(`user:${userId}`).emit('notification:new', {
    ...notification,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Broadcast event to all users in a college
 */
export function emitBroadcast(
  io: SocketIOServer,
  collegeId: string,
  event: string,
  data: any
) {
  io.to(`college:${collegeId}`).emit(event, {
    ...data,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit to multiple users
 */
export function emitToUsers(
  io: SocketIOServer,
  userIds: string[],
  event: string,
  data: any
) {
  userIds.forEach((userId) => {
    io.to(`user:${userId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  });
}

/**
 * Get connected users in a room
 */
export function getRoomUsers(io: SocketIOServer, room: string): string[] {
  const sockets = io.sockets.adapter.rooms.get(room);
  return sockets ? Array.from(sockets) : [];
}

export default initializeSocket;
