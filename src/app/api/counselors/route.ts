import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const counselors = await prisma.user.findMany({
      where: { role: 'counselor' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        specialties: true,
        license: true,
        bio: true
      }
    })

    // Map the status field to isAvailable for the frontend
    const mappedCounselors = counselors.map(counselor => ({
      ...counselor,
      isAvailable: counselor.status === 'available',
      specialties: counselor.specialties ? JSON.parse(counselor.specialties) : []
    }))

    return NextResponse.json(mappedCounselors)
  } catch (error) {
    console.error('Counselors fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, phone, specialties = [], license, bio } = body

    // Trim inputs
    const trimmedName = name?.trim()
    const trimmedEmail = email?.trim()
    const trimmedPhone = phone?.trim()

    if (!trimmedPhone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
    }

    if (!trimmedName) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Check if phone already exists
    const existingPhone = await prisma.user.findFirst({
      where: { phone: trimmedPhone }
    })

    if (existingPhone) {
      return NextResponse.json({ error: 'Phone number already exists' }, { status: 400 })
    }

    // Check if email already exists
    if (trimmedEmail) {
      const existingEmail = await prisma.user.findFirst({
        where: { email: trimmedEmail }
      })

      if (existingEmail) {
        return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
      }
    }

    const counselor = await prisma.user.create({
      data: {
        name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone,
        role: 'counselor',
        status: 'available',
        specialties: JSON.stringify(specialties),
        license,
        bio
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        specialties: true,
        license: true,
        bio: true
      }
    })

    // Map for frontend
    const mappedCounselor = {
      ...counselor,
      isAvailable: counselor.status === 'available',
      specialties: counselor.specialties ? JSON.parse(counselor.specialties) : []
    }

    return NextResponse.json(mappedCounselor, { status: 201 })
  } catch (error) {
    console.error('Counselor creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}