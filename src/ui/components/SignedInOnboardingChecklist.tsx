import { useEffect, useState } from 'react';
import { useSession } from '../../lib/auth-client';
import { loadOnboarding, saveOnboarding } from '../../lib/onboarding';
import type { TabId } from '../../lib/routes';

type ChecklistNav = {
  onGoAccount?: () => void;
  onGoTab?: (tab: TabId) => void;
  onSelectRanked?: () => void;
};

/**
 * Signed-in first-run checklist: username → Ranked → Journey → Features.
 * Guest account tip stays in OnboardingTip.
 */
export function SignedInOnboardingChecklist({
  onGoAccount,
  onGoTab,
  onSelectRanked,
}: ChecklistNav) {
  const { data: session } = useSession();
  const [show, setShow] = useState(false);
  const username =
    typeof session?.user?.username === 'string'
      ? session.user.username.trim()
      : '';

  useEffect(() => {
    if (!session?.user) {
      setShow(false);
      return;
    }
    const ob = loadOnboarding();
    setShow(!ob.dismissedSignedInChecklist);
  }, [session?.user]);

  if (!show || !session?.user) return null;

  const steps: {
    id: string;
    done: boolean;
    label: string;
    action?: () => void;
    actionLabel?: string;
  }[] = [
    {
      id: 'username',
      done: Boolean(username),
      label: username
        ? `Public handle @${username}`
        : 'Claim a public @username',
      action: onGoAccount,
      actionLabel: 'Account',
    },
    {
      id: 'ranked',
      done: false,
      label: 'Try Ranked (server rolls + quota)',
      action: onSelectRanked,
      actionLabel: 'Ranked',
    },
    {
      id: 'journey',
      done: false,
      label: 'Browse Journey badges in Codex',
      action: onGoTab ? () => onGoTab('collection') : undefined,
      actionLabel: 'Codex',
    },
    {
      id: 'features',
      done: false,
      label: 'Visit Features to upvote ideas',
      action: onGoTab ? () => onGoTab('features') : undefined,
      actionLabel: 'Features',
    },
  ];

  return (
    <div className="w-full max-w-lg rounded-lg border border-(--outline) bg-(--surface-raised) p-4 text-left">
      <p className="text-base font-bold text-(--prose)">Getting started</p>
      <p className="mt-1 text-sm leading-relaxed text-(--prose-2)">
        A quick tour of Ranked, Journey, and Features — dismiss anytime.
      </p>
      <ul className="mt-3 space-y-2">
        {steps.map((s) => (
          <li
            key={s.id}
            className="flex flex-wrap items-center justify-between gap-2 text-sm"
          >
            <span
              className={
                s.done ? 'text-(--prose-3) line-through' : 'text-(--prose)'
              }
            >
              {s.done ? '✓ ' : '○ '}
              {s.label}
            </span>
            {!s.done && s.action && s.actionLabel && (
              <button
                type="button"
                className="rounded-md border border-(--outline) px-2.5 py-1 text-xs font-semibold text-(--prose-2) hover:border-(--prose) hover:text-(--prose)"
                onClick={s.action}
              >
                {s.actionLabel}
              </button>
            )}
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="mt-3 border border-(--outline) px-3 py-2 text-sm font-semibold text-(--prose-2)"
        onClick={() => {
          saveOnboarding({ dismissedSignedInChecklist: true });
          setShow(false);
        }}
      >
        Dismiss
      </button>
    </div>
  );
}
