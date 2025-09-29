import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'

const AccessToken = twilio.jwt.AccessToken
const VoiceGrant = AccessToken.VoiceGrant

export async function POST(request: NextRequest) {
  try {
    const { identity } = await request.json()

    if (!identity) {
      return NextResponse.json({ error: 'Identity is required' }, { status: 400 })
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID!
    const apiKeySid = process.env.TWILIO_API_KEY_SID!
    const apiKeySecret = process.env.TWILIO_API_KEY_SECRET!

    // Create an access token
    const token = new AccessToken(accountSid, apiKeySid, apiKeySecret, {
      identity,
      ttl: 3600 // 1 hour
    })

    // Create a Voice grant
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: "AP9b3745836a4a074d848e52ebe139b40c",
      incomingAllow: true
    })

    token.addGrant(voiceGrant)

    return NextResponse.json({ token: token.toJwt() })
  } catch (error) {
    console.error('Token generation error:', error)
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 })
  }
}