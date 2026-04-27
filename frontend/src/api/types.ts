import apiClient from './client';
import type { TypeData } from '../types/pokemon';

export async function getTypeData(name: string) {
  const { data } = await apiClient.get<TypeData>(`/type/${name}`);
  return data;
}
