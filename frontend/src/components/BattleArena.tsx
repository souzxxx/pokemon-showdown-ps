import { useState, useEffect, useRef } from 'react';
import { startBattle, sendMove, sendSwitch } from '../api/battleApi';
import type { ApiPokemon, ApiMove, TeamSlot, BattlePhase } from '../types/battle';

const TYPE_COLORS: Record<string, string> = {
  normal: '#A8A878', fire: '#F08030', water: '#6890F0', electric: '#F8D030',
  grass: '#78C850', ice: '#98D8D8', fighting: '#C03028', poison: '#A040A0',
  ground: '#E0C068', flying: '#A890F0', psychic: '#F85888', bug: '#A8B820',
  rock: '#B8A038', ghost: '#705898', dragon: '#7038F8', dark: '#705848',
  steel: '#B8B8D0', fairy: '#EE99AC',
};

// ── Sub-components ──────────────────────────────────────────────────────────

function HpBar({ current, max }: { current: number; max: number }) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  const color = pct > 50 ? '#4ade80' : pct > 25 ? '#facc15' : '#f87171';
  return (
    <div className="hp-bar-track">
      <div className="hp-bar-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function InfoBox({
  pokemon, hp, isPlayer,
}: { pokemon: ApiPokemon; hp: number; isPlayer: boolean }) {
  return (
    <div className={`info-box ${isPlayer ? 'player-info' : 'opponent-info'}`}>
      <div className="info-name-row">
        <span className="poke-name">{pokemon.displayName}</span>
        <span className="poke-level">Lv50</span>
      </div>
      <div className="type-badges">
        {pokemon.types.map(t => (
          <span key={t} className="type-badge" style={{ background: TYPE_COLORS[t] ?? '#888' }}>
            {t.toUpperCase()}
          </span>
        ))}
      </div>
      <div className="hp-row">
        <span className="hp-label">HP</span>
        <div style={{ flex: 1 }}><HpBar current={hp} max={pokemon.maxHp} /></div>
      </div>
      {isPlayer && <div className="hp-numbers">{hp} / {pokemon.maxHp}</div>}
    </div>
  );
}

