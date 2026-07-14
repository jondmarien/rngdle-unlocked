export type ConfirmOptions = {
  title: string;
  body: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

export type PromptOptions = {
  title: string;
  body: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Return an error message to block submit, or null/undefined to accept. */
  validate?: (value: string) => string | null | undefined;
};

export type ConfirmRequest = ConfirmOptions & {
  resolve: (value: boolean) => void;
};

export type PromptRequest = PromptOptions & {
  resolve: (value: string | null) => void;
};
