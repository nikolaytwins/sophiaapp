import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const AUTH_COOKIE = 'tw_site_auth'
const TOKEN = process.env.TW_SITE_AUTH_TOKEN || 'twinworks-secret-please-change'
const MAX_AGE = 60 * 60 * 24 * 90 // 90 дней

export async function GET() {
  const cookieStore = await cookies()
  const value = cookieStore.get(AUTH_COOKIE)?.value
  if (value === TOKEN) {
    return new NextResponse(null, { status: 200 })
  }
  return new NextResponse(null, { status: 401 })
}
