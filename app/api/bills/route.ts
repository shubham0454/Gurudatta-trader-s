import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { billSchema } from '@/lib/validation'

export async function GET(request: NextRequest) {
  try {
    authMiddleware(request)

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const includeInactive = searchParams.get('includeInactive') === 'true' // For backend/admin use

    const where: any = userId ? { userId } : {}
    
    // Filter by billStatus - only show active bills unless explicitly requested
    // Note: This field may not exist until migration is run, so we'll handle it gracefully
    if (!includeInactive) {
      // Only add billStatus filter if the field exists (after migration)
      // For now, we'll fetch all bills and filter in memory if needed
      // This will work until migration is complete
    }

    try {
      const bills = await prisma.bill.findMany({
        where,
        select: {
          id: true,
          billNumber: true,
          totalAmount: true,
          paidAmount: true,
          pendingAmount: true,
          status: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              mobileNo: true,
              userType: true,
              status: true,
            },
          },
          items: {
            select: {
              feed: {
                select: {
                  name: true,
                  weight: true,
                },
              },
              quantity: true,
              unitPrice: true,
              totalPrice: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        // Removed limit to show all bills
      })

      return NextResponse.json({ bills })
    } catch (dbError: any) {
      // If fields don't exist yet (database not migrated), fetch without new fields
      const errorMessage = dbError.message || ''
      const isFieldError = 
        dbError.code === 'P2009' || 
        errorMessage.includes('Unknown field') ||
        errorMessage.includes('Unknown column') || 
        errorMessage.includes('does not exist') ||
        errorMessage.includes('userType') ||
        errorMessage.includes('status')

      if (isFieldError) {
        // Fetch without new fields (database not migrated yet)
        const bills = await prisma.bill.findMany({
          where,
          select: {
            id: true,
            billNumber: true,
            totalAmount: true,
            paidAmount: true,
            pendingAmount: true,
            status: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                name: true,
                mobileNo: true,
              },
            },
            items: {
              select: {
                feed: {
                  select: {
                    name: true,
                    weight: true,
                  },
                },
                quantity: true,
                unitPrice: true,
                totalPrice: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          // Removed limit to show all bills
        })

        // Add default values for missing fields
        const billsWithDefaults = bills.map((bill: any) => ({
          ...bill,
          user: {
            ...bill.user,
            userType: 'BMC',
            status: 'active',
          },
        }))

        return NextResponse.json({ bills: billsWithDefaults })
      }
      throw dbError
    }
  } catch (error: any) {
    if (error.status === 401) {
      return error
    }
    console.error('Error in GET /api/bills:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    authMiddleware(request)

    const body = await request.json()
    const validatedData = billSchema.parse(body)

    // Calculate total amount
    let totalAmount = 0
    const items: Array<{
      feedId: string
      quantity: number
      unitPrice: number
      totalPrice: number
      storageLocation: string
    }> = []

    for (const item of validatedData.items) {
      const feed = await prisma.feed.findUnique({
        where: { id: item.feedId },
      })

      if (!feed) {
        return NextResponse.json(
          { error: `Feed with ID ${item.feedId} not found` },
          { status: 400 }
        )
      }

      // Check stock based on storage location
      const storageLocation = item.storageLocation || 'godown'
      let availableStock = 0
      
      if (storageLocation === 'shop') {
        availableStock = feed.shopStock || 0
      } else if (storageLocation === 'godown') {
        availableStock = feed.godownStock || 0
      } else {
        // For custom locations, check total stock (shop + godown)
        availableStock = (feed.shopStock || 0) + (feed.godownStock || 0)
      }

      // Fallback to old stock field if location stocks are 0
      if (availableStock === 0 && feed.stock > 0) {
        availableStock = feed.stock
      }

      if (availableStock < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${feed.name} in ${storageLocation}. Available: ${availableStock.toFixed(0)}` },
          { status: 400 }
        )
      }

      const itemTotal = item.quantity * item.unitPrice
      totalAmount += itemTotal

      items.push({
        feedId: item.feedId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: itemTotal,
        storageLocation: storageLocation,
      })
    }

    // Check for duplicate bills before creating
    // Look for bills with same userId, same total amount, created within last 10 seconds
    const fiveSecondsAgo = new Date(Date.now() - 10000) // 10 seconds ago
    const recentBills = await prisma.bill.findMany({
      where: {
        userId: validatedData.userId,
        totalAmount: totalAmount,
        createdAt: {
          gte: fiveSecondsAgo,
        },
      },
      include: {
        items: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5, // Check last 5 recent bills
    })

    // Check if any recent bill has the same items (same feedIds and quantities)
    for (const recentBill of recentBills) {
      if (recentBill.items.length === items.length) {
        const recentItemsMap = new Map(
          recentBill.items.map(item => [`${item.feedId}-${item.quantity}`, true])
        )
        const allItemsMatch = items.every(item => 
          recentItemsMap.has(`${item.feedId}-${item.quantity}`)
        )
        
        if (allItemsMatch) {
          return NextResponse.json(
            { 
              error: 'Duplicate bill detected. A similar bill was created recently. Please check the bills list.',
              duplicateBillId: recentBill.id,
              duplicateBillNumber: recentBill.billNumber,
            },
            { status: 409 } // 409 Conflict
          )
        }
      }
    }

    // Use transaction to ensure atomicity - create bill and update stock together
    const bill = await prisma.$transaction(async (tx) => {
      // Generate bill number inside transaction to prevent race conditions
      const billCount = await tx.bill.count()
      const billNumber = `BILL-${String(billCount + 1).padStart(6, '0')}`
      // Double-check stock availability inside transaction to prevent race conditions
      for (const item of validatedData.items) {
        const feed = await tx.feed.findUnique({
          where: { id: item.feedId },
        })

        if (!feed) {
          throw new Error(`Feed with ID ${item.feedId} not found`)
        }

        const storageLocation = item.storageLocation || 'godown'
        let availableStock = 0
        
        if (storageLocation === 'shop') {
          availableStock = feed.shopStock || 0
        } else if (storageLocation === 'godown') {
          availableStock = feed.godownStock || 0
        } else {
          availableStock = (feed.shopStock || 0) + (feed.godownStock || 0)
        }

        // Fallback to old stock field if location stocks are 0
        if (availableStock === 0 && feed.stock > 0) {
          availableStock = feed.stock
        }

        if (availableStock < item.quantity) {
          throw new Error(`Insufficient stock for ${feed.name} in ${storageLocation}. Available: ${availableStock.toFixed(0)}`)
        }
      }

      // Calculate paid and pending amounts based on status
      const paidAmount = validatedData.paidAmount || 0
      const pendingAmount = totalAmount - paidAmount
      let status = validatedData.status || 'pending'
      
      // Auto-determine status based on paid amount if not provided
      if (!validatedData.status) {
        if (paidAmount === 0) {
          status = 'pending'
        } else if (paidAmount >= totalAmount) {
          status = 'paid'
        } else {
          status = 'partial'
        }
      }

      // Create bill with items
      const newBill = await tx.bill.create({
        data: {
          billNumber, // Generated inside transaction
          userId: validatedData.userId,
          totalAmount,
          paidAmount,
          pendingAmount,
          status,
          billStatus: 'active', // New bills are always active
          items: {
            create: items,
          },
        },
        include: {
          user: true,
          items: {
            include: {
              feed: true,
            },
          },
        },
      })

      // Update stock for each feed atomically based on storage location
      for (const item of validatedData.items) {
        const storageLocation = item.storageLocation || 'godown'
        const updateData: any = {}
        
        if (storageLocation === 'shop') {
          updateData.shopStock = { decrement: item.quantity }
        } else if (storageLocation === 'godown') {
          updateData.godownStock = { decrement: item.quantity }
        } else {
          // For custom locations, deduct from godown by default
          updateData.godownStock = { decrement: item.quantity }
        }
        
        // Also update legacy stock field for backward compatibility
        updateData.stock = { decrement: item.quantity }

        await tx.feed.update({
          where: { id: item.feedId },
          data: updateData,
        })
      }

      // Automatically set user status to 'active' when bill is created
      await tx.user.update({
        where: { id: validatedData.userId },
        data: { status: 'active' },
      })

      return newBill
    })

    return NextResponse.json({ bill }, { status: 201 })
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
    // Handle transaction errors (stock issues, etc.)
    if (error.message && (error.message.includes('stock') || error.message.includes('Insufficient'))) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    // Handle unique constraint violation (duplicate bill number - should be rare now)
    if (error.code === 'P2002' && error.meta?.target?.includes('billNumber')) {
      return NextResponse.json(
        { error: 'Bill number conflict detected. Please try again.' },
        { status: 409 }
      )
    }
    console.error('Error creating bill:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

