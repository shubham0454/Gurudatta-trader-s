import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { feedSchema } from '@/lib/validation'

export async function GET(request: NextRequest) {
  try {
    authMiddleware(request)

    const feeds = await prisma.feed.findMany({
      orderBy: { name: 'asc' },
      include: {
        billItems: {
          select: {
            quantity: true,
          },
        },
      },
    })

    // Calculate sold stock and total stock for each feed
    const feedsWithStats = feeds.map((feed) => {
      // Calculate sold stock (sum of all bill items quantities)
      const soldStock = feed.billItems.reduce((sum, item) => sum + item.quantity, 0)
      
      // Total stock = current stock + sold stock
      const totalStock = feed.stock + soldStock

      return {
        id: feed.id,
        name: feed.name,
        brand: feed.brand,
        weight: feed.weight,
        defaultPrice: feed.defaultPrice,
        stock: feed.stock, // Current available stock
        soldStock: soldStock, // Total sold stock
        totalStock: totalStock, // Total stock (current + sold)
        createdAt: feed.createdAt,
        updatedAt: feed.updatedAt,
      }
    })

    return NextResponse.json({ feeds: feedsWithStats })
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

