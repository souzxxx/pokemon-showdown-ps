export interface ApiMove {
  name: string;
  displayName: string;
  power: number;
  type: string;
  damageClass: 'physical' | 'special' | 'status';
  pp: number;
  maxPp: number;
  accuracy: number;
}

export interface ApiPokemon {
  name: string;
  displayName: string;
  types: string[];
  maxHp: number;
  currentHp: number;
  spriteUrl: string;
  speed: number;
  moves: ApiMove[];
}

export interface TeamSlot {
  index: number;
  name: string;
  displayName: string;
  currentHp: number;
  maxHp: number;
  spriteUrl: string;
  fainted: boolean;
}

export type BattlePhase = 'choosing' | 'switching' | 'ended';

export interface StartBattleResponse {
  battleId: string;
  playerTeam: ApiPokemon[];
  opponentTeam: ApiPokemon[];
  playerActiveIndex: number;
  opponentActiveIndex: number;
  messages: string[];
  phase: BattlePhase;
}

export interface TurnResponse {
  playerTeam: TeamSlot[];
  opponentTeam: TeamSlot[];
  playerActiveIndex: number;
  opponentActiveIndex: number;
  messages: string[];
  phase: BattlePhase;
  winner: 'player' | 'opponent' | null;
  turn: number;
}

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
