export const envString = (name: string, defaultValue?: string): string => {
  const val = process.env[name]
  if (typeof val === 'undefined') {
    if (defaultValue !== undefined) return defaultValue
    throw new Error(
      `environment variable '${name}' does not exist and no default value is provided, env vars: ${JSON.stringify(
        process.env
      )}`
    )
  }
  return (val as string).trim()
}

export const envInt = (name: string, defaultValue?: number): number => {
  const val = process.env[name]
  if (typeof val === 'undefined') {
    if (defaultValue !== undefined) return defaultValue
    throw new Error(`environment variable '${name}' does not exist, and no default vaue is provided`)
  }
  return parseInt((val as string).trim())
}
