import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { isValidSiteLogin } from '@/lib/site-credentials'

const AUTH_COOKIE = 'tw_site_auth'
const TOKEN = process.env.TW_SITE_AUTH_TOKEN || 'twinworks-secret-please-change'
const MAX_AGE = 60 * 60 * 24 * 90 // 90 дней

function getPublicOrigin(request: NextRequest): string {
  const configuredOrigin = process.env.TW_SITE_PUBLIC_ORIGIN?.trim()
  if (configuredOrigin) {
    return configuredOrigin
  }

  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
  const host = request.headers.get('host')?.split(',')[0]?.trim()

  if (forwardedHost) {
    return `${forwardedProto || request.nextUrl.protocol.replace(':', '')}://${forwardedHost}`
  }
  if (host) {
    return `${forwardedProto || request.nextUrl.protocol.replace(':', '')}://${host}`
  }
  return request.nextUrl.origin
}

function buildLoginRedirect(request: NextRequest, error: string, nextUrl: string): URL {
  const publicOrigin = getPublicOrigin(request)
  return new URL(
    `/login?error=${encodeURIComponent(error)}&next=${encodeURIComponent(nextUrl)}`,
    publicOrigin
  )
}

function setAuthCookie(cookieStore: Awaited<ReturnType<typeof cookies>>, request: NextRequest) {
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() ?? ''
  const isHttps = forwardedProto === 'https'
  cookieStore.set(AUTH_COOKIE, TOKEN, {
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax',
    maxAge: MAX_AGE,
    path: '/',
  })
}

export async function POST(request: NextRequest) {
  let username: string | undefined
  let password: string | undefined
  let nextUrl = '/'

  const contentType = request.headers.get('content-type') ?? ''
  const isForm = contentType.includes('application/x-www-form-urlencoded')
  if (isForm) {
    const form = await request.formData()
    username = (form.get('username') as string)?.trim()
    password = form.get('password') as string
    const nextParam = form.get('next')
    if (typeof nextParam === 'string' && nextParam.startsWith('/')) {
      nextUrl = nextParam
    }
  } else {
    let body: { username?: string; password?: string; next?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }
    username = body.username?.trim()
    password = body.password
    if (typeof body.next === 'string' && body.next.startsWith('/')) {
      nextUrl = body.next
    }
  }

  if (!username || password === undefined) {
    if (isForm) {
      return NextResponse.redirect(
        buildLoginRedirect(request, 'Логин и пароль обязательны', nextUrl),
        { status: 302 }
      )
    }
    return NextResponse.json({ error: 'Логин и пароль обязательны' }, { status: 400 })
  }
  if (!isValidSiteLogin(username, password)) {
    if (isForm) {
      return NextResponse.redirect(
        buildLoginRedirect(request, 'Неверный логин или пароль', nextUrl),
        { status: 302 }
      )
    }
    return NextResponse.json({ error: 'Неверный логин или пароль' }, { status: 401 })
  }

  const cookieStore = await cookies()
  setAuthCookie(cookieStore, request)

  if (isForm) {
    const base = getPublicOrigin(request)
    const redirectTo = nextUrl.startsWith('http') ? nextUrl : `${base}${nextUrl}`
    return NextResponse.redirect(redirectTo, { status: 302 })
  }
  return NextResponse.json({ success: true, next: nextUrl })
}
