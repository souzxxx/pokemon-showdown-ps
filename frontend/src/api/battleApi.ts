import axios from 'axios';
import type {
  PokemonPreview,
  StartBattleResponse,
  TurnResponse,
} from '../types/battle';

const api = axios.create({ baseURL: 'http://localhost:3001/api', timeout: 60000 });

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
