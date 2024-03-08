/**
 *
 * http://tostring.it/2014/06/23/advanced-logging-with-nodejs/
 *
 */

import { createLogger, format, transports } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

import { SHARD_NAME } from './config';

export const PIXELLOGGER_PREFIX = (SHARD_NAME)
  ? `./log/pixels-${SHARD_NAME}-` : './log/pixels-';
const PROXYLOGGER_PREFIX = (SHARD_NAME)
  ? `./log/proxycheck-${SHARD_NAME}-` : './log/proxycheck-';
const MODTOOLLOGGER_PREFIX = (SHARD_NAME)
  ? `./log/modtools-${SHARD_NAME}-` : './log/modtools-';

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.splat(),
    format.simple(),
  ),
  transports: [
    new transports.Console(),
  ],
});

export const pixelLogger = createLogger({
  format: format.printf(({ message }) => message),
  transports: [
    new DailyRotateFile({
      filename: `${PIXELLOGGER_PREFIX}%DATE%.log`,
      maxFiles: '14d',
      utc: true,
      colorize: false,
    }),
  ],
});

export const proxyLogger = createLogger({
  format: format.combine(
    format.splat(),
    format.simple(),
  ),
  transports: [
    new DailyRotateFile({
      level: 'info',
      filename: `${PROXYLOGGER_PREFIX}%DATE%.log`,
      maxsize: '10m',
      maxFiles: '14d',
      utc: true,
      colorize: false,
    }),
  ],
});

export const modtoolsLogger = createLogger({
  format: format.printf(({ message }) => message),
  transports: [
    new DailyRotateFile({
      level: 'info',
      filename: `${MODTOOLLOGGER_PREFIX}%DATE%.log`,
      maxSize: '20m',
      maxFiles: '14d',
      utc: true,
      colorize: false,
    }),
  ],
});



export default logger;
