type LogLevel = "info" | "warn" | "error";

type LoggerContext = {
  service: string;
};

export type Logger = ReturnType<typeof createLogger>;

export function createLogger(context: LoggerContext) {
  function write(level: LogLevel, event: string, data: Record<string, unknown>) {
    const record = {
      level,
      event,
      service: context.service,
      timestamp: new Date().toISOString(),
      ...data,
    };

    console[level === "info" ? "log" : level](JSON.stringify(record));
  }

  return {
    info(event: string, data: Record<string, unknown> = {}) {
      write("info", event, data);
    },
    warn(event: string, data: Record<string, unknown> = {}) {
      write("warn", event, data);
    },
    error(event: string, data: Record<string, unknown> = {}) {
      write("error", event, data);
    },
  };
}

