const isDev = process.env.NODE_ENV === 'development'

export const log = (...args: unknown[]) => {
  if (isDev) {
    console.log(...args)
  }
}

export const warn = (...args: unknown[]) => {
  if (isDev) {
    console.warn(...args)
  }
}

export const error = (...args: unknown[]) => {
  // Always log errors, even in production
  console.error(...args)
}
