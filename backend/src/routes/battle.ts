import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { loadBattlePokemon } from '../pokemon/service';
import { calcDamage } from '../battle/engine';
import type { BattleSession, BattlePokemon, BattleMove } from '../types';

export const battleRouter = Router();

// ── In-memory session store ──────────────────────────────────────────────────

const sessions = new Map<string, BattleSession>();

// Clean up sessions older than 2 hours
setInterval(() => {
  const cutoff = Date.now() - 2 * 60 * 60 * 1000;
  for (const [id, s] of sessions) {
    if (s.createdAt < cutoff) sessions.delete(id);
  }
}, 30 * 60 * 1000);

// ── AI Pokémon pool ──────────────────────────────────────────────────────────

const AI_POOL = [
  'charizard', 'blastoise', 'venusaur', 'gengar', 'machamp', 'alakazam',
  'arcanine', 'lapras', 'dragonite', 'snorlax', 'mewtwo', 'tyranitar',
  'salamence', 'metagross', 'garchomp', 'lucario', 'togekiss', 'magnezone',
  'gyarados', 'espeon', 'umbreon', 'gardevoir', 'absol', 'flygon',
  'scizor', 'heracross', 'starmie', 'nidoking', 'rhydon', 'aerodactyl',
];

function pickAiNames(count = 6): string[] {
  const pool = [...AI_POOL];
  const picked: string[] = [];
  while (picked.length < count && pool.length > 0) {
    const i = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(i, 1)[0]);
  }
  return picked;
}

// ── Serialisation helpers ────────────────────────────────────────────────────

function serializePokemon(p: BattlePokemon) {
  return {
    name: p.name,
    displayName: p.displayName,
    types: p.types,
    maxHp: p.maxHp,
    currentHp: p.currentHp,
    spriteUrl: p.spriteUrl,
    speed: p.speed,
    moves: p.moves.map(m => ({
      name: m.name,
      displayName: m.displayName,
      power: m.power,
      type: m.type,
      damageClass: m.damageClass,
      pp: m.pp,
      maxPp: m.maxPp,
      accuracy: m.accuracy,
    })),
  };
}

function teamSummary(team: BattlePokemon[]) {
  return team.map((p, i) => ({
    index: i,
    name: p.name,
    displayName: p.displayName,
    currentHp: p.currentHp,
    maxHp: p.maxHp,
    spriteUrl: p.spriteUrl,
    fainted: p.currentHp === 0,
  }));
}

// ── Battle helpers ────────────────────────────────────────────────────────────

function getNextAliveIndex(team: BattlePokemon[], excludeIndex: number): number {
  for (let i = 0; i < team.length; i++) {
    if (i !== excludeIndex && team[i].currentHp > 0) return i;
  }
  return -1;
}

function allFainted(team: BattlePokemon[]): boolean {
  return team.every(p => p.currentHp === 0);
}

function resolveAttack(
  attacker: BattlePokemon,
  move: BattleMove,
  defender: BattlePokemon,
  messages: string[],
): boolean {
  const { damage, critical, missed, effectiveness } = calcDamage(attacker, move, defender);

  messages.push(`${attacker.displayName} usou ${move.displayName.toUpperCase()}!`);

  if (missed)           { messages.push('O ataque errou!'); return false; }
  if (effectiveness === 0) { messages.push('Não afetou...'); return false; }
  if (critical)         messages.push('Acerto crítico!');
  if (effectiveness >= 2)  messages.push('É super eficaz!');
  else if (effectiveness <= 0.5) messages.push('Não é muito eficaz...');

  defender.currentHp = Math.max(0, defender.currentHp - damage);
  messages.push(`${defender.displayName} recebeu ${damage} de dano!`);

  if (defender.currentHp === 0) {
    messages.push(`${defender.displayName} desmaiou!`);
    return true; // KO
  }
  return false;
}

/** AI auto-switches to next alive Pokémon. Returns false if no Pokémon left. */
function aiAutoSwitch(session: BattleSession, messages: string[]): boolean {
  const next = getNextAliveIndex(session.opponentTeam, session.opponentActiveIndex);
  if (next === -1) return false;
  session.opponentActiveIndex = next;
  messages.push(`Inimigo enviou ${session.opponentTeam[next].displayName}!`);
  return true;
}

function buildTurnResponse(session: BattleSession, messages: string[]) {
  return {
    playerTeam: teamSummary(session.playerTeam),
    opponentTeam: teamSummary(session.opponentTeam),
    playerActiveIndex: session.playerActiveIndex,
    opponentActiveIndex: session.opponentActiveIndex,
    messages,
    phase: session.phase,
    winner: session.winner,
    turn: session.turn,
  };
}

