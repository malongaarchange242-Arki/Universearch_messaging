// src/server.ts

import 'dotenv/config';
import { app } from './app';

const PORT = parseInt(process.env.PORT || '3006', 10);
const HOST = '0.0.0.0';

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  app.log.error({ reason, promise }, 'Unhandled Rejection');
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  app.log.error(error, 'Uncaught Exception');
  process.exit(1);
});

const start = async () => {
  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`🚀 Messaging service listening on http://${HOST}:${PORT}`);
    app.log.info(`🔌 WebSocket (Socket.io) available on ws://${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
