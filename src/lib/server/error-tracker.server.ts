// Production-ready error reporting abstraction.
// Supports future integrations such as Sentry, Vercel monitoring, or structured logging.

export type ErrorContext = Record<string, unknown>;

export interface ErrorTracker {
  captureException(error: Error, context?: ErrorContext): void;
  captureMessage(message: string, context?: ErrorContext): void;
}

class ConsoleErrorTracker implements ErrorTracker {
  captureException(error: Error, context?: ErrorContext) {
    console.error("[error-tracker] exception:", error, context ?? {});
  }

  captureMessage(message: string, context?: ErrorContext) {
    console.warn("[error-tracker] message:", message, context ?? {});
  }
}

function redactSecrets(context: ErrorContext | undefined): ErrorContext | undefined {
  if (!context) return context;
  const redacted: ErrorContext = {};
  for (const [key, value] of Object.entries(context)) {
    const lower = key.toLowerCase();
    if (
      lower.includes("password") ||
      lower.includes("token") ||
      lower.includes("secret") ||
      lower.includes("key") ||
      lower.includes("api_key")
    ) {
      redacted[key] = typeof value === "string" ? "[REDACTED]" : value;
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

let tracker: ErrorTracker = new ConsoleErrorTracker();

export function setErrorTracker(newTracker: ErrorTracker): void {
  tracker = newTracker;
}

export function getErrorTracker(): ErrorTracker {
  return tracker;
}

export function captureException(error: Error, context?: ErrorContext): void {
  tracker.captureException(error, redactSecrets(context));
}

export function captureMessage(message: string, context?: ErrorContext): void {
  tracker.captureMessage(message, redactSecrets(context));
}
