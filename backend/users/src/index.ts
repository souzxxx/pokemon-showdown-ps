import { execSync } from 'node:child_process';
import app from './app';
import { env } from './env';

try {
  execSync('npx prisma db push', { cwd: process.cwd(), stdio: 'inherit' });
} catch (error) {
  console.warn('Prisma schema push failed at startup:', error);
}

app.listen(env.PORT, () => {
  console.log(`\nUsers API → http://localhost:${env.PORT}\n`);
  console.log('Endpoints:');
  console.log('  GET    /me  (Auth0 JWT required)');
  console.log('  POST   /me/teams  (save a 6-Pokémon team for the current user)');
});
