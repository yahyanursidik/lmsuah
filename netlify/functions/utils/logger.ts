export const logger = {
  info: (action: string, data?: Record<string, unknown>) => {
    console.log(JSON.stringify({
      level: 'INFO',
      timestamp: new Date().toISOString(),
      action,
      ...data,
    }));
  },
  error: (action: string, error: unknown, data?: Record<string, unknown>) => {
    const errorDetails = error instanceof Error ? {
      message: error.message,
      name: error.name,
      // intentionally not logging stack trace to client, but logging it to stdout for debugging
      stack: error.stack,
    } : { message: String(error) };

    console.error(JSON.stringify({
      level: 'ERROR',
      timestamp: new Date().toISOString(),
      action,
      error: errorDetails,
      ...data,
    }));
  },
  warn: (action: string, data?: Record<string, unknown>) => {
    console.warn(JSON.stringify({
      level: 'WARN',
      timestamp: new Date().toISOString(),
      action,
      ...data,
    }));
  }
};
