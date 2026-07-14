import { Analytics } from '@vercel/analytics/react';
import { AnimatePresence } from 'motion/react';
import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
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
import { FeedbackProvider } from './ui/feedback';
import { ScreenFallback } from './ui/components/ScreenFallback';
import { AppShell } from './ui/layout/AppShell';
import { RouteEnter, SuspenseReveal } from './ui/motion';
import { HomeScreen } from './ui/screens/HomeScreen';
import { lazyScreen } from './ui/lazyScreen';

function routeKey(route: AppRoute): string {
  switch (route.kind) {
    case 'tab':
      return `tab:${route.tab}`;
    case 'profile':
      return `profile:${route.username}`;
    case 'roll':
      return `roll:${route.rollId}`;
    case 'legal':
      return `legal:${route.page}`;
    default: {
      const _exhaustive: never = route;
      return _exhaustive;
    }
  }
}

const CelebrationLayer = lazy(() =>
  import('./ui/components/Celebration').then((m) => ({
    default: m.CelebrationLayer,
  })),
);

const AccountScreen = lazyScreen<{ onOpenAdmin?: () => void }>(
  () => import('./ui/screens/AccountScreen'),
  'AccountScreen',
);
const AboutScreen = lazyScreen(
  () => import('./ui/screens/AboutScreen'),
  'AboutScreen',
);
const WhatsNewScreen = lazyScreen(
  () => import('./ui/screens/WhatsNewScreen'),
  'WhatsNewScreen',
);
const AdminScreen = lazyScreen<{
  onBack: () => void;
  onOpenProfile: (username: string) => void;
}>(() => import('./ui/screens/AdminScreen'), 'AdminScreen');
const CollectionScreen = lazyScreen(
  () => import('./ui/screens/CollectionScreen'),
  'CollectionScreen',
);
const HistoryScreen = lazyScreen<{
  onGoAccount?: () => void;
  initialView?: 'highlights' | 'rolls';
}>(() => import('./ui/screens/HistoryScreen'), 'HistoryScreen');
const FeatureRequestsScreen = lazyScreen<{ onGoAccount: () => void }>(
  () => import('./ui/screens/FeatureRequestsScreen'),
  'FeatureRequestsScreen',
);
const LeaderboardScreen = lazyScreen<{
  onOpenProfile: (username: string) => void;
}>(() => import('./ui/screens/LeaderboardScreen'), 'LeaderboardScreen');
const FriendsScreen = lazyScreen<{
  onOpenProfile: (username: string) => void;
  onGoTab: (tab: TabId) => void;
}>(() => import('./ui/screens/FriendsScreen'), 'FriendsScreen');
const ArcadeScreen = lazyScreen<{
  onGoAccount: () => void;
  onGoLeaderboard: () => void;
}>(() => import('./ui/screens/ArcadeScreen'), 'ArcadeScreen');
const ProfileScreen = lazyScreen<{
  username: string;
  onOpenRoll: (rollId: string, username?: string | null) => void;
  onBack: () => void;
}>(() => import('./ui/screens/ProfileScreen'), 'ProfileScreen');
const PublicRollScreen = lazyScreen<{
  rollId: string;
  username?: string;
  onOpenProfile: (username: string) => void;
  onBack: () => void;
}>(() => import('./ui/screens/PublicRollScreen'), 'PublicRollScreen');
const SettingsScreen = lazyScreen(
  () => import('./ui/screens/SettingsScreen'),
  'SettingsScreen',
);
const StatsScreen = lazyScreen(
  () => import('./ui/screens/StatsScreen'),
  'StatsScreen',
);
const LegalScreen = lazyScreen<{ kind: 'privacy' | 'terms' }>(
  () => import('./ui/screens/LegalScreen'),
  'LegalScreen',
);
const NotificationsScreen = lazyScreen<{
  onOpenHref: (path: string) => void;
  onGoAccount?: () => void;
}>(() => import('./ui/screens/NotificationsScreen'), 'NotificationsScreen');

const log = createLogger('router');

function AppRoutes() {
  const { data: session } = useSession();
  const myUsername = session?.user.username ?? null;

  const [route, setRoute] = useState<AppRoute>(() =>
    typeof window !== 'undefined'
      ? parsePath(window.location.pathname, window.location.search)
      : { kind: 'tab', tab: 'home' },
  );

  useEffect(() => {
    log.info('initial route', { route, path: window.location.pathname });
    // Canonicalize legacy /showcase → /history?view=highlights
    if (window.location.pathname === '/showcase') {
      window.history.replaceState({}, '', '/history?view=highlights');
    }
    const onPop = () => {
      const next = parsePath(window.location.pathname, window.location.search);
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
      const url = new URL(path, window.location.origin);
      const next = parsePath(url.pathname, url.search);
      navigate(`${url.pathname}${url.search}`, next);
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

  const currentRouteKey = routeKey(route);

  return (
    <AppShell
      tab={tab}
      onTab={goTab}
      onOpenMyProfile={goMyProfile}
      profileActive={profileActive}
    >
      <AnimatePresence mode="wait">
        <RouteEnter
          key={currentRouteKey}
          className="flex min-h-0 flex-1 flex-col"
        >
          <Suspense fallback={<ScreenFallback />}>
            <SuspenseReveal>
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
                  onGoTab={goTab}
                  onOpenProfile={goProfile}
                  onOpenRoll={goRoll}
                />
              )}
              {route.kind === 'tab' && tab === 'history' && (
                <HistoryScreen
                  onGoAccount={() => goTab('account')}
                  initialView={route.historyView ?? 'rolls'}
                />
              )}
              {route.kind === 'tab' && tab === 'collection' && (
                <CollectionScreen />
              )}
              {route.kind === 'tab' && tab === 'stats' && <StatsScreen />}
              {route.kind === 'tab' && tab === 'leaderboard' && (
                <LeaderboardScreen onOpenProfile={goProfile} />
              )}
              {route.kind === 'tab' && tab === 'friends' && (
                <FriendsScreen onOpenProfile={goProfile} onGoTab={goTab} />
              )}
              {route.kind === 'tab' && tab === 'arcade' && (
                <ArcadeScreen
                  onGoAccount={() => goTab('account')}
                  onGoLeaderboard={() => goTab('leaderboard')}
                />
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
              {route.kind === 'tab' && tab === 'whats-new' && (
                <WhatsNewScreen />
              )}
              {route.kind === 'tab' && tab === 'about' && <AboutScreen />}
              {route.kind === 'tab' && tab === 'admin' && (
                <AdminScreen
                  onBack={() => goTab('account')}
                  onOpenProfile={goProfile}
                />
              )}
              {route.kind === 'tab' && tab === 'settings' && <SettingsScreen />}
            </SuspenseReveal>
          </Suspense>
        </RouteEnter>
      </AnimatePresence>
    </AppShell>
  );
}

export default function App() {
  return (
    <GameProvider>
      <FeedbackProvider>
        <AppRoutes />
        <Suspense fallback={null}>
          <CelebrationLayer />
        </Suspense>
        <Analytics />
      </FeedbackProvider>
    </GameProvider>
  );
}
