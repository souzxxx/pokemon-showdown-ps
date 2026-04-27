import { useState, useRef } from 'react';
import { fetchPokemonPreview } from '../api/battleApi';
import type { PokemonPreview } from '../types/battle';

const TYPE_COLORS: Record<string, string> = {
  normal: '#A8A878', fire: '#F08030', water: '#6890F0', electric: '#F8D030',
  grass: '#78C850', ice: '#98D8D8', fighting: '#C03028', poison: '#A040A0',
  ground: '#E0C068', flying: '#A890F0', psychic: '#F85888', bug: '#A8B820',
  rock: '#B8A038', ghost: '#705898', dragon: '#7038F8', dark: '#705848',
  steel: '#B8B8D0', fairy: '#EE99AC',
};

const STAT_LABELS: Record<string, string> = {
  hp: 'HP', attack: 'ATK', defense: 'DEF', spAtk: 'SpA', spDef: 'SpD', speed: 'SPD',
};

interface Props {
  onStart: (team: string[]) => void;
}

export default function TeamBuilder({ onStart }: Props) {
  const [team, setTeam] = useState<PokemonPreview[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleAdd() {
    const name = query.trim().toLowerCase();
    if (!name) return;
    if (team.length >= 6) { setError('Time completo! Máximo de 6 Pokémon.'); return; }
    if (team.some(p => p.name === name)) { setError(`${name} já está no time.`); return; }

    setError('');
    setLoading(true);
    try {
      const preview = await fetchPokemonPreview(name);
      setTeam(prev => [...prev, preview]);
      setQuery('');
      inputRef.current?.focus();
    } catch (e: any) {
      setError(e?.response?.data?.error ?? `Pokémon "${name}" não encontrado.`);
    } finally {
      setLoading(false);
    }
  }

  function handleRemove(index: number) {
    setTeam(prev => prev.filter((_, i) => i !== index));
  }

  function handleStart() {
    if (team.length !== 6) { setError('Você precisa de exatamente 6 Pokémon.'); return; }
    setStarting(true);
    onStart(team.map(p => p.name));
  }

  return (
    <div className="builder-screen">
      <div className="builder-header">
        <h1 className="builder-title">Pokemon Showdown</h1>
        <p className="builder-subtitle">Monte seu time de 6 Pokémon</p>
      </div>

      <div className="builder-body">
        {/* Search */}
        <div className="search-row">
          <input
            ref={inputRef}
            className="search-input"
            value={query}
            onChange={e => { setQuery(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Nome do Pokémon (ex: charizard)"
            disabled={loading || team.length >= 6}
          />
          <button
            className="btn-add"
            onClick={handleAdd}
            disabled={loading || !query.trim() || team.length >= 6}
          >
            {loading ? '...' : '+ Adicionar'}
          </button>
        </div>

        {error && <p className="search-error">{error}</p>}

        {/* Team slots */}
        <div className="team-slots">
          {team.map((poke, i) => (
            <div key={poke.name} className="team-card">
              <button className="remove-btn" onClick={() => handleRemove(i)} title="Remover">✕</button>
              <img src={poke.spriteUrl} alt={poke.displayName} className="team-sprite" />
              <div className="team-card-info">
                <span className="team-poke-name">{poke.displayName}</span>
                <div className="team-types">
                  {poke.types.map(t => (
                    <span key={t} className="type-pill" style={{ background: TYPE_COLORS[t] ?? '#888' }}>
                      {t.toUpperCase()}
                    </span>
                  ))}
                </div>
                <div className="team-stats">
                  {Object.entries(STAT_LABELS).map(([key, label]) => (
                    <div key={key} className="stat-row">
                      <span className="stat-label">{label}</span>
                      <div className="stat-bar-bg">
                        <div
                          className="stat-bar-fill"
                          style={{ width: `${Math.min(100, (poke.stats[key as keyof typeof poke.stats] / 255) * 100)}%` }}
                        />
                      </div>
                      <span className="stat-val">{poke.stats[key as keyof typeof poke.stats]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {/* Empty slots */}
          {Array.from({ length: 6 - team.length }).map((_, i) => (
            <div key={`empty-${i}`} className="team-card team-card-empty">
              <div className="empty-slot-icon">?</div>
              <span className="empty-slot-text">Slot {team.length + i + 1}</span>
            </div>
          ))}
        </div>

        {/* Start button */}
        <div className="builder-footer">
          <span className="team-count">{team.length}/6 Pokémon</span>
          <button
            className="btn-start"
            onClick={handleStart}
            disabled={team.length !== 6 || starting}
          >
            {starting ? 'Carregando batalha...' : 'Iniciar Batalha!'}
          </button>
        </div>
      </div>
    </div>
  );
}
