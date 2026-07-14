import { Toast } from '@base-ui/react/toast';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { MOTION_EASE, MOTION_MS } from '../motion/tokens';
import { appToastManager } from './toastManager';

export function ToastViewport() {
  const reduceMotion = useReducedMotion();

  return (
    <Toast.Provider toastManager={appToastManager} timeout={4000}>
      <ToastList reduceMotion={!!reduceMotion} />
    </Toast.Provider>
  );
}

function ToastList({ reduceMotion }: { reduceMotion: boolean }) {
  const { toasts } = Toast.useToastManager();
  const enter = MOTION_MS.standard / 1000;
  const exit = (MOTION_MS.standard * 0.7) / 1000;

  return (
    <Toast.Portal>
      <Toast.Viewport className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => {
            const isError = toast.type === 'error';
            return (
              <Toast.Root
                key={toast.id}
                toast={toast}
                className="pointer-events-auto w-full max-w-sm"
                render={
                  <motion.div
                    layout
                    initial={
                      reduceMotion ? false : { opacity: 0, y: 12, scale: 0.98 }
                    }
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={
                      reduceMotion
                        ? undefined
                        : {
                            opacity: 0,
                            y: 8,
                            scale: 0.98,
                            transition: {
                              duration: exit,
                              ease: 'easeIn',
                            },
                          }
                    }
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : { duration: enter, ease: MOTION_EASE }
                    }
                  />
                }
              >
                <Toast.Content
                  className={`rounded-lg border px-3 py-2.5 shadow-lg ${
                    isError
                      ? 'border-red-500/40 bg-red-500/10 text-red-800 dark:text-red-300'
                      : 'border-(--outline) bg-(--surface) text-(--prose)'
                  }`}
                  role={isError ? 'alert' : 'status'}
                >
                  {toast.title ? (
                    <Toast.Title className="text-sm font-semibold">
                      {toast.title}
                    </Toast.Title>
                  ) : null}
                  {toast.description ? (
                    <Toast.Description className="text-sm leading-snug text-(--prose-2)">
                      {toast.description}
                    </Toast.Description>
                  ) : null}
                  <Toast.Close
                    className="mt-1 text-xs font-semibold text-(--prose-3) hover:text-(--prose)"
                    aria-label="Dismiss"
                  >
                    Dismiss
                  </Toast.Close>
                </Toast.Content>
              </Toast.Root>
            );
          })}
        </AnimatePresence>
      </Toast.Viewport>
    </Toast.Portal>
  );
}
