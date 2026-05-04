import axios from 'axios';
import type {
  PokemonPreview,
  StartBattleResponse,
  TurnResponse,
} from '../types/battle';

const baseURL = import.meta.env.VITE_GATEWAY_BASE_URL ?? 'http://localhost:3001/api';
const api = axios.create({ baseURL, timeout: 60000 });
const pokeApi = axios.create({ baseURL: 'https://pokeapi.co/api/v2', timeout: 15000 });

type PokemonListResponse = {
  results: Array<{ name: string; url: string }>;
};

let cachedPokemonNames: string[] | null = null;

async function loadAllPokemonNames(): Promise<string[]> {
  if (cachedPokemonNames) {
    return cachedPokemonNames;
  }

  const { data } = await pokeApi.get<PokemonListResponse>('/pokemon', {
    params: { limit: 2000 },
  });

  cachedPokemonNames = data.results.map(result => result.name);
  return cachedPokemonNames;
}

export async function getPokemonSuggestions(prefix: string): Promise<string[]> {
  const trimmed = prefix.toLowerCase().trim();
  if (!trimmed) return [];
  const names = await loadAllPokemonNames();
  return names.filter(name => name.startsWith(trimmed)).slice(0, 12);
}

export async function fetchPokemonPreview(name: string): Promise<PokemonPreview> {
  const { data } = await api.get<PokemonPreview>(`/pokemon/${name.toLowerCase().trim()}`);
  return data;
}

export async function startBattle(playerTeam: string[]): Promise<StartBattleResponse> {
  const { data } = await api.post<StartBattleResponse>('/battle/start', { playerTeam });
  return data;
}

export async function sendMove(battleId: string, moveIndex: number): Promise<TurnResponse> {
  const { data } = await api.post<TurnResponse>(`/battle/${battleId}/turn`, {
    action: 'move',
    moveIndex,
  });
  return data;
}

export async function sendSwitch(battleId: string, switchTo: number): Promise<TurnResponse> {
  const { data } = await api.post<TurnResponse>(`/battle/${battleId}/turn`, {
    action: 'switch',
    switchTo,
  });
  return data;
}

export async function deleteBattle(battleId: string): Promise<void> {
  await api.delete(`/battle/${battleId}`);
}
