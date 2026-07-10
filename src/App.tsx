import { Analytics } from '@vercel/analytics/react';
import { useCallback, useEffect, useState } from 'react';
import { useSession } from './lib/auth-client';
import { createLogger } from './lib/logger';
import {
  documentTitleForLegal,
  documentTitleForProfile,
  documentTitleForRoll,
  documentTitleForTab,
} from './lib/pageMeta';
import { parsePath, tabPath, type AppRoute, type TabId } from './lib/routes';
import { GameProvider } from './state/GameProvider';
import { CelebrationLayer } from './ui/components/Celebration';
import { AppShell } from './ui/layout/AppShell';
import { AccountScreen } from './ui/screens/AccountScreen';
import { AboutScreen } from './ui/screens/AboutScreen';
import { WhatsNewScreen } from './ui/screens/WhatsNewScreen';
import { AdminScreen } from './ui/screens/AdminScreen';
import { CollectionScreen } from './ui/screens/CollectionScreen';
import { HistoryScreen } from './ui/screens/HistoryScreen';
import { HomeScreen } from './ui/screens/HomeScreen';
import { FeatureRequestsScreen } from './ui/screens/FeatureRequestsScreen';
import { LeaderboardScreen } from './ui/screens/LeaderboardScreen';
import { ProfileScreen } from './ui/screens/ProfileScreen';
import { PublicRollScreen } from './ui/screens/PublicRollScreen';
import { SettingsScreen } from './ui/screens/SettingsScreen';
import { ShowcaseScreen } from './ui/screens/ShowcaseScreen';
import { StatsScreen } from './ui/screens/StatsScreen';
import { LegalScreen } from './ui/screens/LegalScreen';
import { NotificationsScreen } from './ui/screens/NotificationsScreen';

const log = createLogger('router');

function AppRoutes() {
  const { data: session } = useSession();
  const myUsername = session?.user.username ?? null;

  const [route, setRoute] = useState<AppRoute>(() =>
    typeof window !== 'undefined'
      ? parsePath(window.location.pathname)
      : { kind: 'tab', tab: 'home' },
  );

  useEffect(() => {
    log.info('initial route', { route, path: window.location.pathname });
    const onPop = () => {
      const next = parsePath(window.location.pathname);
      log.debug('popstate', { path: window.location.pathname, next });
      setRoute(next);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    switch (route.kind) {
      case 'tab':
        document.title = documentTitleForTab(route.tab);
        break;
      case 'profile':
        document.title = documentTitleForProfile(route.username);
        break;
      case 'roll':
        document.title = documentTitleForRoll();
        break;
      case 'legal':
        document.title = documentTitleForLegal(route.page);
        break;
      default: {
        const _exhaustive: never = route;
        void _exhaustive;
        break;
      }
    }
  }, [route]);

  const navigate = useCallback((path: string, next: AppRoute) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    log.info('navigate', { path, next });
    setRoute(next);
  }, []);

  const goTab = useCallback(
    (tab: TabId) => {
      navigate(tabPath(tab), { kind: 'tab', tab });
    },
    [navigate],
  );

  const goPath = useCallback(
    (path: string) => {
      const next = parsePath(path);
      navigate(path, next);
    },
    [navigate],
  );

  const goProfile = useCallback(
    (username: string) => {
      const path = `/u/${encodeURIComponent(username)}`;
      navigate(path, {
        kind: 'profile',
        username: username.toLowerCase(),
      });
    },
    [navigate],
  );

  const goMyProfile = useCallback(() => {
    if (myUsername && myUsername.length >= 3) {
      goProfile(myUsername);
      return;
    }
    // Need a public handle first
    goTab('account');
  }, [goProfile, goTab, myUsername]);

  const goRoll = useCallback(
    (rollId: string, username?: string | null) => {
      if (username && username.length >= 3) {
        const path = `/s/${encodeURIComponent(username)}/${encodeURIComponent(rollId)}`;
        navigate(path, {
          kind: 'roll',
          rollId,
          username: username.toLowerCase(),
        });
        return;
      }
      const path = `/r/${encodeURIComponent(rollId)}`;
      navigate(path, { kind: 'roll', rollId });
    },
    [navigate],
  );

  const tab: TabId =
    route.kind === 'tab'
      ? route.tab
      : route.kind === 'profile'
        ? 'account'
        : route.kind === 'legal'
          ? 'about'
          : 'home';

  const profileActive =
    route.kind === 'profile' &&
    Boolean(
      myUsername && route.username.toLowerCase() === myUsername.toLowerCase(),
    );

  return (
    <AppShell
      tab={tab}
      onTab={goTab}
      onOpenMyProfile={goMyProfile}
      profileActive={profileActive}
    >
      {route.kind === 'legal' && <LegalScreen kind={route.page} />}
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
          username={route.username}
          onOpenProfile={goProfile}
          onBack={() => goTab('home')}
        />
      )}
      {route.kind === 'tab' && tab === 'home' && (
        <HomeScreen
          onGoAccount={() => goTab('account')}
          onOpenProfile={goProfile}
          onOpenRoll={goRoll}
        />
      )}
      {route.kind === 'tab' && tab === 'history' && (
        <HistoryScreen onGoAccount={() => goTab('account')} />
      )}
      {route.kind === 'tab' && tab === 'collection' && <CollectionScreen />}
      {route.kind === 'tab' && tab === 'showcase' && (
        <ShowcaseScreen onGoAccount={() => goTab('account')} />
      )}
      {route.kind === 'tab' && tab === 'stats' && <StatsScreen />}
      {route.kind === 'tab' && tab === 'leaderboard' && (
        <LeaderboardScreen onOpenProfile={goProfile} />
      )}
      {route.kind === 'tab' && tab === 'features' && (
        <FeatureRequestsScreen onGoAccount={() => goTab('account')} />
      )}
      {route.kind === 'tab' && tab === 'notifications' && (
        <NotificationsScreen
          onOpenHref={goPath}
          onGoAccount={() => goTab('account')}
        />
      )}
      {route.kind === 'tab' && tab === 'account' && (
        <AccountScreen onOpenAdmin={() => goTab('admin')} />
      )}
      {route.kind === 'tab' && tab === 'whats-new' && <WhatsNewScreen />}
      {route.kind === 'tab' && tab === 'about' && <AboutScreen />}
      {route.kind === 'tab' && tab === 'admin' && (
        <AdminScreen onBack={() => goTab('account')} />
      )}
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
