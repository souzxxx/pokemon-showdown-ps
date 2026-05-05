import request from 'supertest';
import express from 'express';
import { battleRouter } from '../routes/battle';
import { loadBattlePokemon } from '../pokemon/service';
import type { BattlePokemon } from '../types';

jest.mock('../pokemon/service');
jest.mock('../cache/redis', () => ({
  connectRedis: jest.fn().mockResolvedValue(undefined),
  cacheGet: jest.fn().mockResolvedValue(null),
  cacheSet: jest.fn().mockResolvedValue(undefined),
}));

const app = express();
app.use(express.json());
app.use('/api/battle', battleRouter);

const mockLoad = loadBattlePokemon as jest.MockedFunction<typeof loadBattlePokemon>;

const MOVES = [
  { name: 'tackle', displayName: 'Tackle', power: 40, type: 'normal', damageClass: 'physical' as const, pp: 35, maxPp: 35, accuracy: 100 },
  { name: 'growl', displayName: 'Growl', power: 40, type: 'normal', damageClass: 'physical' as const, pp: 40, maxPp: 40, accuracy: 100 },
  { name: 'scratch', displayName: 'Scratch', power: 40, type: 'normal', damageClass: 'physical' as const, pp: 35, maxPp: 35, accuracy: 100 },
  { name: 'pound', displayName: 'Pound', power: 40, type: 'normal', damageClass: 'physical' as const, pp: 35, maxPp: 35, accuracy: 100 },
];

function makePokemon(overrides: Partial<BattlePokemon> = {}): BattlePokemon {
  return {
    name: 'pikachu',
    displayName: 'Pikachu',
    types: ['electric'],
    maxHp: 200,
    currentHp: 200,
    attack: 55,
    defense: 40,
    spAtk: 50,
    spDef: 50,
    speed: 90,
    spriteUrl: 'https://example.com/pikachu.png',
    moves: MOVES,
    ...overrides,
  };
}

const VALID_TEAM = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];

async function startBattle(): Promise<string> {
  mockLoad.mockResolvedValue(makePokemon());
  const res = await request(app)
    .post('/api/battle/start')
    .send({ playerTeam: VALID_TEAM });
  return res.body.battleId as string;
}

async function cleanupBattle(battleId: string) {
  await request(app).delete(`/api/battle/${battleId}`);
}

// ── POST /api/battle/start ──────────────────────────────────────────────────

describe('POST /api/battle/start', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 201 and creates a session with valid 6-pokemon team', async () => {
    mockLoad.mockResolvedValue(makePokemon());

    const res = await request(app)
      .post('/api/battle/start')
      .send({ playerTeam: VALID_TEAM });

    expect(res.status).toBe(201);
    expect(res.body.battleId).toBeDefined();
    expect(res.body.playerTeam).toHaveLength(6);
    expect(res.body.opponentTeam).toHaveLength(6);
    expect(res.body.phase).toBe('choosing');
    expect(res.body.messages).toContain('Uma batalha começou!');

    await cleanupBattle(res.body.battleId);
  });

  it('returns 400 when playerTeam is missing', async () => {
    const res = await request(app).post('/api/battle/start').send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 400 when playerTeam has fewer than 6 names', async () => {
    const res = await request(app)
      .post('/api/battle/start')
      .send({ playerTeam: ['pikachu', 'charizard'] });

    expect(res.status).toBe(400);
  });

  it('returns 400 when playerTeam has more than 6 names', async () => {
    const res = await request(app)
      .post('/api/battle/start')
      .send({ playerTeam: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] });

    expect(res.status).toBe(400);
  });

  it('returns 400 when playerTeam contains empty strings', async () => {
    const res = await request(app)
      .post('/api/battle/start')
      .send({ playerTeam: ['pikachu', '', 'bulbasaur', 'squirtle', 'gengar', 'snorlax'] });

    expect(res.status).toBe(400);
  });

  it('returns 400 when playerTeam is not an array', async () => {
    const res = await request(app)
      .post('/api/battle/start')
      .send({ playerTeam: 'pikachu' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when a pokemon name is not found in PokeAPI', async () => {
    const axiosError = Object.assign(new Error('Not found'), {
      response: { status: 404 },
      config: { url: 'https://pokeapi.co/api/v2/pokemon/fakemon' },
    });
    mockLoad.mockRejectedValue(axiosError);

    const res = await request(app)
      .post('/api/battle/start')
      .send({ playerTeam: VALID_TEAM });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('fakemon');
  });

  it('returns 500 on unexpected error', async () => {
    mockLoad.mockRejectedValue(new Error('Unexpected'));

    const res = await request(app)
      .post('/api/battle/start')
      .send({ playerTeam: VALID_TEAM });

    expect(res.status).toBe(500);
  });
});

