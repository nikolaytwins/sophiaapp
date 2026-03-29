import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForTokens } from '@/lib/youtube-oauth'
import { setYoutubeTokens } from '@/lib/youtube-tokens'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const error = request.nextUrl.searchParams.get('error')
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const redirectUri = `${baseUrl.replace(/\/$/, '')}/api/youtube/callback`
  const creatorUrl = `${baseUrl.replace(/\/$/, '')}/creator/youtube`

  if (error) {
    return NextResponse.redirect(`${creatorUrl}?error=${encodeURIComponent(error)}`)
  }
  if (!code) {
    return NextResponse.redirect(`${creatorUrl}?error=no_code`)
  }
  try {
    const tokens = await exchangeCodeForTokens(code, redirectUri)
    const channelId = await fetchChannelId(tokens.accessToken)
    if (channelId) {
      const channelTitle = await fetchChannelTitle(tokens.accessToken, channelId)
      await setYoutubeTokens({
        ...tokens,
        channelId,
        channelTitle: channelTitle ?? undefined,
      })
    }
    return NextResponse.redirect(`${creatorUrl}?connected=1`)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.redirect(`${creatorUrl}?error=${encodeURIComponent(message)}`)
  }
}

async function fetchChannelId(accessToken: string): Promise<string | null> {
  const res = await fetch(
    'https://www.googleapis.com/youtube/v3/channels?part=id,snippet&mine=true',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!res.ok) return null
  const data = (await res.json()) as { items?: { id: string }[] }
  return data.items?.[0]?.id ?? null
}

async function fetchChannelTitle(accessToken: string, channelId: string): Promise<string | null> {
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!res.ok) return null
  const data = (await res.json()) as { items?: { snippet?: { title?: string } }[] }
  return data.items?.[0]?.snippet?.title ?? null
}
