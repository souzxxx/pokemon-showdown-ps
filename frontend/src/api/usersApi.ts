import axios from 'axios';
import { auth0Config } from '../auth/config';

type TrainerMe = {
  id: string;
  auth0Sub: string;
  email?: string;
  username: string;
};

type SavedTeamResponse = {
  team: {
    id: string;
    name: string;
  };
};

const usersApi = axios.create({
  baseURL: auth0Config.usersApiBaseUrl || 'http://127.0.0.1:8001',
  timeout: 15000,
});

export async function getMe(token: string): Promise<TrainerMe> {
  const { data } = await usersApi.get<TrainerMe>('/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return data;
}

export async function saveTeam(token: string, pokemonNames: string[]): Promise<SavedTeamResponse['team']> {
  const { data } = await usersApi.post<SavedTeamResponse>('/me/teams', {
    pokemonNames,
  }, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return data.team;
}
