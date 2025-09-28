import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { userId, mood, note } = await request.json()

    if (!userId || !mood || mood < 1 || mood > 10) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }

    const entry = await prisma.moodEntry.create({
      data: {
        userId,
        mood,
        note
      }
    })

    return NextResponse.json(entry)
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to save mood entry' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    const entries = await prisma.moodEntry.findMany({
      where: { userId },
      orderBy: { date: 'desc' }
    })

    return NextResponse.json(entries)
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to fetch mood entries' }, { status: 500 })
  }
}