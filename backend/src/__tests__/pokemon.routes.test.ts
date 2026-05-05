import request from 'supertest';
import express from 'express';
import { pokemonRouter } from '../routes/pokemon';
import { getPokemonPreview } from '../pokemon/service';
import type { PokemonPreview } from '../types';

jest.mock('../pokemon/service');
jest.mock('../cache/redis', () => ({
  connectRedis: jest.fn().mockResolvedValue(undefined),
  cacheGet: jest.fn().mockResolvedValue(null),
  cacheSet: jest.fn().mockResolvedValue(undefined),
}));

const app = express();
app.use(express.json());
app.use('/api/pokemon', pokemonRouter);

const mockGetPreview = getPokemonPreview as jest.MockedFunction<typeof getPokemonPreview>;

const fakePreview: PokemonPreview = {
  name: 'charizard',
  displayName: 'Charizard',
  types: ['fire', 'flying'],
  spriteUrl: 'https://example.com/charizard.png',
  stats: { hp: 150, attack: 84, defense: 78, spAtk: 109, spDef: 85, speed: 100 },
};

describe('GET /api/pokemon/:name', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 200 with pokemon preview for a valid name', async () => {
    mockGetPreview.mockResolvedValue(fakePreview);

    const res = await request(app).get('/api/pokemon/charizard');

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('charizard');
    expect(res.body.displayName).toBe('Charizard');
    expect(res.body.types).toEqual(['fire', 'flying']);
    expect(res.body.stats).toBeDefined();
    expect(mockGetPreview).toHaveBeenCalledWith('charizard');
  });

  it('normalizes name to lowercase before calling service', async () => {
    mockGetPreview.mockResolvedValue(fakePreview);

    await request(app).get('/api/pokemon/CHARIZARD');

    expect(mockGetPreview).toHaveBeenCalledWith('charizard');
  });

  it('returns 404 when pokemon is not found in PokeAPI', async () => {
    mockGetPreview.mockRejectedValue({ response: { status: 404 } });

    const res = await request(app).get('/api/pokemon/notapokemon');

    expect(res.status).toBe(404);
    expect(res.body.error).toContain('notapokemon');
  });

  it('returns 500 on unexpected service error', async () => {
    mockGetPreview.mockRejectedValue(new Error('Network error'));

    const res = await request(app).get('/api/pokemon/charizard');

    expect(res.status).toBe(500);
    expect(res.body.error).toBeDefined();
  });
});
