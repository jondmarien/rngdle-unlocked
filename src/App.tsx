import { Analytics } from '@vercel/analytics/react';
import { useCallback, useEffect, useState } from 'react';
import { parsePath, tabPath, type AppRoute, type TabId } from './lib/routes';
import { GameProvider } from './state/GameProvider';
import { CelebrationLayer } from './ui/components/Celebration';
import { AppShell } from './ui/layout/AppShell';
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

function AppRoutes() {
  const [route, setRoute] = useState<AppRoute>(() =>
    typeof window !== 'undefined'
      ? parsePath(window.location.pathname)
      : { kind: 'tab', tab: 'home' },
  );

  useEffect(() => {
    const onPop = () => setRoute(parsePath(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((path: string, next: AppRoute) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setRoute(next);
  }, []);

  const goTab = useCallback(
    (tab: TabId) => {
      navigate(tabPath(tab), { kind: 'tab', tab });
    },
    [navigate],
  );

  const goProfile = useCallback(
    (username: string) => {
      const path = `/u/${encodeURIComponent(username)}`;
      navigate(path, { kind: 'profile', username });
    },
    [navigate],
  );

  const goRoll = useCallback(
    (rollId: string) => {
      const path = `/r/${encodeURIComponent(rollId)}`;
      navigate(path, { kind: 'roll', rollId });
    },
    [navigate],
  );

  const tab: TabId = route.kind === 'tab' ? route.tab : 'home';

  return (
    <AppShell tab={tab} onTab={goTab}>
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
