export type Result<T extends Record<string, any>, E = Error> = Promise<{
  data: T
  error: null
} | {
  data: null
  error: E
}>