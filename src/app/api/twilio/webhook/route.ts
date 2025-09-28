import { NextRequest, NextResponse } from 'next/server'
import { getAIResponse } from '@/lib/openai'
import { prisma } from '@/lib/prisma'

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

    console.log('Twilio webhook data:', {
      speechResult,
      callSid,
      from,
      to
    })

    // If this is the initial call (no speech result yet)
    if (!speechResult) {
      // Return greeting without database to avoid hangs
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Hello! I'm your mental health support assistant. How are you feeling today?</Say>
  <Gather input="speech" action="/api/twilio/webhook" method="POST" speechTimeout="3" timeout="10">
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
              status: 'ongoing',
              conversation: { connect: { id: conversation.id } }
            },
            include: { conversation: true }
          })
        }

        // Get AI response
        const aiResponse = await getAIResponse(speechResult, call.id)
        console.log('AI response:', aiResponse)

        // Continue conversation
        const escapeXml = (str: string) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;').replace(/"/g, '&quot;');
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">${escapeXml(aiResponse)}</Say>
  <Gather input="speech" action="/api/twilio/webhook" method="POST" speechTimeout="3" timeout="10">
    <Say>What would you like to talk about next?</Say>
  </Gather>
  <Say>Thank you for calling. Take care of yourself.</Say>
</Response>`

        return new NextResponse(xml, {
          headers: { 'Content-Type': 'text/xml' }
        })
      } catch (dbError) {
        console.error('Database error in speech:', dbError)
        // Fallback without AI
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">I'm sorry, I'm having trouble responding right now. Please try again.</Say>
  <Gather input="speech" action="/api/twilio/webhook" method="POST" speechTimeout="3" timeout="10">
    <Say>What would you like to talk about next?</Say>
  </Gather>
  <Say>Thank you for calling. Take care of yourself.</Say>
</Response>`

        return new NextResponse(xml, {
          headers: { 'Content-Type': 'text/xml' }
        })
      }
    }

    // Fallback for empty speech
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">I didn't catch that. Could you please repeat?</Say>
  <Gather input="speech" action="/api/twilio/webhook" method="POST" speechTimeout="3" timeout="10">
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
  <Gather input="speech" action="/api/twilio/webhook" method="POST" speechTimeout="3" timeout="10">
    <Say>Please speak after the beep.</Say>
  </Gather>
  <Say>Thank you for calling.</Say>
</Response>`

    return new NextResponse(errorXml, {
      headers: { 'Content-Type': 'text/xml' }
    })
  }
}
