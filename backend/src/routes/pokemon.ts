import { Router, Request, Response } from 'express';
import { getPokemonPreview } from '../pokemon/service';

export const pokemonRouter = Router();

/**
 * GET /api/pokemon/:name
 * Retorna informações básicas de um Pokémon para uso no team builder.
 * Não inclui moves (use /api/battle/start para isso).
 *
 * Exemplo: GET /api/pokemon/charizard
 */
pokemonRouter.get('/:name', async (req: Request, res: Response) => {
  const name = req.params.name.toLowerCase().trim();

  if (!name) return res.status(400).json({ error: 'Nome do Pokémon é obrigatório.' });

  try {
    const preview = await getPokemonPreview(name);
    return res.json(preview);
  } catch (err: any) {
    if (err?.response?.status === 404) {
      return res.status(404).json({ error: `Pokémon "${name}" não encontrado.` });
    }
    console.error('Erro ao buscar Pokémon:', err);
    return res.status(500).json({ error: 'Erro ao buscar dados da PokeAPI.' });
  }
});
