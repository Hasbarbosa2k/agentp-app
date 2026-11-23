/**
 * Logger utility que desativa logs em produção
 * Usar em vez de console.log direto
 */

const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
  
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args);
  },
  
  error: (...args: unknown[]) => {
    // Erros sempre são logados
    console.error(...args);
  },
  
  debug: (...args: unknown[]) => {
    if (isDev) console.debug(...args);
  },
  
  info: (...args: unknown[]) => {
    if (isDev) console.info(...args);
  },
  
  table: (data: unknown) => {
    if (isDev) console.table(data);
  },
  
  group: (label: string) => {
    if (isDev) console.group(label);
  },
  
  groupEnd: () => {
    if (isDev) console.groupEnd();
  },
  
  time: (label: string) => {
    if (isDev) console.time(label);
  },
  
  timeEnd: (label: string) => {
    if (isDev) console.timeEnd(label);
  }
};

// Alias para retrocompatibilidade
export const devLog = logger.log;
export const devWarn = logger.warn;

export default logger;
