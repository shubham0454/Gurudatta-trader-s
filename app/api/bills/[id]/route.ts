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

    // Check if bill is already inactive
    if (bill.billStatus === 'inactive') {
      return NextResponse.json(
        { error: 'Bill is already deleted' },
        { status: 400 }
      )
    }

    // Use transaction to ensure atomicity - restore stock and soft delete bill
    await prisma.$transaction(async (tx) => {
      // Restore stock for each feed item based on storage location
      for (const item of bill.items) {
        const storageLocation = (item as any).storageLocation || 'godown'
        const updateData: any = {}
        
        if (storageLocation === 'shop') {
          updateData.shopStock = { increment: item.quantity }
        } else if (storageLocation === 'godown') {
          updateData.godownStock = { increment: item.quantity }
        } else {
          // For custom locations, restore to godown by default
          updateData.godownStock = { increment: item.quantity }
        }
        
        // Also update legacy stock field for backward compatibility
        updateData.stock = { increment: item.quantity }

        await tx.feed.update({
          where: { id: item.feedId },
          data: updateData,
        })
      }

      // Soft delete: Set billStatus to inactive instead of deleting
      await tx.bill.update({
        where: { id: params.id },
        data: {
          billStatus: 'inactive',
        },
      })
    })

    return NextResponse.json({ 
      success: true,
      message: `Bill ${bill.billNumber} has been deleted. Stock has been restored.`
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
