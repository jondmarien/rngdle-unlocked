import { Toast } from '@base-ui/react/toast';

/** Shared toast manager so non-hook code can enqueue toasts. */
export const appToastManager = Toast.createToastManager();

export type ToastTone = 'info' | 'error';

export function enqueueToast(
  description: string,
  tone: ToastTone = 'info',
  title?: string,
): string {
  return appToastManager.add({
    title: title ?? (tone === 'error' ? 'Error' : undefined),
    description,
    type: tone,
    timeout: 4000,
  });
}
