import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  ConfirmOptions,
  ConfirmRequest,
  PromptOptions,
  PromptRequest,
} from './dialogTypes';
import { enqueueToast, type ToastTone } from './toastManager';
import { ConfirmDialogHost } from './ConfirmDialogHost';
import { PromptDialogHost } from './PromptDialogHost';
import { ToastViewport } from './ToastViewport';

type FeedbackApi = {
  confirmAsync: (options: ConfirmOptions) => Promise<boolean>;
  promptAsync: (options: PromptOptions) => Promise<string | null>;
  toast: {
    info: (description: string, title?: string) => void;
    error: (description: string, title?: string) => void;
  };
};

const FeedbackContext = createContext<FeedbackApi | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [confirmReq, setConfirmReq] = useState<ConfirmRequest | null>(null);
  const [promptReq, setPromptReq] = useState<PromptRequest | null>(null);
  const confirmBusy = useRef(false);
  const promptBusy = useRef(false);

  const confirmAsync = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      if (confirmBusy.current) {
        resolve(false);
        return;
      }
      confirmBusy.current = true;
      setConfirmReq({
        ...options,
        resolve: (value) => {
          confirmBusy.current = false;
          setConfirmReq(null);
          resolve(value);
        },
      });
    });
  }, []);

  const promptAsync = useCallback((options: PromptOptions) => {
    return new Promise<string | null>((resolve) => {
      if (promptBusy.current) {
        resolve(null);
        return;
      }
      promptBusy.current = true;
      setPromptReq({
        ...options,
        resolve: (value) => {
          promptBusy.current = false;
          setPromptReq(null);
          resolve(value);
        },
      });
    });
  }, []);

  const toast = useMemo(
    () => ({
      info: (description: string, title?: string) =>
        enqueueToast(description, 'info' satisfies ToastTone, title),
      error: (description: string, title?: string) =>
        enqueueToast(description, 'error' satisfies ToastTone, title),
    }),
    [],
  );

  const api = useMemo(
    () => ({ confirmAsync, promptAsync, toast }),
    [confirmAsync, promptAsync, toast],
  );

  return (
    <FeedbackContext.Provider value={api}>
      {children}
      <ConfirmDialogHost request={confirmReq} />
      <PromptDialogHost request={promptReq} />
      <ToastViewport />
    </FeedbackContext.Provider>
  );
}

export function useFeedback(): FeedbackApi {
  const ctx = useContext(FeedbackContext);
  if (!ctx) {
    throw new Error('useFeedback must be used within FeedbackProvider');
  }
  return ctx;
}

/** Toast-only convenience (same as `useFeedback().toast`). */
export function useToast() {
  return useFeedback().toast;
}
