import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  console.log('Active call check endpoint called')
  try {
    // Find any active call (you might want to add user identification here)
    const activeCall = await prisma.call.findFirst({
      where: {
        status: 'ai_handling',
        endedAt: null
      },
      orderBy: {
        startedAt: 'desc'
      }
    })

    console.log('Active call found:', activeCall ? activeCall.id : 'none')

    if (activeCall) {
      return NextResponse.json({
        hasActiveCall: true,
        callId: activeCall.id,
        callSid: activeCall.twilioCallSid,
        callStatus: activeCall.status
      })
    }

    return NextResponse.json({
      hasActiveCall: false
    })
  } catch (error) {
    console.error('Active call check error:', error)
    return NextResponse.json({ error: 'Failed to check active call' }, { status: 500 })
  }
}