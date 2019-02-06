const { createLogger, format, transports } = require('winston');
const { combine, timestamp, colorize, printf, label } = format;
const path = require('path');

const baseFromat = printf(info => `${info.timestamp} ${info.level} [${info.label}]: ${info.message}`);


const logger = caller => {
  const l = createLogger({
    level: 'info',
    format: combine(
      label({ label: path.basename(caller) }),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })
    ),
    defaultMeta: { service: 'user-service' },
    transports: [
      new transports.File({ filename: 'error.log', level: 'error', format: combine(baseFromat) }),
      new transports.File({ filename: 'combined.log', format: combine(baseFromat) })
    ]
  });

  if (process.env.NODE_ENV !== 'production') {
    l.add(new transports.Console({
      format: combine(
        colorize(),
        baseFromat
      )
    }));
  }
  return l;
};

module.exports = logger;