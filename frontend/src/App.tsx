import { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import TeamBuilder from './components/TeamBuilder';
import BattleArena from './components/BattleArena';
import './App.css';
import { auth0Config } from './auth/config';
import { getMe } from './api/usersApi';

type Screen = 'builder' | 'battle';

export default function App() {
  const [screen, setScreen] = useState<Screen>('builder');
  const [team, setTeam] = useState<string[]>([]);
  const [me, setMe] = useState<TrainerMe | null>(null);
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

  function handleStart(selectedTeam: string[]) {
    setTeam(selectedTeam);
    setScreen('battle');
  }

  useEffect(() => {
    if (!isAuthenticated) {
      setMe(null);
      return;
    }

    if (!auth0Config.audience) {
      setMeError('Configure VITE_AUTH0_AUDIENCE no frontend/.env');
      return;
    }

    let cancelled = false;
    const loadMe = async () => {
      setMeLoading(true);
      setMeError(null);
      try {
        const token = await getAccessTokenSilently({
          authorizationParams: { audience: auth0Config.audience },
        });
        const data = await getMe(token);
        if (!cancelled) setMe(data);
      } catch (err) {
        if (!cancelled) setMeError('Falha ao carregar /me.');
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
    return <BattleArena playerTeamNames={team} onQuit={() => setScreen('builder')} />;
  }

  return (
    <div>
      <header className="auth-header">
        <div>
          {isLoading ? 'Carregando auth...' : isAuthenticated ? 'Logado' : 'Deslogado'}
          {user?.email ? ` · ${user.email}` : ''}
        </div>
        <div>
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

      {meLoading ? <p>Carregando /me...</p> : null}
      {meError ? <p>{meError}</p> : null}
      {me ? <pre>{JSON.stringify(me, null, 2)}</pre> : null}

      <TeamBuilder onStart={handleStart} />
    </div>
  );
}

type TrainerMe = {
  id: string;
  auth0Sub: string;
  email?: string;
  username: string;
};
