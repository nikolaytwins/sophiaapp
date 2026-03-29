import { NextResponse } from 'next/server'
import { getYoutubeVideosTable } from '@/lib/youtube-data'

export async function GET() {
  try {
    const items = await getYoutubeVideosTable({ maxVideos: 200 })
    return NextResponse.json(items)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
