import request from 'supertest';

// Must be mocked before app.ts is imported (env.ts runs at module level)
jest.mock('../env', () => ({
  env: {
    AUTH0_DOMAIN: 'test.auth0.com',
    AUTH0_AUDIENCE: 'https://test-api',
    DATABASE_URL: 'file:./test.db',
    PORT: 8001,
  },
}));

jest.mock('../db', () => ({
  prisma: {
    team: {
      findMany: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    trainerPokemon: { create: jest.fn() },
    teamMember: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock('../middleware/auth', () => ({
  requireAuth: (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../middleware/currentUser', () => ({
  currentUser: (req: any, _res: any, next: any) => {
    req.currentUser = {
      id: 'user-1',
      auth0Sub: 'auth0|abc123',
      email: 'trainer@test.com',
      username: 'trainer',
    };
    next();
  },
}));

const mockPokeApiGet = jest.fn();
jest.mock('axios', () => ({
  create: jest.fn(() => ({ get: mockPokeApiGet })),
  isAxiosError: jest.fn((err: any) => err?.__isAxiosError === true),
  default: {
    create: jest.fn(() => ({ get: mockPokeApiGet })),
    isAxiosError: jest.fn((err: any) => err?.__isAxiosError === true),
  },
}));

import app from '../app';
import { prisma } from '../db';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const FAKE_TEAM = {
  id: 'team-1',
  name: 'My Team',
  userId: 'user-1',
  createdAt: new Date(),
  members: [
    { slot: 1, trainerPokemon: { id: 'tp-1', pokeapiId: 25 } },
    { slot: 2, trainerPokemon: { id: 'tp-2', pokeapiId: 6 } },
    { slot: 3, trainerPokemon: { id: 'tp-3', pokeapiId: 1 } },
    { slot: 4, trainerPokemon: { id: 'tp-4', pokeapiId: 9 } },
    { slot: 5, trainerPokemon: { id: 'tp-5', pokeapiId: 94 } },
    { slot: 6, trainerPokemon: { id: 'tp-6', pokeapiId: 143 } },
  ],
};

// ── GET /health ─────────────────────────────────────────────────────────────

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

// ── GET /me ──────────────────────────────────────────────────────────────────

describe('GET /me', () => {
  it('returns 200 with current user data', async () => {
    const res = await request(app).get('/me');

    expect(res.status).toBe(200);
    expect(res.body.id).toBe('user-1');
    expect(res.body.username).toBe('trainer');
    expect(res.body.email).toBe('trainer@test.com');
  });
});

// ── GET /me/teams ────────────────────────────────────────────────────────────

describe('GET /me/teams', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 200 with list of teams', async () => {
    (mockPrisma.team.findMany as jest.Mock).mockResolvedValue([FAKE_TEAM]);
    mockPokeApiGet.mockResolvedValue({ data: { name: 'pikachu' } });

    const res = await request(app).get('/me/teams');

    expect(res.status).toBe(200);
    expect(res.body.teams).toHaveLength(1);
    expect(res.body.teams[0].id).toBe('team-1');
    expect(res.body.teams[0].members).toHaveLength(6);
  });

  it('returns 200 with empty array when user has no teams', async () => {
    (mockPrisma.team.findMany as jest.Mock).mockResolvedValue([]);

    const res = await request(app).get('/me/teams');

    expect(res.status).toBe(200);
    expect(res.body.teams).toEqual([]);
  });
});

// ── POST /me/teams ───────────────────────────────────────────────────────────

describe('POST /me/teams', () => {
  beforeEach(() => jest.clearAllMocks());

  const VALID_BODY = {
    name: 'Dream Team',
    pokemonNames: ['pikachu', 'charizard', 'bulbasaur', 'squirtle', 'gengar', 'snorlax'],
  };

  it('returns 201 and the created team on valid input', async () => {
    mockPokeApiGet.mockResolvedValue({ data: { id: 25 } });
    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (cb: any) => {
      const fakeTx = {
        team: { create: jest.fn().mockResolvedValue({ id: 'team-new', name: 'Dream Team', userId: 'user-1', createdAt: new Date() }) },
        trainerPokemon: { create: jest.fn().mockResolvedValue({ id: 'tp-new' }) },
        teamMember: { create: jest.fn().mockResolvedValue({}) },
      };
      return cb(fakeTx);
    });

    const res = await request(app).post('/me/teams').send(VALID_BODY);

    expect(res.status).toBe(201);
    expect(res.body.team).toBeDefined();
    expect(res.body.team.id).toBe('team-new');
  });

  it('auto-generates team name when name is not provided', async () => {
    mockPokeApiGet.mockResolvedValue({ data: { id: 25 } });
    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (cb: any) => {
      const fakeTx = {
        team: { create: jest.fn().mockImplementation(async ({ data }: any) => ({ id: 'team-auto', name: data.name, userId: 'user-1', createdAt: new Date() })) },
        trainerPokemon: { create: jest.fn().mockResolvedValue({ id: 'tp-new' }) },
        teamMember: { create: jest.fn().mockResolvedValue({}) },
      };
      return cb(fakeTx);
    });

    const res = await request(app)
      .post('/me/teams')
      .send({ pokemonNames: VALID_BODY.pokemonNames });

    expect(res.status).toBe(201);
    expect(res.body.team.name).toMatch(/^team-\d+$/);
  });

  it('returns 422 when pokemonNames has fewer than 6 entries', async () => {
    const res = await request(app)
      .post('/me/teams')
      .send({ pokemonNames: ['pikachu', 'charizard'] });

    expect(res.status).toBe(422);
    expect(res.body.error).toContain('6');
  });

  it('returns 422 when pokemonNames has more than 6 entries', async () => {
    const res = await request(app)
      .post('/me/teams')
      .send({ pokemonNames: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] });

    expect(res.status).toBe(422);
  });

  it('returns 422 when pokemonNames is missing', async () => {
    const res = await request(app).post('/me/teams').send({ name: 'Team' });

    expect(res.status).toBe(422);
  });

  it('returns 422 when a pokemon name is not found in PokeAPI', async () => {
    const axiosError = Object.assign(new Error('Not Found'), {
      __isAxiosError: true,
      response: { status: 404 },
    });
    mockPokeApiGet.mockRejectedValue(axiosError);

    const res = await request(app).post('/me/teams').send(VALID_BODY);

    expect(res.status).toBe(422);
    expect(res.body.error).toContain('PokeAPI');
  });

  it('returns 500 on unexpected database error', async () => {
    mockPokeApiGet.mockResolvedValue({ data: { id: 25 } });
    (mockPrisma.$transaction as jest.Mock).mockRejectedValue(new Error('DB error'));

    const res = await request(app).post('/me/teams').send(VALID_BODY);

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to save team.');
  });
});

// ── DELETE /me/teams/:teamId ─────────────────────────────────────────────────

describe('DELETE /me/teams/:teamId', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 204 when team is successfully deleted', async () => {
    (mockPrisma.team.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

    const res = await request(app).delete('/me/teams/team-1');

    expect(res.status).toBe(204);
    expect(mockPrisma.team.deleteMany).toHaveBeenCalledWith({
      where: { id: 'team-1', userId: 'user-1' },
    });
  });

  it('returns 404 when team does not exist or belongs to another user', async () => {
    (mockPrisma.team.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });

    const res = await request(app).delete('/me/teams/team-other');

    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });
});