// ── Routes ───────────────────────────────────────────────────────────────────

/**
 * POST /api/battle/start
 * Body: { playerTeam: string[] }  — array com exatamente 6 nomes de Pokémon
 *
 * A IA monta um time aleatório de 6 do pool interno.
 */
battleRouter.post('/start', async (req: Request, res: Response) => {
  const { playerTeam: names } = req.body as { playerTeam?: unknown };

  if (!Array.isArray(names) || names.length !== 6 || names.some(n => typeof n !== 'string' || !n.trim())) {
    return res.status(400).json({
      error: 'playerTeam deve ser um array com exatamente 6 nomes de Pokémon.',
      example: { playerTeam: ['pikachu', 'charizard', 'mewtwo', 'gengar', 'lapras', 'dragonite'] },
    });
  }

  const playerNames = (names as string[]).map(n => n.toLowerCase().trim());
  const aiNames = pickAiNames(6);

  try {
    const [playerTeam, opponentTeam] = await Promise.all([
      Promise.all(playerNames.map(n => loadBattlePokemon(n))),
      Promise.all(aiNames.map(n => loadBattlePokemon(n))),
    ]);

    const session: BattleSession = {
      id: uuid(),
      playerTeam,
      opponentTeam,
      playerActiveIndex: 0,
      opponentActiveIndex: 0,
      phase: 'choosing',
      winner: null,
      turn: 0,
      createdAt: Date.now(),
    };

    sessions.set(session.id, session);

    const firstPlayer = playerTeam[0];
    const firstOpponent = opponentTeam[0];

    return res.status(201).json({
      battleId: session.id,
      playerTeam: playerTeam.map(serializePokemon),
      opponentTeam: opponentTeam.map(serializePokemon),
      playerActiveIndex: 0,
      opponentActiveIndex: 0,
      messages: [
        'Uma batalha começou!',
        `Inimigo enviou ${firstOpponent.displayName}!`,
        `Vai, ${firstPlayer.displayName}!`,
        `O que ${firstPlayer.displayName} vai fazer?`,
      ],
      phase: 'choosing',
    });
  } catch (err: any) {
    const invalidName = err?.config?.url?.split('/').pop();
    if (err?.response?.status === 404 && invalidName) {
      return res.status(400).json({ error: `Pokémon "${invalidName}" não encontrado na PokeAPI.` });
    }
    console.error('Erro ao iniciar batalha:', err);
    return res.status(500).json({ error: 'Falha ao carregar dados da batalha.' });
  }
});

/**
 * POST /api/battle/:id/turn
 *
 * Ação de movimento:
 *   Body: { action: 'move', moveIndex: 0-3 }
 *   Resolve o turno completo (jogador + IA). Ordem por Speed stat.
 *
 * Troca voluntária (jogador decide trocar em vez de atacar):
 *   Body: { action: 'switch', switchTo: 0-5 }
 *   A IA ataca normalmente nesse turno.
 *
 * Troca forçada (Pokémon do jogador desmaiou, phase === 'switching'):
 *   Body: { action: 'switch', switchTo: 0-5 }
 *   Não há ataque da IA nesse sub-turno.
 */
