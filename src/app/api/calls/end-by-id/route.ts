import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import twilio from 'twilio'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { callId } = body

    if (!callId) {
      return NextResponse.json({ error: 'Call ID is required' }, { status: 400 })
    }

    // Get the call details
    const call = await prisma.call.findUnique({
      where: { id: callId }
    })

    if (!call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 })
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
    } else {
      console.log('Call has no Twilio SID, cannot hang up via API')
    }

    // Update call status to completed and set end time
    const updatedCall = await prisma.call.update({
      where: { id: callId },
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
    console.error('End call by ID error:', error)
    return NextResponse.json({ error: 'Failed to end call' }, { status: 500 })
  }
}