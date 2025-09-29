import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import twilio from 'twilio'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { callSid } = body

    if (!callSid) {
      return NextResponse.json({ error: 'Call SID is required' }, { status: 400 })
    }

    // Find the call by Twilio SID
    console.log('Looking for call with CallSid:', callSid)
    let call = await prisma.call.findUnique({
      where: { twilioCallSid: callSid }
    })

    if (!call) {
      console.log('Call not found with CallSid:', callSid)
      // Try to find any recent ai_handling call as fallback
      const recentCall = await prisma.call.findFirst({
        where: { status: 'ai_handling' },
        orderBy: { startedAt: 'desc' }
      })
      if (recentCall) {
        console.log('Using recent ai_handling call as fallback:', recentCall.id)
        call = recentCall
      } else {
        return NextResponse.json({ error: 'Call not found' }, { status: 404 })
      }
    }

    // If call has a Twilio SID, hang up the call using Twilio REST API
    if (call.twilioCallSid) {
      try {
        console.log(`Attempting to hang up call ${call.twilioCallSid}`)
        const client = twilio(
          process.env.TWILIO_ACCOUNT_SID!,
          process.env.TWILIO_AUTH_TOKEN!
        )

        const result = await client.calls(call.twilioCallSid).update({
          status: 'completed'
        })
        console.log(`Successfully hung up call ${call.twilioCallSid}:`, result.status)
      } catch (twilioError) {
        console.error('Twilio hangup error:', twilioError)
        // Continue with database update even if Twilio API fails
      }
    }

    // Update call status to completed and set end time
    const updatedCall = await prisma.call.update({
      where: { id: call.id },
      data: {
        status: 'completed',
        endedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      call: updatedCall
    })
  } catch (error) {
    console.error('End call error:', error)
    return NextResponse.json({ error: 'Failed to end call' }, { status: 500 })
  }
}