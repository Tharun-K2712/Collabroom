import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';
import { logger } from '../utils/logger';

let ioInstance: SocketIOServer | null = null;

export const initSocketIO = (io: SocketIOServer) => {
  ioInstance = io;

  // Socket Authentication Middleware
  io.use((socket: Socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        (socket.handshake.headers?.authorization?.startsWith('Bearer ')
          ? socket.handshake.headers.authorization.split(' ')[1]
          : null);

      if (!token) {
        return next(new Error('Authentication token missing'));
      }

      const payload = verifyAccessToken(token);
      (socket as any).userId = payload.userId;
      (socket as any).email = payload.email;
      next();
    } catch (err) {
      logger.warn('Socket connection rejected: Invalid authentication token');
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId;
    logger.info(`User connected to Socket.IO: ${userId} (${socket.id})`);

    // Join personal notification channel
    socket.join(`user:${userId}`);

    // Join specific room channel
    socket.on('room:join', (roomId: string) => {
      socket.join(`room:${roomId}`);
      logger.debug(`User ${userId} joined room channel: room:${roomId}`);
      socket.to(`room:${roomId}`).emit('room:user_joined', { userId, timestamp: new Date() });
    });

    // Leave room channel
    socket.on('room:leave', (roomId: string) => {
      socket.leave(`room:${roomId}`);
      logger.debug(`User ${userId} left room channel: room:${roomId}`);
      socket.to(`room:${roomId}`).emit('room:user_left', { userId, timestamp: new Date() });
    });

    // Handle typing indicators in room comments or discussions
    socket.on('room:typing', (data: { roomId: string; userName: string; isTyping: boolean }) => {
      socket.to(`room:${data.roomId}`).emit('room:user_typing', {
        userId,
        userName: data.userName,
        isTyping: data.isTyping,
      });
    });

    socket.on('disconnect', () => {
      logger.info(`User disconnected from Socket.IO: ${userId} (${socket.id})`);
    });
  });
};

export const getIO = (): SocketIOServer => {
  if (!ioInstance) {
    throw new Error('Socket.IO not initialized');
  }
  return ioInstance;
};

export const broadcastToRoom = (roomId: string, event: string, payload: any) => {
  if (ioInstance) {
    ioInstance.to(`room:${roomId}`).emit(event, payload);
  }
};

export const sendNotificationToUser = (userId: string, payload: any) => {
  if (ioInstance) {
    ioInstance.to(`user:${userId}`).emit('notification:new', payload);
  }
};
