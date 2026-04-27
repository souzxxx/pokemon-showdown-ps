export interface PokemonListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: { name: string; url: string }[];
}

export interface PokemonDetail {
  id: number;
  name: string;
  height: number;
  weight: number;
  base_experience: number;
  sprites: {
    front_default: string;
    other: {
      'official-artwork': {
        front_default: string;
      };
      dream_world: {
        front_default: string;
      };
    };
  };
  stats: PokemonStat[];
  types: PokemonTypeSlot[];
  moves: PokemonMoveEntry[];
  abilities: PokemonAbilityEntry[];
}

export interface PokemonStat {
  base_stat: number;
  effort: number;
  stat: {
    name: string;
    url: string;
  };
}

export interface PokemonTypeSlot {
  slot: number;
  type: {
    name: string;
    url: string;
  };
}

export interface PokemonMoveEntry {
  move: {
    name: string;
    url: string;
  };
  version_group_details: {
    level_learned_at: number;
    move_learn_method: {
      name: string;
    };
    version_group: {
      name: string;
    };
  }[];
}

export interface PokemonAbilityEntry {
  ability: {
    name: string;
    url: string;
  };
  is_hidden: boolean;
  slot: number;
}

export interface PokemonSpecies {
  id: number;
  name: string;
  flavor_text_entries: {
    flavor_text: string;
    language: { name: string };
    version: { name: string };
  }[];
  genera: {
    genus: string;
    language: { name: string };
  }[];
  evolution_chain: {
    url: string;
  };
  generation: {
    name: string;
    url: string;
  };
  color: {
    name: string;
  };
}

export interface TypeData {
  id: number;
  name: string;
  damage_relations: {
    double_damage_from: { name: string; url: string }[];
    double_damage_to: { name: string; url: string }[];
    half_damage_from: { name: string; url: string }[];
    half_damage_to: { name: string; url: string }[];
    no_damage_from: { name: string; url: string }[];
    no_damage_to: { name: string; url: string }[];
  };
}

export interface EvolutionChain {
  id: number;
  chain: EvolutionNode;
}

export interface EvolutionNode {
  species: {
    name: string;
    url: string;
  };
  evolution_details: {
    min_level: number | null;
    trigger: { name: string };
    item: { name: string } | null;
  }[];
  evolves_to: EvolutionNode[];
}

export interface EvolutionStep {
  name: string;
  id: number;
  sprite: string;
  minLevel: number | null;
  trigger: string;
  item: string | null;
}

export interface MoveDetail {
  id: number;
  name: string;
  power: number | null;
  accuracy: number | null;
  pp: number;
  type: { name: string };
  damage_class: { name: string };
}
