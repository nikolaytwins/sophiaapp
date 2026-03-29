import { NextResponse } from 'next/server'
import { getYoutubeOverviewStats, getYoutubeChannelOverview } from '@/lib/youtube-data'

export async function GET() {
  try {
    const [stats, channel] = await Promise.all([
      getYoutubeOverviewStats(),
      getYoutubeChannelOverview(),
    ])
    if (!stats || !channel) {
      return NextResponse.json(
        { error: 'YouTube not connected or no data' },
        { status: 404 }
      )
    }
    return NextResponse.json({ stats, channel })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
