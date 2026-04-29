import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../db';

export type CurrentUser = {
  id: string;
  auth0Sub: string;
  email?: string;
  username: string;
};

function slugify(value?: string): string {
  if (!value) return 'trainer';
  const base = value.split('@')[0] ?? 'trainer';
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return slug.length > 0 ? slug : 'trainer';
}

export async function currentUser(req: Request, res: Response, next: NextFunction) {
  const sub = req.auth?.payload?.sub;
  if (!sub) {
    return res.status(401).json({ error: 'Missing Auth0 subject.' });
  }

  const email = typeof req.auth?.payload?.email === 'string' ? req.auth?.payload?.email : undefined;
  const normalizedEmail = email?.toLowerCase();
  const username = slugify(normalizedEmail);

  const user = await prisma.user.upsert({
    where: { auth0Sub: sub },
    update: {
      email: normalizedEmail ?? undefined,
      username,
    },
    create: {
      auth0Sub: sub,
      email: normalizedEmail ?? undefined,
      username,
    },
  });

  req.currentUser = {
    id: user.id,
    auth0Sub: user.auth0Sub,
    email: user.email ?? undefined,
    username: user.username,
  };

  return next();
}
