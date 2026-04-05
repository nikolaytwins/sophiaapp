import { NextRequest, NextResponse } from 'next/server'

const NEO_COOKIE = 'twin_ui'

/** Выйти из Neo-оформления: сброс cookie и на дашборд. */
export async function GET(request: NextRequest) {
  const res = NextResponse.redirect(new URL('/me/dashboard', request.url))
  res.cookies.set(NEO_COOKIE, '', { path: '/', maxAge: 0 })
  return res
}
