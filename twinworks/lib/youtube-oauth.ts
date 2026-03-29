import { getYoutubeTokens, setYoutubeTokens, type YoutubeTokens } from './youtube-tokens'

const SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/yt-analytics.readonly',
]

export function getGoogleAuthUrl(redirectUri: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID is not set')
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent', // force refresh_token
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<YoutubeTokens> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new Error('Google OAuth credentials not configured')

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Token exchange failed: ${res.status} ${err}`)
  }
  const data = (await res.json()) as {
    access_token: string
    refresh_token?: string
    expires_in: number
  }
  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()
  const tokens: YoutubeTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? '',
    expiresAt,
  }
  await setYoutubeTokens(tokens)
  return tokens
}

export async function refreshAccessToken(): Promise<YoutubeTokens | null> {
  const current = await getYoutubeTokens()
  if (!current?.refreshToken) return null
  if (new Date(current.expiresAt) > new Date(Date.now() + 5 * 60 * 1000)) {
    return current
  }
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) return null

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: current.refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) return null
  const data = (await res.json()) as { access_token: string; expires_in: number }
  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()
  const tokens: YoutubeTokens = {
    ...current,
    accessToken: data.access_token,
    expiresAt,
  }
  await setYoutubeTokens(tokens)
  return tokens
}

export async function getValidAccessToken(): Promise<string | null> {
  let tokens = await getYoutubeTokens()
  if (!tokens) return null
  tokens = await refreshAccessToken()
  return tokens?.accessToken ?? null
}
