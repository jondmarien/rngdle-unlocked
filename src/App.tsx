import { Analytics } from '@vercel/analytics/react';
import { useCallback, useEffect, useState } from 'react';
import { GameProvider } from './state/GameProvider';
import { CelebrationLayer } from './ui/components/Celebration';
import { AppShell, type TabId } from './ui/layout/AppShell';
import { AccountScreen } from './ui/screens/AccountScreen';
import { AboutScreen } from './ui/screens/AboutScreen';
import { CollectionScreen } from './ui/screens/CollectionScreen';
import { HistoryScreen } from './ui/screens/HistoryScreen';
import { HomeScreen } from './ui/screens/HomeScreen';
import { LeaderboardScreen } from './ui/screens/LeaderboardScreen';
import { ProfileScreen } from './ui/screens/ProfileScreen';
import { PublicRollScreen } from './ui/screens/PublicRollScreen';
import { SettingsScreen } from './ui/screens/SettingsScreen';
import { ShowcaseScreen } from './ui/screens/ShowcaseScreen';

type Route =
  | { kind: 'tab'; tab: TabId }
  | { kind: 'profile'; username: string }
  | { kind: 'roll'; rollId: string };

function parsePath(pathname: string): Route {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] === 'u' && parts[1]) {
    return { kind: 'profile', username: decodeURIComponent(parts[1]).toLowerCase() };
  }
  if (parts[0] === 'r' && parts[1]) {
    return { kind: 'roll', rollId: decodeURIComponent(parts[1]) };
  }
  return { kind: 'tab', tab: 'home' };
}

function AppRoutes() {
  const [route, setRoute] = useState<Route>(() =>
    typeof window !== 'undefined'
      ? parsePath(window.location.pathname)
      : { kind: 'tab', tab: 'home' },
  );

  useEffect(() => {
    const onPop = () => setRoute(parsePath(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const goTab = useCallback((tab: TabId) => {
    window.history.pushState({}, '', '/');
    setRoute({ kind: 'tab', tab });
  }, []);

  const goProfile = useCallback((username: string) => {
    const path = `/u/${encodeURIComponent(username)}`;
    window.history.pushState({}, '', path);
    setRoute({ kind: 'profile', username });
  }, []);

  const goRoll = useCallback((rollId: string) => {
    const path = `/r/${encodeURIComponent(rollId)}`;
    window.history.pushState({}, '', path);
    setRoute({ kind: 'roll', rollId });
  }, []);

  const tab: TabId = route.kind === 'tab' ? route.tab : 'home';

  return (
    <AppShell
      tab={tab}
      onTab={goTab}
    >
      {route.kind === 'profile' && (
        <ProfileScreen
          username={route.username}
          onOpenRoll={goRoll}
          onBack={() => goTab('leaderboard')}
        />
      )}
      {route.kind === 'roll' && (
        <PublicRollScreen
          rollId={route.rollId}
          onOpenProfile={goProfile}
          onBack={() => goTab('home')}
        />
      )}
      {route.kind === 'tab' && tab === 'home' && <HomeScreen />}
      {route.kind === 'tab' && tab === 'history' && <HistoryScreen />}
      {route.kind === 'tab' && tab === 'collection' && <CollectionScreen />}
      {route.kind === 'tab' && tab === 'showcase' && <ShowcaseScreen />}
      {route.kind === 'tab' && tab === 'leaderboard' && (
        <LeaderboardScreen onOpenProfile={goProfile} />
      )}
      {route.kind === 'tab' && tab === 'account' && <AccountScreen />}
      {route.kind === 'tab' && tab === 'about' && <AboutScreen />}
      {route.kind === 'tab' && tab === 'settings' && <SettingsScreen />}
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
