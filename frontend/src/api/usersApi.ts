import axios from 'axios';
import { auth0Config } from '../auth/config';

type TrainerMe = {
  id: string;
  auth0Sub: string;
  email?: string;
  username: string;
};

type SavedTeam = {
  id: string;
  name: string;
  members: string[];
};

type SavedTeamResponse = {
  team: {
    id: string;
    name: string;
  };
};

type SavedTeamsResponse = {
  teams: SavedTeam[];
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

export async function getSavedTeams(token: string): Promise<SavedTeam[]> {
  const { data } = await usersApi.get<SavedTeamsResponse>('/me/teams', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return data.teams;
}

export async function saveTeam(token: string, pokemonNames: string[], name?: string): Promise<SavedTeamResponse['team']> {
  const { data } = await usersApi.post<SavedTeamResponse>('/me/teams', {
    pokemonNames,
    name,
  }, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return data.team;
}

export async function deleteTeam(token: string, teamId: string): Promise<void> {
  await usersApi.delete(`/me/teams/${teamId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