// ── GET /api/battle/:id ─────────────────────────────────────────────────────

describe('GET /api/battle/:id', () => {
  let battleId: string;

  beforeEach(async () => {
    jest.clearAllMocks();
    battleId = await startBattle();
  });

  afterEach(async () => {
    await cleanupBattle(battleId);
  });

  it('returns 200 with full session state for a valid battle id', async () => {
    const res = await request(app).get(`/api/battle/${battleId}`);

    expect(res.status).toBe(200);
    expect(res.body.battleId).toBe(battleId);
    expect(res.body.playerTeam).toHaveLength(6);
    expect(res.body.opponentTeam).toHaveLength(6);
    expect(res.body.phase).toBe('choosing');
    expect(res.body.turn).toBe(0);
    expect(res.body.winner).toBeNull();
  });

  it('returns 404 for a non-existent battle id', async () => {
    const res = await request(app).get('/api/battle/non-existent-id');

    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });
});

// ── DELETE /api/battle/:id ──────────────────────────────────────────────────

describe('DELETE /api/battle/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 204 and removes the session', async () => {
    const battleId = await startBattle();

    const delRes = await request(app).delete(`/api/battle/${battleId}`);
    expect(delRes.status).toBe(204);

    const getRes = await request(app).get(`/api/battle/${battleId}`);
    expect(getRes.status).toBe(404);
  });

  it('returns 404 for a non-existent battle id', async () => {
    const res = await request(app).delete('/api/battle/non-existent-id');

    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });
});

// ── POST /api/battle/:id/turn ───────────────────────────────────────────────

