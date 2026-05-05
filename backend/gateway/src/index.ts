import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { env } from './env';

const app = express();

app.use(cors({ origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN }));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/pokemon', createProxyMiddleware({
  target: env.BATTLE_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/': '/api/pokemon/' },
}));

app.use('/api/battle', createProxyMiddleware({
  target: env.BATTLE_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/': '/api/battle/' },
}));

app.use(
  '/api/users',
  createProxyMiddleware({
    target: env.USERS_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/api/users': '' },
  }),
);

app.listen(env.PORT, () => {
  console.log(`\nGateway → http://localhost:${env.PORT}\n`);
  console.log('Routes:');
  console.log(`  /api/pokemon/*  →  ${env.BATTLE_SERVICE_URL}/api/pokemon/*`);
  console.log(`  /api/battle/*   →  ${env.BATTLE_SERVICE_URL}/api/battle/*`);
  console.log(`  /api/users/*    →  ${env.USERS_SERVICE_URL}/*`);
});
