// app/api/eskiz/login/route.ts — server-only Eskiz login.
// Reads ESKIZ_EMAIL / ESKIZ_PASSWORD from the server-side env, calls
// notify.eskiz.uz/api/auth/login, and returns just the token to the client.
// Credentials never leave the server, so they don't end up in the JS bundle.

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST() {
  const email = process.env.ESKIZ_EMAIL
  const password = process.env.ESKIZ_PASSWORD

  if (!email || !password) {
    return NextResponse.json(
      { error: 'ESKIZ_EMAIL or ESKIZ_PASSWORD is not set on the server' },
      { status: 500 },
    )
  }

  const form = new FormData()
  form.append('email', email)
  form.append('password', password)

  let upstream: Response
  try {
    upstream = await fetch('https://notify.eskiz.uz/api/auth/login', {
      method: 'POST',
      body: form,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Eskiz unreachable' },
      { status: 502 },
    )
  }

  if (!upstream.ok) {
    let message = `Eskiz login failed (${upstream.status})`
    try {
      const body = await upstream.json()
      if (body?.message) message = body.message
    } catch {}
    return NextResponse.json({ error: message }, { status: upstream.status })
  }

  const body = (await upstream.json()) as {
    data?: { token?: string }
  }
  const token = body?.data?.token
  if (!token) {
    return NextResponse.json(
      { error: 'Eskiz response missing token' },
      { status: 502 },
    )
  }

  return NextResponse.json({ token })
}
