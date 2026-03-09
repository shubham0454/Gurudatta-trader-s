import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { feedSchema } from '@/lib/validation'

export async function GET(request: NextRequest) {
  try {
    authMiddleware(request)

    const searchParams = request.nextUrl.searchParams
    const includeInactive = searchParams.get('includeInactive') === 'true'
    
    // Fetch feeds; exclude soft-deleted (inactive) unless includeInactive
    const [feeds, soldByFeed] = await Promise.all([
      prisma.feed.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          brand: true,
          weight: true,
          defaultPrice: true,
          stock: true,
          shopStock: true,
          godownStock: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.billItem.groupBy({
        by: ['feedId'],
        where: {
          bill: {
            billStatus: { not: 'inactive' },
          },
        },
        _sum: { quantity: true },
      }),
    ])

    const soldMap = new Map(soldByFeed.map((row) => [row.feedId, row._sum.quantity || 0]))

    const feedsFiltered = includeInactive
      ? feeds
      : feeds.filter((f: any) => f.status == null || f.status === 'active')

    const feedsWithStats = feedsFiltered.map((feed: any) => {
        const soldStock = soldMap.get(feed.id) || 0
        return {
          id: feed.id,
          name: feed.name,
          brand: feed.brand,
          weight: feed.weight,
          defaultPrice: feed.defaultPrice,
          stock: feed.stock,
          shopStock: feed.shopStock ?? 0,
          godownStock: feed.godownStock ?? 0,
          soldStock,
          totalStock: feed.stock + soldStock,
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
      data: {
        ...validatedData,
        status: 'active', // ensure new feeds are active and show in list
      },
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

