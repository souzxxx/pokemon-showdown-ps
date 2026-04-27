import type { BattlePokemon, BattleMove } from '../types';
import { getTypeEffectiveness } from './typeChart';

const LEVEL = 50;

export function calcDamage(
  attacker: BattlePokemon,
  move: BattleMove,
  defender: BattlePokemon,
): { damage: number; critical: boolean; missed: boolean; effectiveness: number } {
  if (move.power === 0) {
    return { damage: 0, critical: false, missed: false, effectiveness: 1 };
  }

  if (Math.random() * 100 > move.accuracy) {
    return { damage: 0, critical: false, missed: true, effectiveness: 1 };
  }

  const effectiveness = getTypeEffectiveness(move.type, defender.types);

  if (effectiveness === 0) {
    return { damage: 0, critical: false, missed: false, effectiveness: 0 };
  }

  const critical = Math.random() < 1 / 16;
  const stab = attacker.types.includes(move.type) ? 1.5 : 1;
  const atk = move.damageClass === 'special' ? attacker.spAtk : attacker.attack;
  const def = move.damageClass === 'special' ? defender.spDef : defender.defense;
  const base = Math.floor(((2 * LEVEL / 5 + 2) * move.power * atk) / (def * 50) + 2);
  const rand = (Math.floor(Math.random() * 16) + 85) / 100;
  const damage = Math.max(1, Math.floor(base * stab * effectiveness * (critical ? 1.5 : 1) * rand));

  return { damage, critical, missed: false, effectiveness };
}
