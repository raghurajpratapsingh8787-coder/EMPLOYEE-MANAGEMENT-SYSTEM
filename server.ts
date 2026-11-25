import fs from 'fs';
import path from 'path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { connectDatabase, disconnectDatabase } from './backend/src/config/db';
import { env } from './backend/src/config/env';
import { createExpressApp } from './backend/src/app';

async function startServer() {
  await connectDatabase();

  const app = createExpressApp();

  if (env.nodeEnv !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output missing. Run npm run build.');
      }
    });
  }

  const server = app.listen(env.port, '0.0.0.0', () => {
    console.log(`Calibre HR server listening on http://0.0.0.0:${env.port}`);
  });

  const shutdown = async () => {
    server.close(async () => {
      await disconnectDatabase().catch(() => {});
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 3000).unref();
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
