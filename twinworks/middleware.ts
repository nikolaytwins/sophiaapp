import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const NEO_COOKIE = 'twin_ui'
const NEO_PREFIX = '/neo'

function isNeoScopedPath(pathname: string): boolean {
  if (pathname === '/agency' || pathname.startsWith('/agency/')) return true
  if (pathname === '/me/finance' || pathname.startsWith('/me/finance/')) return true
  if (pathname === '/me/transactions' || pathname.startsWith('/me/transactions/')) return true
  return false
}

function cookieSecure(request: NextRequest): boolean {
  const p = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
  return p === 'https' || request.nextUrl.protocol === 'https:'
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  if (pathname === '/') {
    return NextResponse.redirect(new URL('/me/dashboard', request.url))
  }

  // Вход в Neo: /neo/... → внутренний путь без префикса + cookie
  if (pathname.startsWith(NEO_PREFIX)) {
    if (pathname === NEO_PREFIX || pathname === `${NEO_PREFIX}/`) {
      return NextResponse.redirect(new URL(`${NEO_PREFIX}/agency`, request.url))
    }
    const internal = pathname.slice(NEO_PREFIX.length) || '/'
    if (!isNeoScopedPath(internal)) {
      return NextResponse.redirect(new URL('/me/dashboard', request.url))
    }
    const rewriteUrl = request.nextUrl.clone()
    rewriteUrl.pathname = internal
    const res = NextResponse.rewrite(rewriteUrl)
    res.cookies.set(NEO_COOKIE, 'neo', {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
      secure: cookieSecure(request),
    })
    return res
  }

  // Уже выбран Neo: любые прямые ссылки /agency, /me/finance, /me/transactions → /neo/...
  if (isNeoScopedPath(pathname) && request.cookies.get(NEO_COOKIE)?.value === 'neo') {
    const url = request.nextUrl.clone()
    url.pathname = `${NEO_PREFIX}${pathname}`
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)'],
}
