import axios from 'axios';
import { useEffect, useState, startTransition } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import TeamBuilder from './components/TeamBuilder';
import BattleArena from './components/BattleArena';
import './App.css';
import { auth0Config } from './auth/config';
import { getMe, getSavedTeams, saveTeam, deleteTeam } from './api/usersApi';

type Screen = 'builder' | 'battle';

type SavedTeam = {
  id: string;
  name: string;
  members: string[];
};

export default function App() {
  const [screen, setScreen] = useState<Screen>('builder');
  const [team, setTeam] = useState<string[]>([]);
  const [me, setMe] = useState<TrainerMe | null>(null);
  const [savedTeams, setSavedTeams] = useState<SavedTeam[]>([]);
  const [savedTeamsError, setSavedTeamsError] = useState<string | null>(null);
  const [savedTeamsLoading, setSavedTeamsLoading] = useState(false);
  const [meError, setMeError] = useState<string | null>(null);
  const [meLoading, setMeLoading] = useState(false);
  const {
    isAuthenticated,
    isLoading,
    loginWithRedirect,
    logout,
    getAccessTokenSilently,
    user,
  } = useAuth0();

  async function handleSaveTeam(selectedTeam: string[], name?: string) {
    if (!isAuthenticated) {
      throw new Error('Faça login para salvar o time.');
    }
    if (!auth0Config.audience) {
      throw new Error('VITE_AUTH0_AUDIENCE não está configurado.');
    }

    const token = await getAccessTokenSilently({
      authorizationParams: { audience: auth0Config.audience },
    });

    await saveTeam(token, selectedTeam, name);
    await loadSavedTeams(token);
  }

  async function loadSavedTeams(token: string) {
    setSavedTeamsLoading(true);
    setSavedTeamsError(null);
    try {
      const teams = await getSavedTeams(token);
      setSavedTeams(teams);
    } catch (err) {
      setSavedTeamsError(axios.isAxiosError(err)
        ? err.response?.data?.error ?? err.message
        : 'Falha ao carregar times salvos.');
    } finally {
      setSavedTeamsLoading(false);
    }
  }

  async function handleStart(selectedTeam: string[]) {
    setTeam(selectedTeam);
    setScreen('battle');
  }

  async function handleDeleteTeam(teamId: string) {
    if (!isAuthenticated) {
      throw new Error('Faça login para excluir o time.');
    }
    if (!auth0Config.audience) {
      throw new Error('VITE_AUTH0_AUDIENCE não está configurado.');
    }

    const token = await getAccessTokenSilently({
      authorizationParams: { audience: auth0Config.audience },
    });

    await deleteTeam(token, teamId);
    await loadSavedTeams(token);
  }

  useEffect(() => {
    if (!isAuthenticated) {
      startTransition(() => {
        setMe(null);
        setSavedTeams([]);
      });
      return;
    }

    if (!auth0Config.audience) {
      startTransition(() => setMeError('Configure VITE_AUTH0_AUDIENCE no frontend/.env'));
      return;
    }

    let cancelled = false;
    const loadMe = async () => {
      setMeLoading(true);
      setMeError(null);
      setSavedTeamsError(null);
      try {
        const token = await getAccessTokenSilently({
          authorizationParams: { audience: auth0Config.audience },
        });
        const data = await getMe(token);
        if (!cancelled) {
          setMe(data);
          await loadSavedTeams(token);
        }
      } catch (err) {
        if (!cancelled) {
          const message = axios.isAxiosError(err)
            ? err.response?.data?.error ?? err.message
            : 'Falha ao carregar /me.';
          setMeError(`Falha ao carregar /me: ${message}`);
        }
      } finally {
        if (!cancelled) setMeLoading(false);
      }
    };

    loadMe();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, getAccessTokenSilently]);

  if (screen === 'battle' && team.length === 6) {
    return (
      <BattleArena
        playerTeamNames={team}
        onQuit={() => setScreen('builder')}
        onSaveTeam={handleSaveTeam}
      />
    );
  }

  const accountLabel = isAuthenticated
    ? me
      ? me.email
        ? <><span>{me.username}</span><span className="auth-divider">·</span><span>{me.email}</span></>
        : <span>{me.username}</span>
      : <span>{user?.email ?? 'Logado'}</span>
    : <span>Deslogado</span>;

  return (
    <div>
      <header className="auth-header">
        <div className="auth-brand">
          <svg viewBox="0 0 32 32" fill="none" className="pokeball-icon" aria-hidden="true">
            <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" />
            <path d="M2 16h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M18 16h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="16" cy="16" r="4" stroke="currentColor" strokeWidth="2" fill="rgba(7,7,15,0.85)" />
            <circle cx="16" cy="16" r="1.5" fill="currentColor" />
          </svg>
          <span>Trainer</span>
        </div>
        <div className="auth-status">
          {isLoading
            ? <span className="auth-status-loading">Carregando…</span>
            : accountLabel}
        </div>
        <div className="auth-actions">
          {isAuthenticated ? (
            <button onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}>
              Sair
            </button>
          ) : (
            <button onClick={() => loginWithRedirect({ authorizationParams: { audience: auth0Config.audience } })}>
              Entrar
            </button>
          )}
        </div>
      </header>

      {(meLoading || meError || savedTeamsLoading || savedTeamsError) && (
        <div className="auth-toasts" aria-live="polite">
          {meLoading ? <div className="auth-toast auth-toast--info">Carregando perfil…</div> : null}
          {meError ? <div className="auth-toast auth-toast--error">{meError}</div> : null}
          {savedTeamsLoading ? <div className="auth-toast auth-toast--info">Carregando times salvos…</div> : null}
          {savedTeamsError ? <div className="auth-toast auth-toast--error">{savedTeamsError}</div> : null}
        </div>
      )}

      <TeamBuilder
        onStart={handleStart}
        onSave={handleSaveTeam}
        onDelete={handleDeleteTeam}
        savedTeams={savedTeams}
      />
    </div>
  );
}

type TrainerMe = {
  id: string;
  auth0Sub: string;
  email?: string;
  username: string;
};
