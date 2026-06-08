/**
 * Minimal, injectable logger. A library should not spam stderr by default, so the
 * default sink is silent; consumers opt in via `setLogger` (e.g. `stderrLogger()`).
 * stdout is never written to — it stays clean for any stdio-based consumer.
 */
export interface Logger {
  debug(msg: string): void;
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
}

const noop = (): void => {};
export const silentLogger: Logger = { debug: noop, info: noop, warn: noop, error: noop };

/** Logs to stderr (stdout stays clean). */
export function stderrLogger(prefix = '[adt-ls]'): Logger {
  const w =
    (level: string) =>
    (msg: string): void => {
      process.stderr.write(`${prefix} ${level}: ${msg}\n`);
    };
  return { debug: w('debug'), info: w('info'), warn: w('warn'), error: w('error') };
}

let current: Logger = silentLogger;

/** Stable logger handle — import this; the active sink is swapped via `setLogger`. */
export const logger: Logger = {
  debug: (m) => current.debug(m),
  info: (m) => current.info(m),
  warn: (m) => current.warn(m),
  error: (m) => current.error(m),
};

export function setLogger(l: Logger): void {
  current = l;
}
