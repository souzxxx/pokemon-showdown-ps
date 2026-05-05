import { useEffect, useState, useRef, startTransition, type CSSProperties } from 'react';
import axios from 'axios';
import { fetchPokemonPreview, getPokemonSuggestions } from '../api/battleApi';
import type { PokemonPreview } from '../types/battle';

const TYPE_COLORS: Record<string, string> = {
  normal: '#A8A878', fire: '#F08030', water: '#6890F0', electric: '#F8D030',
  grass: '#78C850', ice: '#98D8D8', fighting: '#C03028', poison: '#A040A0',
  ground: '#E0C068', flying: '#A890F0', psychic: '#F85888', bug: '#A8B820',
  rock: '#B8A038', ghost: '#705898', dragon: '#7038F8', dark: '#705848',
  steel: '#B8B8D0', fairy: '#EE99AC',
};

function PokeballIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" />
      <path d="M2 16h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M18 16h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="16" cy="16" r="4" stroke="currentColor" strokeWidth="2" fill="rgba(7,7,15,0.85)" />
      <circle cx="16" cy="16" r="1.5" fill="currentColor" />
    </svg>
  );
}

function BoltIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M13 2 4 14h6l-2 8 9-12h-6l2-8z" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className} aria-hidden="true">
      <path d="M3 3l10 10M13 3L3 13" />
    </svg>
  );
}

const STAT_LABELS: Record<string, string> = {
  hp: 'HP', attack: 'ATK', defense: 'DEF', spAtk: 'SpA', spDef: 'SpD', speed: 'SPD',
};

interface SavedTeam {
  id: string;
  name: string;
  members: string[];
}

interface Props {
  onStart: (team: string[]) => Promise<void> | void;
  onSave: (team: string[], name?: string) => Promise<void> | void;
  onDelete?: (teamId: string) => Promise<void> | void;
  savedTeams?: SavedTeam[];
}

