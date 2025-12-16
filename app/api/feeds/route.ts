import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { feedSchema } from '@/lib/validation'

export async function GET(request: NextRequest) {
  try {
    authMiddleware(request)

    const feeds = await prisma.feed.findMany({
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ feeds })
  } catch (error: any) {
    if (error.status === 401) {
      return error
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    authMiddleware(request)

    const body = await request.json()
    const validatedData = feedSchema.parse(body)

    const feed = await prisma.feed.create({
      data: validatedData,
    })

    return NextResponse.json({ feed }, { status: 201 })
  } catch (error: any) {
    if (error.status === 401) {
      return error
    }
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

