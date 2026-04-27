import apiClient from './client';
import type { PokemonDetail, PokemonListResponse, PokemonSpecies, EvolutionChain, MoveDetail } from '../types/pokemon';

export async function getPokemonList(offset: number, limit: number) {
  const { data } = await apiClient.get<PokemonListResponse>('/pokemon', {
    params: { offset, limit },
  });
  return data;
}

export async function getPokemonDetail(idOrName: number | string) {
  const { data } = await apiClient.get<PokemonDetail>(`/pokemon/${idOrName}`);
  return data;
}

export async function getPokemonPage(offset: number, limit: number) {
  const list = await getPokemonList(offset, limit);
  const details = await Promise.all(
    list.results.map(p => getPokemonDetail(p.name))
  );
  return {
    pokemon: details,
    next: list.next,
    total: list.count,
  };
}

export async function getPokemonSpecies(id: number) {
  const { data } = await apiClient.get<PokemonSpecies>(`/pokemon-species/${id}`);
  return data;
}

export async function getEvolutionChain(url: string) {
  const { data } = await apiClient.get<EvolutionChain>(url);
  return data;
}

export async function getMoveDetail(nameOrId: string | number) {
  const { data } = await apiClient.get<MoveDetail>(`/move/${nameOrId}`);
  return data;
}
