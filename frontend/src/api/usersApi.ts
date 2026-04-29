import axios from 'axios';
import { auth0Config } from '../auth/config';

type TrainerMe = {
  id: string;
  auth0Sub: string;
  email?: string;
  username: string;
};

const usersApi = axios.create({
  baseURL: auth0Config.usersApiBaseUrl,
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
