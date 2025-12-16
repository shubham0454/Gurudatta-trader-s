import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { userSchema } from '@/lib/validation'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    authMiddleware(request)

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        bills: {
          include: {
            items: {
              include: {
                feed: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ user })
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
    const validatedData = userSchema.parse(body)

    const user = await prisma.user.update({
      where: { id: params.id },
      data: {
        name: validatedData.name,
        mobileNo: validatedData.mobileNo,
        address: validatedData.address || null,
        email: validatedData.email || null,
        userCode: validatedData.userCode || undefined,
        userType: validatedData.userType || undefined,
        status: validatedData.status || undefined,
      },
    })

    return NextResponse.json({ user })
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
        { error: 'User not found' },
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

    await prisma.user.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.status === 401) {
      return error
    }
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

