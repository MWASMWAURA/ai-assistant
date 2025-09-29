import { NextRequest, NextResponse } from 'next/server'
import { getAIResponse } from '@/lib/cohere'
import { prisma } from '@/lib/prisma'

async function generateConversationSummary(callId: string): Promise<string> {
  const call = await prisma.call.findUnique({
    where: { id: callId },
    include: { conversation: { include: { messages: true } } }
  })

  if (!call?.conversation) return 'No conversation history available.'

  const messages = call.conversation.messages
  const conversationText = messages.map(m => `${m.role}: ${m.content}`).join('\n')

  // Simple summary - in production, use AI to summarize
  return `Conversation summary: ${messages.length} messages exchanged. Key topics: ${conversationText.substring(0, 200)}...`
}

async function findAvailableCounselor() {
  // Find an available counselor
  const counselor = await prisma.user.findFirst({
    where: {
      role: 'counselor',
      status: 'available'
    }
  })
  return counselor
}

export async function POST(request: NextRequest) {
  console.log('Webhook called')
  try {
    // Parse the form data from Twilio
    const formData = await request.formData()
    console.log('Form data parsed')

    // Get Twilio parameters
    const speechResult = formData.get('SpeechResult') as string
    const callSid = formData.get('CallSid') as string
    const from = formData.get('From') as string
    const to = formData.get('To') as string
    const callStatus = formData.get('CallStatus') as string

    console.log('Twilio webhook data:', {
      speechResult,
      callSid,
      from,
      to,
      callStatus
    })

    // Handle call status updates (when call ends)
    if (callStatus && ['completed', 'busy', 'no-answer', 'failed', 'canceled'].includes(callStatus)) {
      console.log(`Call ${callSid} ended with status: ${callStatus}`)

      // Update call status in database
      const existingCall = await prisma.call.findUnique({
        where: { twilioCallSid: callSid }
      })

      if (existingCall && existingCall.status !== 'completed') {
        await prisma.call.update({
          where: { id: existingCall.id },
          data: {
            status: 'completed',
            endedAt: new Date()
          }
        })

        // Free up assigned counselor if call was assigned
        if (existingCall.assignedCounselorId) {
          await prisma.user.update({
            where: { id: existingCall.assignedCounselorId },
            data: { status: 'available' }
          })
        }

        console.log(`Updated call ${existingCall.id} to completed and freed counselor`)
      }

      // Return empty response for status updates
      return new NextResponse('', { status: 200 })
    }

    // If this is the initial call (no speech result yet)
    if (!speechResult) {
      // Return greeting without database to avoid hangs
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Hello! I'm your mental health support assistant. How are you feeling today?</Say>
  <Gather input="speech" action="/api/twilio/webhook" method="POST" speechTimeout="3" timeout="10" statusCallback="/api/twilio/webhook" statusCallbackEvent="completed">
    <Say>Please speak after the beep, and I'll listen.</Say>
  </Gather>
  <Say>I didn't hear anything. Please try calling again.</Say>
</Response>`

      return new NextResponse(xml, {
        headers: { 'Content-Type': 'text/xml' }
      })
    }

    // Handle speech input
    if (speechResult && speechResult.trim() !== '') {
      console.log('Processing speech input:', speechResult)
      try {
        // Find or create the call and conversation
        let call = await prisma.call.findUnique({
          where: { twilioCallSid: callSid },
          include: { conversation: true }
        })

        if (!call) {
          console.log('Call not found, creating new')
          // Create user, conversation, call
          const user = await prisma.user.upsert({
            where: { phone: from },
            update: {},
            create: {
              phone: from,
              role: 'user'
            }
          })

          const conversation = await prisma.conversation.create({
            data: {
              userId: user.id
            }
          })

          call = await prisma.call.create({
            data: {
              userId: user.id,
              twilioCallSid: callSid,
              status: 'ai_handling',
              conversation: { connect: { id: conversation.id } }
            },
            include: { conversation: true }
          })
        }

        // Get AI response
        console.log('Getting AI response for input:', speechResult)
        const aiResult = await getAIResponse(speechResult, call.id)
        console.log('AI response received:', aiResult)
        console.log('Response text length:', aiResult.response?.length || 0)

        if (aiResult.needsEscalation) {
          // Generate conversation summary
          const summary = await generateConversationSummary(call.id)

          // Find available counselor
          const counselor = await findAvailableCounselor()

          if (counselor) {
            // Create escalation record
            await prisma.escalation.create({
              data: {
                callId: call.id,
                counselorId: counselor.id,
                notes: `Reason: ${aiResult.escalationReason}\nSummary: ${summary}`
              }
            })

            // Update call status and assign counselor
            await prisma.call.update({
              where: { id: call.id },
              data: {
                status: 'counselor_assigned',
                assignedCounselorId: counselor.id
              }
            })

            // Set counselor status to busy
            await prisma.user.update({
              where: { id: counselor.id },
              data: { status: 'busy' }
            })

            // Escalation response
            const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">I understand you need professional help. I'm connecting you with a licensed counselor. Please hold while I transfer your call.</Say>
  <Dial>${counselor.phone}</Dial>
  <Say voice="alice">The counselor is unavailable right now. Please call back later or contact emergency services if you're in immediate danger.</Say>
</Response>`
            return new NextResponse(xml, {
              headers: { 'Content-Type': 'text/xml' }
            })
          } else {
            // No counselor available, provide info
            const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">I understand you need professional help. Our counselors are currently unavailable. Please contact the National Suicide Prevention Lifeline at 988, or visit emergency room if you're in immediate danger.</Say>
</Response>`
            return new NextResponse(xml, {
              headers: { 'Content-Type': 'text/xml' }
            })
          }
        }

        // Ensure response is not empty
        let cleanResponse = aiResult.response.replace(/[<>&'"]/g, '').trim()
        if (!cleanResponse) {
          cleanResponse = "I'm here to listen. How are you feeling?"
        }
        console.log('Clean response:', cleanResponse)

        // Continue normal conversation
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="/api/twilio/webhook" method="POST" speechTimeout="3" timeout="10" statusCallback="/api/twilio/webhook" statusCallbackEvent="completed">
    <Say voice="alice">${cleanResponse}</Say>
    <Say>What would you like to talk about next?</Say>
  </Gather>
  <Say>Thank you for calling. Take care of yourself.</Say>
</Response>`

        console.log('Returning XML response:', xml)
        return new NextResponse(xml, {
          headers: { 'Content-Type': 'text/xml' }
        })
      } catch (dbError) {
        console.error('Database error in speech:', dbError)
        // Fallback without AI
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">I'm sorry, I'm having trouble responding right now. Please try again.</Say>
  <Gather input="speech" action="/api/twilio/webhook" method="POST" speechTimeout="3" timeout="10" statusCallback="/api/twilio/webhook" statusCallbackEvent="completed">
    <Say>What would you like to talk about next?</Say>
  </Gather>
  <Say>Thank you for calling. Take care of yourself.</Say>
</Response>`

        console.log('Returning fallback XML due to database error:', xml)
        return new NextResponse(xml, {
          headers: { 'Content-Type': 'text/xml' }
        })
      }
    }

    // Fallback for empty speech
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">I didn't catch that. Could you please repeat?</Say>
  <Gather input="speech" action="/api/twilio/webhook" method="POST" speechTimeout="3" timeout="10" statusCallback="/api/twilio/webhook" statusCallbackEvent="completed">
    <Say>Please speak clearly after the beep.</Say>
  </Gather>
  <Say>Thank you for calling. Take care.</Say>
</Response>`

    return new NextResponse(xml, {
      headers: { 'Content-Type': 'text/xml' }
    })

  } catch (error) {
    console.error('Webhook error:', error)

    // Error response
    const errorXml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">I'm sorry, I'm experiencing technical difficulties. Please try calling again later.</Say>
</Response>`

    return new NextResponse(errorXml, {
      headers: { 'Content-Type': 'text/xml' }
    })
  }
}
