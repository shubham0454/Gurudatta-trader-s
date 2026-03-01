import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { feedSchema } from '@/lib/validation'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    authMiddleware(request)

    const feed = await prisma.feed.findUnique({
      where: { id: params.id },
    })

    if (!feed) {
      return NextResponse.json(
        { error: 'Feed not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ feed })
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

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    authMiddleware(request)

    const body = await request.json()
    const validatedData = feedSchema.parse(body)

    const feed = await prisma.feed.update({
      where: { id: params.id },
      data: validatedData,
    })

    return NextResponse.json({ feed })
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
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Feed not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    authMiddleware(request)

    // Soft delete: Set status to 'inactive' instead of deleting
    const feed = await prisma.feed.update({
      where: { id: params.id },
      data: {
        status: 'inactive',
      },
    })

    return NextResponse.json({ success: true, feed })
  } catch (error: any) {
    if (error.status === 401) {
      return error
    }
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Feed not found' },
        { status: 404 }
      )
    }
    console.error('Delete feed error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

