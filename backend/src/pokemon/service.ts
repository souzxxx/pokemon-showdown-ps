import axios from 'axios';
import type { BattlePokemon, BattleMove, PokemonPreview } from '../types';

const pokeApi = axios.create({ baseURL: 'https://pokeapi.co/api/v2', timeout: 15000 });

const LEVEL = 50;

// Cache to avoid re-fetching the same Pokémon across battles
const cache = new Map<string, BattlePokemon>();

function calcHp(base: number): number {
  return Math.floor((2 * base * LEVEL) / 100) + LEVEL + 10;
}

function calcStat(base: number): number {
  return Math.floor((2 * base * LEVEL) / 100) + 5;
}

interface PokeApiPokemon {
  name: string;
  stats: { base_stat: number; stat: { name: string } }[];
  types: { type: { name: string } }[];
  moves: {
    move: { name: string };
    version_group_details: { move_learn_method: { name: string }; level_learned_at: number }[];
  }[];
  sprites: {
    front_default: string;
    other: { 'official-artwork': { front_default: string } };
  };
}

interface PokeApiMove {
  name: string;
  power: number | null;
  accuracy: number | null;
  pp: number;
  type: { name: string };
  damage_class: { name: string };
}

/** Full load: stats + top 4 damaging moves. Result is cached. */
export async function loadBattlePokemon(nameOrId: string | number): Promise<BattlePokemon> {
  const key = String(nameOrId).toLowerCase();
  const cached = cache.get(key);
  if (cached) {
    // Return a fresh copy at full HP; moves are read-only so shared ref is safe
    return { ...cached, currentHp: cached.maxHp };
  }

  const { data } = await pokeApi.get<PokeApiPokemon>(`/pokemon/${key}`);
  const moves = await fetchMoves(data);
  const stat = (name: string) => data.stats.find(s => s.stat.name === name)?.base_stat ?? 0;
  const hp = calcHp(stat('hp'));

  const pokemon: BattlePokemon = {
    name: data.name,
    displayName: data.name.charAt(0).toUpperCase() + data.name.slice(1),
    types: data.types.map(t => t.type.name),
    maxHp: hp,
    currentHp: hp,
    attack: calcStat(stat('attack')),
    defense: calcStat(stat('defense')),
    spAtk: calcStat(stat('special-attack')),
    spDef: calcStat(stat('special-defense')),
    speed: calcStat(stat('speed')),
    spriteUrl: data.sprites.other['official-artwork'].front_default ?? data.sprites.front_default,
    moves,
  };

  cache.set(key, pokemon);
  return { ...pokemon, currentHp: pokemon.maxHp };
}

/** Light load: only stats and sprite, no move fetching. For team building previews. */
export async function getPokemonPreview(nameOrId: string | number): Promise<PokemonPreview> {
  const key = String(nameOrId).toLowerCase();

  // Reuse cached data if available
  const cached = cache.get(key);
  if (cached) {
    return {
      name: cached.name,
      displayName: cached.displayName,
      types: cached.types,
      spriteUrl: cached.spriteUrl,
      stats: {
        hp: cached.maxHp,
        attack: cached.attack,
        defense: cached.defense,
        spAtk: cached.spAtk,
        spDef: cached.spDef,
        speed: cached.speed,
      },
    };
  }

  const { data } = await pokeApi.get<PokeApiPokemon>(`/pokemon/${key}`);
  const stat = (name: string) => data.stats.find(s => s.stat.name === name)?.base_stat ?? 0;

  return {
    name: data.name,
    displayName: data.name.charAt(0).toUpperCase() + data.name.slice(1),
    types: data.types.map(t => t.type.name),
    spriteUrl: data.sprites.other['official-artwork'].front_default ?? data.sprites.front_default,
    stats: {
      hp: calcHp(stat('hp')),
      attack: calcStat(stat('attack')),
      defense: calcStat(stat('defense')),
      spAtk: calcStat(stat('special-attack')),
      spDef: calcStat(stat('special-defense')),
      speed: calcStat(stat('speed')),
    },
  };
}

async function fetchMoves(pokemon: PokeApiPokemon): Promise<BattleMove[]> {
  const levelUpNames = pokemon.moves
    .filter(m => m.version_group_details.some(
      v => v.move_learn_method.name === 'level-up' && v.level_learned_at > 0
    ))
    .map(m => ({
      name: m.move.name,
      level: Math.max(0, ...m.version_group_details
        .filter(v => v.move_learn_method.name === 'level-up')
        .map(v => v.level_learned_at)),
    }))
    .sort((a, b) => b.level - a.level)
    .slice(0, 25)
    .map(m => m.name);

  const fetched = await Promise.all(
    levelUpNames.map(n =>
      pokeApi.get<PokeApiMove>(`/move/${n}`).then(r => r.data).catch(() => null)
    )
  );

  const damaging = fetched.filter((d): d is PokeApiMove => d !== null && (d.power ?? 0) > 0);

  if (damaging.length < 4) {
    const fallbackNames = pokemon.moves
      .filter(m => !levelUpNames.includes(m.move.name))
      .slice(0, 15)
      .map(m => m.move.name);

    const fallback = await Promise.all(
      fallbackNames.map(n =>
        pokeApi.get<PokeApiMove>(`/move/${n}`).then(r => r.data).catch(() => null)
      )
    );
    damaging.push(...fallback.filter((d): d is PokeApiMove => d !== null && (d.power ?? 0) > 0));
  }

  return damaging.slice(0, 4).map(m => ({
    name: m.name,
    displayName: m.name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    power: m.power ?? 0,
    type: m.type.name,
    damageClass: m.damage_class.name as 'physical' | 'special' | 'status',
    pp: m.pp,
    maxPp: m.pp,
    accuracy: m.accuracy ?? 100,
  }));
}