describe('POST /api/battle/:id/turn', () => {
  let battleId: string;

  beforeEach(async () => {
    jest.clearAllMocks();
    battleId = await startBattle();
  });

  afterEach(async () => {
    await cleanupBattle(battleId);
  });

  it('returns 404 for a non-existent battle id', async () => {
    const res = await request(app)
      .post('/api/battle/non-existent-id/turn')
      .send({ action: 'move', moveIndex: 0 });

    expect(res.status).toBe(404);
  });

  it('returns 400 for unknown action', async () => {
    const res = await request(app)
      .post(`/api/battle/${battleId}/turn`)
      .send({ action: 'run' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('action');
  });

  describe('action: move', () => {
    it('returns 200 and advances the turn on valid moveIndex', async () => {
      const res = await request(app)
        .post(`/api/battle/${battleId}/turn`)
        .send({ action: 'move', moveIndex: 0 });

      expect(res.status).toBe(200);
      expect(res.body.messages).toBeDefined();
      expect(Array.isArray(res.body.messages)).toBe(true);
      expect(res.body.turn).toBe(1);
    });

    it('returns 400 for invalid moveIndex (negative)', async () => {
      const res = await request(app)
        .post(`/api/battle/${battleId}/turn`)
        .send({ action: 'move', moveIndex: -1 });

      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid moveIndex (out of range)', async () => {
      const res = await request(app)
        .post(`/api/battle/${battleId}/turn`)
        .send({ action: 'move', moveIndex: 10 });

      expect(res.status).toBe(400);
    });

    it('returns 400 for moveIndex that is not a number', async () => {
      const res = await request(app)
        .post(`/api/battle/${battleId}/turn`)
        .send({ action: 'move', moveIndex: 'first' });

      expect(res.status).toBe(400);
    });
  });

  describe('action: switch', () => {
    it('returns 200 and switches pokemon on valid switchTo', async () => {
      const res = await request(app)
        .post(`/api/battle/${battleId}/turn`)
        .send({ action: 'switch', switchTo: 1 });

      expect(res.status).toBe(200);
      expect(res.body.playerActiveIndex).toBe(1);
    });

    it('returns 400 when switching to the currently active pokemon', async () => {
      const res = await request(app)
        .post(`/api/battle/${battleId}/turn`)
        .send({ action: 'switch', switchTo: 0 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('já está em campo');
    });

    it('returns 400 for invalid switchTo (out of range)', async () => {
      const res = await request(app)
        .post(`/api/battle/${battleId}/turn`)
        .send({ action: 'switch', switchTo: 10 });

      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid switchTo (negative)', async () => {
      const res = await request(app)
        .post(`/api/battle/${battleId}/turn`)
        .send({ action: 'switch', switchTo: -1 });

      expect(res.status).toBe(400);
    });

    it('returns 400 when switching to a fainted pokemon', async () => {
      // Slot 1 (2nd player pokemon) is fainted; all others are healthy
      let callNum = 0;
      mockLoad.mockImplementation(async () => {
        callNum++;
        return callNum === 2 ? makePokemon({ currentHp: 0, maxHp: 200 }) : makePokemon();
      });

      const startRes = await request(app)
        .post('/api/battle/start')
        .send({ playerTeam: VALID_TEAM });
      const id = startRes.body.battleId as string;

      const res = await request(app)
        .post(`/api/battle/${id}/turn`)
        .send({ action: 'switch', switchTo: 1 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('desmaiado');

      await cleanupBattle(id);
    });
  });

  describe('ended battle', () => {
    it('returns 400 when trying to take a turn after battle ended', async () => {
      // End the battle by killing all opponent pokemon in one shot
      const strongPlayer = makePokemon({ speed: 999, attack: 9999, spAtk: 9999 });
      const weakOpponent = makePokemon({ maxHp: 1, currentHp: 1, speed: 1, defense: 1, spDef: 1 });

      // Alternate: player gets strongPlayer, AI gets weakOpponent
      let callCount = 0;
      mockLoad.mockImplementation(async () => {
        callCount++;
        // First 6 calls are player team, next 6 are AI team
        return callCount <= 6 ? { ...strongPlayer } : { ...weakOpponent };
      });

      const startRes = await request(app)
        .post('/api/battle/start')
        .send({ playerTeam: VALID_TEAM });
      const id = startRes.body.battleId as string;

      // Repeatedly use move 0 until battle ends
      let phase = 'choosing';
      let attempts = 0;
      while (phase !== 'ended' && attempts < 30) {
        const turnRes = await request(app)
          .post(`/api/battle/${id}/turn`)
          .send({ action: 'move', moveIndex: 0 });
        phase = turnRes.body.phase;
        attempts++;
        if (turnRes.body.phase === 'switching') {
          // Find a living pokemon
          const team: { fainted: boolean }[] = turnRes.body.playerTeam;
          const nextAlive = team.findIndex((p, i) => i !== turnRes.body.playerActiveIndex && !p.fainted);
          if (nextAlive >= 0) {
            await request(app)
              .post(`/api/battle/${id}/turn`)
              .send({ action: 'switch', switchTo: nextAlive });
          }
        }
      }

      if (phase === 'ended') {
        const res = await request(app)
          .post(`/api/battle/${id}/turn`)
          .send({ action: 'move', moveIndex: 0 });
        expect(res.status).toBe(400);
        expect(res.body.error).toContain('terminou');
      }

      await cleanupBattle(id);
    });
  });
});
