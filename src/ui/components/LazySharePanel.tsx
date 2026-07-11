import { lazy, Suspense } from 'react';
import type { RollResult } from '../../game';

const SharePanel = lazy(() =>
  import('./ShareCard').then((m) => ({ default: m.SharePanel })),
);

export function LazySharePanel({
  roll,
  rollCount,
  showRollCount,
  showUnlockedBadges = false,
  unlockedSealNames = [],
  onClose,
  onGoAccount,
}: {
  roll: RollResult;
  rollCount: number;
  showRollCount: boolean;
  showUnlockedBadges?: boolean;
  unlockedSealNames?: string[];
  onClose: () => void;
  onGoAccount?: () => void;
}) {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <p className="rounded-md border border-(--outline) bg-(--surface) px-4 py-3 text-sm text-(--prose-2)">
            Loading share…
          </p>
        </div>
      }
    >
      <SharePanel
        roll={roll}
        rollCount={rollCount}
        showRollCount={showRollCount}
        showUnlockedBadges={showUnlockedBadges}
        unlockedSealNames={unlockedSealNames}
        onClose={onClose}
        onGoAccount={onGoAccount}
      />
    </Suspense>
  );
}
