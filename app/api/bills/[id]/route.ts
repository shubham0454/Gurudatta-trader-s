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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    authMiddleware(request)

    // Find the bill first to get its items for stock restoration
    const bill = await prisma.bill.findUnique({
      where: { id: params.id },
      include: {
        items: {
          include: {
            feed: true,
          },
        },
      },
    })

    if (!bill) {
      return NextResponse.json(
        { error: 'Bill not found' },
        { status: 404 }
      )
    }

    // Use transaction to ensure atomicity - restore stock and delete bill together
    await prisma.$transaction(async (tx) => {
      // Restore stock for each feed item
      for (const item of bill.items) {
        await tx.feed.update({
          where: { id: item.feedId },
          data: {
            stock: {
              increment: item.quantity,
            },
          },
        })
      }

      // Delete the bill (items will be deleted automatically due to cascade)
      await tx.bill.delete({
        where: { id: params.id },
      })
    })

    return NextResponse.json({ 
      success: true,
      message: `Bill ${bill.billNumber} deleted successfully. Stock has been restored.`
    })
  } catch (error: any) {
    if (error.status === 401) {
      return error
    }
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Bill not found' },
        { status: 404 }
      )
    }
    console.error('Delete bill error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
