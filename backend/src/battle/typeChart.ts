const chart: Record<string, Record<string, number>> = {
  normal:   { rock: 0.5, ghost: 0, steel: 0.5 },
  fire:     { fire: 0.5, water: 0.5, rock: 0.5, dragon: 0.5, grass: 2, ice: 2, bug: 2, steel: 2 },
  water:    { fire: 2, water: 0.5, grass: 0.5, dragon: 0.5, ground: 2, rock: 2 },
  electric: { water: 2, electric: 0.5, grass: 0.5, dragon: 0.5, flying: 2, ground: 0 },
  grass:    { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, flying: 0.5, bug: 0.5, dragon: 0.5, steel: 0.5, ground: 2, rock: 2 },
  ice:      { fire: 0.5, water: 0.5, ice: 0.5, steel: 0.5, grass: 2, ground: 2, flying: 2, dragon: 2 },
  fighting: { normal: 2, ice: 2, rock: 2, dark: 2, steel: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, ghost: 0, fairy: 0.5 },
  poison:   { grass: 2, fairy: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0 },
  ground:   { fire: 2, electric: 2, poison: 2, rock: 2, steel: 2, grass: 0.5, flying: 0, bug: 0.5 },
  flying:   { grass: 2, fighting: 2, bug: 2, electric: 0.5, rock: 0.5, steel: 0.5 },
  psychic:  { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug:      { grass: 2, psychic: 2, dark: 2, fire: 0.5, fighting: 0.5, flying: 0.5, ghost: 0.5, steel: 0.5, fairy: 0.5 },
  rock:     { fire: 2, ice: 2, flying: 2, bug: 2, fighting: 0.5, ground: 0.5, steel: 0.5 },
  ghost:    { ghost: 2, psychic: 2, normal: 0, dark: 0.5 },
  dragon:   { dragon: 2, steel: 0.5, fairy: 0 },
  dark:     { ghost: 2, psychic: 2, fighting: 0.5, dark: 0.5, fairy: 0.5 },
  steel:    { ice: 2, rock: 2, fairy: 2, fire: 0.5, water: 0.5, electric: 0.5, steel: 0.5 },
  fairy:    { fighting: 2, dragon: 2, dark: 2, fire: 0.5, poison: 0.5, steel: 0.5 },
};

export function getTypeEffectiveness(moveType: string, defenderTypes: string[]): number {
  return defenderTypes.reduce((mult, defType) => {
    return mult * ((chart[moveType] ?? {})[defType] ?? 1);
  }, 1);
}