battleRouter.post('/:id/turn', (req: Request, res: Response) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Sessão de batalha não encontrada.' });
  if (session.phase === 'ended') return res.status(400).json({ error: 'A batalha já terminou.' });

  const body = req.body as { action?: unknown; moveIndex?: unknown; switchTo?: unknown };
  const messages: string[] = [];

  // ── Troca ────────────────────────────────────────────────────────────────
  if (body.action === 'switch') {
    const switchTo = body.switchTo;

    if (typeof switchTo !== 'number' || switchTo < 0 || switchTo >= session.playerTeam.length) {
      return res.status(400).json({ error: 'switchTo inválido.' });
    }
    if (switchTo === session.playerActiveIndex) {
      return res.status(400).json({ error: 'Esse Pokémon já está em campo.' });
    }
    if (session.playerTeam[switchTo].currentHp === 0) {
      return res.status(400).json({ error: 'Esse Pokémon está desmaiado.' });
    }

    const outgoing = session.playerTeam[session.playerActiveIndex];
    session.playerActiveIndex = switchTo;
    const incoming = session.playerTeam[switchTo];

    if (session.phase === 'switching') {
      // Troca forçada após KO — IA não ataca
      messages.push(`Vai, ${incoming.displayName}!`);
      session.phase = 'choosing';
      session.turn++;
      messages.push(`O que ${incoming.displayName} vai fazer?`);
    } else {
      // Troca voluntária — IA ataca o novo Pokémon
      messages.push(`${outgoing.displayName} volta! Vai, ${incoming.displayName}!`);

      const opponent = session.opponentTeam[session.opponentActiveIndex];
      const aiMove = opponent.moves[Math.floor(Math.random() * opponent.moves.length)];
      const playerKO = resolveAttack(opponent, aiMove, incoming, messages);

      session.turn++;

      if (playerKO) {
        if (allFainted(session.playerTeam)) {
          session.phase = 'ended';
          session.winner = 'opponent';
          messages.push('Inimigo venceu a batalha!');
        } else {
          session.phase = 'switching';
          messages.push('Escolha seu próximo Pokémon!');
        }
      } else {
        messages.push(`O que ${incoming.displayName} vai fazer?`);
      }
    }

    return res.json(buildTurnResponse(session, messages));
  }

  // ── Movimento ────────────────────────────────────────────────────────────
  if (body.action === 'move') {
    if (session.phase === 'switching') {
      return res.status(400).json({ error: 'Seu Pokémon desmaiou. Use action: "switch" para trocar.' });
    }

    const moveIndex = body.moveIndex;
    if (typeof moveIndex !== 'number' || moveIndex < 0 || moveIndex >= session.playerTeam[session.playerActiveIndex].moves.length) {
      return res.status(400).json({ error: 'moveIndex inválido. Deve ser 0-3.' });
    }

    const player = session.playerTeam[session.playerActiveIndex];
    const opponent = session.opponentTeam[session.opponentActiveIndex];
    const playerMove = player.moves[moveIndex];
    const aiMove = opponent.moves[Math.floor(Math.random() * opponent.moves.length)];
    const playerFirst = player.speed >= opponent.speed;

    let battleOver = false;

    if (playerFirst) {
      // Jogador ataca primeiro
      const opponentKO = resolveAttack(player, playerMove, opponent, messages);
      if (opponentKO) {
        if (allFainted(session.opponentTeam)) {
          session.phase = 'ended';
          session.winner = 'player';
          messages.push('Você venceu a batalha!');
          battleOver = true;
        } else {
          aiAutoSwitch(session, messages);
          // IA enviou novo Pokémon — jogador escolhe próxima ação normalmente
        }
      }

      if (!battleOver && !opponentKO) {
        // IA ataca
        const playerKO = resolveAttack(opponent, aiMove, player, messages);
        if (playerKO) {
          if (allFainted(session.playerTeam)) {
            session.phase = 'ended';
            session.winner = 'opponent';
            messages.push('Inimigo venceu a batalha!');
            battleOver = true;
          } else {
            session.phase = 'switching';
            messages.push('Escolha seu próximo Pokémon!');
          }
        }
      }
    } else {
      // IA ataca primeiro
      const playerKO = resolveAttack(opponent, aiMove, player, messages);
      if (playerKO) {
        if (allFainted(session.playerTeam)) {
          session.phase = 'ended';
          session.winner = 'opponent';
          messages.push('Inimigo venceu a batalha!');
          battleOver = true;
        } else {
          session.phase = 'switching';
          messages.push('Escolha seu próximo Pokémon!');
        }
      }

      if (!battleOver && !playerKO) {
        // Jogador ataca
        const opponentKO = resolveAttack(player, playerMove, opponent, messages);
        if (opponentKO) {
          if (allFainted(session.opponentTeam)) {
            session.phase = 'ended';
            session.winner = 'player';
            messages.push('Você venceu a batalha!');
            battleOver = true;
          } else {
            aiAutoSwitch(session, messages);
          }
        }
      }
    }

    session.turn++;

    if (!battleOver && session.phase === 'choosing') {
      const active = session.playerTeam[session.playerActiveIndex];
      messages.push(`O que ${active.displayName} vai fazer?`);
    }

    return res.json(buildTurnResponse(session, messages));
  }

  return res.status(400).json({ error: 'action deve ser "move" ou "switch".' });
});

/**
 * GET /api/battle/:id
 * Estado completo da sessão de batalha.
 */
battleRouter.get('/:id', (req: Request, res: Response) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Sessão não encontrada.' });

  return res.json({
    battleId: session.id,
    playerTeam: session.playerTeam.map(serializePokemon),
    opponentTeam: session.opponentTeam.map(serializePokemon),
    playerActiveIndex: session.playerActiveIndex,
    opponentActiveIndex: session.opponentActiveIndex,
    phase: session.phase,
    winner: session.winner,
    turn: session.turn,
  });
});

/**
 * DELETE /api/battle/:id
 * Encerra e remove a sessão.
 */
battleRouter.delete('/:id', (req: Request, res: Response) => {
  if (!sessions.has(req.params.id)) {
    return res.status(404).json({ error: 'Sessão não encontrada.' });
  }
  sessions.delete(req.params.id);
  return res.status(204).send();
});
