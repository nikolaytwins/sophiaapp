import { NextRequest, NextResponse } from 'next/server'
import { getYoutubeVideosTable } from '@/lib/youtube-data'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  const { videoId } = await params
  try {
    const items = await getYoutubeVideosTable({ maxVideos: 200 })
    const video = items.find((v) => v.id === videoId)
    if (!video) return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    return NextResponse.json(video)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
