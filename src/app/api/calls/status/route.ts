import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const callSid = searchParams.get('callSid')

    if (!callSid) {
      return NextResponse.json({ error: 'Call SID is required' }, { status: 400 })
    }

    // Find the call by Twilio SID
    const call = await prisma.call.findUnique({
      where: { twilioCallSid: callSid },
      select: { status: true }
    })

    if (!call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 })
    }

    return NextResponse.json({ status: call.status })
  } catch (error) {
    console.error('Call status check error:', error)
    return NextResponse.json({ error: 'Failed to check call status' }, { status: 500 })
  }
}