import { NextResponse } from 'next/server'
import { getYoutubeTokens } from '@/lib/youtube-tokens'

export async function GET() {
  const tokens = await getYoutubeTokens()
  return NextResponse.json({
    connected: !!tokens?.accessToken,
    channelId: tokens?.channelId ?? null,
    channelTitle: tokens?.channelTitle ?? null,
  })
}
