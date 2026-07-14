import { Dialog } from '@base-ui/react/dialog';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useId, useRef, useState } from 'react';
import type { PromptRequest } from './dialogTypes';

export function PromptDialogHost({
  request,
}: {
  request: PromptRequest | null;
}) {
  const reduceMotion = useReducedMotion();
  const open = request != null;
  const inputId = useId();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const settled = useRef(false);

  useEffect(() => {
    settled.current = false;
    if (request) {
      setValue(request.defaultValue ?? '');
      setError(null);
    }
  }, [request]);

  const settle = (next: string | null) => {
    if (!request || settled.current) return;
    settled.current = true;
    request.resolve(next);
  };

  const submit = () => {
    if (!request) return;
    const next = value;
    const err = request.validate?.(next);
    if (err) {
      setError(err);
      return;
    }
    settle(next);
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) settle(null);
      }}
    >
      <AnimatePresence>
        {open && request && (
          <Dialog.Portal keepMounted>
            <Dialog.Backdrop
              className="fixed inset-0 z-50 bg-black/70"
              render={
                <motion.div
                  initial={reduceMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={reduceMotion ? undefined : { opacity: 0 }}
                  transition={{ duration: reduceMotion ? 0 : 0.15 }}
                />
              }
            />
            <Dialog.Viewport className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
              <Dialog.Popup
                className="w-full max-w-md rounded-lg border-2 border-(--outline) bg-(--surface) p-4 shadow-xl outline-none"
                render={
                  <motion.div
                    initial={reduceMotion ? false : { opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={
                      reduceMotion ? undefined : { opacity: 0, scale: 0.95 }
                    }
                    transition={{ duration: reduceMotion ? 0 : 0.18 }}
                  />
                }
              >
                <Dialog.Title className="text-lg font-bold tracking-tight text-(--prose)">
                  {request.title}
                </Dialog.Title>
                <Dialog.Description className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-(--prose-2)">
                  {request.body}
                </Dialog.Description>
                <label htmlFor={inputId} className="sr-only">
                  {request.title}
                </label>
                <input
                  id={inputId}
                  autoFocus
                  value={value}
                  onChange={(e) => {
                    setValue(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      submit();
                    }
                  }}
                  className="mt-3 w-full rounded-md border border-(--outline) bg-(--bg) px-3 py-2 text-sm text-(--prose) outline-none focus-visible:border-(--accent)"
                />
                {error && (
                  <p
                    role="alert"
                    className="mt-2 text-sm text-red-600 dark:text-red-400"
                  >
                    {error}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <Dialog.Close
                    className="min-h-11 rounded-md border border-(--outline) px-3 py-2 text-sm font-semibold text-(--prose-2) hover:text-(--prose)"
                    onClick={() => settle(null)}
                  >
                    {request.cancelLabel ?? 'Cancel'}
                  </Dialog.Close>
                  <button
                    type="button"
                    className="min-h-11 rounded-md border-2 border-(--accent) bg-(--accent) px-3 py-2 text-sm font-semibold text-(--bg)"
                    onClick={submit}
                  >
                    {request.confirmLabel ?? 'OK'}
                  </button>
                </div>
              </Dialog.Popup>
            </Dialog.Viewport>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
