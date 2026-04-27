import type { PokemonDetail, MoveDetail } from '../types/pokemon';

export interface BattleMove {
  name: string;
  displayName: string;
  power: number;
  type: string;
  damageClass: 'physical' | 'special' | 'status';
  pp: number;
  maxPp: number;
  accuracy: number;
}

export interface BattlePokemon {
  id: number;
  name: string;
  displayName: string;
  types: string[];
  maxHp: number;
  attack: number;
  defense: number;
  spAtk: number;
  spDef: number;
  speed: number;
  spriteUrl: string;
  moves: BattleMove[];
}

const LEVEL = 50;

function calcHp(base: number): number {
  return Math.floor((2 * base * LEVEL) / 100) + LEVEL + 10;
}

function calcStat(base: number): number {
  return Math.floor((2 * base * LEVEL) / 100) + 5;
}

export function buildBattlePokemon(detail: PokemonDetail, moves: MoveDetail[]): BattlePokemon {
  const stat = (name: string) => detail.stats.find(s => s.stat.name === name)?.base_stat ?? 0;

  return {
    id: detail.id,
    name: detail.name,
    displayName: detail.name.charAt(0).toUpperCase() + detail.name.slice(1),
    types: detail.types.map(t => t.type.name),
    maxHp: calcHp(stat('hp')),
    attack: calcStat(stat('attack')),
    defense: calcStat(stat('defense')),
    spAtk: calcStat(stat('special-attack')),
    spDef: calcStat(stat('special-defense')),
    speed: calcStat(stat('speed')),
    spriteUrl: detail.sprites.other['official-artwork'].front_default ?? detail.sprites.front_default,
    moves: moves.slice(0, 4).map(m => ({
      name: m.name,
      displayName: m.name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      power: m.power ?? 0,
      type: m.type.name,
      damageClass: m.damage_class.name as 'physical' | 'special' | 'status',
      pp: m.pp,
      maxPp: m.pp,
      accuracy: m.accuracy ?? 100,
    })),
  };
}

export function calcDamage(
  attacker: BattlePokemon,
  move: BattleMove,
  defender: BattlePokemon,
  effectiveness: number,
): { damage: number; critical: boolean; missed: boolean } {
  if (move.power === 0) return { damage: 0, critical: false, missed: false };

  if (Math.random() * 100 > move.accuracy) {
    return { damage: 0, critical: false, missed: true };
  }

  const critical = Math.random() < 1 / 16;
  const stab = attacker.types.includes(move.type) ? 1.5 : 1;
  const atk = move.damageClass === 'special' ? attacker.spAtk : attacker.attack;
  const def = move.damageClass === 'special' ? defender.spDef : defender.defense;
  const base = Math.floor(((2 * LEVEL / 5 + 2) * move.power * atk) / (def * 50) + 2);
  const rand = (Math.floor(Math.random() * 16) + 85) / 100;
  const damage = Math.max(1, Math.floor(base * stab * effectiveness * (critical ? 1.5 : 1) * rand));

  return { damage, critical, missed: false };
}
