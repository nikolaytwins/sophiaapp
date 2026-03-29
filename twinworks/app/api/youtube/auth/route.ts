import { NextResponse } from 'next/server'
import { getGoogleAuthUrl } from '@/lib/youtube-oauth'

export function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const redirectUri = `${baseUrl.replace(/\/$/, '')}/api/youtube/callback`
  const url = getGoogleAuthUrl(redirectUri)
  return NextResponse.redirect(url)
}
