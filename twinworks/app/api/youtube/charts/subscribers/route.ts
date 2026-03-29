import { NextRequest, NextResponse } from 'next/server'
import { getYoutubeDailySubscribers } from '@/lib/youtube-data'

export async function GET(request: NextRequest) {
  const days = Math.min(90, Math.max(7, parseInt(request.nextUrl.searchParams.get('days') ?? '14', 10)))
  try {
    const data = await getYoutubeDailySubscribers(days)
    return NextResponse.json(data)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