export default function TeamBuilder({ onStart, onSave, onDelete, savedTeams = [] }: Props) {
  const [team, setTeam] = useState<PokemonPreview[]>([]);
  const [teamName, setTeamName] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [loadingSavedTeam, setLoadingSavedTeam] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    startTransition(() => setSaved(false));
  }, [team]);

  useEffect(() => {
    let cancelled = false;

    const loadSuggestions = async () => {
      const prefix = query.trim();
      if (!prefix) {
        setSuggestions([]);
        setActiveSuggestionIndex(-1);
        return;
      }

      setSuggestionsLoading(true);
      try {
        const names = await getPokemonSuggestions(prefix);
        if (cancelled) return;
        const filtered = names.filter(name => !team.some(p => p.name === name));
        setSuggestions(filtered);
        setActiveSuggestionIndex(filtered.length > 0 ? 0 : -1);
      } catch {
        if (!cancelled) {
          setSuggestions([]);
          setActiveSuggestionIndex(-1);
        }
      } finally {
        if (!cancelled) setSuggestionsLoading(false);
      }
    };

    loadSuggestions();
    return () => {
      cancelled = true;
    };
  }, [query, team]);

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
      setSuggestions([]);
      setActiveSuggestionIndex(-1);
      inputRef.current?.focus();
    } catch (e) {
      setError(axios.isAxiosError(e) ? e.response?.data?.error ?? e.message : `Pokémon "${name}" não encontrado.`);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectSuggestion(name: string) {
    if (team.length >= 6) { setError('Time completo! Máximo de 6 Pokémon.'); return; }
    if (team.some(p => p.name === name)) { setError(`${name} já está no time.`); return; }

    setError('');
    setLoading(true);
    try {
      const preview = await fetchPokemonPreview(name);
      setTeam(prev => [...prev, preview]);
      setQuery('');
      setSuggestions([]);
      setActiveSuggestionIndex(-1);
      inputRef.current?.focus();
    } catch (e) {
      setError(axios.isAxiosError(e) ? e.response?.data?.error ?? e.message : `Pokémon "${name}" não encontrado.`);
    } finally {
      setLoading(false);
    }
  }

  function handleRemove(index: number) {
    setTeam(prev => prev.filter((_, i) => i !== index));
    setSaved(false);
  }

  async function handleSave() {
    if (team.length !== 6) { setError('Você precisa de exatamente 6 Pokémon para salvar.'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave(team.map(p => p.name), teamName.trim() || undefined);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar o time.');
    } finally {
      setSaving(false);
    }
  }

  async function handleLoadSavedTeam(savedTeam: SavedTeam) {
    if (!savedTeam.members.length) {
      setError('Este time salvo não contém Pokémon.');
      return;
    }

    setError('');
    setLoadingSavedTeam(savedTeam.id);
    setSaved(false);

    try {
      const previews = await Promise.all(
        savedTeam.members.map(member => fetchPokemonPreview(member)),
      );
      setTeam(previews);
      setTeamName(savedTeam.name);
      setQuery('');
    } catch (e) {
      setError(axios.isAxiosError(e) ? e.response?.data?.error ?? e.message : 'Não foi possível carregar o time salvo.');
    } finally {
      setLoadingSavedTeam(null);
    }
  }

  async function handleStart() {
    if (team.length !== 6) { setError('Você precisa de exatamente 6 Pokémon.'); return; }
    setStarting(true);
    try {
      await onStart(team.map(p => p.name));
    } catch (e) {
      setStarting(false);
      setError(e instanceof Error ? e.message : 'Não foi possível iniciar a batalha.');
    }
  }

  const ready = team.length === 6;

  return (
    <div className="builder-screen">
      <div className="builder-header">
        <h1 className="builder-title">Pokémon Showdown</h1>
        <p className="builder-subtitle">Monte seu time de 6 Pokémon</p>
      </div>

      <div className="builder-body">
        {/* Search */}
        <div className="search-row">
          <input
            ref={inputRef}
            className="search-input"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setError('');
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (activeSuggestionIndex >= 0 && suggestions[activeSuggestionIndex]) {
                  handleSelectSuggestion(suggestions[activeSuggestionIndex]);
                } else {
                  handleAdd();
                }
              }

              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveSuggestionIndex(prev => Math.min(prev + 1, suggestions.length - 1));
              }

              if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveSuggestionIndex(prev => Math.max(prev - 1, 0));
              }
            }}
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

        {query.trim() ? (
          <div className="suggestions-panel">
            {suggestionsLoading ? (
              <p className="suggestions-loading">Procurando Pokémon...</p>
            ) : suggestions.length > 0 ? (
              <ul className="suggestions-list">
                {suggestions.map((suggestion, index) => (
                  <li
                    key={suggestion}
                    className={`suggestion-item ${index === activeSuggestionIndex ? 'active' : ''}`}
                    onMouseDown={() => handleSelectSuggestion(suggestion)}
                  >
                    {suggestion}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="no-suggestions">Nenhum Pokémon encontrado para "{query}".</p>
            )}
          </div>
        ) : null}

        {savedTeams.length > 0 ? (
          <section className="saved-teams-block">
            <h2>Times Salvos</h2>
            <div className="saved-teams-grid">
              {savedTeams.map(savedTeam => (
                <div key={savedTeam.id} className="saved-team-card">
                  <div className="saved-team-card-header">
                    <strong>{savedTeam.name}</strong>
                    <div className="saved-team-actions">
                      <button
                        type="button"
                        onClick={() => handleLoadSavedTeam(savedTeam)}
                        disabled={loadingSavedTeam !== null}
                      >
                        {loadingSavedTeam === savedTeam.id ? 'Carregando...' : 'Carregar'}
                      </button>
                      <button
                        type="button"
                        className="delete-team-btn"
                        onClick={() => onDelete?.(savedTeam.id)}
                        disabled={loadingSavedTeam !== null}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                  <div className="saved-team-members">
                    {savedTeam.members.join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <div className="team-name-row">
          <label htmlFor="team-name-input">Nome do time</label>
          <input
            id="team-name-input"
            className="team-name-input"
            value={teamName}
            onChange={e => setTeamName(e.target.value)}
            placeholder="Digite um nome para o time"
          />
        </div>

        {/* Team slots */}
        <div className="team-slots">
          {team.map((poke, i) => {
            const primaryType = poke.types[0] ?? 'normal';
            const cardStyle = {
              '--type-color': TYPE_COLORS[primaryType] ?? '#888',
              '--i': i,
            } as CSSProperties;
            return (
              <div key={poke.name} className="team-card" style={cardStyle}>
                <span className="slot-number">{String(i + 1).padStart(2, '0')}</span>
                <button className="remove-btn" onClick={() => handleRemove(i)} title="Remover" aria-label="Remover Pokémon">
                  <CloseIcon />
                </button>
                <img src={poke.spriteUrl} alt={poke.displayName} className="team-sprite" />
                <div className="team-card-info">
                  <span className="team-poke-name">{poke.displayName}</span>
                  <div className="team-types">
                    {poke.types.map(t => (
                      <span key={t} className="type-pill" style={{ background: TYPE_COLORS[t] ?? '#888' }}>
                        {t}
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
            );
          })}

          {/* Empty slots */}
          {Array.from({ length: 6 - team.length }).map((_, i) => {
            const slotIdx = team.length + i;
            const cardStyle = { '--i': slotIdx } as CSSProperties;
            return (
              <div key={`empty-${i}`} className="team-card team-card-empty" style={cardStyle}>
                <PokeballIcon className="empty-pokeball" />
                <span className="empty-slot-text">Slot {slotIdx + 1}</span>
              </div>
            );
          })}
        </div>

        {/* Save and start buttons */}
        <div className="builder-footer">
          <span className="team-count">{team.length}/6</span>
          <button
            className="btn-save"
            onClick={handleSave}
            disabled={team.length !== 6 || saving}
          >
            {saving ? 'Salvando…' : saved ? 'Time salvo ✓' : 'Salvar time'}
          </button>
          <button
            className={`btn-start${ready ? ' btn-start--ready' : ''}`}
            onClick={handleStart}
            disabled={team.length !== 6 || starting}
          >
            <BoltIcon className="bolt-icon" />
            {starting ? 'Carregando batalha…' : 'Iniciar Batalha'}
          </button>
        </div>
      </div>
    </div>
  );
}
