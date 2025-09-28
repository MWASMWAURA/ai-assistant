import { CohereClient } from 'cohere-ai'
import { prisma } from './prisma'

const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY
})

export async function getAIResponse(input: string, callId: string): Promise<string> {
  // Get conversation
  const call = await prisma.call.findUnique({
    where: { id: callId },
    include: { conversation: { include: { messages: true } } }
  })
  if (!call || !call.conversation) return 'Sorry, there was an error.'

  const conversation = call.conversation

  // Add user message
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: 'user',
      content: input
    }
  })

  // Get messages for Cohere (last 5 messages for speed)
  const recentMessages = conversation.messages.slice(-5)
  const chatHistory = recentMessages.map(m => ({
    role: m.role === 'assistant' ? ('CHATBOT' as const) : ('USER' as const),
    message: m.content
  }))

  try {
    // Add timeout to prevent hanging
    const chatPromise = cohere.chat({
      model: 'command-r-plus-08-2024',
      message: input,
      chatHistory,
      preamble: 'You are a compassionate mental health AI assistant. Listen actively, provide support, and detect if the user needs professional help. If they mention suicide or self-harm, suggest immediate help.',
      maxTokens: 100
    })

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('AI response timeout')), 2000) // 2 seconds
    )

    const response = await Promise.race([chatPromise, timeoutPromise]) as { text: string }

    const aiResponse = response.text || 'I\'m here to listen.'

    // Save assistant message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: aiResponse
      }
    })

    // Check for crisis
    if (input.toLowerCase().includes('suicide') || input.toLowerCase().includes('kill myself') || input.toLowerCase().includes('self-harm')) {
      // TODO: handle crisis
      return aiResponse + ' Please call emergency services at 911 if you\'re in immediate danger.'
    }

    return aiResponse
  } catch (error) {
    console.error('Cohere error:', error)
    if ((error as Error).message === 'AI response timeout') {
      return 'I\'m taking a bit longer to respond. Please hold on.'
    }
    return 'I\'m sorry, I\'m having trouble responding right now. Please try again.'
  }
}