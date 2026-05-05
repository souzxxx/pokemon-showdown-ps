import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { prisma } from './db';
import { requireAuth } from './middleware/auth';
import { currentUser } from './middleware/currentUser';

export const pokeApi = axios.create({ baseURL: 'https://pokeapi.co/api/v2', timeout: 15000 });

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/me', requireAuth, currentUser, (req, res) => {
  return res.json(req.currentUser);
});

app.get('/me/teams', requireAuth, currentUser, async (req, res) => {
  const current = req.currentUser;
  if (!current) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  const teams = await prisma.team.findMany({
    where: { userId: current.id },
    include: {
      members: {
        include: { trainerPokemon: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const result = await Promise.all(
    teams.map(async team => {
      const members = await Promise.all(
        team.members
          .sort((a, b) => a.slot - b.slot)
          .map(async member => {
            const { data } = await pokeApi.get<{ name: string }>(`/pokemon/${member.trainerPokemon.pokeapiId}`);
            return data.name;
          }),
      );

      return {
        id: team.id,
        name: team.name,
        members,
      };
    }),
  );

  return res.json({ teams: result });
});

app.post('/me/teams', requireAuth, currentUser, async (req, res) => {
  const current = req.currentUser;
  if (!current) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  const { name, pokemonNames } = req.body as { name?: unknown; pokemonNames?: unknown };
  const teamName = typeof name === 'string' && name.trim().length > 0
    ? name.trim()
    : `team-${Date.now()}`;

  if (!Array.isArray(pokemonNames) || pokemonNames.length !== 6 || !pokemonNames.every(p => typeof p === 'string' && p.trim().length > 0)) {
    return res.status(422).json({ error: 'pokemonNames must be an array of exactly 6 Pokémon names.' });
  }

  try {
    const teamMembers = await Promise.all(
      pokemonNames.map(async (pokemonName, index) => {
        const normalizedName = pokemonName.trim().toLowerCase();
        const { data } = await pokeApi.get<{ id: number }>(`/pokemon/${normalizedName}`);

        return {
          slot: index + 1,
          pokeapiId: data.id,
          nickname: null as string | null,
          level: 50,
        };
      }),
    );

    const team = await prisma.$transaction(async tx => {
      const createdTeam = await tx.team.create({
        data: {
          userId: current.id,
          name: teamName,
        },
      });

      for (const member of teamMembers) {
        const trainerPokemon = await tx.trainerPokemon.create({
          data: {
            userId: current.id,
            pokeapiId: member.pokeapiId,
            nickname: member.nickname,
            level: member.level,
          },
        });

        await tx.teamMember.create({
          data: {
            teamId: createdTeam.id,
            slot: member.slot,
            trainerPokemonId: trainerPokemon.id,
          },
        });
      }

      return createdTeam;
    });

    return res.status(201).json({ team });
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return res.status(422).json({ error: 'One or more Pokémon names were not found in PokeAPI.' });
    }

    return res.status(500).json({ error: 'Failed to save team.' });
  }
});

app.delete('/me/teams/:teamId', requireAuth, currentUser, async (req, res) => {
  const current = req.currentUser;
  if (!current) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  const teamId = req.params.teamId;
  if (!teamId) {
    return res.status(400).json({ error: 'Team ID is required.' });
  }

  const deleted = await prisma.team.deleteMany({
    where: { id: teamId, userId: current.id },
  });

  if (deleted.count === 0) {
    return res.status(404).json({ error: 'Time não encontrado ou sem permissão para excluir.' });
  }

  return res.status(204).send();
});

export default app;
