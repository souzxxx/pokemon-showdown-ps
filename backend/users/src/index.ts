import express from 'express';
import cors from 'cors';
import { env } from './env';
import { requireAuth } from './middleware/auth';
import { currentUser } from './middleware/currentUser';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/me', requireAuth, currentUser, (req, res) => {
  return res.json(req.currentUser);
});

app.listen(env.PORT, () => {
  console.log(`\nUsers API → http://localhost:${env.PORT}\n`);
  console.log('Endpoints:');
  console.log('  GET    /me  (Auth0 JWT required)');
});
