import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect } from 'react';
import { FormattedCount } from './FormattedCount';

export type BadgeArtLightboxItem = {
  image: string;
  name: string;
  description?: string;
  ep?: number;
  kind?: string;
  /** Shared-element id with the thumbnail that opened this lightbox. */
  layoutId?: string;
};

/** Full-resolution badge art overlay (Profile / Codex / Home unlocks). */
export function BadgeArtLightbox({
  item,
  onClose,
}: {
  item: BadgeArtLightboxItem;
  onClose: () => void;
}) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        key={item.image + item.name}
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
        role="dialog"
        aria-modal="true"
        aria-label={item.name}
        onClick={onClose}
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={reduceMotion ? undefined : { opacity: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.18 }}
      >
        <motion.div
          className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-lg border-2 border-(--outline) bg-(--surface) shadow-xl"
          onClick={(e) => e.stopPropagation()}
          initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0, scale: 0.96 }}
          transition={{ duration: reduceMotion ? 0 : 0.2 }}
        >
          <div className="flex items-center justify-between border-b border-(--outline) px-4 py-3">
            <h2 className="truncate text-lg font-bold tracking-tight">
              {item.name}
            </h2>
            <button
              type="button"
              className="shrink-0 text-sm font-semibold text-(--prose-3) hover:text-(--prose)"
              onClick={onClose}
            >
              Close
            </button>
          </div>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            <motion.img
              layoutId={reduceMotion ? undefined : item.layoutId}
              src={item.image}
              alt={item.name}
              className="mx-auto max-h-[min(70dvh,28rem)] w-full rounded-xl border border-(--outline) object-contain"
            />
            {item.kind && (
              <p className="text-xs font-semibold uppercase tracking-wide text-(--prose-3)">
                {item.kind}
              </p>
            )}
            {item.description && (
              <p className="text-sm leading-relaxed text-(--prose-2)">
                {item.description}
              </p>
            )}
            {item.ep != null && item.ep > 0 && (
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                +<FormattedCount value={item.ep} /> life EP
              </p>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
