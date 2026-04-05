import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const AUTH_COOKIE = 'tw_site_auth'

export async function POST(request: NextRequest) {
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() ?? ''
  const isHttps = forwardedProto === 'https'
  const cookieStore = await cookies()
  cookieStore.set(AUTH_COOKIE, '', {
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
  return NextResponse.json({ ok: true })
}
