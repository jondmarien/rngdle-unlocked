/**
 * App-wide structured logger (browser + shared helpers).
 *
 * Levels: debug < info < warn < error
 * - Dev (import.meta.env.DEV): default level = debug
 * - Prod: default level = info
 * Override anytime:
 *   localStorage.setItem('rngdle:logLevel', 'debug' | 'info' | 'warn' | 'error' | 'silent')
 *   localStorage.setItem('rngdle:logBuffer', '1') // keep last 200 entries for dump
 *
 * Dump buffer: window.__rngdleLog.dump()
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

type LogEntry = {
  t: string;
  level: Exclude<LogLevel, 'silent'>;
  scope: string;
  msg: string;
  data?: unknown;
};

const RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

const BUFFER_MAX = 200;
const buffer: LogEntry[] = [];

function envDefaultLevel(): LogLevel {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('rngdle:logLevel') as LogLevel | null;
      if (stored && stored in RANK) return stored;
    }
  } catch {
    /* private mode */
  }
  try {
    return import.meta.env.DEV ? 'debug' : 'info';
  } catch {
    return 'info';
  }
}

let minLevel: LogLevel = envDefaultLevel();

function bufferEnabled(): boolean {
  try {
    return localStorage.getItem('rngdle:logBuffer') === '1';
  } catch {
    return false;
  }
}

function shouldLog(level: Exclude<LogLevel, 'silent'>): boolean {
  return RANK[level] >= RANK[minLevel];
}

function pushBuffer(entry: LogEntry): void {
  if (!bufferEnabled() && minLevel !== 'debug') return;
  buffer.push(entry);
  if (buffer.length > BUFFER_MAX) buffer.shift();
}

function emit(
  level: Exclude<LogLevel, 'silent'>,
  scope: string,
  msg: string,
  data?: unknown,
): void {
  const entry: LogEntry = {
    t: new Date().toISOString(),
    level,
    scope,
    msg,
    data,
  };
  pushBuffer(entry);
  if (!shouldLog(level)) return;

  const prefix = `[rngdle:${scope}]`;
  const args =
    data !== undefined ? [prefix, msg, data] : [prefix, msg];

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
  /** Time an async op; logs duration on settle. */
  time: <T>(label: string, fn: () => Promise<T>) => Promise<T>;
};

function makeLogger(scope: string): Logger {
  return {
    debug: (msg, data) => emit('debug', scope, msg, data),
    info: (msg, data) => emit('info', scope, msg, data),
    warn: (msg, data) => emit('warn', scope, msg, data),
    error: (msg, data) => emit('error', scope, msg, data),
    child: (sub) => makeLogger(`${scope}:${sub}`),
    async time(label, fn) {
      const start = performance.now?.() ?? Date.now();
      emit('debug', scope, `${label}:start`);
      try {
        const result = await fn();
        const ms = Math.round((performance.now?.() ?? Date.now()) - start);
        emit('info', scope, `${label}:ok`, { ms });
        return result;
      } catch (err) {
        const ms = Math.round((performance.now?.() ?? Date.now()) - start);
        emit('error', scope, `${label}:fail`, {
          ms,
          err: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }
    },
  };
}

export const log = makeLogger('app');

export function createLogger(scope: string): Logger {
  return makeLogger(scope);
}

export function setLogLevel(level: LogLevel): void {
  minLevel = level;
  try {
    localStorage.setItem('rngdle:logLevel', level);
  } catch {
    /* ignore */
  }
  emit('info', 'logger', `level=${level}`);
}

export function getLogBuffer(): readonly LogEntry[] {
  return buffer;
}

export function dumpLogBuffer(): LogEntry[] {
  const copy = [...buffer];
  console.info('[rngdle:logger] buffer dump', copy);
  return copy;
}

/** Race a promise against a timeout; rejects with a clear Error. */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`${label} timed out after ${ms}ms`));
        }, ms);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

// Devtools helpers
declare global {
  interface Window {
    __rngdleLog?: {
      setLevel: typeof setLogLevel;
      dump: typeof dumpLogBuffer;
      buffer: typeof getLogBuffer;
    };
  }
}

if (typeof window !== 'undefined') {
  window.__rngdleLog = {
    setLevel: setLogLevel,
    dump: dumpLogBuffer,
    buffer: getLogBuffer,
  };
}
