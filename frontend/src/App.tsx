import { useState } from 'react';
import TeamBuilder from './components/TeamBuilder';
import BattleArena from './components/BattleArena';
import './App.css';

type Screen = 'builder' | 'battle';

export default function App() {
  const [screen, setScreen] = useState<Screen>('builder');
  const [team, setTeam] = useState<string[]>([]);

  function handleStart(selectedTeam: string[]) {
    setTeam(selectedTeam);
    setScreen('battle');
  }

  if (screen === 'battle' && team.length === 6) {
    return <BattleArena playerTeamNames={team} onQuit={() => setScreen('builder')} />;
  }

  return <TeamBuilder onStart={handleStart} />;
}
