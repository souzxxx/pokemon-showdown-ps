import type { CurrentUser } from '../middleware/currentUser';

declare global {
  namespace Express {
    interface Request {
      currentUser?: CurrentUser;
      auth?: {
        payload?: {
          sub?: string;
          email?: string;
        };
      };
    }
  }
}

export {};
