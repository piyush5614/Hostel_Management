/**
 * Socket.io Client Wrapper
 * Singleton instance for managing real-time connections
 */

import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

/**
 * Initialize socket connection with JWT authentication
 */
export function initializeSocket(token: string): Socket {
  if (socket) {
    return socket;
  }

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

  socket = io(backendUrl, {
    auth: { token },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 10,
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('✓ Connected to notification server');
  });

  socket.on('disconnect', (reason: string) => {
    console.log(`✗ Disconnected from notification server: ${reason}`);
  });

  socket.on('error', (error: any) => {
    console.error('Socket error:', error);
  });

  socket.on('connection:success', (data: any) => {
    console.log(`✓ WebSocket authenticated for user: ${data.email}`);
  });

  return socket;
}

/**
 * Get current socket instance
 */
export function getSocket(): Socket {
  if (!socket) {
    throw new Error('Socket not initialized. Call initializeSocket first.');
  }
  return socket;
}

/**
 * Check if socket is connected
 */
export function isSocketConnected(): boolean {
  return socket?.connected ?? false;
}

/**
 * Disconnect socket
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Emit event to server
 */
export function emitEvent(event: string, data?: any): void {
  getSocket().emit(event, data);
}

/**
 * Listen for event from server
 */
export function onEvent(event: string, callback: (data: any) => void): () => void {
  const socket = getSocket();
  socket.on(event, callback);
  
  // Return unsubscribe function
  return () => {
    socket.off(event, callback);
  };
}

/**
 * Listen for event once
 */
export function onceEvent(event: string, callback: (data: any) => void): void {
  getSocket().once(event, callback);
}

/**
 * Remove all listeners for event
 */
export function offEvent(event: string): void {
  getSocket().off(event);
}

/**
 * Test connection with ping/pong
 */
export function testConnection(): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Socket ping timeout'));
    }, 5000);

    const handlePong = () => {
      clearTimeout(timeout);
      offEvent('pong');
      resolve();
    };

    onceEvent('pong', handlePong);
    emitEvent('ping');
  });
}
