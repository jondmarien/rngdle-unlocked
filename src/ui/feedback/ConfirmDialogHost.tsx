import { AlertDialog } from '@base-ui/react/alert-dialog';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { MOTION_EASE, MOTION_MS } from '../motion/tokens';
import type { ConfirmRequest } from './dialogTypes';

export function ConfirmDialogHost({
  request,
}: {
  request: ConfirmRequest | null;
}) {
  const reduceMotion = useReducedMotion();
  const open = request != null;
  const settled = useRef(false);
  const backdropDur = MOTION_MS.quick / 1000;
  const popupEnter = MOTION_MS.standard / 1000;
  const popupExit = (MOTION_MS.standard * 0.7) / 1000;

  useEffect(() => {
    settled.current = false;
  }, [request]);

  const settle = (value: boolean) => {
    if (!request || settled.current) return;
    settled.current = true;
    request.resolve(value);
  };

  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) settle(false);
      }}
    >
      <AnimatePresence>
        {open && request && (
          <AlertDialog.Portal keepMounted>
            <AlertDialog.Backdrop
              className="fixed inset-0 z-50 bg-black/70"
              render={
                <motion.div
                  initial={reduceMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={
                    reduceMotion
                      ? undefined
                      : {
                          opacity: 0,
                          transition: {
                            duration: backdropDur * 0.7,
                            ease: 'easeIn',
                          },
                        }
                  }
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { duration: backdropDur, ease: MOTION_EASE }
                  }
                />
              }
            />
            <AlertDialog.Viewport className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
              <AlertDialog.Popup
                className="w-full max-w-md rounded-lg border-2 border-(--outline) bg-(--surface) p-4 shadow-xl outline-none"
                render={
                  <motion.div
                    initial={reduceMotion ? false : { opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={
                      reduceMotion
                        ? undefined
                        : {
                            opacity: 0,
                            scale: 0.95,
                            transition: {
                              duration: popupExit,
                              ease: 'easeIn',
                            },
                          }
                    }
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : { duration: popupEnter, ease: MOTION_EASE }
                    }
                  />
                }
              >
                <AlertDialog.Title className="text-lg font-bold tracking-tight text-(--prose)">
                  {request.title}
                </AlertDialog.Title>
                <AlertDialog.Description className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-(--prose-2)">
                  {request.body}
                </AlertDialog.Description>
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <AlertDialog.Close
                    className="min-h-11 rounded-md border border-(--outline) px-3 py-2 text-sm font-semibold text-(--prose-2) hover:text-(--prose)"
                    onClick={() => settle(false)}
                  >
                    {request.cancelLabel ?? 'Cancel'}
                  </AlertDialog.Close>
                  <AlertDialog.Close
                    className={
                      request.danger
                        ? 'min-h-11 rounded-md border border-red-600/50 bg-red-600/15 px-3 py-2 text-sm font-semibold text-red-700 dark:text-red-400'
                        : 'min-h-11 rounded-md border-2 border-(--accent) bg-(--accent) px-3 py-2 text-sm font-semibold text-(--bg)'
                    }
                    onClick={() => settle(true)}
                  >
                    {request.confirmLabel ?? 'Confirm'}
                  </AlertDialog.Close>
                </div>
              </AlertDialog.Popup>
            </AlertDialog.Viewport>
          </AlertDialog.Portal>
        )}
      </AnimatePresence>
    </AlertDialog.Root>
  );
}
