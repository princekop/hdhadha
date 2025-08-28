import { NextRequest, NextResponse } from 'next/server'
import { RtcTokenBuilder, RtcRole } from 'agora-access-token'

// GET /api/agora/token?channel=<name>&uid=<string>&role=publisher|subscriber&expireSeconds=3600
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID
    const appCertificate = process.env.ABLY_AGORA_APP_CERTIFICATE || process.env.AGORA_APP_CERTIFICATE

    if (!appId || !appCertificate) {
      return NextResponse.json({ error: 'Missing AGORA envs' }, { status: 500 })
    }

    const channel = (searchParams.get('channel') || '').trim()
    const uid = (searchParams.get('uid') || '').trim()
    const roleParam = (searchParams.get('role') || 'publisher').toLowerCase()
    const expireSeconds = parseInt(searchParams.get('expireSeconds') || '') || parseInt(process.env.AGORA_TOKEN_EXPIRE_SECONDS || '') || 3600

    if (!channel || !uid) {
      return NextResponse.json({ error: 'channel and uid are required' }, { status: 400 })
    }

    const role = roleParam === 'subscriber' ? RtcRole.SUBSCRIBER : RtcRole.PUBLISHER

    const currentTs = Math.floor(Date.now() / 1000)
    const privilegeExpireTs = currentTs + Math.max(60, expireSeconds)

    // Use account-based token to support string UIDs
    const token = RtcTokenBuilder.buildTokenWithAccount(
      appId,
      appCertificate,
      channel,
      uid,
      role,
      privilegeExpireTs
    )

    return NextResponse.json({ token, appId, channel, uid, role: roleParam, expireAt: privilegeExpireTs })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'token error' }, { status: 500 })
  }
}
