import { profileAvatarSrc } from '../../lib/profile-avatars';
import { frameStyles, normalizeProfileFrame } from '../../lib/profile-frames';

type Size = 'sm' | 'md' | 'lg';

const SIZE: Record<Size, string> = {
  sm: 'h-10 w-10 text-base',
  md: 'h-16 w-16 text-2xl',
  lg: 'h-20 w-20 text-3xl',
};

/**
 * Public profile / Account preview avatar with optional subscription frame chrome.
 * Outer wrap stays overflow-visible so frame rings/glow are not clipped.
 */
export function ProfileAvatar({
  username,
  image,
  avatarId,
  frameId,
  accentRingClass,
  size = 'md',
  className = '',
}: {
  username?: string | null;
  image?: string | null;
  avatarId?: string | null;
  frameId?: string | null;
  /** Accent ring from profile theme (used when frame is `none`). */
  accentRingClass?: string;
  size?: Size;
  className?: string;
}) {
  const initial = (username?.[0] ?? '?').toUpperCase();
  const src = profileAvatarSrc(avatarId) ?? image ?? null;
  const frame = normalizeProfileFrame(frameId);
  const chrome =
    frame === 'none'
      ? `border-2 border-(--outline) ring-2 ${accentRingClass ?? 'ring-(--outline)'}`
      : `border-2 border-transparent ${frameStyles(frame)}`;

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-visible rounded-full bg-(--surface) font-bold ${SIZE[size]} ${chrome} ${className}`}
      aria-hidden
    >
      <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full">
        {src ? (
          <img
            src={src}
            alt=""
            className="h-full w-full rounded-full object-cover"
          />
        ) : (
          initial
        )}
      </div>
    </div>
  );
}
