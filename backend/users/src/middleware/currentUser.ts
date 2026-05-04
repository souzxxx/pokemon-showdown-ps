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

async function buildUniqueUsername(baseUsername: string, auth0Sub: string): Promise<string> {
  let candidate = baseUsername;
  const suffix = auth0Sub.replace(/[^a-z0-9]/gi, '').slice(-6).toLowerCase() || 'u';
  let attempt = 0;

  while (true) {
    const existingUser = await prisma.user.findUnique({ where: { username: candidate } });
    if (!existingUser) {
      return candidate;
    }
    if (existingUser.auth0Sub === auth0Sub) {
      return candidate;
    }

    attempt += 1;
    candidate = `${baseUsername}-${suffix}${attempt > 1 ? attempt : ''}`;
  }
}

export async function currentUser(req: Request, res: Response, next: NextFunction) {
  const sub = req.auth?.payload?.sub;
  if (!sub) {
    return res.status(401).json({ error: 'Missing Auth0 subject.' });
  }

  const email = typeof req.auth?.payload?.email === 'string' ? req.auth?.payload?.email : undefined;
  const normalizedEmail = email?.toLowerCase();
  const baseUsername = slugify(normalizedEmail);
  const username = await buildUniqueUsername(baseUsername, sub);

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
