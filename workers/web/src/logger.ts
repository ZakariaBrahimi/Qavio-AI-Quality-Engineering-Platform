/**
 * Structured JSON logging for the worker process — every line carries
 * whatever of testRunId/projectId/organizationId/jobId is known, so a log
 * aggregator can filter to one run's whole lifecycle. Never pass a
 * credential, token, or secret value as `context` or `extra` — both only
 * ever carry ids and short diagnostic strings (error messages, statuses)
 * in this codebase; nothing here reads `SUPABASE_SERVICE_ROLE_KEY`,
 * `REDIS_URL`, or any environment/credential secret.
 */
export interface LogContext {
  testRunId?: string;
  projectId?: string;
  organizationId?: string;
  jobId?: string;
}

type LogLevel = 'info' | 'warn' | 'error';

function write(level: LogLevel, message: string, context: LogContext, extra?: Record<string, unknown>): void {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
    ...extra,
  };

  const line = JSON.stringify(entry);
  // eslint-disable-next-line no-console
  if (level === 'error') console.error(line);
  // eslint-disable-next-line no-console
  else if (level === 'warn') console.warn(line);
  // eslint-disable-next-line no-console
  else console.log(line);
}

export const logger = {
  info: (message: string, context: LogContext = {}, extra?: Record<string, unknown>) =>
    write('info', message, context, extra),
  warn: (message: string, context: LogContext = {}, extra?: Record<string, unknown>) =>
    write('warn', message, context, extra),
  error: (message: string, context: LogContext = {}, extra?: Record<string, unknown>) =>
    write('error', message, context, extra),
};
