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
  name: string;
  displayName: string;
  types: string[];
  maxHp: number;
  currentHp: number;
  attack: number;
  defense: number;
  spAtk: number;
  spDef: number;
  speed: number;
  spriteUrl: string;
  moves: BattleMove[];
}

export interface BattleSession {
  id: string;
  playerTeam: BattlePokemon[];
  opponentTeam: BattlePokemon[];
  playerActiveIndex: number;
  opponentActiveIndex: number;
  /** 'switching' = player's active fainted, must choose replacement */
  phase: 'choosing' | 'switching' | 'ended';
  winner: 'player' | 'opponent' | null;
  turn: number;
  createdAt: number;
}

// Lighter shape used for team building previews (no moves)
export interface PokemonPreview {
  name: string;
  displayName: string;
  types: string[];
  spriteUrl: string;
  stats: {
    hp: number;
    attack: number;
    defense: number;
    spAtk: number;
    spDef: number;
    speed: number;
  };
}
