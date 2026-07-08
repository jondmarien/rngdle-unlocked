import { useState } from 'react';
import { GameProvider } from './state/GameProvider';
import { AppShell, type TabId } from './ui/layout/AppShell';
import { AboutScreen } from './ui/screens/AboutScreen';
import { CollectionScreen } from './ui/screens/CollectionScreen';
import { HistoryScreen } from './ui/screens/HistoryScreen';
import { HomeScreen } from './ui/screens/HomeScreen';
import { SettingsScreen } from './ui/screens/SettingsScreen';

function AppRoutes() {
  const [tab, setTab] = useState<TabId>('home');

  return (
    <AppShell tab={tab} onTab={setTab}>
      {tab === 'home' && <HomeScreen />}
      {tab === 'history' && <HistoryScreen />}
      {tab === 'collection' && <CollectionScreen />}
      {tab === 'about' && <AboutScreen />}
      {tab === 'settings' && <SettingsScreen />}
    </AppShell>
  );
}

export default function App() {
  return (
    <GameProvider>
      <AppRoutes />
    </GameProvider>
  );
}
