import { Analytics } from '@vercel/analytics/react';
import { useState } from 'react';
import { GameProvider } from './state/GameProvider';
import { CelebrationLayer } from './ui/components/Celebration';
import { AppShell, type TabId } from './ui/layout/AppShell';
import { AboutScreen } from './ui/screens/AboutScreen';
import { CollectionScreen } from './ui/screens/CollectionScreen';
import { HistoryScreen } from './ui/screens/HistoryScreen';
import { HomeScreen } from './ui/screens/HomeScreen';
import { SettingsScreen } from './ui/screens/SettingsScreen';
import { ShowcaseScreen } from './ui/screens/ShowcaseScreen';

function AppRoutes() {
  const [tab, setTab] = useState<TabId>('home');

  return (
    <AppShell tab={tab} onTab={setTab}>
      {tab === 'home' && <HomeScreen />}
      {tab === 'history' && <HistoryScreen />}
      {tab === 'collection' && <CollectionScreen />}
      {tab === 'showcase' && <ShowcaseScreen />}
      {tab === 'about' && <AboutScreen />}
      {tab === 'settings' && <SettingsScreen />}
    </AppShell>
  );
}

export default function App() {
  return (
    <GameProvider>
      <AppRoutes />
      <CelebrationLayer />
      <Analytics />
    </GameProvider>
  );
}
