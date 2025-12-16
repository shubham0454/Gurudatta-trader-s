import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    authMiddleware(request)

    const bill = await prisma.bill.findUnique({
      where: { id: params.id },
      include: {
        user: true,
        items: {
          include: {
            feed: true,
          },
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!bill) {
      return NextResponse.json(
        { error: 'Bill not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ bill })
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

