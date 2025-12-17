// Example logger utility for Node.js backend
// Place this at: apps/server/src/logger.ts

const isDev = process.env.NODE_ENV !== 'production'

export const log = (...args: any[]) => {
  if (isDev) {
    console.log(...args)
  }
}

export const error = (...args: any[]) => {
  // Always log errors, even in production
  console.error(...args)
}

// Usage example:
// import { log, error } from './logger'
// 
// log('[S] ws connected', remoteAddress) // Only in dev
// error('[S] JWT verification failed', err) // Always logs
