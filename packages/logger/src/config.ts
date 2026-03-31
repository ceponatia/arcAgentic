const isProduction = process.env['NODE_ENV'] === 'production';

export const LOG_LEVEL = process.env['LOG_LEVEL'] ?? (isProduction ? 'info' : 'debug');

export const PRETTY_TRANSPORT = isProduction
  ? undefined
  : { target: 'pino-pretty', options: { colorize: true } };
