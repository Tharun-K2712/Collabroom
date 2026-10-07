import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './app';
import { ENV } from './config/env';
import { initSocketIO } from './socket/socketHandler';
import { logger } from './utils/logger';
import { prisma } from './config/db';

// Enable BigInt serialization for JSON.stringify and Express res.json
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

const app = createApp();
const server = http.createServer(app);

// Setup Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: (origin, callback) => {
      callback(null, true);
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
});

initSocketIO(io);

const PORT = ENV.PORT;

server.listen(PORT, () => {
  logger.info(`🚀 CollabRoom API Server running in ${ENV.NODE_ENV} mode on port ${PORT}`);
  logger.info(`🌐 Frontend URL: ${ENV.FRONTEND_URL}`);
  logger.info(`📁 Storage Provider: ${ENV.STORAGE.PROVIDER} (${ENV.SUPABASE.BUCKET_NAME})`);
});

// Graceful Shutdown
const shutdown = async () => {
  logger.info('Shutting down CollabRoom API gracefully...');
  server.close(async () => {
    await prisma.$disconnect();
    logger.info('Closed all database connections and HTTP listeners. Bye!');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