function TeamBar({
  slots, activeIndex, isPlayer, onSwitch, switchable,
}: {
  slots: TeamSlot[];
  activeIndex: number;
  isPlayer: boolean;
  onSwitch?: (i: number) => void;
  switchable?: boolean;
}) {
  return (
    <div className={`team-bar ${isPlayer ? 'team-bar-player' : 'team-bar-opponent'}`}>
      {slots.map((slot, i) => (
        <button
          key={slot.name}
          className={[
            'team-ball',
            slot.fainted ? 'ball-fainted' : '',
            i === activeIndex ? 'ball-active' : '',
            switchable && !slot.fainted && i !== activeIndex ? 'ball-switchable' : '',
          ].join(' ')}
          title={`${slot.displayName} ${slot.fainted ? '(desmaiado)' : `${slot.currentHp}/${slot.maxHp}`}`}
          onClick={() => switchable && !slot.fainted && i !== activeIndex && onSwitch?.(i)}
          disabled={!switchable || slot.fainted || i === activeIndex}
        >
          <img src={slot.spriteUrl} alt={slot.displayName} className="ball-sprite" />
        </button>
      ))}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

interface Props {
  playerTeamNames: string[];
  onQuit: () => void;
}

export default function BattleArena({ playerTeamNames, onQuit }: Props) {
  const [battleId, setBattleId] = useState<string | null>(null);
  const [playerTeam, setPlayerTeam] = useState<ApiPokemon[]>([]);
  const [opponentTeam, setOpponentTeam] = useState<ApiPokemon[]>([]);
  const [playerSlots, setPlayerSlots] = useState<TeamSlot[]>([]);
  const [opponentSlots, setOpponentSlots] = useState<TeamSlot[]>([]);
  const [playerActiveIndex, setPlayerActiveIndex] = useState(0);
  const [opponentActiveIndex, setOpponentActiveIndex] = useState(0);
  const [playerHps, setPlayerHps] = useState<number[]>([]);
  const [opponentHps, setOpponentHps] = useState<number[]>([]);
  const [messages, setMessages] = useState<string[]>([]);
  const [phase, setPhase] = useState<BattlePhase>('choosing');
  const [winner, setWinner] = useState<'player' | 'opponent' | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState('');
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => { init(); }, []);

  async function init() {
    setBusy(true);
    setLoadError('');
    try {
      const resp = await startBattle(playerTeamNames);
      setBattleId(resp.battleId);
      setPlayerTeam(resp.playerTeam);
      setOpponentTeam(resp.opponentTeam);
      setPlayerActiveIndex(resp.playerActiveIndex);
      setOpponentActiveIndex(resp.opponentActiveIndex);
      setPlayerHps(resp.playerTeam.map(p => p.maxHp));
      setOpponentHps(resp.opponentTeam.map(p => p.maxHp));
      setPlayerSlots(resp.playerTeam.map((p, i) => ({
        index: i, name: p.name, displayName: p.displayName,
        currentHp: p.maxHp, maxHp: p.maxHp, spriteUrl: p.spriteUrl, fainted: false,
      })));
      setOpponentSlots(resp.opponentTeam.map((p, i) => ({
        index: i, name: p.name, displayName: p.displayName,
        currentHp: p.maxHp, maxHp: p.maxHp, spriteUrl: p.spriteUrl, fainted: false,
      })));
      setMessages(resp.messages);
      setPhase(resp.phase);
      setWinner(null);
    } catch (e: any) {
      setLoadError(e?.response?.data?.error ?? 'Erro ao conectar com o servidor de batalha.');
    } finally {
      setBusy(false);
    }
  }

  function applyTurnResponse(resp: { playerTeam: TeamSlot[]; opponentTeam: TeamSlot[]; playerActiveIndex: number; opponentActiveIndex: number; messages: string[]; phase: BattlePhase; winner: 'player' | 'opponent' | null }) {
    setPlayerSlots(resp.playerTeam);
    setOpponentSlots(resp.opponentTeam);
    setPlayerHps(resp.playerTeam.map(s => s.currentHp));
    setOpponentHps(resp.opponentTeam.map(s => s.currentHp));
    setPlayerActiveIndex(resp.playerActiveIndex);
    setOpponentActiveIndex(resp.opponentActiveIndex);
    setMessages(prev => [...prev, ...resp.messages]);
    setPhase(resp.phase);
    setWinner(resp.winner);
  }

  async function handleMove(moveIndex: number) {
    if (!battleId || busy || phase !== 'choosing') return;
    setBusy(true);
    try {
      const resp = await sendMove(battleId, moveIndex);
      applyTurnResponse(resp);
    } catch (e: any) {
      setMessages(prev => [...prev, `Erro: ${e?.response?.data?.error ?? 'falha na requisição'}`]);
    } finally {
      setBusy(false);
    }
  }

  async function handleSwitch(switchTo: number) {
    if (!battleId || busy || (phase !== 'choosing' && phase !== 'switching')) return;
    setBusy(true);
    try {
      const resp = await sendSwitch(battleId, switchTo);
      applyTurnResponse(resp);
    } catch (e: any) {
      setMessages(prev => [...prev, `Erro: ${e?.response?.data?.error ?? 'falha na requisição'}`]);
    } finally {
      setBusy(false);
    }
  }

  // ── Loading / error ─────────────────────────────────────────────────────

  if (!battleId && !loadError) {
    return (
      <div className="battle-loading">
        <div className="pokeball-spinner" />
        <p>Carregando batalha...</p>
        <small>Buscando dados dos 12 Pokémon na PokeAPI...</small>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="battle-loading">
        <p style={{ color: '#f87171' }}>{loadError}</p>
        <button className="restart-btn" onClick={init}>Tentar novamente</button>
        <button className="quit-btn" onClick={onQuit}>Voltar ao inicio</button>
      </div>
    );
  }

  const activePlayer = playerTeam[playerActiveIndex];
  const activeOpponent = opponentTeam[opponentActiveIndex];
  const playerHp = playerHps[playerActiveIndex] ?? 0;
  const opponentHp = opponentHps[opponentActiveIndex] ?? 0;
  const isSwitching = phase === 'switching';
  const canAct = !busy && (phase === 'choosing' || phase === 'switching');

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="battle-screen">
      <header className="battle-header">
        <span className="battle-title">⚡ Pokemon Showdown</span>
        <button className="quit-btn" onClick={onQuit}>✕ Sair</button>
      </header>

      <div className="battle-field">
        {/* Opponent team bar (top-left) */}
        <div className="opponent-team-area">
          <TeamBar slots={opponentSlots} activeIndex={opponentActiveIndex} isPlayer={false} />
        </div>

        {/* Opponent info (top-left) */}
        {activeOpponent && (
          <InfoBox pokemon={activeOpponent} hp={opponentHp} isPlayer={false} />
        )}

        {/* Opponent sprite (top-right) */}
        {activeOpponent && (
          <div className="sprite-area opponent-sprite-area">
            <img src={activeOpponent.spriteUrl} alt={activeOpponent.displayName}
              className="battle-sprite opponent-sprite" />
          </div>
        )}

        {/* Player sprite (bottom-left) */}
        {activePlayer && (
          <div className="sprite-area player-sprite-area">
            <img src={activePlayer.spriteUrl} alt={activePlayer.displayName}
              className="battle-sprite player-sprite" />
          </div>
        )}

        {/* Player info (bottom-right) */}
        {activePlayer && (
          <InfoBox pokemon={activePlayer} hp={playerHp} isPlayer={true} />
        )}

        {/* Player team bar (bottom-right corner) */}
        <div className="player-team-area">
          <TeamBar
            slots={playerSlots}
            activeIndex={playerActiveIndex}
            isPlayer={true}
            switchable={canAct}
            onSwitch={handleSwitch}
          />
        </div>
      </div>

      {/* Action panel */}
      <div className="action-panel">
        {/* Log */}
        <div className="message-box" ref={logRef}>
          {messages.slice(-6).map((msg, i, arr) => (
            <div key={i} className="log-line"
              style={{ opacity: i === arr.length - 1 ? 1 : 0.4 + (i / arr.length) * 0.5 }}>
              {i === arr.length - 1 ? '▶ ' : ''}{msg}
            </div>
          ))}
        </div>

        {/* Switching forced */}
        {isSwitching && (
          <div className="switch-panel">
            <p className="switch-prompt">Escolha seu próximo Pokémon:</p>
            <div className="switch-grid">
              {playerSlots.map((slot, i) => (
                !slot.fainted && i !== playerActiveIndex && (
                  <button key={slot.name} className="switch-btn"
                    onClick={() => handleSwitch(i)} disabled={busy}>
                    <img src={slot.spriteUrl} alt={slot.displayName} className="switch-sprite" />
                    <span className="switch-name">{slot.displayName}</span>
                    <span className="switch-hp">{slot.currentHp}/{slot.maxHp}</span>
                  </button>
                )
              ))}
            </div>
          </div>
        )}

        {/* Normal choosing: moves */}
        {phase === 'choosing' && activePlayer && (
          <div className="move-panel">
            <div className="move-grid">
              {activePlayer.moves.map((move: ApiMove, i: number) => (
                <button key={move.name} className="move-btn"
                  style={{ '--type-color': TYPE_COLORS[move.type] ?? '#888' } as React.CSSProperties}
                  onClick={() => handleMove(i)} disabled={busy}>
                  <span className="move-name">{move.displayName}</span>
                  <div className="move-meta">
                    <span className="move-type-badge" style={{ background: TYPE_COLORS[move.type] ?? '#888' }}>
                      {move.type.toUpperCase()}
                    </span>
                    <span className="move-power">{move.power > 0 ? `PWR ${move.power}` : '—'}</span>
                    <span className="move-pp">PP {move.pp}/{move.maxPp}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {busy && phase !== 'ended' && (
          <div className="busy-area">
            <div className="busy-dots"><span /><span /><span /></div>
          </div>
        )}

        {phase === 'ended' && (
          <div className="ended-area">
            <div className={`winner-banner ${winner === 'player' ? 'winner-player' : 'winner-opponent'}`}>
              {winner === 'player' ? '🏆 Você venceu!' : '💀 Inimigo venceu!'}
            </div>
            <button className="restart-btn" onClick={onQuit}>Montar novo time</button>
          </div>
        )}
      </div>
    </div>
  );
}
