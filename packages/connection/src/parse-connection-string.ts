// Inspired by https://github.com/brianc/node-postgres/blob/master/packages/pg-connection-string/index.js
import { SafeURL } from '@conar/shared/utils/safe-url'

export type SSLConfig = {
  rejectUnauthorized?: boolean
  cert?: string
  key?: string
  ca?: string
  passphrase?: string
  servername?: string
} | boolean

export interface Config {
  user?: string
  password?: string
  host?: string
  port?: number
  database?: string
  ssl?: SSLConfig
}

export function parseConnectionString(connectionString: string): Config {
  // Check if this is ADO.NET format (key=value pairs with semicolons)
  // ADO.NET format doesn't contain ://
  if (!connectionString.includes('://') && connectionString.includes(';')) {
    return parseADOConnectionString(connectionString)
  }

  // URL format parsing
  const parsed = new SafeURL(connectionString)

  const config: Config = {
    user: parsed.username || undefined,
    password: parsed.password || undefined,
    host: parsed.hostname,
    port: parsed.port ? Number.parseInt(parsed.port, 10) : undefined,
    database: parsed.pathname && parsed.pathname !== '/' ? parsed.pathname.slice(1) : undefined,
  }

  const ssl = parseSSLConfig(parsed.searchParams)

  return {
    ...config,
    ...(ssl !== undefined && ssl !== null ? { ssl } : {}),
  }
}

function parseADOConnectionString(connectionString: string): Config {
  const config: Config = {}

  // Split by semicolon and parse key=value pairs
  const pairs = connectionString.split(';').filter(pair => pair.trim())

  for (const pair of pairs) {
    const [key, ...valueParts] = pair.split('=')
    if (!key)
      continue
    const value = valueParts.join('=').trim() // Rejoin in case value contains '='
    const normalizedKey = key.trim().toLowerCase()

    switch (normalizedKey) {
      case 'server':
      case 'host':
      case 'data source':
      case 'datasource':
      case 'address':
      case 'addr':
      case 'network address':
        config.host = value
        break
      case 'port':
        config.port = Number.parseInt(value, 10)
        break
      case 'user':
      case 'user id':
      case 'userid':
      case 'username':
      case 'uid':
        config.user = value
        break
      case 'password':
      case 'pwd':
        config.password = value
        break
      case 'database':
      case 'initial catalog':
      case 'initialcatalog':
        config.database = value
        break
      case 'encrypt':
      case 'ssl':
        // Handle boolean-ish values
        const normalizedValue = value.toLowerCase()
        if (normalizedValue === 'true' || normalizedValue === '1' || normalizedValue === 'yes') {
          config.ssl = true
        }
        else if (normalizedValue === 'false' || normalizedValue === '0' || normalizedValue === 'no') {
          config.ssl = false
        }
        break
      case 'trustservercertificate':
      case 'trust server certificate':
        // This is the inverse of rejectUnauthorized
        const trustValue = value.toLowerCase()
        if (trustValue === 'true' || trustValue === '1' || trustValue === 'yes') {
          config.ssl = { rejectUnauthorized: false }
        }
        break
    }
  }

  return config
}

export function parseSSLConfig(searchParams: URLSearchParams): Config['ssl'] {
  const sslMode = searchParams.get('sslmode')
  const ssl = searchParams.get('ssl')
  const sslCert = searchParams.get('sslcert')
  const sslKey = searchParams.get('sslkey')
  const sslRootCert = searchParams.get('sslrootcert')
  const sslPassword = searchParams.get('sslpassword')
  const sslServername = searchParams.get('sslservername')

  const hasMainSSLParams = sslCert || sslKey || sslRootCert || sslPassword || sslServername

  if (sslMode || hasMainSSLParams) {
    if (sslMode === 'disable' && hasMainSSLParams) {
      throw new Error('sslmode=disable cannot be used with SSL certificate parameters (sslcert, sslkey, sslrootcert, sslpassword, sslservername)')
    }

    if (sslMode && !hasMainSSLParams) {
      if (sslMode === 'disable') {
        return false
      }
      if (sslMode === 'no-verify') {
        return { rejectUnauthorized: false }
      }
      if (sslMode === 'verify') {
        return { rejectUnauthorized: true }
      }
    }

    const sslConfig: SSLConfig = {
      ...(sslMode && (
        ['prefer', 'no-verify'].includes(sslMode)
        || (sslMode === 'require' && !sslRootCert && !hasMainSSLParams)
      )
        ? {
            rejectUnauthorized: false,
          }
        : {}),
      ...(sslCert ? { cert: sslCert } : {}),
      ...(sslKey ? { key: sslKey } : {}),
      ...(sslRootCert ? { ca: sslRootCert } : {}),
      ...(sslPassword ? { passphrase: sslPassword } : {}),
      ...(sslServername ? { servername: sslServername } : {}),
    }

    return sslConfig
  }

  if (ssl === '1' || ssl?.toLowerCase() === 'true') {
    return true
  }
  if (ssl === '0' || ssl?.toLowerCase() === 'false') {
    return false
  }
}
