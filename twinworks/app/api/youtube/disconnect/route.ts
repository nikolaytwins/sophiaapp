import { NextResponse } from 'next/server'
import { clearYoutubeTokens } from '@/lib/youtube-tokens'

export async function POST() {
  await clearYoutubeTokens()
  return NextResponse.json({ ok: true })
}
