/**
 * Server/API structured logger (Vercel function logs).
 * Same shape as client logger, console-only (no localStorage).
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const minLevel: LogLevel =
  process.env.LOG_LEVEL === 'debug' || process.env.NODE_ENV !== 'production'
    ? 'debug'
    : 'info';

function emit(
  level: LogLevel,
  scope: string,
  msg: string,
  data?: unknown,
): void {
  if (RANK[level] < RANK[minLevel]) return;
  const prefix = `[rngdle:${scope}]`;
  const args = data !== undefined ? [prefix, msg, data] : [prefix, msg];
  switch (level) {
    case 'debug':
      console.debug(...args);
      break;
    case 'info':
      console.info(...args);
      break;
    case 'warn':
      console.warn(...args);
      break;
    case 'error':
      console.error(...args);
      break;
  }
}

export type Logger = {
  debug: (msg: string, data?: unknown) => void;
  info: (msg: string, data?: unknown) => void;
  warn: (msg: string, data?: unknown) => void;
  error: (msg: string, data?: unknown) => void;
  child: (sub: string) => Logger;
};

export function createLogger(scope: string): Logger {
  return {
    debug: (msg, data) => emit('debug', scope, msg, data),
    info: (msg, data) => emit('info', scope, msg, data),
    warn: (msg, data) => emit('warn', scope, msg, data),
    error: (msg, data) => emit('error', scope, msg, data),
    child: (sub) => createLogger(`${scope}:${sub}`),
  };
}

export const log = createLogger('server');
