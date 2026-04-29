import { auth } from 'express-oauth2-jwt-bearer';
import { env } from '../env';

export const requireAuth = auth({
  audience: env.AUTH0_AUDIENCE,
  issuerBaseURL: `https://${env.AUTH0_DOMAIN}/`,
  tokenSigningAlg: 'RS256',
});
