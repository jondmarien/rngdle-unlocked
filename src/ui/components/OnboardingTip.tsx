import { useEffect, useState } from 'react';
import { useSession } from '../../lib/auth-client';
import { loadOnboarding, saveOnboarding } from '../../lib/onboarding';
import { useGame } from '../../state/GameProvider';

/** First-roll + create-account tip (feature 6). */
export function OnboardingTip({ onGoAccount }: { onGoAccount?: () => void }) {
  const { data: session } = useSession();
  const { lifetimeRollCount, lastRoll } = useGame();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (session?.user) {
      setShow(false);
      return;
    }
    const ob = loadOnboarding();
    if (ob.dismissedAccountTip) {
      setShow(false);
      return;
    }
    if (lifetimeRollCount >= 1 || lastRoll) {
      if (!ob.hasRolledOnce) saveOnboarding({ hasRolledOnce: true });
      setShow(true);
    }
  }, [session?.user, lifetimeRollCount, lastRoll]);

  if (!show) return null;

  return (
    <div className="mb-4 rounded-lg border-2 border-[var(--accent)] bg-[var(--surface-raised)] p-3 text-sm shadow-sm">
      <p className="font-bold uppercase tracking-wider text-[var(--prose)]">
        Nice roll 🎲
      </p>
      <p className="mt-1 text-[var(--prose-2)]">
        Create an account to keep progress forever, climb the board, and get a
        public share link for rare hits.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {onGoAccount && (
          <button
            type="button"
            className="border-2 border-[var(--prose)] bg-[var(--prose)] px-3 py-1.5 text-xs font-bold uppercase text-[var(--bg)]"
            onClick={onGoAccount}
          >
            Create account
          </button>
        )}
        <button
          type="button"
          className="border border-[var(--outline)] px-3 py-1.5 text-xs font-bold uppercase text-[var(--prose-3)]"
          onClick={() => {
            saveOnboarding({ dismissedAccountTip: true });
            setShow(false);
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
