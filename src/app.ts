// src/app.ts

import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import fastifyIO from 'fastify-socket.io';
import { createSupabaseClient } from './config/supabase';
import { registerRoutes } from './routes';
import { setupSocketIO } from './socket-io';
import './types'; // Import types for Fastify module augmentation

export const app: FastifyInstance = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
  bodyLimit: 10 * 1024 * 1024, // 10MB for messages with attachments
});

/**
 * Plugins
 */
app.register(cors, {
  origin: process.env.CORS_ORIGIN || true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true,
});

// Register Socket.io plugin
app.register(fastifyIO, {
  cors: {
    origin: process.env.CORS_ORIGIN || true,
    credentials: true,
  },
});

/**
 * Decorators - Make Supabase available throughout the app
 */
app.decorate('supabase', createSupabaseClient());

/**
 * Setup Socket.io after decoration
 */
app.ready(async () => {
  setupSocketIO(app, (app as any).io);
});

/**
 * Logging response hook
 */
app.addHook('onResponse', (request, reply) => {
  const start = (request as any).startTime;

  if (!start) return;

  const duration = Number(process.hrtime.bigint() - start) / 1_000_000;

  app.log.info({
    endpoint: `${request.method} ${request.url}`,
    status: reply.statusCode,
    duration_ms: duration.toFixed(2),
    ip: request.ip,
  });
});

/**
 * Register timing hook
 */
app.addHook('onRequest', (request, reply, done) => {
  (request as any).startTime = process.hrtime.bigint();
  done();
});

/**
 * Error handler
 */
app.setErrorHandler((error, request, reply) => {
  request.log.error(error);

  const message = error instanceof Error ? error.message : 'Unknown error';

  reply.status(500).send({
    error: 'Internal Server Error',
    message,
  });
});

/**
 * Register routes
 */
registerRoutes(app).catch((error) => {
  app.log.error('Failed to register routes:', error);
  process.exit(1);
});
