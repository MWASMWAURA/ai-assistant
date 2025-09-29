import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Mock counselor ID - in real app, get from auth
const COUNSELOR_ID = 'counselor-1'

export async function GET() {
  try {
    const counselor = await prisma.user.findUnique({
      where: { id: COUNSELOR_ID },
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

    if (!counselor) {
      return NextResponse.json({ error: 'Counselor not found' }, { status: 404 })
    }

    // Map for frontend
    const mappedCounselor = {
      ...counselor,
      isAvailable: counselor.status === 'available',
      specialties: counselor.specialties ? JSON.parse(counselor.specialties) : []
    }

    return NextResponse.json(mappedCounselor)
  } catch (error) {
    console.error('Profile error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, phone, specialties, license, bio } = body

    const updatedCounselor = await prisma.user.update({
      where: { id: COUNSELOR_ID },
      data: {
        name,
        email,
        phone,
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
      ...updatedCounselor,
      isAvailable: updatedCounselor.status === 'available',
      specialties: updatedCounselor.specialties ? JSON.parse(updatedCounselor.specialties) : []
    }

    return NextResponse.json(mappedCounselor)
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}